export function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function plainText(value) {
  return decodeEntities(String(value ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export function fold(value) {
  return plainText(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function hasPhrase(text, phrase) {
  const hay = ` ${fold(text)} `;
  const needle = ` ${fold(phrase)} `;
  if (!needle.trim()) return false;
  return hay.includes(needle);
}

export function hasStem(text, stem) {
  const foldedStem = fold(stem);
  if (!foldedStem) return false;
  const source = fold(text);
  const pattern = new RegExp(`(?:^|\\s)${foldedStem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  return pattern.test(source);
}

export function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

export function listPt(items) {
  const values = items.filter(Boolean);
  if (values.length <= 1) return values[0] || "";
  return `${values.slice(0, -1).join(", ")} e ${values.at(-1)}`;
}
