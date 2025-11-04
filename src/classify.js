import { fold, hasPhrase, hasStem, unique } from "./text.js";

const RULES = [
  {
    id: "violencia-domestica",
    label: "violência doméstica",
    weight: 6,
    phrases: ["violencia domestica", "violencia conjugal", "agressao domestica"],
    stems: [],
    areas: ["Violência Doméstica", "Família e Menores", "Penal"],
  },
  {
    id: "poder-paternal",
    label: "poder paternal",
    weight: 6,
    phrases: ["poder paternal", "regulacao do poder paternal"],
    stems: [],
    areas: ["Regulação do Poder Paternal", "Família e Menores"],
  },
  {
    id: "alimentos",
    label: "pensão de alimentos",
    weight: 6,
    phrases: ["pensao de alimentos", "alimentos devidos"],
    stems: [],
    areas: ["Pensão de Alimentos", "Família e Menores"],
  },
  {
    id: "familia",
    label: "família",
    weight: 5,
    phrases: ["uniao de facto", "guarda dos filhos", "guarda do menor", "poder paternal", "estado civil", "regime de bens"],
    stems: ["divorci", "casament", "adop"],
    areas: ["Família e Menores", "Família e sucessões"],
  },
  {
    id: "sucessoes",
    label: "sucessões",
    weight: 5,
    phrases: ["habilitacao de herdeiros", "partilha da heranca"],
    stems: ["heranc", "testament", "inventari", "sucessa", "herdeir"],
    areas: ["Família e sucessões"],
  },
  {
    id: "terra",
    label: "terra e DUAT",
    weight: 6,
    phrases: ["uso e aproveitamento da terra", "titulo de uso e aproveitamento", "direito de uso e aproveitamento"],
    stems: ["duat", "terren"],
    areas: ["Uso e Aproveitamento da Terra", "Imobiliário"],
  },
  {
    id: "arrendamento",
    label: "arrendamento",
    weight: 5,
    phrases: ["contrato de arrendamento", "senhorio", "despejo"],
    stems: ["inquilin", "arrend"],
    areas: ["Arrendamento", "Imobiliário"],
  },
  {
    id: "laboral",
    label: "trabalho e despedimento",
    weight: 5,
    phrases: ["justa causa", "contrato de trabalho", "aviso previo", "horas extra", "subsidio de ferias", "direito do trabalho", "acidente de trabalho", "no trabalho"],
    stems: ["desped", "salari", "empregador", "trabalhador", "venciment", "laboral"],
    areas: ["Laboral", "Contencioso Laboral"],
  },
  {
    id: "penal",
    label: "processo penal",
    weight: 5,
    phrases: ["queixa crime", "ministerio publico", "prisao preventiva", "medida de coaccao", "medida de coação"],
    stems: ["crime", "roub", "furt", "burl", "homicid", "detid", "prisao"],
    areas: ["Penal", "Criminal", "Contencioso Penal"],
  },
  {
    id: "corrupcao",
    label: "corrupção",
    weight: 5,
    phrases: ["branqueamento de capitais"],
    stems: ["corrupc", "suborn"],
    areas: ["Prevenção e Combate à Corrupção", "Penal", "Prevenção ao Branqueamento de Capitais e Financiamento ao Terrorismo"],
  },
  {
    id: "fiscal",
    label: "impostos",
    weight: 5,
    phrases: ["autoridade tributaria", "autoridade tributária", "tributacao aduaneira", "pauta aduaneira"],
    stems: ["impost", "alfandeg", "fiscal"],
    areas: ["Fiscal", "Tributário e fiscal", "Contencioso Fiscal", "Tributação Aduaneira"],
  },
  {
    id: "bancario",
    label: "banca",
    weight: 5,
    phrases: ["cheque sem provisao", "contrato de mutuo", "cartao de credito"],
    stems: ["emprestim", "bancar"],
    areas: ["Bancário", "Regulação Bancária e Financeira", "Contencioso Bancário"],
  },
  {
    id: "credito",
    label: "dívida e cobrança",
    weight: 4,
    phrases: ["recuperacao de credito", "falta de pagamento", "divida comercial", "cobranca da divida"],
    stems: ["divida", "cobranc"],
    areas: ["Recuperação de Crédito", "Contencioso Contratual"],
  },
  {
    id: "energia",
    label: "energia e recursos naturais",
    weight: 6,
    phrases: ["recursos naturais", "concessao mineira", "concessão mineira", "gas natural", "direito da energia"],
    stems: ["petrole", "minerac", "petrolif"],
    areas: ["Energia e recursos naturais", "Direito da Energia", "Recursos naturais", "Regime Juridico De Gás E Petróleo", "Oil & Gas"],
  },
  {
    id: "societario",
    label: "sociedades e empresas",
    weight: 4,
    phrases: ["sociedade por quotas", "assembleia geral", "contrato social", "constituir empresa"],
    stems: ["socio", "accion", "acionist", "empres"],
    areas: ["Societário", "Comercial", "Direito Comercial", "Corporate"],
  },
  {
    id: "contratos",
    label: "contratos",
    weight: 3,
    phrases: ["contrato comercial", "incumprimento contratual", "incumprimento do contrato"],
    stems: [],
    areas: ["Contratos", "Contratos Comerciais", "Contencioso Contratual"],
  },
  {
    id: "administrativo",
    label: "acto administrativo",
    weight: 4,
    phrases: ["acto administrativo", "funcionario publico", "licenca administrativa", "contencioso administrativo"],
    stems: [],
    areas: ["Administrativo", "Direito Administrativo", "Contencioso Administrativo"],
  },
  {
    id: "migratorio",
    label: "migração",
    weight: 5,
    phrases: ["autorizacao de residencia", "visto de trabalho", "direccao nacional de migracao"],
    stems: ["imigrac", "migrator", "deport"],
    areas: ["Migratório"],
  },
  {
    id: "dados",
    label: "dados pessoais",
    weight: 5,
    phrases: ["dados pessoais", "proteccao de dados", "proteção de dados"],
    stems: [],
    areas: ["Proteção de Dados Pessoais"],
  },
  {
    id: "ambiente",
    label: "ambiente",
    weight: 4,
    phrases: ["impacto ambiental", "licenciamento ambiental"],
    stems: ["poluic"],
    areas: ["Ambiente", "Licenciamento Ambiental"],
  },
  {
    id: "pi",
    label: "propriedade intelectual",
    weight: 5,
    phrases: ["propriedade intelectual", "propriedade industrial", "marca registada"],
    stems: ["patent", "contrafac"],
    areas: ["Propriedade intelectual e industrial", "Propriedade Industrial", "Marcas", "Patentes"],
  },
  {
    id: "arbitragem",
    label: "arbitragem",
    weight: 5,
    phrases: ["clausula arbitral", "tribunal arbitral", "resolucao de litigios"],
    stems: ["arbitra"],
    areas: ["Arbitragem", "Arbitragem Internacional", "Resolução de litígios"],
  },
  {
    id: "civil-acidente",
    label: "responsabilidade civil",
    weight: 4,
    phrases: ["responsabilidade civil", "acidente de viacao", "acidente de viação", "dano moral", "seguradora"],
    stems: [],
    areas: ["Civil", "Contencioso Civil", "Seguros"],
  },
  {
    id: "saude",
    label: "saúde",
    weight: 4,
    phrases: ["negligencia medica", "negligência médica", "estabelecimento de saude"],
    stems: [],
    areas: ["Saúde", "Civil"],
  },
  {
    id: "imobiliario",
    label: "imóvel",
    weight: 4,
    phrases: ["compra e venda de imovel", "compra e venda de imóvel", "registo predial", "conservatoria do registo"],
    stems: [],
    areas: ["Imobiliário", "Habitação e urbanismo"],
  },
];

