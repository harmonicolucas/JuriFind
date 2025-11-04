import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isSourceProfile } from "./contacts.js";
import { plainText, unique } from "./text.js";

const USER_AGENT = "JuriFind/1.0 (le o indice publico; liga ao perfil original)";
const SOURCE_PAGE = "https://encontreadvogados.co.mz/advogado/";

const TERMS = {
  areas: "categoria_areas_pratica_advogado",
  locations: "categoria-localizacao-advogado",
  languages: "categoria-linguas-advogado",
};

function header(response, name) {
  return response.headers?.get?.(name) || response.headers?.get?.(name.toLowerCase()) || "";
}

async function fetchWithTimeout(fetchImpl, url, options, ms = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAll(fetchImpl, baseUrl, restBase) {
  const items = [];
  for (let page = 1; page <= 50; page += 1) {
    const url = new URL(`${baseUrl.replace(/\/$/, "")}/${restBase}`);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    const response = await fetchWithTimeout(fetchImpl, url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    });
    if (response.status === 400) break;
    if (!response.ok) throw new Error(`O directório respondeu ${response.status} em ${restBase}.`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) break;
    items.push(...data);
    const pages = Number(header(response, "x-wp-totalpages") || 1);
    if (page >= pages) break;
  }
  return items;
}

function publicTerms(list) {
  return list
    .map((item) => ({
      id: item.id,
      name: plainText(item.name),
      slug: String(item.slug || "").toLowerCase(),
    }))
    .filter((item) => item.name)
    .map((item) => ({ ...item, slug: /^[a-z0-9-]+$/.test(item.slug) ? item.slug : "" }));
}

function namesFor(ids, terms) {
  const byId = new Map(terms.map((item) => [item.id, item.name]));
  return unique((ids || []).map((id) => byId.get(id)).filter(Boolean));
}

export function slugFromUrl(url) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts.at(-1) || "";
  } catch {
    return "";
  }
}

export function buildIndex({ lawyers, areas, locations, languages, retrievedAt = new Date().toISOString() }) {
  const areaTerms = publicTerms(areas);
  const locationTerms = publicTerms(locations);
  const languageTerms = publicTerms(languages);
  const clean = [];

  for (const raw of lawyers) {
    const profileUrl = typeof raw.link === "string" ? raw.link : "";
    if (!isSourceProfile(profileUrl)) continue;
    const name = plainText(raw.title?.rendered || "");
    if (!name) continue;
    clean.push({
      id: slugFromUrl(profileUrl),
      name,
      profileUrl,
      areas: namesFor(raw.categoria_areas_pratica_advogado, areaTerms),
      locations: namesFor(raw["categoria-localizacao-advogado"], locationTerms),
      languages: namesFor(raw["categoria-linguas-advogado"], languageTerms),
      hasPhoto: Number(raw.featured_media) > 0,
    });
  }

  const publish = (terms) => terms
    .map(({ name, slug }) => ({ name, slug }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt"));

  return {
    version: 1,
    retrievedAt,
    source: SOURCE_PAGE,
    areas: publish(areaTerms),
    locations: publish(locationTerms),
    languages: publish(languageTerms),
    lawyers: clean.sort((a, b) => a.name.localeCompare(b.name, "pt")),
  };
}

export async function fetchDirectory(fetchImpl, baseUrl) {
  const [areas, locations, languages, lawyers] = await Promise.all([
    fetchAll(fetchImpl, baseUrl, TERMS.areas),
    fetchAll(fetchImpl, baseUrl, TERMS.locations),
    fetchAll(fetchImpl, baseUrl, TERMS.languages),
    fetchAll(fetchImpl, baseUrl, "advogados"),
  ]);
  return buildIndex({ areas, locations, languages, lawyers });
}

function cacheIsValid(data) {
  return Boolean(data && data.version === 1 && Array.isArray(data.lawyers) && Array.isArray(data.areas));
}

export async function loadIndex({
  fetchImpl = fetch,
  baseUrl,
  cacheFile,
  ttlMs,
  excludeSlugs = [],
  now = Date.now(),
}) {
  let cached = null;
  try {
    cached = JSON.parse(await readFile(cacheFile, "utf8"));
    if (!cacheIsValid(cached)) cached = null;
  } catch {
    cached = null;
  }

  if (cached && now - Date.parse(cached.retrievedAt) < ttlMs) {
    return applyExclusions(cached, excludeSlugs);
  }

  let fresh;
  try {
    fresh = applyExclusions(await fetchDirectory(fetchImpl, baseUrl), excludeSlugs);
  } catch (error) {
    if (cached) return applyExclusions(cached, excludeSlugs);
    throw error;
  }
  try {
    await mkdir(path.dirname(cacheFile), { recursive: true });
    await writeFile(cacheFile, JSON.stringify(fresh));
  } catch {
    // A cache em disco é opcional; o índice em memória continua válido.
  }
  return fresh;
}

function applyExclusions(index, excludeSlugs) {
  const excluded = new Set(excludeSlugs.map((item) => item.toLowerCase()));
  if (!excluded.size) return index;
  return { ...index, lawyers: index.lawyers.filter((lawyer) => !excluded.has(lawyer.id.toLowerCase())) };
}

export function taxonomyOf(index) {
  return {
    areas: index.areas.map((item) => item.name),
    locations: index.locations.map((item) => item.name),
    languages: index.languages.map((item) => item.name),
  };
}

export function directoryUrlFor(index, areaName) {
  const area = index.areas.find((item) => item.name === areaName);
  if (!area?.slug) return index.source;
  return `https://encontreadvogados.co.mz/categoria_areas_pratica_advogado/${area.slug}/`;
}
