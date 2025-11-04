const config = window.JURIFIND_CONFIG || {};
const apiBase = String(config.apiBase || "").replace(/\/$/, "");
const form = document.querySelector("#caso");
const description = document.querySelector("#mensagem");
const areaSelect = document.querySelector("#area");
const locationSelect = document.querySelector("#localizacao");
const strictLocation = document.querySelector("#apenas-local");
const submitButton = document.querySelector("#submeter");
const formError = document.querySelector("#form-error");
const welcome = document.querySelector("#boas-vindas");
const messages = document.querySelector("#mensagens");
const counter = document.querySelector("#contador");
const suggestions = document.querySelector("#sugestoes");
const filters = document.querySelector("#personalizar");
const filterButton = document.querySelector("#abrir-filtros");
const directory = document.querySelector("#directorio");
const directoryList = document.querySelector("#directorio-lista");
const directoryStatus = document.querySelector("#directorio-estado");
const directorySearch = document.querySelector("#procurar-advogado");
const historyList = document.querySelector("#historico");
const historyEmpty = document.querySelector("#historico-vazio");
const areaList = document.querySelector("#lista-areas");
const cityList = document.querySelector("#lista-cidades");
const sidebar = document.querySelector("#sidebar");
const menuButton = document.querySelector("#menu");
const themeButton = document.querySelector("#tema");
const newChatButton = document.querySelector("#nova");
const limit = 2000;

const prompts = [
  "Trabalhei dois anos numa loja na Matola e fui despedido sem carta. Não recebi os salários dos últimos três meses.",
  "Quero o divórcio na Beira. Temos dois filhos menores e não há acordo sobre a pensão de alimentos.",
  "O meu vizinho em Maputo ocupa parte do terreno onde tenho o DUAT e recusa sair.",
];

