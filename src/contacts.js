const SOURCE_HOST = "encontreadvogados.co.mz";

export function formatMozPhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("00258")) local = local.slice(5);
  else if (local.startsWith("258") && local.length > 9) local = local.slice(3);
  if (local.length !== 9) return null;
  const mobile = /^8[2-7]/.test(local);
  const geographic = /^2\d/.test(local);
  if (!mobile && !geographic) return null;
  return `+258 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

export function extractPublishedPhone(html) {
  const pattern = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;
  let match;
  while ((match = pattern.exec(String(html ?? "")))) {
    const text = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!text || text.length > 40) continue;
    const phone = formatMozPhone(text);
    if (phone) return phone;
  }
  return null;
}

export function telephoneHref(phone) {
  const formatted = formatMozPhone(phone);
  if (!formatted) return null;
  return `tel:${formatted.replace(/\s/g, "")}`;
}

export function isSourceProfile(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === SOURCE_HOST && parsed.pathname.includes("/advogados/");
  } catch {
    return false;
  }
}

export function createContactLookup({ fetchImpl = fetch, cache = new Map(), ttlMs = 24 * 60 * 60 * 1000, now = () => Date.now() } = {}) {
  return async function lookupContact(profileUrl) {
    if (!isSourceProfile(profileUrl)) return null;
    const hit = cache.get(profileUrl);
    if (hit && now() - hit.at < ttlMs) return hit.phone;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetchImpl(profileUrl, {
        headers: {
          Accept: "text/html",
          "User-Agent": "JuriFind/1.0 (referencia o perfil original; nao republica biografias)",
        },
        signal: controller.signal,
        redirect: "follow",
      });
      if (!response.ok) return null;
      if (response.url && !isSourceProfile(response.url)) return null;
      const html = await response.text();
      if (html.length > 1_500_000) return null;
      const phone = extractPublishedPhone(html);
      cache.set(profileUrl, { phone, at: now() });
      return phone;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
}
