var JuriFindLocal = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/pages-entry.js
  var pages_entry_exports = {};
  __export(pages_entry_exports, {
    catalogue: () => catalogue,
    recommend: () => recommend
  });

  // src/text.js
  function decodeEntities(value) {
    return String(value ?? "").replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))).replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16))).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;|&#039;/g, "'").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  }
  function plainText(value) {
    return decodeEntities(String(value ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  }
  function fold(value) {
    return plainText(value).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }
  function hasPhrase(text, phrase) {
    const hay = ` ${fold(text)} `;
    const needle = ` ${fold(phrase)} `;
    if (!needle.trim()) return false;
    return hay.includes(needle);
  }
  function hasStem(text, stem) {
    const foldedStem = fold(stem);
    if (!foldedStem) return false;
    const source = fold(text);
    const pattern = new RegExp(`(?:^|\\s)${foldedStem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    return pattern.test(source);
  }
  function unique(items) {
    return [...new Set(items.filter(Boolean))];
  }

  // src/classify.js
  var RULES = [
    {
      id: "violencia-domestica",
      label: "viol\xEAncia dom\xE9stica",
      weight: 6,
      phrases: ["violencia domestica", "violencia conjugal", "agressao domestica"],
      stems: [],
      areas: ["Viol\xEAncia Dom\xE9stica", "Fam\xEDlia e Menores", "Penal"]
    },
    {
      id: "poder-paternal",
      label: "poder paternal",
      weight: 6,
      phrases: ["poder paternal", "regulacao do poder paternal"],
      stems: [],
      areas: ["Regula\xE7\xE3o do Poder Paternal", "Fam\xEDlia e Menores"]
    },
    {
      id: "alimentos",
      label: "pens\xE3o de alimentos",
      weight: 6,
      phrases: ["pensao de alimentos", "alimentos devidos"],
      stems: [],
      areas: ["Pens\xE3o de Alimentos", "Fam\xEDlia e Menores"]
    },
    {
      id: "familia",
      label: "fam\xEDlia",
      weight: 5,
      phrases: ["uniao de facto", "guarda dos filhos", "guarda do menor", "poder paternal", "estado civil", "regime de bens"],
      stems: ["divorci", "casament", "adop"],
      areas: ["Fam\xEDlia e Menores", "Fam\xEDlia e sucess\xF5es"]
    },
    {
      id: "sucessoes",
      label: "sucess\xF5es",
      weight: 5,
      phrases: ["habilitacao de herdeiros", "partilha da heranca"],
      stems: ["heranc", "testament", "inventari", "sucessa", "herdeir"],
      areas: ["Fam\xEDlia e sucess\xF5es"]
    },
    {
      id: "terra",
      label: "terra e DUAT",
      weight: 6,
      phrases: ["uso e aproveitamento da terra", "titulo de uso e aproveitamento", "direito de uso e aproveitamento"],
      stems: ["duat", "terren"],
      areas: ["Uso e Aproveitamento da Terra", "Imobili\xE1rio"]
    },
    {
      id: "arrendamento",
      label: "arrendamento",
      weight: 5,
      phrases: ["contrato de arrendamento", "senhorio", "despejo"],
      stems: ["inquilin", "arrend"],
      areas: ["Arrendamento", "Imobili\xE1rio"]
    },
    {
      id: "laboral",
      label: "trabalho e despedimento",
      weight: 5,
      phrases: ["justa causa", "contrato de trabalho", "aviso previo", "horas extra", "subsidio de ferias", "direito do trabalho", "acidente de trabalho", "no trabalho"],
      stems: ["desped", "salari", "empregador", "trabalhador", "venciment", "laboral"],
      areas: ["Laboral", "Contencioso Laboral"]
    },
    {
      id: "penal",
      label: "processo penal",
      weight: 5,
      phrases: ["queixa crime", "ministerio publico", "prisao preventiva", "medida de coaccao", "medida de coa\xE7\xE3o"],
      stems: ["crime", "roub", "furt", "burl", "homicid", "detid", "prisao"],
      areas: ["Penal", "Criminal", "Contencioso Penal"]
    },
    {
      id: "corrupcao",
      label: "corrup\xE7\xE3o",
      weight: 5,
      phrases: ["branqueamento de capitais"],
      stems: ["corrupc", "suborn"],
      areas: ["Preven\xE7\xE3o e Combate \xE0 Corrup\xE7\xE3o", "Penal", "Preven\xE7\xE3o ao Branqueamento de Capitais e Financiamento ao Terrorismo"]
    },
    {
      id: "fiscal",
      label: "impostos",
      weight: 5,
      phrases: ["autoridade tributaria", "autoridade tribut\xE1ria", "tributacao aduaneira", "pauta aduaneira"],
      stems: ["impost", "alfandeg", "fiscal"],
      areas: ["Fiscal", "Tribut\xE1rio e fiscal", "Contencioso Fiscal", "Tributa\xE7\xE3o Aduaneira"]
    },
    {
      id: "bancario",
      label: "banca",
      weight: 5,
      phrases: ["cheque sem provisao", "contrato de mutuo", "cartao de credito"],
      stems: ["emprestim", "bancar"],
      areas: ["Banc\xE1rio", "Regula\xE7\xE3o Banc\xE1ria e Financeira", "Contencioso Banc\xE1rio"]
    },
    {
      id: "credito",
      label: "d\xEDvida e cobran\xE7a",
      weight: 4,
      phrases: ["recuperacao de credito", "falta de pagamento", "divida comercial", "cobranca da divida"],
      stems: ["divida", "cobranc"],
      areas: ["Recupera\xE7\xE3o de Cr\xE9dito", "Contencioso Contratual"]
    },
    {
      id: "energia",
      label: "energia e recursos naturais",
      weight: 6,
      phrases: ["recursos naturais", "concessao mineira", "concess\xE3o mineira", "gas natural", "direito da energia"],
      stems: ["petrole", "minerac", "petrolif"],
      areas: ["Energia e recursos naturais", "Direito da Energia", "Recursos naturais", "Regime Juridico De G\xE1s E Petr\xF3leo", "Oil & Gas"]
    },
    {
      id: "societario",
      label: "sociedades e empresas",
      weight: 4,
      phrases: ["sociedade por quotas", "assembleia geral", "contrato social", "constituir empresa"],
      stems: ["socio", "accion", "acionist", "empres"],
      areas: ["Societ\xE1rio", "Comercial", "Direito Comercial", "Corporate"]
    },
    {
      id: "contratos",
      label: "contratos",
      weight: 3,
      phrases: ["contrato comercial", "incumprimento contratual", "incumprimento do contrato"],
      stems: [],
      areas: ["Contratos", "Contratos Comerciais", "Contencioso Contratual"]
    },
    {
      id: "administrativo",
      label: "acto administrativo",
      weight: 4,
      phrases: ["acto administrativo", "funcionario publico", "licenca administrativa", "contencioso administrativo"],
      stems: [],
      areas: ["Administrativo", "Direito Administrativo", "Contencioso Administrativo"]
    },
    {
      id: "migratorio",
      label: "migra\xE7\xE3o",
      weight: 5,
      phrases: ["autorizacao de residencia", "visto de trabalho", "direccao nacional de migracao"],
      stems: ["imigrac", "migrator", "deport"],
      areas: ["Migrat\xF3rio"]
    },
    {
      id: "dados",
      label: "dados pessoais",
      weight: 5,
      phrases: ["dados pessoais", "proteccao de dados", "prote\xE7\xE3o de dados"],
      stems: [],
      areas: ["Prote\xE7\xE3o de Dados Pessoais"]
    },
    {
      id: "ambiente",
      label: "ambiente",
      weight: 4,
      phrases: ["impacto ambiental", "licenciamento ambiental"],
      stems: ["poluic"],
      areas: ["Ambiente", "Licenciamento Ambiental"]
    },
    {
      id: "pi",
      label: "propriedade intelectual",
      weight: 5,
      phrases: ["propriedade intelectual", "propriedade industrial", "marca registada"],
      stems: ["patent", "contrafac"],
      areas: ["Propriedade intelectual e industrial", "Propriedade Industrial", "Marcas", "Patentes"]
    },
    {
      id: "arbitragem",
      label: "arbitragem",
      weight: 5,
      phrases: ["clausula arbitral", "tribunal arbitral", "resolucao de litigios"],
      stems: ["arbitra"],
      areas: ["Arbitragem", "Arbitragem Internacional", "Resolu\xE7\xE3o de lit\xEDgios"]
    },
    {
      id: "civil-acidente",
      label: "responsabilidade civil",
      weight: 4,
      phrases: ["responsabilidade civil", "acidente de viacao", "acidente de via\xE7\xE3o", "dano moral", "seguradora"],
      stems: [],
      areas: ["Civil", "Contencioso Civil", "Seguros"]
    },
    {
      id: "saude",
      label: "sa\xFAde",
      weight: 4,
      phrases: ["negligencia medica", "neglig\xEAncia m\xE9dica", "estabelecimento de saude"],
      stems: [],
      areas: ["Sa\xFAde", "Civil"]
    },
    {
      id: "imobiliario",
      label: "im\xF3vel",
      weight: 4,
      phrases: ["compra e venda de imovel", "compra e venda de im\xF3vel", "registo predial", "conservatoria do registo"],
      stems: [],
      areas: ["Imobili\xE1rio", "Habita\xE7\xE3o e urbanismo"]
    }
  ];
  var LANGUAGE_ALIASES = {
    "Ingl\xEAs": ["english"],
    "Franc\xEAs": ["french"],
    "Chin\xEAs (Mandarim)": ["mandarim"],
    "Emakhuwa (Macua)": ["macua", "emakhuwa"],
    "Xichangana": ["changana"]
  };
  var AMBIGUOUS_PLACES = /* @__PURE__ */ new Set(["beira"]);
  function mentionsPlace(text, place) {
    const name = fold(place);
    const folded = fold(text);
    if (!name || !folded) return false;
    if (AMBIGUOUS_PLACES.has(name)) {
      return new RegExp(`(?:^|\\s)(?:em|na|da|de|para|cidade|provincia)\\s+${name}(?:\\s|$)`).test(folded);
    }
    return hasPhrase(text, place);
  }
  function prunePlaces(places) {
    return places.filter((place) => {
      const folded = fold(place);
      return !places.some((other) => {
        if (other === place) return false;
        const longer = fold(other);
        return longer.length > folded.length && longer.includes(folded);
      });
    });
  }
  function resolveName(name, available) {
    const target = fold(name);
    return available.find((item) => fold(item) === target) || null;
  }
  function ruleMatches(rule, text) {
    if (rule.phrases.some((phrase) => hasPhrase(text, phrase))) return true;
    return rule.stems.some((stem) => hasStem(text, stem));
  }
  function classifyCase(text, taxonomy, extras = {}) {
    const areas = taxonomy?.areas || [];
    const locations = taxonomy?.locations || [];
    const languages = taxonomy?.languages || [];
    const weights = /* @__PURE__ */ new Map();
    const labels = [];
    function addArea(name, weight) {
      const resolved = resolveName(name, areas);
      if (!resolved) return;
      weights.set(resolved, Math.max(weights.get(resolved) || 0, weight));
    }
    for (const rule of RULES) {
      if (!ruleMatches(rule, text)) continue;
      labels.push(rule.label);
      for (const area of rule.areas) addArea(area, rule.weight);
    }
    if (extras.area) addArea(extras.area, 6);
    const detectedLocations = prunePlaces(
      locations.filter((place) => mentionsPlace(text, place))
    );
    const detectedLanguages = languages.filter((language) => {
      if (hasPhrase(text, language)) return true;
      const aliases = LANGUAGE_ALIASES[language] || [];
      return aliases.some((alias) => hasPhrase(text, alias));
    });
    return {
      areas: [...weights.keys()].sort((a, b) => weights.get(b) - weights.get(a) || a.localeCompare(b, "pt")),
      areaWeights: Object.fromEntries(weights),
      locations: unique(detectedLocations),
      languages: unique(detectedLanguages),
      keywords: unique(labels).slice(0, 8),
      method: "regras"
    };
  }

  // src/recommend.js
  function same(left, right) {
    return fold(left) === fold(right);
  }
  function scoreList(lawyers, analysis, preferred) {
    const ranked = [];
    for (const lawyer of lawyers) {
      const matchedAreas = analysis.areas.filter((area) => lawyer.areas.some((item) => same(item, area)));
      if (!matchedAreas.length) continue;
      const matchedLocation = preferred && lawyer.locations.some((item) => same(item, preferred)) ? preferred : "";
      const matchedLanguages = (analysis.languages || []).filter(
        (language) => lawyer.languages.some((item) => same(item, language))
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
      item.band = ratio >= 0.85 ? "Correspond\xEAncia forte" : ratio >= 0.55 ? "Correspond\xEAncia moderada" : "Correspond\xEAncia parcial";
    }
    return results;
  }
  function rankLawyers({ lawyers, analysis, location = "", strictLocation = false, limit = 8 }) {
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
      reason: results.length ? "ok" : "no_lawyer_for_area"
    };
  }

  // src/pages-entry.js
  function names(list) {
    return (list || []).map((item) => typeof item === "string" ? item : item?.name).filter(Boolean);
  }
  function taxonomyOf(index) {
    return {
      areas: names(index.areas),
      locations: names(index.locations),
      languages: names(index.languages)
    };
  }
  function known(name, list) {
    const fold2 = (value) => String(value || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    const target = fold2(name);
    if (!target) return "";
    return list.find((item) => fold2(item) === target) || "";
  }
  function recommend(index, input = {}) {
    const taxonomy = taxonomyOf(index);
    const location = known(input.location, taxonomy.locations);
    const area = known(input.area, taxonomy.areas);
    const analysis = classifyCase(String(input.text || ""), taxonomy, { area });
    const ranking = rankLawyers({
      lawyers: index.lawyers || [],
      analysis,
      location,
      strictLocation: Boolean(input.strictLocation)
    });
    return {
      analysis: {
        areas: analysis.areas,
        locations: analysis.locations,
        languages: analysis.languages,
        keywords: analysis.keywords,
        method: analysis.method
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
        phone: null
      }))
    };
  }
  function catalogue(index) {
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
        profileUrl: lawyer.profileUrl || ""
      }))
    };
  }
  return __toCommonJS(pages_entry_exports);
})();
