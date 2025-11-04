import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

export function loadEnvFile(file = path.resolve(".env")) {
  if (!existsSync(file)) return;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function readConfig(env = process.env) {
  return {
    port: Number(env.PORT || 8787),
    sourceBase: env.SOURCE_API_BASE || "https://encontreadvogados.co.mz/wp-json/wp/v2",
    cacheFile: env.CACHE_FILE || path.join("data", "cache", "index.json"),
    cacheTtlMs: Number(env.CACHE_TTL_HOURS || 6) * 60 * 60 * 1000,
    llmApiKey: env.LLM_API_KEY || "",
    llmBaseUrl: (env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    llmModel: env.LLM_MODEL || "gpt-4o-mini",
    allowedOrigin: env.ALLOWED_ORIGIN || "",
    enrichContacts: env.ENRICH_CONTACTS !== "false",
    trustProxy: env.TRUST_PROXY === "true",
    rateLimit: Number(env.RATE_LIMIT || 20),
    rateWindowMs: Number(env.RATE_WINDOW_MS || 600000),
    excludeSlugs: (env.EXCLUDE_SLUGS || "").split(",").map((item) => item.trim()).filter(Boolean),
  };
}