const LANGUAGE_ALIASES = {
  "Inglês": ["english"],
  "Francês": ["french"],
  "Chinês (Mandarim)": ["mandarim"],
  "Emakhuwa (Macua)": ["macua", "emakhuwa"],
  "Xichangana": ["changana"],
};

const AMBIGUOUS_PLACES = new Set(["beira"]);

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

export function classifyCase(text, taxonomy, extras = {}) {
  const areas = taxonomy?.areas || [];
  const locations = taxonomy?.locations || [];
  const languages = taxonomy?.languages || [];
  const weights = new Map();
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
    locations.filter((place) => mentionsPlace(text, place)),
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
    method: "regras",
  };
}

export function sanitizeModelInterpretation(raw, taxonomy) {
  if (!raw || typeof raw !== "object") return null;
  const areas = taxonomy?.areas || [];
  const locations = taxonomy?.locations || [];
  const acceptedAreas = [];
  const acceptedLocations = [];
  const keywords = [];

  for (const area of Array.isArray(raw.areas) ? raw.areas : []) {
    const resolved = resolveName(String(area), areas);
    if (resolved) acceptedAreas.push(resolved);
  }
  for (const place of Array.isArray(raw.locations) ? raw.locations : []) {
    const resolved = resolveName(String(place), locations);
    if (resolved) acceptedLocations.push(resolved);
  }
  for (const keyword of Array.isArray(raw.keywords) ? raw.keywords : []) {
    const clean = String(keyword).replace(/\s+/g, " ").trim();
    if (clean.length < 3 || clean.length > 40) continue;
    if (/@|\d{5,}/.test(clean)) continue;
    keywords.push(clean);
  }

  return {
    areas: unique(acceptedAreas),
    locations: unique(acceptedLocations),
    keywords: unique(keywords).slice(0, 8),
  };
}

export function mergeAnalysis(base, model) {
  if (!model) return base;
  const weights = { ...base.areaWeights };
  for (const area of model.areas) {
    if (!weights[area]) weights[area] = 3;
  }
  const areas = Object.keys(weights).sort(
    (a, b) => weights[b] - weights[a] || a.localeCompare(b, "pt"),
  );
  return {
    areas,
    areaWeights: weights,
    locations: unique([...base.locations, ...model.locations]),
    languages: base.languages,
    keywords: unique([...base.keywords, ...model.keywords]).slice(0, 8),
    method: "regras+modelo",
  };
}
