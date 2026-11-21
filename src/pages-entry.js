import { classifyCase } from "./classify.js";
import { rankLawyers } from "./recommend.js";

function names(list) {
  return (list || []).map((item) => (typeof item === "string" ? item : item?.name)).filter(Boolean);
}

function taxonomyOf(index) {
  return {
    areas: names(index.areas),
    locations: names(index.locations),
    languages: names(index.languages),
  };
}

function known(name, list) {
  const fold = (value) => String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const target = fold(name);
  if (!target) return "";
  return list.find((item) => fold(item) === target) || "";
}

export function recommend(index, input = {}) {
  const taxonomy = taxonomyOf(index);
  const location = known(input.location, taxonomy.locations);
  const area = known(input.area, taxonomy.areas);
  const analysis = classifyCase(String(input.text || ""), taxonomy, { area });
  const ranking = rankLawyers({
    lawyers: index.lawyers || [],
    analysis,
    location,
    strictLocation: Boolean(input.strictLocation),
  });
  return {
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
    results: ranking.results.map((item) => ({
      id: item.lawyer.id,
      name: item.lawyer.name,
      areas: item.lawyer.areas,
      matchedAreas: item.matchedAreas,
      locations: item.lawyer.locations,
      languages: item.lawyer.languages,
      photo: item.lawyer.photo || null,
      profileUrl: item.lawyer.profileUrl || "",
      band: item.band,
      explanation: item.matchedAreas.length ? `Publica ${item.matchedAreas.join(", ")}.` : "",
      phone: null,
    })),
  };
}

export function catalogue(index) {
  const taxonomy = taxonomyOf(index);
  return {
    areas: taxonomy.areas,
    locations: taxonomy.locations,
    lawyers: (index.lawyers || []).map((lawyer) => ({
      id: lawyer.id,
      name: lawyer.name,
      areas: lawyer.areas,
      locations: lawyer.locations,
      languages: lawyer.languages,
      photo: lawyer.photo || null,
      profileUrl: lawyer.profileUrl || "",
    })),
  };
}
