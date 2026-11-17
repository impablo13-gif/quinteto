/* Fase 8: comprobacion de datos, temporada/competicion/rival, situaciones
 * especiales y comparador. */
import test from "node:test";
import assert from "node:assert/strict";
import { matchChecks } from "../src/domain/checks.js";
import { seasonOf, competitionsIn, rivalKey, rivalsIn, filterMatches, headToHead, specialSituations, seasonsIn, ALL, NO_COMPETITION } from "../src/domain/filters.js";
import { ALL as FIXTURES } from "./fixtures/partidos.js";

const players = [{ id: "a", name: "Ana", number: 7 }, { id: "b", name: "Bea", number: 9 }, { id: "c", name: "Cris", number: 11 }];

test("comprobación: partido limpio no da avisos", () => {
  const out = matchChecks({
    goalEvents: [{ type: "for", phase: "ABP", authorId: "a", onCourt: [{ id: "a" }, { id: "b" }] }, { type: "against", phase: "4x3" }],
    teamGoals: 1, rivalScore: 1, players, convocados: ["a", "b"],
    stats: { a: { seconds: 100 }, b: { seconds: 50 } },
    statsByHalf: { 1: { a: { fouls: 2 }, b: { fouls: 1 } } }, teamFouls: { 1: 3 },
  });
  assert.deepEqual(out, []);
});

test("comprobación: avisa de lo que no cuadra", () => {
  const out = matchChecks({
    goalEvents: [
      { type: "for", phase: "", authorId: "c", authorName: "Cris", assistId: "b", assistName: "Bea", onCourt: [{ id: "a" }, { id: "b" }] },
      { type: "for", phase: "En propia", ownGoal: true, onCourt: [{ id: "a" }] },
    ],
    teamGoals: 3, rivalScore: 1, players, convocados: ["a", "b", "c"],
    stats: { a: { seconds: 100 }, b: { seconds: 0 } },
    statsByHalf: { 1: { a: { fouls: 1 } } }, teamFouls: { 1: 3, 2: 0 },
  });
  const txt = out.map((c) => c.text).join("\n");
  assert.match(txt, /3 a favor, pero hay 2 goles a favor/);
  assert.match(txt, /1 en contra, pero hay 0 goles en contra/);
  assert.match(txt, /1 gol sin fase/);
  assert.match(txt, /gol de Cris está anotado a alguien que no estaba en pista/);
  assert.equal(/asistencia de Bea/.test(txt), false, "Bea sí estaba en pista");
  assert.match(txt, /2 convocados no han jugado: 9 · Bea, 11 · Cris/);
  assert.match(txt, /En la 1ª parte hay 3 faltas acumuladas y 1 anotada/);
  assert.equal(/2ª parte/.test(txt), false, "0 y 0 cuadra");
  assert.ok(out.every((c) => c.level === "warn" || c.level === "info"));
});

test("comprobación: los partidos de prueba se pueden revisar sin romperse", () => {
  Object.values(FIXTURES).forEach((fx) => {
    const m = fx.match;
    const out = matchChecks({ goalEvents: m.goalEvents || [], teamGoals: m.teamGoals, rivalScore: m.rivalScore, players: fx.roster, convocados: null, stats: {}, statsByHalf: {}, teamFouls: m.teamFouls || {} });
    assert.ok(Array.isArray(out));
  });
});

test("temporada de julio a junio; se respeta la que traiga el partido", () => {
  assert.equal(seasonOf({ date: "2026-06-30T18:00:00.000Z" }), "2025-26");
  assert.equal(seasonOf({ date: "2026-07-01T10:00:00.000Z" }), "2026-27");
  assert.equal(seasonOf({ date: "2027-01-15T10:00:00.000Z" }), "2026-27");
  assert.equal(seasonOf({ date: "2099-09-01T10:00:00.000Z" }), "2099-00");
  assert.equal(seasonOf({ date: "2026-10-01", season: "Liga 26" }), "Liga 26");
  assert.equal(seasonOf({}), "Sin fecha");
  assert.deepEqual(seasonsIn([{ date: "2025-10-01" }, { date: "2026-10-01" }, { date: "2026-11-01" }]), ["2026-27", "2025-26"]);
});

test("competición y rival normalizados", () => {
  const ms = [
    { date: "2026-10-01", competition: "Liga regular", rivalName: "C.D. Ríos" },
    { date: "2026-10-08", competition: " liga  regular ", rivalName: "cd rios" },
    { date: "2026-10-15", competition: "Copa", rivalName: "Otro" },
    { date: "2026-10-22", rivalName: "CD Ríos " },
  ];
  assert.deepEqual(competitionsIn(ms), ["Liga regular", "Copa"]);
  assert.equal(rivalKey("C.D. Ríos"), rivalKey("cd  RIOS"));
  assert.deepEqual(rivalsIn(ms).map((r) => [r.label, r.n]), [["C.D. Ríos", 3], ["Otro", 1]]);
  assert.equal(filterMatches(ms, { competition: "LIGA REGULAR" }).length, 2);
  assert.equal(filterMatches(ms, { competition: NO_COMPETITION }).length, 1);
  assert.equal(filterMatches(ms, { rival: rivalKey("cd rios") }).length, 3);
  assert.equal(filterMatches(ms, { season: ALL, competition: ALL, rival: ALL }).length, 4, "sin filtros, todos");
  assert.equal(filterMatches(ms, { season: "2025-26" }).length, 0);
});

test("cara a cara y situaciones especiales con los partidos de prueba", () => {
  const ms = Object.values(FIXTURES).map((fx) => fx.match);
  const key = rivalKey(ms[0].rivalName);
  const h = headToHead(ms, key);
  const same = ms.filter((m) => rivalKey(m.rivalName) === key);
  assert.equal(h.summary.played, same.length);
  assert.equal(h.summary.gf, same.reduce((s, m) => s + (Number(m.teamGoals) || 0), 0));
  const sp = specialSituations(ms);
  const all = ms.flatMap((m) => m.goalEvents || []);
  sp.forEach((r) => {
    assert.equal(r.favor, all.filter((g) => g.type === "for" && g.phase === r.key).length);
    assert.equal(r.contra, all.filter((g) => g.type === "against" && g.phase === r.key).length);
    assert.equal(r.diff, r.favor - r.contra);
  });
});
