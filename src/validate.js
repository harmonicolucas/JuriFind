const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

export function normalizeCaseText(value) {
  return String(value ?? "").replace(CONTROL, "").trim();
}

export function validateRecommendInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "O pedido tem de ser um objecto JSON." };
  }
  const text = normalizeCaseText(body.text);
  if (text.length < 20) {
    return { ok: false, error: "Descreva o caso com pelo menos 20 caracteres. Não inclua números de identificação nem dados sensíveis desnecessários." };
  }
  if (text.length > 2000) {
    return { ok: false, error: "A descrição pode ter no máximo 2000 caracteres." };
  }
  if ((text.match(/https?:\/\//gi) || []).length > 2) {
    return { ok: false, error: "Retire os endereços web da descrição e conte o que aconteceu." };
  }
  const location = typeof body.location === "string" ? body.location.trim().slice(0, 80) : "";
  const area = typeof body.area === "string" ? body.area.trim().slice(0, 120) : "";
  return {
    ok: true,
    value: {
      text,
      location,
      area,
      strictLocation: body.strictLocation === true,
    },
  };
}