function api(path) {
  return `${apiBase}${path}`;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function initials(name) {
  const parts = String(name).split(/\s+/).filter((part) => part.length > 2 && !/^(de|da|do|dos|das|e)$/i.test(part));
  const chosen = (parts.length ? parts : String(name).split(/\s+/)).slice(0, 2);
  return chosen.map((part) => part[0] || "").join("").toUpperCase() || "•";
}

function safePhotoPath(path) {
  return typeof path === "string" && /^\/api\/photos\/[a-z0-9-]+$/.test(path) ? path : "";
}

function fillSelect(select, values, placeholder) {
  const current = select.value;
  select.replaceChildren();
  select.append(new Option(placeholder, ""));
  for (const value of values || []) select.append(new Option(value, value));
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function portrait(lawyer) {
  const frame = el("div", "portrait");
  const fallback = el("div", "initials", initials(lawyer.name));
  fallback.setAttribute("role", "img");
  fallback.setAttribute("aria-label", `Sem fotografia de ${lawyer.name}`);
  const photo = safePhotoPath(lawyer.photo);
  if (photo) {
    const image = document.createElement("img");
    image.src = api(photo);
    image.alt = `Fotografia de ${lawyer.name}`;
    image.addEventListener("error", () => image.replaceWith(fallback));
    frame.append(image);
  } else {
    frame.append(fallback);
  }
  const bandClass = lawyer.band === "Correspondência forte"
    ? "band"
    : lawyer.band === "Correspondência moderada" ? "band mid" : "band soft";
  frame.append(el("p", bandClass, lawyer.band || "Correspondência"));
  return frame;
}

function lawyerCard(lawyer) {
  const card = el("article", "lawyer");
  card.append(portrait(lawyer));
  const body = el("div", "card-body");
  body.append(el("h3", null, lawyer.name));
  const places = (lawyer.locations || []).join(", ") || "Localização não indicada";
  const languages = lawyer.languages?.length ? ` · ${lawyer.languages.join(", ")}` : "";
  body.append(el("p", "place", `${places}${languages}`));
  const chips = el("ul", "chips");
  const areas = lawyer.matchedAreas?.length ? lawyer.matchedAreas : (lawyer.areas || []).slice(0, 3);
  for (const area of areas) chips.append(el("li", null, area));
  if (chips.childElementCount) body.append(chips);
  if (lawyer.explanation) body.append(el("p", "explanation", lawyer.explanation));
  const phone = typeof lawyer.phone === "string" && /^\+258 \d{3} \d{3} \d{3}$/.test(lawyer.phone) ? lawyer.phone : "";
  if (phone) {
    const actions = el("div", "actions");
    const call = el("a", null, `Ligar ${phone}`);
    call.href = `tel:${phone.replace(/\s/g, "")}`;
    actions.append(call);
    body.append(actions);
  }
  card.append(body);
  return card;
}

function summaryText(data) {
  if (data.reason === "need_detail") {
    return "O texto ainda não aponta para uma área. Acrescente o que aconteceu, em que cidade e o que pretende.";
  }
  if (data.reason === "no_lawyer_for_area") {
    return "A área foi identificada, mas nenhum advogado deste índice a indica neste momento.";
  }
  const areas = data.analysis?.areas?.length ? data.analysis.areas.join(", ") : "nenhuma área identificada";
  const place = data.relaxedLocation ? " A lista inclui outras cidades, porque não houve correspondência só na cidade pedida." : "";
  const count = data.results?.length || 0;
  const people = count === 1 ? "1 advogado" : `${count} advogados`;
  return `Áreas identificadas: ${areas}. ${people} com prática publicada nessa correspondência.${place}`;
}

function remember(text, anchor) {
  historyEmpty.hidden = true;
  const item = document.createElement("li");
  const button = el("button", null, text.length > 88 ? `${text.slice(0, 88)}…` : text);
  button.type = "button";
  button.addEventListener("click", () => anchor.scrollIntoView({ behavior: "smooth", block: "center" }));
  item.append(button);
  historyList.append(item);
}

function assistantReply(data) {
  const bubble = el("article", "bubble assistant");
  bubble.append(el("h2", null, "Advogados para este caso"));
  bubble.append(el("p", "lead", summaryText(data)));
  const topics = data.analysis?.keywords || [];
  if (topics.length) bubble.append(el("p", "meta-line", `Temas: ${topics.join(", ")}.`));
  if (data.results?.length) {
    const cards = el("div", "cards");
    for (const lawyer of data.results) cards.append(lawyerCard(lawyer));
    bubble.append(cards);
  }
  return bubble;
}

function setActive(panel) {
  for (const item of document.querySelectorAll(".nav-item[data-panel]")) {
    item.classList.toggle("is-active", item.dataset.panel === panel);
  }
  document.querySelector("#painel-areas").hidden = panel !== "areas";
  document.querySelector("#painel-cidades").hidden = panel !== "cidades";
  sidebar.classList.remove("is-open");
  menuButton.setAttribute("aria-expanded", "false");
}

function updateCount() {
  counter.textContent = `${description.value.length}/${limit}`;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButton.textContent = theme === "dark" ? "Tema claro" : "Tema escuro";
  localStorage.setItem("jurifind-theme", theme);
}

let busy = false;
let catalogue = null;

function foldQuery(value) {
  return String(value).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

const TITLES = {
  assistente: "Assistente jurídico",
  advogados: "Advogados",
  areas: "Assistente jurídico",
  cidades: "Assistente jurídico",
  vade: "Vade Mecum",
  jurisprudencia: "Jurisprudência",
  dicionario: "Dicionário jurídico",
  atualizacoes: "Atualizações",
  noticias: "Notícias",
  questoes: "Questões",
  comparar: "Comparar",
  pastas: "Pastas",
  etiquetas: "Etiquetas",
  recentes: "Conteúdos recentes",
  busca: "Pesquisa",
};

function showView(panel) {
  const assistant = panel === "assistente" || panel === "areas" || panel === "cidades";
  const lawyers = panel === "advogados";
  document.querySelector("#conversa").hidden = !assistant;
  form.hidden = !assistant;
  directory.hidden = !lawyers;
  const vista = document.querySelector("#vista");
  vista.hidden = assistant || lawyers;
  document.querySelector(".top-title").textContent = TITLES[panel] || "JuriFind IA";
  if (!assistant && !lawyers) window.JuriFindStudio.open(panel, document.querySelector("#busca-texto")?.value.trim());
}

function paintDirectory(query = "") {
  const needle = foldQuery(query.trim());
  const visible = (catalogue || []).filter((lawyer) => {
    if (!needle) return true;
    const hay = foldQuery([lawyer.name, ...(lawyer.areas || []), ...(lawyer.locations || []), ...(lawyer.languages || [])].join(" "));
    return hay.includes(needle);
  });
  directoryList.replaceChildren(...visible.map((lawyer) => lawyerCard(lawyer)));
  directoryStatus.textContent = visible.length
    ? `${visible.length} ${visible.length === 1 ? "advogado" : "advogados"}`
    : "Nenhum advogado corresponde a essa pesquisa.";
}

async function showLawyers() {
  showView("advogados");
  if (catalogue) {
    paintDirectory(directorySearch.value);
    directorySearch.focus();
    return;
  }
  directoryStatus.textContent = "A carregar advogados…";
  directoryList.replaceChildren();
  try {
    const response = await fetch(api("/api/lawyers"));
    let data = {};
    try {
      data = await response.json();
    } catch {
      throw new Error("A lista de advogados não está acessível neste momento.");
    }
    if (!response.ok) throw new Error(data.error || "Não foi possível obter os advogados.");
    catalogue = data.lawyers || [];
    paintDirectory("");
    directorySearch.focus();
  } catch (error) {
    directoryStatus.textContent = error.message;
  }
}

async function ask(text) {
  if (busy) return;
  busy = true;
  formError.textContent = "";
  welcome.hidden = true;
  showView("assistente");
  setActive("assistente");
  const mode = document.querySelector("#modo")?.value || "explicar";
  const user = el("article", "bubble user");
  user.append(el("p", null, text));
  messages.append(user);
  remember(text, user);
  submitButton.disabled = true;
  try {
    if (mode === "comparar") {
      messages.append(window.JuriFindStudio.compareFromText(text));
      description.value = "";
      updateCount();
      return;
    }
    if (mode === "provas") {
      showView("questoes");
      setActive("questoes");
      return;
    }
    const legal = mode !== "advogados" ? window.JuriFindStudio.hitsBubble(text) : null;
    if (legal) messages.append(legal);
    if (text.length < 20) {
      if (!legal) formError.textContent = "Descreva o caso com pelo menos 20 caracteres, ou pergunte por um diploma como DUAT ou Lei do Trabalho.";
      else {
        description.value = "";
        updateCount();
      }
      return;
    }
    const pending = el("article", "bubble assistant");
    pending.append(el("p", null, "A procurar advogados…"));
    messages.append(pending);
    pending.scrollIntoView({ behavior: "smooth", block: "end" });
    const response = await fetch(api("/api/recommend"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        location: locationSelect.value,
        area: areaSelect.value,
        strictLocation: strictLocation.checked,
      }),
    });
    let data = {};
    try {
      data = await response.json();
    } catch {
      throw new Error("A lista de advogados não está acessível neste momento.");
    }
    if (!response.ok) throw new Error(data.error || "Não foi possível obter os advogados.");
    pending.replaceWith(assistantReply(data));
    description.value = "";
    updateCount();
  } catch (error) {
    messages.append(el("article", "bubble assistant", error.message));
  } finally {
    busy = false;
    submitButton.disabled = false;
    messages.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "end" });
  }
}

