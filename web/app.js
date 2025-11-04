const config = window.JURIFIND_CONFIG || {};
const apiBase = String(config.apiBase || "").replace(/\/$/, "");
const form = document.querySelector("#caso");
const description = document.querySelector("#descricao");
const areaSelect = document.querySelector("#area");
const locationSelect = document.querySelector("#localizacao");
const strictLocation = document.querySelector("#apenas-local");
const submitButton = document.querySelector("#submeter");
const formError = document.querySelector("#form-error");
const results = document.querySelector("#resultados");
const summary = document.querySelector("#resumo");
const notice = document.querySelector("#aviso-resultado");
const list = document.querySelector("#lista");
const sourceLine = document.querySelector("#fonte");

function api(path) {
  return `${apiBase}${path}`;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function initials(name) {
  const parts = String(name).split(/\s+/).filter((part) => part.length > 2 && !/^(de|da|do|dos|das|e)$/i.test(part));
  const chosen = (parts.length ? parts : String(name).split(/\s+/)).slice(0, 2);
  return chosen.map((part) => part[0] || "").join("").toUpperCase() || "•";
}

function safeProfileUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "encontreadvogados.co.mz") return "";
    if (!parsed.pathname.includes("/advogados/")) return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function safeDirectoryUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "encontreadvogados.co.mz") return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function fillSelect(select, values, placeholder) {
  const current = select.value;
  select.replaceChildren();
  select.append(new Option(placeholder, ""));
  for (const value of values || []) {
    select.append(new Option(value, value));
  }
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function externalLink(href, label, className) {
  const link = el("a", className, label);
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.append(el("span", "sr", " (abre noutro separador)"));
  return link;
}

function renderResults(data) {
  results.hidden = false;
  list.replaceChildren();
  const areas = data.analysis?.areas?.length ? data.analysis.areas.join(", ") : "nenhuma área do directório";
  const topics = data.analysis?.keywords?.length ? ` Temas: ${data.analysis.keywords.join(", ")}.` : "";
  const method = data.analysis?.method === "regras+modelo"
    ? " A leitura usou regras locais e um modelo limitado às áreas do directório."
    : " A leitura usou regras do contexto jurídico moçambicano, sem modelo externo.";
  summary.textContent = `Áreas identificadas: ${areas}.${topics}${method}`;

  let lead = "";
  if (data.reason === "need_detail") {
    lead = "O texto ainda não aponta para uma área publicada no directório. Acrescente o que aconteceu, em que cidade e o que pretende.";
  } else if (data.reason === "no_lawyer_for_area") {
    lead = "A área foi identificada, mas nenhum advogado deste índice a publica neste momento.";
  } else if (data.relaxedLocation) {
    lead = "Não há correspondência só na localização pedida. A lista inclui advogados de outras cidades, ordenados pelas áreas que coincidem.";
  } else {
    lead = `${data.results.length} ${data.results.length === 1 ? "advogado ordenado" : "advogados ordenados"} pela correspondência com as áreas publicadas. Esta ordem não avalia a qualidade profissional.`;
  }
  notice.replaceChildren();
  notice.append(el("p", null, lead));
  notice.append(el("p", null, data.disclaimer || ""));

  for (const lawyer of data.results || []) {
    const card = el("article", "lawyer");
    const top = el("div", "lawyer-top");
    const who = el("div", "who");
    who.append(el("div", "avatar", initials(lawyer.name)));
    const heading = el("div");
    heading.append(el("h3", null, lawyer.name));
    const bandClass = lawyer.band === "Correspondência forte" ? "band" : lawyer.band === "Correspondência moderada" ? "band mid" : "band soft";
    heading.append(el("p", bandClass, lawyer.band || "Correspondência"));
    who.append(heading);
    top.append(who);
    card.append(top);

    const places = (lawyer.locations || []).join(", ") || "Localização não indicada";
    const languages = lawyer.languages?.length ? ` · Línguas: ${lawyer.languages.join(", ")}` : "";
    card.append(el("p", "meta", `${places}${languages}`));
    card.append(el("p", "areas", `Coincide: ${(lawyer.matchedAreas || []).join(", ")}`));
    if (lawyer.areas?.length) card.append(el("p", "meta", `Áreas no directório: ${lawyer.areas.join(", ")}`));
    card.append(el("p", "explanation", lawyer.explanation || ""));
    card.append(el("p", "method-note", lawyer.explanationSource === "modelo"
      ? "Explicação do modelo, limitada aos dados recebidos do perfil."
      : "Explicação automática a partir das áreas listadas."));
    if (lawyer.hasPhoto) {
      card.append(el("p", "photo-note", "Há fotografia no perfil original. O JuriFind não a copia."));
    }

    const actions = el("div", "actions");
    const profile = safeProfileUrl(lawyer.profileUrl);
    const phone = typeof lawyer.phone === "string" && /^\+258 \d{3} \d{3} \d{3}$/.test(lawyer.phone) ? lawyer.phone : "";
    if (phone) {
      const call = el("a", "button", `Ligar ${phone}`);
      call.href = `tel:${phone.replace(/\s/g, "")}`;
      actions.append(call);
    }
    if (profile) {
      actions.append(externalLink(profile, phone ? "Perfil original" : "Contacto no perfil", phone ? "button secondary" : "button"));
      if (!phone) actions.append(externalLink(profile, "Ver perfil", "button secondary"));
    }
    card.append(actions);
    list.append(card);
  }

  sourceLine.replaceChildren();
  const source = data.source || {};
  const when = source.retrievedAt ? new Date(source.retrievedAt).toLocaleString("pt-PT") : "";
  sourceLine.append(el("span", null, `${source.note || ""} Índice de ${source.name || "origem"}${when ? `, lido em ${when}` : ""}. `));
  const directory = safeDirectoryUrl(data.directoryUrl || source.url);
  if (directory) sourceLine.append(externalLink(directory, "Abrir no directório de origem", null));
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadMeta() {
  try {
    const response = await fetch(api("/api/meta"));
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível ler o directório.");
    fillSelect(areaSelect, data.areas, "Identificar a partir do texto");
    fillSelect(locationSelect, data.locations, "Sem preferência");
    if (data.disclaimer) document.querySelector("#aviso-fixo").textContent = data.disclaimer;
  } catch (error) {
    formError.textContent = `${error.message} Pode consultar o directório em encontreadvogados.co.mz.`;
  }
}

locationSelect.addEventListener("change", () => {
  strictLocation.disabled = locationSelect.value === "";
  if (!locationSelect.value) strictLocation.checked = false;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.textContent = "";
  const text = description.value.trim();
  if (text.length < 20) {
    formError.textContent = "Descreva o caso com pelo menos 20 caracteres, sem dados sensíveis desnecessários.";
    description.focus();
    return;
  }
  submitButton.disabled = true;
  submitButton.textContent = "A analisar o caso…";
  try {
    const response = await fetch(api("/api/recommend"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        location: locationSelect.value,
        area: areaSelect.value,
        strictLocation: strictLocation.checked,
      }),
    });
    let data = {};
    try {
      data = await response.json();
    } catch {
      throw new Error("O serviço devolveu uma resposta inválida.");
    }
    if (!response.ok) throw new Error(data.error || "Não foi possível obter recomendações.");
    renderResults(data);
  } catch (error) {
    formError.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Ver advogados adequados";
  }
});

loadMeta();
