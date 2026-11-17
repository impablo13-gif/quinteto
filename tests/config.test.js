/* Configuracion por equipo (fase 8): reglas, posiciones y fases de gol. */
import test from "node:test";
import assert from "node:assert/strict";
import { applyConfig, normalizeConfig, isDefaultConfig, templateOf, selectablePhases, phasesInUse, pluralLabel, DEFAULT_RULES, OTHER_PHASE_GROUP } from "../src/domain/config.js";
import { GOAL_PHASES, GOAL_PHASE_GROUPS } from "../src/domain/catalog.js";
import { POS_LABEL, halfMinutesFor } from "../src/domain/match.js";

const snapshot = () => JSON.stringify({ phases: GOAL_PHASES, groups: GOAL_PHASE_GROUPS, pos: POS_LABEL });

test("sin config, todo queda exactamente como de serie", () => {
  const before = snapshot();
  applyConfig(null);
  assert.equal(snapshot(), before);
  applyConfig({ rules: { halfMinutes: 25 }, positions: { ALA: "Extremo" }, phases: { ABP: { hidden: true } } });
  assert.notEqual(snapshot(), before);
  applyConfig(undefined);
  assert.equal(snapshot(), before, "volver a null restaura los catalogos");
  assert.equal(isDefaultConfig(null), true);
  assert.equal(isDefaultConfig({ rules: { ...DEFAULT_RULES } }), true);
  assert.equal(isDefaultConfig({ rules: { halfMinutes: 25 } }), false);
});

test("normalizeConfig limpia valores fuera de rango o mal escritos", () => {
  const c = normalizeConfig({ rules: { halfMinutes: 999, overtimeHalfMinutes: "x", timeoutsPerHalf: -3, foulsForDoublePenalty: 6.6, runningClock: "si" } });
  assert.deepEqual(c.rules, { halfMinutes: 60, overtimeHalfMinutes: 3, timeoutsPerHalf: 0, foulsForDoublePenalty: 7, runningClock: false });
  const p = normalizeConfig({ positions: { POR: "<b>Meta</b>", XXX: "Nada" }, customPhases: [{ key: "ABP" }, { key: "  Saque  de banda " , group: 99 }, null] });
  assert.deepEqual(p.positions, { POR: "bMeta/b" });
  assert.deepEqual(p.customPhases, [{ key: "Saque de banda", group: OTHER_PHASE_GROUP }], "no se duplica una fase de serie y el grupo se acota");
});

test("plantillas de reglas", () => {
  assert.equal(templateOf(DEFAULT_RULES), "estandar");
  assert.equal(templateOf({ ...DEFAULT_RULES, halfMinutes: 25, runningClock: true }), "formacion");
  assert.equal(templateOf({ ...DEFAULT_RULES, halfMinutes: 22 }), "personalizada");
});

test("etiquetas nuevas sin cambiar claves; fases ocultas y añadidas", () => {
  applyConfig({
    positions: { PIV: "Boya" },
    phases: { "5x4": { label: "Portero-jugador" }, "En propia": { hidden: true }, "Saque de banda": { label: "Banda" } },
    customPhases: [{ key: "Saque de banda", group: 1 }],
  });
  try {
    assert.equal(POS_LABEL.PIV, "Boya");
    const pj = GOAL_PHASES.find((p) => p.key === "5x4");
    assert.equal(pj.label, "Portero-jugador", "la clave sigue siendo 5x4");
    const banda = GOAL_PHASES.find((p) => p.key === "Saque de banda");
    assert.equal(banda.label, "Banda");
    assert.equal(GOAL_PHASES.indexOf(banda), 1, "la fase nueva va junto a las de su grupo");
    assert.ok(GOAL_PHASE_GROUPS.find((g) => g.id === 1).label.includes("Banda"));
    assert.equal(selectablePhases().some((p) => p.key === "En propia"), false, "una oculta no se ofrece al anotar");
    assert.equal(selectablePhases("En propia").some((p) => p.key === "En propia"), true, "salvo en el gol que ya la lleva");
    assert.equal(GOAL_PHASES.length, 13, "ocultar no quita la fase del historico");
  } finally { applyConfig(null); }
});

test("fases con goles guardados", () => {
  const used = phasesInUse([{ goalEvents: [{ phase: "ABP" }, { phase: "ABP" }, { phase: "5x4" }] }, { goalEvents: [] }, {}]);
  assert.equal(used.get("ABP"), 2);
  assert.equal(used.get("5x4"), 1);
  assert.equal(used.has("4x3"), false);
});

test("prórroga configurable; los partidos antiguos siguen con 3'", () => {
  assert.equal(halfMinutesFor(1, 20), 20);
  assert.equal(halfMinutesFor(3, 20), 3);
  assert.equal(halfMinutesFor(3, 20, 5), 5);
  assert.equal(halfMinutesFor(2, 25, 5), 25);
});

test("plural de las cabeceras del informe", () => {
  assert.deepEqual(["Portero", "Cierre", "Ala", "Pívot", "Universal", "Defensas"].map(pluralLabel), ["Porteros", "Cierres", "Alas", "Pívots", "Universales", "Defensas"]);
});
