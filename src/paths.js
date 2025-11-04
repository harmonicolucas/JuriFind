import path from "node:path";

const ALLOWED = new Set([".html", ".css", ".js", ".svg", ".txt", ".png", ".webp", ".ico"]);

export function safeWebPath(root, urlPath) {
  let decoded = urlPath.split("?")[0];
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const rootResolved = path.resolve(root);
  const requested = decoded === "/" ? "/index.html" : decoded;
  const full = path.resolve(rootResolved, `.${requested}`);
  if (full !== rootResolved && !full.startsWith(rootResolved + path.sep)) return null;
  const extension = path.extname(full).toLowerCase();
  if (!ALLOWED.has(extension)) return null;
  return full;
}
