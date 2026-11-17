/* Paleta de papel de los informes y tema con los colores del club. */
import test from "node:test";
import assert from "node:assert/strict";
import { REPORT, contrastRatio, reportTheme, isHexColor } from "../src/brand/tokens.js";

test("textos del informe sobre papel con contraste AA (4,5:1)", () => {
  const pairs = [
    ["ink", "bg"], ["inkSoft", "bg"], ["muted", "bg"], ["accent", "bg"], ["positive", "bg"], ["negative", "bg"], ["info", "bg"],
    ["warning", "bg"], ["yellowInk", "bg"], ["courtLabel", "bg"], ["positive", "positiveBg"], ["negative", "negativeBg"], ["info", "infoBg"],
    ["muted", "soft"], ["onDark", "ink"],
  ];
  const bad = pairs.map(([f, b]) => [f, b, contrastRatio(REPORT[f], REPORT[b])]).filter(([, , r]) => r < 4.5);
  assert.deepEqual(bad, []);
});

test("sin colores de club: cabecera en tinta y franja de la marca", () => {
  const t = reportTheme(null);
  assert.equal(t.clubColors, false);
  assert.equal(t.title, REPORT.accent);
  assert.equal(t.onHeader, REPORT.onDark);
  assert.equal(t.stripe, REPORT.brand);
});

test("con colores de club: títulos legibles sobre papel y texto legible en la cabecera", () => {
  for (const primary of ["#C0202E", "#F5D90A", "#FFFFFF", "#000000", "#2DD4BF", "#1E3A8A", "#FF7F00"]) {
    const t = reportTheme({ primary });
    assert.ok(contrastRatio(t.title, REPORT.bg) >= 4.5, `título con ${primary}`);
    assert.ok(contrastRatio(t.onHeader, primary) >= Math.min(4.5, contrastRatio(REPORT.ink, primary), contrastRatio(REPORT.onDark, primary)) - 1e-9, `cabecera con ${primary}`);
  }
});

test("un color mal escrito se ignora", () => {
  assert.equal(isHexColor("#C0202E"), true);
  for (const v of ["red", "#FFF", "#GGGGGG", "#C0202E;x", null, 7]) assert.equal(isHexColor(v), false);
  assert.equal(reportTheme({ primary: "url(x)" }).clubColors, false);
});
