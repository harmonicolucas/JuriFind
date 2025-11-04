const { writeFileSync } = require("node:fs");

const base = process.env.API_BASE || "";
writeFileSync(
  "web/config.js",
  `window.JURIFIND_CONFIG = ${JSON.stringify({ apiBase: base })};\n`,
);