function renderChoices(container, values, onPick) {
  container.replaceChildren();
  for (const value of values || []) {
    const button = el("button", "chip", value);
    button.type = "button";
    button.addEventListener("click", () => onPick(value, button));
    container.append(button);
  }
}

async function loadMeta() {
  try {
    const response = await fetch(api("/api/meta"));
    let data = {};
    try {
      data = await response.json();
    } catch {
      throw new Error("A lista de advogados não está acessível neste momento.");
    }
    if (!response.ok) throw new Error(data.error || "Não foi possível preparar a pesquisa.");
    fillSelect(areaSelect, data.areas, "Identificar a partir do texto");
    fillSelect(locationSelect, data.locations, "Sem preferência");
    renderChoices(areaList, data.areas, (value, button) => {
      areaSelect.value = areaSelect.value === value ? "" : value;
      for (const chip of areaList.children) chip.classList.toggle("is-on", chip === button && areaSelect.value === value);
      filters.hidden = false;
      filterButton.setAttribute("aria-expanded", "true");
    });
    renderChoices(cityList, data.locations, (value, button) => {
      locationSelect.value = locationSelect.value === value ? "" : value;
      locationSelect.dispatchEvent(new Event("change"));
      for (const chip of cityList.children) chip.classList.toggle("is-on", chip === button && locationSelect.value === value);
      filters.hidden = false;
      filterButton.setAttribute("aria-expanded", "true");
    });
  } catch (error) {
    formError.textContent = error.message;
  }
}

