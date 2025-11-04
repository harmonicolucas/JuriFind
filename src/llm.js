import { sanitizeModelInterpretation } from "./classify.js";
import { acceptExplanation, templateExplanation } from "./explain.js";
import { redact } from "./redact.js";

const INTERPRET_SYSTEM = [
  "És o classificador do JuriFind, um serviço de correspondência com advogados em Moçambique.",
  "Responde apenas com JSON válido: {\"areas\":[],\"locations\":[],\"keywords\":[]}.",
  "Escolhe áreas e localizações somente da lista recebida, com o nome exacto.",
  "Não inventes ramos do Direito, experiência, nomes de advogados nem factos.",
  "keywords são temas curtos, sem números de identificação, contactos ou moradas.",
  "Se o texto não chegar para classificar, devolve listas vazias.",
].join(" ");

const EXPLAIN_SYSTEM = [
  "És o redactor do JuriFind. Escreves em português de Moçambique.",
  "Responde apenas com JSON: {\"explanations\":{\"id\":\"texto\"}}.",
  "Cada texto tem no máximo duas frases e explica a correspondência.",
  "Usa somente as áreas, localizações e línguas fornecidas para esse advogado.",
  "Não inventes processos, cargos, anos de experiência, honorários ou resultados.",
  "Não dês aconselhamento jurídico nem prometas êxito.",
  "Não repitas números de identificação, moradas privadas ou contactos do cliente.",
].join(" ");

function extractJson(text) {
  const source = String(text ?? "");
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(source.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function chat(env, fetchImpl, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetchImpl(`${env.llmBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.llmApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`O modelo respondeu ${response.status}.`);
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timer);
  }
}

export async function interpretCase({ text, taxonomy, env, fetchImpl = fetch }) {
  if (!env?.llmApiKey) return null;
  try {
    const content = await chat(env, fetchImpl, {
      model: env.llmModel,
      temperature: 0,
      max_tokens: 300,
      messages: [
        { role: "system", content: INTERPRET_SYSTEM },
        {
          role: "user",
          content: JSON.stringify({
            caso: redact(text).slice(0, 1800),
            areasPermitidas: taxonomy.areas,
            localizacoesPermitidas: taxonomy.locations,
          }),
        },
      ],
    });
    return sanitizeModelInterpretation(extractJson(content), taxonomy);
  } catch {
    return null;
  }
}

export async function explainMatches({ text, items, taxonomyAreas, env, fetchImpl = fetch }) {
  const explanations = new Map();
  for (const item of items) {
    explanations.set(item.lawyer.id, { text: templateExplanation(item.lawyer, item), source: "regras" });
  }
  if (!env?.llmApiKey || !items.length) return explanations;

  try {
    const content = await chat(env, fetchImpl, {
      model: env.llmModel,
      temperature: 0.2,
      max_tokens: 800,
      messages: [
        { role: "system", content: EXPLAIN_SYSTEM },
        {
          role: "user",
          content: JSON.stringify({
            caso: redact(text).slice(0, 1500),
            advogados: items.map((item) => ({
              id: item.lawyer.id,
              nome: item.lawyer.name,
              areasQueCoincidem: item.matchedAreas,
              areasDoPerfil: item.lawyer.areas,
              localizacoes: item.lawyer.locations,
              localizacaoCoincide: Boolean(item.matchedLocation),
            })),
          }),
        },
      ],
    });
    const parsed = extractJson(content);
    const received = parsed?.explanations;
    if (!received || typeof received !== "object") return explanations;
    for (const item of items) {
      const accepted = acceptExplanation(received[item.lawyer.id], item.lawyer, taxonomyAreas);
      if (accepted) explanations.set(item.lawyer.id, { text: accepted, source: "modelo" });
    }
  } catch {
    return explanations;
  }
  return explanations;
}
