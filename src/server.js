import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile, readConfig } from "./config.js";
import { createContactLookup } from "./contacts.js";
import { createHandler } from "./http.js";
import { explainMatches, interpretCase } from "./llm.js";
import { createRateLimiter } from "./rateLimit.js";
import { loadIndex } from "./source.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFile(path.join(root, ".env"));
const config = readConfig();
const webRoot = path.join(root, "web");

let index = null;
let loading = null;

function refreshIndex() {
  loading = loadIndex({
    baseUrl: config.sourceBase,
    cacheFile: path.resolve(root, config.cacheFile),
    ttlMs: config.cacheTtlMs,
    excludeSlugs: config.excludeSlugs,
  }).then((value) => {
    index = value;
    console.log(`Índice pronto: ${value.lawyers.length} advogados, obtido em ${value.retrievedAt}.`);
    return value;
  }).catch((error) => {
    console.error(error.message || "Falha ao ler o directório.");
    if (index) return index;
    throw error;
  }).finally(() => {
    loading = null;
  });
  return loading;
}

async function getIndex() {
  if (index && Date.now() - Date.parse(index.retrievedAt) < config.cacheTtlMs) return index;
  if (!loading) refreshIndex();
  if (!index) return loading;
  return index;
}

const handler = createHandler({
  webRoot,
  getIndex,
  config,
  lookupContact: config.enrichContacts ? createContactLookup() : async () => null,
  interpretCase,
  explainMatches,
  allow: createRateLimiter({ limit: config.rateLimit, windowMs: config.rateWindowMs }),
});

const server = createServer((req, res) => {
  handler(req, res).catch(() => {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Erro interno." }));
    }
  });
});

server.listen(config.port, "0.0.0.0", () => {
  console.log(`JuriFind em http://127.0.0.1:${config.port}`);
  refreshIndex().catch(() => {});
});
