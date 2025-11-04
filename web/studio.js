(() => {
  const corpus = window.JURIFIND_CORPUS;
  const vista = () => document.querySelector("#vista");
  const storeKey = "jurifind-material";

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function fold(value) {
    return String(value || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  }

  function emptyStore() {
    return { folders: [{ id: "geral", name: "Geral" }], items: [], recent: [] };
  }

  function readStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storeKey) || "");
      if (!parsed?.folders?.length) return emptyStore();
      parsed.items ||= [];
      parsed.recent ||= [];
      return parsed;
    } catch {
      return emptyStore();
    }
  }

  function writeStore(store) {
    localStorage.setItem(storeKey, JSON.stringify(store));
  }

  function remember(kind, id, title) {
    const store = readStore();
    store.recent = [{ kind, id, title, at: Date.now() }, ...store.recent.filter((item) => item.id !== id)].slice(0, 12);
    writeStore(store);
  }

  function saveItem(kind, id, title) {
    const store = readStore();
    if (!store.items.some((item) => item.kind === kind && item.id === id)) {
      const tag = document.querySelector("#etiqueta-nova")?.value.trim();
      store.items.unshift({ kind, id, title, folderId: "geral", tags: tag ? [tag] : [], at: Date.now() });
      writeStore(store);
    }
  }

  const STOP = new Set(["para", "como", "sobre", "pelo", "pela", "entre", "quando", "onde", "qual", "quais", "isso", "esta", "este", "essa", "esse"]);

  function tokens(query) {
    return [...new Set(fold(query).split(/[^a-z0-9]+/).filter((word) => word.length >= 4 && !STOP.has(word)))];
  }

  function search(query) {
    const words = tokens(query);
    if (!words.length) return [];
    const scored = [];
    const consider = (kind, item, parts) => {
      const hay = fold(parts.filter(Boolean).join(" "));
      const score = words.reduce((total, word) => total + (hay.includes(word) ? 1 : 0), 0);
      if (score) scored.push({ kind, item, score });
    };
    for (const law of corpus.laws) consider("lei", law, [law.title, law.diploma, law.area, law.summary, ...law.topics]);
    for (const term of corpus.terms) consider("termo", term, [term.term, term.definition, ...term.topics]);
    for (const court of corpus.courts) consider("tribunal", court, [court.name, court.level, court.role, ...court.topics]);
    for (const update of corpus.updates) consider("atualizacao", update, [update.title, update.diploma, update.summary, ...update.topics]);
    scored.sort((left, right) => right.score - left.score);
    return scored.slice(0, 12).map(({ kind, item }) => ({ kind, item }));
  }

  function saveButton(kind, id, title) {
    const button = el("button", "ghost", "Guardar na pasta");
    button.type = "button";
    button.addEventListener("click", () => {
      saveItem(kind, id, title);
      button.textContent = "Guardado neste browser";
    });
    return button;
  }

  function lawCard(law) {
    const card = el("article", "entry");
    card.append(el("p", "eyebrow", law.area));
    card.append(el("h3", null, law.title));
    card.append(el("p", "diploma", law.diploma));
    card.append(el("p", null, law.summary));
    card.append(saveButton("lei", law.id, law.title));
    return card;
  }

  function termCard(term) {
    const card = el("article", "entry");
    card.append(el("h3", null, term.term));
    card.append(el("p", null, term.definition));
    const law = corpus.laws.find((item) => item.id === term.see);
    if (law) card.append(el("p", "diploma", `Ver ${law.diploma}`));
    card.append(saveButton("termo", term.id, term.term));
    return card;
  }

  function courtCard(court) {
    const card = el("article", "entry");
    card.append(el("p", "eyebrow", court.level));
    card.append(el("h3", null, court.name));
    card.append(el("p", null, court.role));
    card.append(saveButton("tribunal", court.id, court.name));
    return card;
  }

  function updateCard(update) {
    const card = el("article", "entry");
    card.append(el("p", "eyebrow", update.date));
    card.append(el("h3", null, update.title));
    card.append(el("p", "diploma", update.diploma));
    card.append(el("p", null, update.summary));
    card.append(saveButton("atualizacao", update.id, update.title));
    return card;
  }

  function layout(title, intro, nodes) {
    const root = vista();
    root.replaceChildren();
    root.append(el("h2", null, title));
    if (intro) root.append(el("p", "vista-intro", intro));
    for (const node of nodes) root.append(node);
    remember("vista", title, title);
  }

  function listLaws() {
    const box = el("div", "entry-list");
    for (const law of corpus.laws) box.append(lawCard(law));
    layout("Vade Mecum", "Diplomas centrais do direito moçambicano. O texto completo publica-se no Boletim da República.", [box]);
  }

  function listCourts() {
    const box = el("div", "entry-list");
    for (const court of corpus.courts) box.append(courtCard(court));
    layout("Tribunais", "Mapa dos tribunais moçambicanos e da matéria de cada um. Não há acórdãos inventados nesta secção.", [box]);
  }

  function listTerms() {
    const box = el("div", "entry-list");
    for (const term of corpus.terms) box.append(termCard(term));
    layout("Dicionário jurídico", "Termos usados no direito moçambicano, com o diploma a que se ligam.", [box]);
  }

  function listUpdates() {
    const box = el("div", "entry-list");
    for (const update of corpus.updates) box.append(updateCard(update));
    layout("Atualizações", "Mudanças legislativas confirmadas no Boletim da República.", [box]);
  }

  function listNews() {
    const box = el("div", "entry-list");
    for (const update of corpus.updates) box.append(updateCard(update));
    layout("Notícias legislativas", "Só entram diplomas já publicados no Boletim da República.", [box]);
  }

  let quizIndex = 0;
  let quizScore = 0;
  let quizLocked = false;

  function renderQuiz() {
    const question = corpus.questions[quizIndex];
    const box = el("article", "entry quiz");
    box.append(el("p", "eyebrow", `Questão ${quizIndex + 1} de ${corpus.questions.length}`));
    box.append(el("h3", null, question.prompt));
    const choices = el("div", "choices");
    question.choices.forEach((choice, index) => {
      const button = el("button", "choice", choice);
      button.type = "button";
      button.addEventListener("click", () => {
        if (quizLocked) return;
        quizLocked = true;
        const correct = index === question.answer;
        if (correct) quizScore += 1;
        button.classList.add(correct ? "is-right" : "is-wrong");
        box.append(el("p", "explanation", question.why));
        const next = el("button", "ghost", quizIndex + 1 < corpus.questions.length ? "Pergunta seguinte" : "Ver resultado");
        next.type = "button";
        next.addEventListener("click", () => {
          quizIndex += 1;
          quizLocked = false;
          if (quizIndex >= corpus.questions.length) {
            layout("Resultado", `${quizScore} em ${corpus.questions.length}.`, [restartQuiz()]);
            quizIndex = 0;
            quizScore = 0;
            return;
          }
          renderQuiz();
        });
        box.append(next);
      });
      choices.append(button);
    });
    box.append(choices);
    layout("Questões", "Treino sobre diplomas moçambicanos. Cada resposta explica o diploma em que se baseia.", [box]);
  }

  function restartQuiz() {
    const button = el("button", "ghost", "Recomeçar");
    button.type = "button";
    button.addEventListener("click", () => {
      quizIndex = 0;
      quizScore = 0;
      quizLocked = false;
      renderQuiz();
    });
    return button;
  }

  function compareView() {
    const left = document.createElement("select");
    const right = document.createElement("select");
    for (const law of corpus.laws) {
      left.append(new Option(law.title, law.id));
      right.append(new Option(law.title, law.id));
    }
    right.selectedIndex = Math.min(1, corpus.laws.length - 1);
    const grid = el("div", "compare");
    const fill = () => {
      grid.replaceChildren(
        lawCard(corpus.laws.find((law) => law.id === left.value)),
        lawCard(corpus.laws.find((law) => law.id === right.value)),
      );
    };
    left.addEventListener("change", fill);
    right.addEventListener("change", fill);
    const controls = el("div", "compare-controls");
    controls.append(left, right);
    fill();
    layout("Comparar diplomas", "Escolha dois diplomas moçambicanos e leia o âmbito de cada um.", [controls, grid]);
  }

  function materialViews(kind) {
    const store = readStore();
    if (kind === "pastas") {
      const form = el("form", "folder-form");
      const input = document.createElement("input");
      input.placeholder = "Nova pasta";
      input.setAttribute("aria-label", "Nome da pasta");
      const button = el("button", "ghost", "Criar");
      button.type = "submit";
      form.append(input, button);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const name = input.value.trim();
        if (!name) return;
        const next = readStore();
        next.folders.push({ id: `pasta-${Date.now()}`, name });
        writeStore(next);
        materialViews("pastas");
      });
      const box = el("div", "entry-list");
      for (const folder of store.folders) {
        const card = el("article", "entry");
        card.append(el("h3", null, folder.name));
        const inside = store.items.filter((item) => item.folderId === folder.id);
        card.append(el("p", null, inside.length ? inside.map((item) => item.title).join(", ") : "Ainda sem peças guardadas."));
        box.append(card);
      }
      layout("Pastas", "As pastas ficam apenas neste browser.", [form, box]);
      return;
    }
    if (kind === "etiquetas") {
      const tags = [...new Set(store.items.flatMap((item) => item.tags))];
      const box = el("div", "entry-list");
      if (!tags.length) box.append(el("p", null, "Ainda não há etiquetas. Escreva uma ao guardar uma peça."));
      for (const tag of tags) {
        const card = el("article", "entry");
        card.append(el("h3", null, tag));
        card.append(el("p", null, store.items.filter((item) => item.tags.includes(tag)).map((item) => item.title).join(", ")));
        box.append(card);
      }
      const tagInput = document.createElement("input");
      tagInput.id = "etiqueta-nova";
      tagInput.placeholder = "Etiqueta para a próxima peça guardada";
      tagInput.setAttribute("aria-label", "Etiqueta");
      layout("Etiquetas", "A etiqueta escrita aqui acompanha o próximo clique em Guardar na pasta.", [tagInput, box]);
      return;
    }
    const box = el("div", "entry-list");
    if (!store.recent.length) box.append(el("p", null, "Ainda não há conteúdos abertos neste browser."));
    for (const item of store.recent) {
      const card = el("article", "entry");
      card.append(el("h3", null, item.title));
      card.append(el("p", "diploma", item.kind));
      box.append(card);
    }
    layout("Conteúdos recentes", "Os últimos diplomas, termos e secções abertos neste browser.", [box]);
  }

  function searchView(query) {
    const hits = search(query);
    const box = el("div", "entry-list");
    if (!hits.length) box.append(el("p", null, "Nada encontrado nesses termos. Tente DUAT, trabalho, família ou penal."));
    for (const hit of hits) {
      if (hit.kind === "lei") box.append(lawCard(hit.item));
      if (hit.kind === "termo") box.append(termCard(hit.item));
      if (hit.kind === "tribunal") box.append(courtCard(hit.item));
      if (hit.kind === "atualizacao") box.append(updateCard(hit.item));
    }
    layout("Pesquisa", `Resultados para “${query}”.`, [box]);
  }

  function hitsBubble(query) {
    const hits = search(query).slice(0, 3);
    if (!hits.length) return null;
    const bubble = el("article", "bubble assistant");
    bubble.append(el("h2", null, "No direito moçambicano"));
    for (const hit of hits) {
      const title = hit.item.title || hit.item.term || hit.item.name;
      const text = hit.item.summary || hit.item.definition || hit.item.role;
      bubble.append(el("h3", null, title));
      bubble.append(el("p", "lead", text));
    }
    return bubble;
  }

  function compareFromText(text) {
    const needle = fold(text);
    const hits = corpus.laws.filter((law) => needle.includes(fold(law.title)) || law.topics.some((topic) => topic.length > 4 && needle.includes(fold(topic))));
    const bubble = el("article", "bubble assistant");
    bubble.append(el("h2", null, "Comparação"));
    if (hits.length < 2) {
      bubble.append(el("p", null, "Indique dois diplomas, por exemplo: Lei do Trabalho e Lei da Família. Também pode abrir Comparar no menu."));
      return bubble;
    }
    bubble.append(lawCard(hits[0]), lawCard(hits[1]));
    return bubble;
  }

  const openers = {
    vade: listLaws,
    jurisprudencia: listCourts,
    dicionario: listTerms,
    atualizacoes: listUpdates,
    noticias: listNews,
    questoes: renderQuiz,
    comparar: compareView,
    pastas: () => materialViews("pastas"),
    etiquetas: () => materialViews("etiquetas"),
    recentes: () => materialViews("recentes"),
  };

  window.JuriFindStudio = {
    open(panel, query) {
      if (panel === "busca") searchView(query || "");
      else (openers[panel] || listLaws)();
    },
    match: search,
    hitsBubble,
    compareFromText,
  };
})();
