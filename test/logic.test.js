import assert from "node:assert/strict";
import test from "node:test";
import { classifyCase, mergeAnalysis, sanitizeModelInterpretation } from "../src/classify.js";
import { extractPublishedPhone, formatMozPhone, isSourceProfile } from "../src/contacts.js";
import { acceptExplanation, explanationCitesMissingArea, templateExplanation } from "../src/explain.js";
import { safeWebPath } from "../src/paths.js";
import { createRateLimiter } from "../src/rateLimit.js";
import { rankLawyers } from "../src/recommend.js";
import { redact } from "../src/redact.js";
import { buildIndex } from "../src/source.js";
import { fold } from "../src/text.js";
import { validateRecommendInput } from "../src/validate.js";
import path from "node:path";

const taxonomy = {
  areas: [
    "Laboral",
    "Contencioso Laboral",
    "Contratos",
    "Energia e recursos naturais",
    "Direito regulatório",
    "Família e Menores",
    "Pensão de Alimentos",
    "Penal",
    "Civil",
    "Arbitragem",
    "Administrativo",
    "Uso e Aproveitamento da Terra",
    "Imobiliário",
  ],
  locations: ["Beira", "Maputo", "Matola", "Nacala", "Nacala-Porto", "Tete"],
  languages: ["Inglês", "Changana"],
};

const ilda = {
  id: "ilda-tembe",
  name: "Ilda Tembe",
  profileUrl: "https://encontreadvogados.co.mz/advogados/ilda-tembe/",
  areas: ["Contratos", "Laboral"],
  locations: ["Nacala-Porto"],
  languages: [],
  hasPhoto: true,
};
const tomas = {
  id: "tomas-timbane",
  name: "Tomás Timbane",
  profileUrl: "https://encontreadvogados.co.mz/advogados/tomas-timbane/",
  areas: ["Direito regulatório", "Energia e recursos naturais"],
  locations: ["Maputo"],
  languages: ["Inglês"],
  hasPhoto: true,
};
const helder = {
  id: "helder-chapamba",
  name: "Hélder Chapamba",
  profileUrl: "https://encontreadvogados.co.mz/advogados/helder-chapamba/",
  areas: ["Administrativo", "Arbitragem"],
  locations: ["Tete"],
  languages: [],
  hasPhoto: false,
};
const familia = {
  id: "perfil-familia-teste",
  name: "Perfil Família Teste",
  profileUrl: "https://encontreadvogados.co.mz/advogados/perfil-familia-teste/",
  areas: ["Família e Menores", "Pensão de Alimentos"],
  locations: ["Beira"],
  languages: [],
  hasPhoto: false,
};
const lawyers = [ilda, tomas, helder, familia];

test("identifica despedimento em Nacala-Porto sem trocar a cidade nem a área", () => {
  const analysis = classifyCase(
    "Fui despedido sem justa causa em Nacala-Porto e não recebi os salários dos últimos três meses.",
    taxonomy,
  );
  assert.ok(analysis.areas.includes("Laboral"));
  assert.equal(analysis.areas.includes("Energia e recursos naturais"), false);
  assert.deepEqual(analysis.locations, ["Nacala-Porto"]);
});

test("não confunde a expressão à beira com a cidade da Beira", () => {
  const analysis = classifyCase(
    "O muro ficou à beira da estrada e fui despedido sem justa causa.",
    taxonomy,
  );
  assert.deepEqual(analysis.locations, []);
  assert.ok(analysis.areas.includes("Laboral"));
});

test("reconhece divórcio na Beira e não transforma estado civil em direito civil", () => {
  const divorce = classifyCase("Vivo na Beira e quero o divórcio e a pensão de alimentos.", taxonomy);
  assert.ok(divorce.areas.includes("Família e Menores"));
  assert.ok(divorce.areas.includes("Pensão de Alimentos"));
  assert.deepEqual(divorce.locations, ["Beira"]);

  const status = classifyCase("Preciso de alterar o meu estado civil depois do casamento.", taxonomy);
  assert.ok(status.areas.includes("Família e Menores"));
  assert.equal(status.areas.includes("Civil"), false);
});

test("reconhece concessão petrolífera e recusa um pedido vago", () => {
  const energy = classifyCase("A empresa pretende uma concessão petrolífera em Maputo.", taxonomy);
  assert.ok(energy.areas.includes("Energia e recursos naturais"));
  const vague = classifyCase("Olá, preciso de ajuda com um assunto importante.", taxonomy);
  assert.deepEqual(vague.areas, []);
});

test("o modelo só pode escolher áreas que existem no directório", () => {
  const clean = sanitizeModelInterpretation({
    areas: ["Laboral", "Direito Espacial"],
    locations: ["Maputo", "Marte"],
    keywords: ["despedimento", "123456789", "ab"],
  }, taxonomy);
  assert.deepEqual(clean.areas, ["Laboral"]);
  assert.deepEqual(clean.locations, ["Maputo"]);
  assert.deepEqual(clean.keywords, ["despedimento"]);
  const merged = mergeAnalysis(classifyCase("Texto sem tema jurídico claro aqui.", taxonomy), clean);
  assert.ok(merged.areas.includes("Laboral"));
  assert.equal(merged.method, "regras+modelo");
});

