/* La identidad vive en src/brand/tokens.js: aqui se comprueba que sus pares
 * de color se leen (WCAG AA) y que la interfaz no escribe colores a mano. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE, PAPER, alpha, rgbTriplet } from "../src/brand/tokens.js";

const lum = (hex) => {
  const c = rgbTriplet(hex).split(",").map((x) => Number(x) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

test("contraste AA (4,5:1) de los pares que usa la interfaz", () => {
  const P = PALETTE;
  const pairs = [
    ["texto / fondo", P.text, P.bg], ["texto / superficie 3", P.text, P.surface3], ["secundario / fondo", P.textMuted, P.bg],
    ["secundario / superficie 2", P.textMuted, P.surface2], ["marca / fondo", P.accent, P.bg], ["tinta / marca", P.ink, P.accent],
    ["positivo / fondo", P.positive, P.bg], ["negativo / fondo", P.negative, P.bg], ["aviso / fondo", P.warning, P.bg],
    ["portero / fondo", P.gk, P.bg], ["tinta / negativo", P.ink, P.negative], ["tinta / positivo", P.ink, P.positive],
    ["tinta / aviso", P.ink, P.warning], ["tinta / portero", P.ink, P.gk], ["tinta / info", P.ink, P.info],
    ["marca en papel / blanco", PAPER.accent, PAPER.bg], ["tinta papel / blanco", PAPER.ink, PAPER.bg],
  ];
  const fails = pairs.filter(([, a, b]) => ratio(a, b) < 4.5).map(([n, a, b]) => `${n}: ${ratio(a, b).toFixed(2)}`);
  assert.deepEqual(fails, []);
});

test("el blanco sobre la marca NO se usa: no llega al minimo", () => {
  assert.ok(ratio(PALETTE.white, PALETTE.accent) < 4.5);
});

test("alpha() y rgbTriplet() convierten bien", () => {
  assert.equal(rgbTriplet("#C6F432"), "198,244,50");
  assert.equal(alpha("#0E1110", 0.5), "rgba(14,17,16,0.5)");
});

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// Los informes (HTML para PDF) y sus generadores pasan a tokens en la fase 7.
const PENDING_PHASE_7 = /^$/; // fase 7 hecha: ya no hay excepciones
const COLOR = /#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b(?![0-9A-Fa-f-])|rgba?\(\s*\d/;
function walk(dir, out = []) {
  for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) walk(p, out); else if (/\.(jsx?|css)$/.test(n)) out.push(p); }
  return out;
}

test("ningun color escrito a mano en la interfaz fuera de src/brand", () => {
  const hits = [];
  for (const f of walk(join(ROOT, "src"))) {
    const rel = relative(ROOT, f).split("\\").join("/");
    if (rel.startsWith("src/brand/") || PENDING_PHASE_7.test(rel)) continue;
    readFileSync(f, "utf8").split(/\r?\n/).forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, "");
      if (COLOR.test(code)) hits.push(`${rel}:${i + 1}: ${line.trim().slice(0, 100)}`);
    });
  }
  assert.deepEqual(hits, [], "Colores literales:\n" + hits.join("\n"));
});
