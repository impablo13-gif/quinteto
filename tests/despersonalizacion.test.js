/* Quinteto no debe llevar referencias a un club concreto ni a la app de la
 * que procede, salvo en la capa de compatibilidad que lee sus archivos y su
 * base de datos (src/data/formats.js y src/data/migrate.js). */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// «npa» como palabra o prefijo (NPA Stats, npa-stats, npaSync), sin cazar
// palabras que solo lo contienen (beginPath, JsonPayload).
const FORBIDDEN_NPA = /(?:npa|NPA|Npa)(?![a-z])/;
const FORBIDDEN = /noia|portus|ap[oó]stol|santoro|segundo cerebro/i;
const ALLOWED = new Set(["src/data/formats.js", "src/data/migrate.js"]);
const TEXT = /\.(js|jsx|mjs|css|html|svg|json)$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (TEXT.test(name)) out.push(p);
  }
  return out;
}

test("sin referencias a NPA ni al club fuera de la capa de compatibilidad", () => {
  const files = [
    ...walk(join(ROOT, "src")), ...walk(join(ROOT, "public")), ...walk(join(ROOT, "tools")),
    join(ROOT, "index.html"), join(ROOT, "vite.config.js"), join(ROOT, "package.json"),
  ];
  const hits = [];
  for (const f of files) {
    const rel = relative(ROOT, f).split("\\").join("/");
    if (ALLOWED.has(rel)) continue;
    readFileSync(f, "utf8").split(/\r?\n/).forEach((line, i) => {
      if (FORBIDDEN_NPA.test(line) || FORBIDDEN.test(line)) hits.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  assert.deepEqual(hits, [], "Referencias encontradas:\n" + hits.join("\n"));
});
