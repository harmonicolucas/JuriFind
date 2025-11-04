import { fold, hasPhrase, listPt } from "./text.js";

const OVERCLAIM = /\b(garantid\w*|vai ganhar|certamente ganha|resultado assegurado|ganho garantido)\b/i;

export function templateExplanation(lawyer, match) {
  const areas = listPt(match.matchedAreas);
  const intro = match.matchedAreas.length > 1
    ? `A correspondência incide nas áreas ${areas}, publicadas no perfil de ${lawyer.name}.`
    : `A correspondência incide na área ${areas}, publicada no perfil de ${lawyer.name}.`;
  const location = match.matchedLocation
    ? ` A localização ${match.matchedLocation} coincide com o local indicado.`
    : lawyer.locations.length
      ? ` O directório indica exercício em ${listPt(lawyer.locations)}.`
      : "";
  const language = match.matchedLanguages?.length
    ? ` O perfil inclui ${listPt(match.matchedLanguages)}, língua referida no caso.`
    : "";
  return `${intro}${location}${language}`.replace(/\s+/g, " ").trim();
}

export function explanationCitesMissingArea(text, lawyer, taxonomyAreas) {
  const allowed = new Set(lawyer.areas.map((area) => fold(area)));
  return (taxonomyAreas || lawyer.areas).some((area) => {
    if (allowed.has(fold(area))) return false;
    if (fold(area).length < 5) return false;
    return hasPhrase(text, area);
  });
}

export function acceptExplanation(text, lawyer, taxonomyAreas) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length < 40 || clean.length > 500) return null;
  if (OVERCLAIM.test(clean)) return null;
  if (explanationCitesMissingArea(clean, lawyer, taxonomyAreas)) return null;
  if (!lawyer.areas.some((area) => hasPhrase(clean, area)) && !matchName(clean, lawyer.name)) return null;
  return clean;
}

function matchName(text, name) {
  const parts = fold(name).split(" ").filter((part) => part.length > 3);
  return parts.some((part) => hasPhrase(text, part));
}
