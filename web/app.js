const config = window.JURIFIND_CONFIG || {};
const apiBase = String(config.apiBase || "").replace(/\/$/, "");
const form = document.querySelector("#caso");
const description = document.querySelector("#descricao");
const areaSelect = document.querySelector("#area");
const locationSelect = document.querySelector("#localizacao");
const strictLocation = document.querySelector("#apenas-local");
const submitButton = document.querySelector("#submeter");
const formError = document.querySelector("#form-error");
const results = document.querySelector("#resultados");
const summary = document.querySelector("#resumo");
const notice = document.querySelector("#aviso-resultado");
const list = document.querySelector("#lista");

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

function renderResults(data) {
  results.hidden = false;
  list.replaceChildren();
  const areas = data.analysis?.areas?.length ? data.analysis.areas.join(", ") : "nenhuma área identificada";
  const topics = data.analysis?.keywords?.length ? ` Temas: ${data.analysis.keywords.join(", ")}.` : "";
  summary.textContent = `Áreas identificadas: ${areas}.${topics}`;

  let lead = "";
  if (data.reason === "need_detail") {
    lead = "O texto ainda não aponta para uma área. Acrescente o que aconteceu, em que cidade e o que pretende.";
  } else if (data.reason === "no_lawyer_for_area") {
    lead = "A área foi identificada, mas nenhum advogado deste índice a indica neste momento.";
  } else if (data.relaxedLocation) {
    lead = "Não há correspondência só na localização pedida. A lista inclui advogados de outras cidades.";
  } else {
    const count = data.results.length;
    lead = count === 1
      ? "1 advogado corresponde às áreas identificadas. A ordem não avalia a qualidade profissional."
      : `${count} advogados correspondem às áreas identificadas. A ordem não avalia a qualidade profissional.`;
  }
  notice.replaceChildren(el("p", null, lead), el("p", null, data.disclaimer || ""));

  for (const lawyer of data.results || []) {
    const card = el("article", "lawyer");
    card.append(portrait(lawyer));
    const body = el("div", "card-body");
    body.append(el("h3", null, lawyer.name));
    const places = (lawyer.locations || []).join(", ") || "Localização não indicada";
    const languages = lawyer.languages?.length ? ` · ${lawyer.languages.join(", ")}` : "";
    body.append(el("p", "place", `${places}${languages}`));
    const chips = el("ul", "chips");
    for (const area of lawyer.matchedAreas || []) chips.append(el("li", null, area));
    if (chips.childElementCount) body.append(chips);
    body.append(el("p", "explanation", lawyer.explanation || ""));
    const phone = typeof lawyer.phone === "string" && /^\+258 \d{3} \d{3} \d{3}$/.test(lawyer.phone) ? lawyer.phone : "";
    if (phone) {
      const actions = el("div", "actions");
      const call = el("a", "button", `Ligar ${phone}`);
      call.href = `tel:${phone.replace(/\s/g, "")}`;
      actions.append(call);
      body.append(actions);
    }
    card.append(body);
    list.append(card);
  }
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadMeta() {
  try {
    const response = await fetch(api("/api/meta"));
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível preparar a pesquisa.");
    fillSelect(areaSelect, data.areas, "Identificar a partir do texto");
    fillSelect(locationSelect, data.locations, "Sem preferência");
    if (data.disclaimer) document.querySelector("#aviso-fixo").textContent = data.disclaimer;
  } catch (error) {
    formError.textContent = error.message;
  }
}

locationSelect.addEventListener("change", () => {
  strictLocation.disabled = locationSelect.value === "";
  if (!locationSelect.value) strictLocation.checked = false;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.textContent = "";
  const text = description.value.trim();
  if (text.length < 20) {
    formError.textContent = "Descreva o caso com pelo menos 20 caracteres, sem dados sensíveis desnecessários.";
    description.focus();
    return;
  }
  submitButton.disabled = true;
  submitButton.textContent = "A analisar o caso…";
  try {
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
      throw new Error("O serviço devolveu uma resposta inválida.");
    }
    if (!response.ok) throw new Error(data.error || "Não foi possível obter recomendações.");
    renderResults(data);
  } catch (error) {
    formError.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Ver advogados adequados";
  }
});

loadMeta();
