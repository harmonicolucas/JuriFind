import { fold } from "./text.js";

function same(left, right) {
  return fold(left) === fold(right);
}

function scoreList(lawyers, analysis, preferred) {
  const ranked = [];
  for (const lawyer of lawyers) {
    const matchedAreas = analysis.areas.filter((area) => lawyer.areas.some((item) => same(item, area)));
    if (!matchedAreas.length) continue;
    const matchedLocation = preferred && lawyer.locations.some((item) => same(item, preferred)) ? preferred : "";
    const matchedLanguages = (analysis.languages || []).filter((language) =>
      lawyer.languages.some((item) => same(item, language)),
    );
    let score = matchedAreas.reduce((sum, area) => sum + (analysis.areaWeights?.[area] || 3), 0);
    if (matchedLocation) score += 4;
    if (matchedLanguages.length) score += 2;
    ranked.push({ lawyer, score, matchedAreas, matchedLocation, matchedLanguages });
  }
  ranked.sort((a, b) => b.score - a.score || a.lawyer.name.localeCompare(b.lawyer.name, "pt"));
  return ranked;
}

function withBands(ranked, limit) {
  const results = ranked.slice(0, limit);
  const top = results[0]?.score || 1;
  for (const item of results) {
    const ratio = item.score / top;
    item.band = ratio >= 0.85 ? "Correspondência forte" : ratio >= 0.55 ? "Correspondência moderada" : "Correspondência parcial";
  }
  return results;
}

export function rankLawyers({ lawyers, analysis, location = "", strictLocation = false, limit = 8 }) {
  const preferred = location || analysis.locations[0] || "";
  if (!analysis.areas.length) {
    return { results: [], preferredLocation: preferred, relaxedLocation: false, reason: "need_detail" };
  }

  let relaxedLocation = false;
  let ranked = scoreList(lawyers, analysis, preferred);
  if (strictLocation && preferred) {
    const local = lawyers.filter((lawyer) => lawyer.locations.some((item) => same(item, preferred)));
    const localRanked = scoreList(local, analysis, preferred);
    if (localRanked.length) ranked = localRanked;
    else relaxedLocation = true;
  }

  const results = withBands(ranked, limit);
  return {
    results,
    preferredLocation: preferred,
    relaxedLocation,
    reason: results.length ? "ok" : "no_lawyer_for_area",
  };
}