test("ordena o advogado da área e da cidade antes dos restantes", () => {
  const dismissal = classifyCase(
    "Fui despedido sem justa causa em Nacala-Porto e não recebi os salários dos últimos três meses.",
    taxonomy,
  );
  const labor = rankLawyers({ lawyers, analysis: dismissal });
  assert.equal(labor.results[0].lawyer.name, "Ilda Tembe");
  assert.equal(labor.results.some((item) => item.lawyer.name === "Tomás Timbane"), false);

  const energy = classifyCase("A empresa pretende uma concessão petrolífera em Maputo.", taxonomy);
  const oil = rankLawyers({ lawyers, analysis: energy });
  assert.equal(oil.results[0].lawyer.name, "Tomás Timbane");

  const arbitration = classifyCase("Preciso de constituir um tribunal arbitral em Tete.", taxonomy);
  const local = rankLawyers({ lawyers, analysis: arbitration, location: "Tete", strictLocation: true });
  assert.equal(local.results[0].lawyer.name, "Hélder Chapamba");
  assert.equal(local.relaxedLocation, false);
});

test("a explicação não atribui uma área que o perfil não publica", () => {
  const match = { matchedAreas: ["Laboral"], matchedLocation: "Nacala-Porto", matchedLanguages: [] };
  const text = templateExplanation(ilda, match);
  assert.match(text, /Laboral/);
  assert.equal(text.includes("Energia"), false);
  assert.equal(explanationCitesMissingArea(
    "Também actua em Energia e recursos naturais e o resultado está garantido.",
    ilda,
    taxonomy.areas,
  ), true);
  assert.equal(acceptExplanation(
    "A correspondência de Ilda Tembe está na área Laboral, publicada no directório, sem prometer resultado.",
    ilda,
    taxonomy.areas,
  )?.includes("Laboral"), true);
  assert.equal(acceptExplanation(
    "Ilda Tembe resolve casos de Energia e recursos naturais com resultado garantido para o cliente.",
    ilda,
    taxonomy.areas,
  ), null);
});

test("lê apenas um telefone publicado e rejeita ligações fora do directório", () => {
  const html = "<h2>Carteira profissional nº 229</h2><h2>(+258) 843 014 479</h2>";
  assert.equal(extractPublishedPhone(html), "+258 843 014 479");
  assert.equal(formatMozPhone("229"), null);
  assert.equal(isSourceProfile("https://encontreadvogados.co.mz/advogados/tomas-timbane/"), true);
  assert.equal(isSourceProfile("https://evil.example/advogados/tomas-timbane/"), false);
});

test("oculta contactos e números longos antes de qualquer modelo", () => {
  const clean = redact("Escreva para ana@example.com ou 123456789012. Telefone +258 84 301 4479.");
  assert.equal(clean.includes("ana@example.com"), false);
  assert.equal(clean.includes("123456789012"), false);
  assert.match(clean, /\[email\]/);
  assert.match(clean, /\[número\]|\[telefone\]/);
});

test("valida o tamanho do caso", () => {
  assert.equal(validateRecommendInput({ text: "curto" }).ok, false);
  assert.equal(validateRecommendInput({ text: "Fui despedido sem justa causa na Matola ontem." }).ok, true);
});

test("o índice factual não guarda biografia nem perfis de outro sítio", () => {
  const index = buildIndex({
    areas: [{ id: 1, name: "Energia, Oil&amp;Gas e Minas", slug: "energia-oil-gas" }, { id: 2, name: "Laboral", slug: "laboral" }],
    locations: [{ id: 3, name: "Maputo", slug: "maputo" }],
    languages: [{ id: 4, name: "Inglês", slug: "ingles" }],
    lawyers: [
      {
        link: "https://encontreadvogados.co.mz/advogados/tomas-timbane/",
        title: { rendered: "Tomás Timbane" },
        categoria_areas_pratica_advogado: [1],
        "categoria-localizacao-advogado": [3],
        "categoria-linguas-advogado": [4],
        featured_media: 12,
        content: { rendered: "<p>biografia longa que nao deve ser guardada</p>" },
      },
      {
        link: "http://evil.example/advogados/falso/",
        title: { rendered: "Perfil falso" },
        categoria_areas_pratica_advogado: [2],
      },
    ],
  });
  assert.equal(index.lawyers.length, 1);
  assert.equal(index.lawyers[0].areas[0], "Energia, Oil&Gas e Minas");
  assert.equal(index.lawyers[0].hasPhoto, true);
  assert.equal(JSON.stringify(index).includes("biografia"), false);
  assert.equal(fold("Chókwè"), "chokwe");
});

test("impede caminhos fora da pasta do site e limita pedidos", () => {
  const root = path.resolve("/jurifind-web");
  assert.equal(safeWebPath(root, "/index.html"), path.join(root, "index.html"));
  assert.equal(safeWebPath(root, "/../package.json"), null);
  assert.equal(safeWebPath(root, "/%2e%2e/package.json"), null);
  const allow = createRateLimiter({ limit: 2, windowMs: 1000, now: () => 1000 });
  assert.equal(allow("a"), true);
  assert.equal(allow("a"), true);
  assert.equal(allow("a"), false);
  assert.equal(allow("b"), true);
});
