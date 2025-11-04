import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createHandler } from "../src/http.js";
import { explainMatches } from "../src/llm.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const index = {
  version: 1,
  retrievedAt: "2026-10-27T12:00:00.000Z",
  source: "https://encontreadvogados.co.mz/advogado/",
  areas: [
    { name: "Laboral", slug: "laboral" },
    { name: "Contencioso Laboral", slug: "contencioso-laboral" },
    { name: "Energia e recursos naturais", slug: "energia-e-recursos-naturais" },
    { name: "Direito regulatório", slug: "direito-regulatorio" },
    { name: "Arbitragem", slug: "arbitragem" },
    { name: "Administrativo", slug: "administrativo" },
  ],
  locations: [
    { name: "Maputo", slug: "maputo" },
    { name: "Nacala-Porto", slug: "nacala-porto" },
    { name: "Tete", slug: "tete" },
  ],
  languages: [{ name: "Inglês", slug: "ingles" }],
  lawyers: [
    {
      id: "ilda-tembe",
      name: "Ilda Tembe",
      profileUrl: "https://encontreadvogados.co.mz/advogados/ilda-tembe/",
      areas: ["Laboral"],
      locations: ["Nacala-Porto"],
      languages: [],
      hasPhoto: true,
    },
    {
      id: "tomas-timbane",
      name: "Tomás Timbane",
      profileUrl: "https://encontreadvogados.co.mz/advogados/tomas-timbane/",
      areas: ["Direito regulatório", "Energia e recursos naturais"],
      locations: ["Maputo"],
      languages: ["Inglês"],
      hasPhoto: true,
    },
  ],
};

function handler(allow = () => true) {
  return createHandler({
    webRoot: path.join(root, "web"),
    getIndex: async () => index,
    config: { llmApiKey: "", enrichContacts: false, trustProxy: false, allowedOrigin: "" },
    lookupContact: async () => null,
    interpretCase: async () => null,
    explainMatches,
    allow,
  });
}

async function listen(app) {
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("a página e a recomendação usam o perfil original", async (t) => {
  const ctx = await listen(handler());
  t.after(() => ctx.close());
  const page = await fetch(`${ctx.base}/`);
  const html = await page.text();
  assert.equal(page.status, 200);
  assert.match(html, /JuriFind/);
  assert.match(html, /não substituem/i);

  const response = await fetch(`${ctx.base}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "Fui despedido sem justa causa em Nacala-Porto e não recebi os salários dos últimos três meses.",
    }),
  });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.results[0].name, "Ilda Tembe");
  assert.equal(data.results[0].profileUrl, "https://encontreadvogados.co.mz/advogados/ilda-tembe/");
  assert.match(data.results[0].explanation, /Laboral/);
  assert.equal(data.results[0].explanation.includes("Energia"), false);
  assert.match(data.disclaimer, /não substituem/i);
  assert.match(data.directoryUrl, /categoria_areas_pratica_advogado\/laboral|contencioso-laboral/);
});

test("recusa descrição curta, excesso de pedidos e caminhos fora do site", async (t) => {
  let calls = 0;
  const ctx = await listen(handler(() => {
    calls += 1;
    return calls < 2;
  }));
  t.after(() => ctx.close());

  const missing = await fetch(`${ctx.base}/%2e%2e/%2e%2e/package.json`);
  assert.equal(missing.status, 404);

  const short = await fetch(`${ctx.base}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "texto curto" }),
  });
  assert.equal(short.status, 400);

  const blocked = await fetch(`${ctx.base}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Fui despedido sem justa causa em Nacala-Porto ontem de manhã." }),
  });
  assert.equal(blocked.status, 429);
});