for (const prompt of prompts) {
  const button = el("button", "suggestion", prompt.length > 72 ? `${prompt.slice(0, 72)}…` : prompt);
  button.type = "button";
  button.addEventListener("click", () => ask(prompt));
  suggestions.append(button);
}

description.addEventListener("input", updateCount);
locationSelect.addEventListener("change", () => {
  strictLocation.disabled = locationSelect.value === "";
  if (!locationSelect.value) strictLocation.checked = false;
});
filterButton.addEventListener("click", () => {
  filters.hidden = !filters.hidden;
  filterButton.setAttribute("aria-expanded", String(!filters.hidden));
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = description.value.trim();
  const mode = document.querySelector("#modo")?.value || "explicar";
  if (mode === "provas") {
    setActive("questoes");
    showView("questoes");
    return;
  }
  if (text.length < 2) {
    formError.textContent = "Escreva a pergunta ou o caso.";
    description.focus();
    return;
  }
  if (mode === "advogados" && text.length < 20) {
    formError.textContent = "Descreva o caso com pelo menos 20 caracteres.";
    description.focus();
    return;
  }
  ask(text);
});
menuButton.addEventListener("click", () => {
  const open = sidebar.classList.toggle("is-open");
  menuButton.setAttribute("aria-expanded", String(open));
});
for (const item of document.querySelectorAll(".nav-item[data-panel]")) {
  item.addEventListener("click", () => {
    const panel = item.dataset.panel;
    setActive(panel);
    if (panel === "advogados") showLawyers();
    else showView(panel);
    if (panel === "assistente") description.focus();
  });
}
document.querySelector("#busca").addEventListener("submit", (event) => {
  event.preventDefault();
  const query = document.querySelector("#busca-texto").value.trim();
  if (query.length < 2) return;
  setActive("busca");
  showView("busca");
});
themeButton.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});
newChatButton.addEventListener("click", () => {
  messages.replaceChildren();
  historyList.replaceChildren();
  historyEmpty.hidden = false;
  welcome.hidden = false;
  formError.textContent = "";
  description.value = "";
  updateCount();
  showView("assistente");
  setActive("assistente");
});
directorySearch.addEventListener("input", () => {
  if (catalogue) paintDirectory(directorySearch.value);
});

applyTheme(localStorage.getItem("jurifind-theme") === "dark" ? "dark" : "light");
updateCount();
loadMeta();
