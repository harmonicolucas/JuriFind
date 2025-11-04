import { readFile } from "node:fs/promises";
import path from "node:path";
import { classifyCase, mergeAnalysis } from "./classify.js";
import { telephoneHref } from "./contacts.js";
import { createPhotoCache, fetchPhoto } from "./photos.js";
import { rankLawyers } from "./recommend.js";
import { taxonomyOf } from "./source.js";
import { fold } from "./text.js";
import { validateRecommendInput } from "./validate.js";
import { safeWebPath } from "./paths.js";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
  });
  res.end(body);
}

function clientKey(req, trustProxy) {
  if (trustProxy) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "local";
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 20_000) {
      const error = new Error("payload");
      error.status = 413;
      error.publicMessage = "A descrição é demasiado grande.";
      throw error;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("json");
    error.status = 400;
    error.publicMessage = "O pedido não é JSON válido.";
    throw error;
  }
}

function known(name, list) {
  const target = fold(name);
  return list.find((item) => fold(item) === target) || "";
}

async function mapPool(items, width, task) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(width, items.length) }, () => worker()));
  return output;
}

export function createHandler({
  webRoot,
  getIndex,
  config,
  lookupContact = async () => null,
  interpretCase,
  explainMatches,
  allow,
  fetchImpl = fetch,
  photoCache = createPhotoCache(),
}) {
  return async function handler(req, res) {
    try {
      const origin = config.allowedOrigin;
      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      }
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || "/", "http://jurifind.local");
      if (url.pathname === "/api/health" && req.method === "GET") {
        const index = await getIndex().catch(() => null);
        sendJson(res, 200, {
          ok: true,
          indexReady: Boolean(index?.lawyers?.length),
          lawyers: index?.lawyers?.length || 0,
          llm: Boolean(config.llmApiKey),
        });
        return;
      }

      if (url.pathname === "/api/meta" && req.method === "GET") {
        const index = await getIndex();
        const usedLocations = new Set(index.lawyers.flatMap((lawyer) => lawyer.locations));
        const usedAreas = new Set(index.lawyers.flatMap((lawyer) => lawyer.areas));
        sendJson(res, 200, {
          llm: Boolean(config.llmApiKey),
          locations: index.locations.map((item) => item.name).filter((name) => usedLocations.has(name)),
          areas: index.areas.map((item) => item.name).filter((name) => usedAreas.has(name)),
        });
        return;
      }

      if (url.pathname === "/api/lawyers" && req.method === "GET") {
        const index = await getIndex();
        const lawyers = index.lawyers
          .map((lawyer) => ({
            id: lawyer.id,
            name: lawyer.name,
            areas: lawyer.areas,
            locations: lawyer.locations,
            languages: lawyer.languages,
            photo: lawyer.photoUrl ? `/api/photos/${lawyer.id}` : null,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "pt"));
        sendJson(res, 200, { lawyers });
        return;
      }

      if (url.pathname === "/api/recommend" && req.method === "POST") {
        if (!allow(clientKey(req, config.trustProxy))) {
          sendJson(res, 429, { error: "Muitos pedidos. Tente novamente dentro de alguns minutos." }, { "Retry-After": "60" });
          return;
        }
        const contentType = req.headers["content-type"] || "";
        if (!contentType.includes("application/json")) {
          sendJson(res, 415, { error: "Envie o pedido como application/json." });
          return;
        }
        const parsed = validateRecommendInput(await readJson(req));
        if (!parsed.ok) {
          sendJson(res, 400, { error: parsed.error });
          return;
        }
        const index = await getIndex();
        const taxonomy = taxonomyOf(index);
        const location = known(parsed.value.location, taxonomy.locations);
        const area = known(parsed.value.area, taxonomy.areas);
        const baseline = classifyCase(parsed.value.text, taxonomy, { area });
        const model = await interpretCase({ text: parsed.value.text, taxonomy, env: config });
        const analysis = mergeAnalysis(baseline, model);
        const ranking = rankLawyers({
          lawyers: index.lawyers,
          analysis,
          location,
          strictLocation: parsed.value.strictLocation,
        });
        const explanations = await explainMatches({
          text: parsed.value.text,
          items: ranking.results,
          taxonomyAreas: taxonomy.areas,
          env: config,
        });
        const phones = config.enrichContacts
          ? await mapPool(ranking.results, 3, (item) => lookupContact(item.lawyer.profileUrl))
          : [];

        sendJson(res, 200, {
          analysis: {
            areas: analysis.areas,
            locations: analysis.locations,
            languages: analysis.languages,
            keywords: analysis.keywords,
            method: analysis.method,
          },
          preferredLocation: ranking.preferredLocation,
          relaxedLocation: ranking.relaxedLocation,
          reason: ranking.reason,
          results: ranking.results.map((item, resultIndex) => {
            const explanation = explanations.get(item.lawyer.id);
            const phone = phones[resultIndex] || null;
            return {
              id: item.lawyer.id,
              name: item.lawyer.name,
              areas: item.lawyer.areas,
              matchedAreas: item.matchedAreas,
              locations: item.lawyer.locations,
              languages: item.lawyer.languages,
              photo: item.lawyer.photoUrl ? `/api/photos/${item.lawyer.id}` : null,
              band: item.band,
              explanation: explanation?.text || "",
              phone: telephoneHref(phone) ? phone : null,
            };
          }),
        });
        return;
      }

      const photoMatch = url.pathname.match(/^\/api\/photos\/([a-z0-9-]+)$/);
      if (photoMatch && (req.method === "GET" || req.method === "HEAD")) {
        const slug = photoMatch[1];
        const index = await getIndex();
        const lawyer = index.lawyers.find((item) => item.id === slug);
        if (!lawyer?.photoUrl) {
          sendJson(res, 404, { error: "Fotografia indisponível." });
          return;
        }
        let image = photoCache.get(slug);
        if (!image) {
          image = await fetchPhoto(lawyer.photoUrl, fetchImpl);
          if (image) photoCache.set(slug, image);
        }
        if (!image) {
          sendJson(res, 404, { error: "Fotografia indisponível." });
          return;
        }
        res.writeHead(200, {
          "Content-Type": image.type,
          "Cache-Control": "public, max-age=86400",
          "X-Content-Type-Options": "nosniff",
        });
        res.end(req.method === "HEAD" ? undefined : image.buffer);
        return;
      }

      if (url.pathname.startsWith("/api/")) {
        sendJson(res, 404, { error: "Recurso não encontrado." });
        return;
      }

      if (req.method !== "GET" && req.method !== "HEAD") {
        sendJson(res, 405, { error: "Método não suportado." });
        return;
      }

      const filePath = safeWebPath(webRoot, url.pathname);
      if (!filePath) {
        sendJson(res, 404, { error: "Página não encontrada." });
        return;
      }
      const body = await readFile(filePath);
      const extension = path.extname(filePath).toLowerCase();
      const headers = {
        "Content-Type": MIME[extension] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Frame-Options": "DENY",
        "Cache-Control": [".html", ".js", ".css"].includes(extension) ? "no-cache" : "public, max-age=86400",
      };
      if (extension === ".html") {
        headers["Content-Security-Policy"] = "default-src 'self'; style-src 'self'; img-src 'self' data:; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'";
      }
      res.writeHead(200, headers);
      res.end(req.method === "HEAD" ? undefined : body);
    } catch (error) {
      const sourceDown = /directório|fetch|aborted|ENOTFOUND|ECONN|getaddrinfo|network/i.test(`${error.name || ""} ${error.message || ""}`);
      const status = error.status || (sourceDown ? 503 : 500);
      if (status >= 500) console.error(status === 503 ? "Lista de advogados indisponível." : "Pedido falhou.");
      const message = status === 503
        ? (error.publicMessage || "A lista de advogados não está acessível neste momento.")
        : error.publicMessage || (status === 500 ? "Erro interno." : "Pedido inválido.");
      if (!res.headersSent) sendJson(res, status, { error: message });
      else res.end();
    }
  };
}
