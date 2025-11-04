export function redact(text) {
  return String(text ?? "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/(?:\+?\s*258|00258)[\s().-]*\d[\d\s().-]{6,}\d/g, "[telefone]")
    .replace(/\b\d{8,}\b/g, "[número]");
}
