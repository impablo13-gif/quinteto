/* Motor de análisis por visiones (src/domain/insights.js). */
import test from "node:test";
import assert from "node:assert/strict";
import {
  matchMetrics, trend, dangerousTurnovers, recoveryToShot, zoneEfficiency, concededBreakdown, stintProfile,
  loadWindows, minutesShare, disciplineTable, playerSeasons, goalkeeperRows, dataHealth, compareWithActa,
  evaluateObjectives, keyFacts, matchDurationSeconds, isOwnHalfZone,
} from "../src/domain/insights.js";
import { ALL as FIXTURES } from "./fixtures/partidos.js";

const P = (id, name, number, extra = {}) => ({ id, name, number, position: "ALA", isGK: false, seconds: 0, goals: 0, assists: 0, fouls: 0, foulsReceived: 0, yellow: 0, red: 0, saves: 0, turnovers: 0, recoveries: 0, shotsOn: 0, shotsOff: 0, shotsPost: 0, ...extra });

// Partido hecho a mano: 2x20. remaining = lo que marcaba el reloj.
const base = () => ({
  date: "2026-10-10T18:00:00.000Z", rivalName: "Rival", halfLength: 20, teamGoals: 1, rivalScore: 2,
  players: [
    P("g", "Meta", 1, { position: "POR", isGK: true, seconds: 2400, saves: 6, gkDistOk: 3, gkDistBad: 1 }),
    P("a", "Ana", 7, { seconds: 1500, goals: 1, shotsOn: 2, turnovers: 2, recoveries: 2 }),
    P("b", "Bea", 9, { seconds: 900, shotsOff: 1, fouls: 2, yellow: 1 }),
    P("c", "Cris", 11, { seconds: 0 }),
  ],
  convocados: [{ id: "g", name: "Meta", number: 1 }, { id: "a", name: "Ana", number: 7 }, { id: "b", name: "Bea", number: 9 }, { id: "c", name: "Cris", number: 11 }],
  goalEvents: [
    { id: "g1", type: "against", phase: "Transición", half: 1, remaining: 1000, onCourt: [{ id: "g", name: "Meta", number: 1 }, { id: "a", name: "Ana", number: 7 }] },
    { id: "g2", type: "for", phase: "ABP", half: 1, remaining: 800, authorId: "a", authorName: "Ana", zone: "f5-centro", onCourt: [{ id: "a" }] },
    { id: "g3", type: "against", phase: "Transición", half: 2, remaining: 200, onCourt: [{ id: "g", name: "Meta", number: 1 }, { id: "b", name: "Bea", number: 9 }] },
  ],
  zonedEvents: [
    { key: "turnovers", half: 1, remaining: 1012, zone: "f2-izq", playerId: "a", playerName: "Ana", playerNumber: 7 }, // 12" antes del gol en contra
    { key: "turnovers", half: 1, remaining: 700, zone: "f5-der", playerId: "a" }, // campo rival: no cuenta
    { key: "recoveries", half: 1, remaining: 820, zone: "f4-centro", playerId: "a" }, // 20" antes del gol: no (ventana 10")
    { key: "recoveries", half: 2, remaining: 600, zone: "f3-izq", playerId: "a" },
    { key: "shotsOn", half: 2, remaining: 594, zone: "f5-centro", playerId: "a" }, // 6" después: sí
    { key: "shotsOn", half: 2, remaining: 400, zone: "f6-centro", playerId: "a" },
    { key: "shotsOff", half: 2, remaining: 300, zone: "f4-izq", playerId: "b" },
  ],
  rotations: [
    { playerId: "a", playerName: "Ana", playerNumber: 7, half: 1, startRemaining: 1200, endRemaining: 900, durationSeconds: 300 },
    { playerId: "a", playerName: "Ana", playerNumber: 7, half: 1, startRemaining: 780, endRemaining: 0, durationSeconds: 780 },
    { playerId: "a", playerName: "Ana", playerNumber: 7, half: 2, startRemaining: 1200, endRemaining: 780, durationSeconds: 420 },
    { playerId: "b", playerName: "Bea", playerNumber: 9, half: 1, startRemaining: 900, endRemaining: 780, durationSeconds: 120 },
  ],
  teamFouls: { 1: 1, 2: 1 },
  halves: [],
});

test("zonas de campo propio y rival", () => {
  assert.ok(isOwnHalfZone("f1-izq") && isOwnHalfZone("f3-der") && isOwnHalfZone("def-centro"));
  assert.ok(!isOwnHalfZone("f4-izq") && !isOwnHalfZone("ataque-der") && !isOwnHalfZone(undefined));
});

test("secuencias: pérdida peligrosa y recuperación que acaba en tiro", () => {
  const m = base();
  const dt = dangerousTurnovers(m);
  assert.equal(dt.length, 1);
  assert.equal(dt[0].gap, 12);
  const rs = recoveryToShot(m);
  assert.equal(rs.length, 1);
  assert.equal(rs[0].gap, 6);
  assert.equal(recoveryToShot(m, 30).length, 2, "con ventana de 30\" entra la del gol");
});

test("métricas del partido y portero", () => {
  const mm = matchMetrics(base());
  assert.equal(mm.gf, 1); assert.equal(mm.ga, 2);
  assert.equal(mm.finishes, 4); // 1 gol + 2 a puerta + 1 fuera
  assert.equal(mm.efficiency, 0.25);
  assert.equal(mm.turnoversOwnHalf, 1);
  assert.equal(mm.dangerousTurnovers, 1); assert.equal(mm.recoveryToShot, 1);
  assert.equal(mm.gaLate, 1, "el de la 2ª parte con 3'20\" por jugar");
  assert.equal(mm.saves, 6); assert.equal(mm.conceded, 2); assert.equal(mm.savePct, 0.75);
  const gk = goalkeeperRows(base());
  assert.equal(gk.length, 1);
  assert.equal(gk[0].distPct, 0.75);
  assert.equal(matchDurationSeconds(base()), 2400);
});

test("tandas: número, media, máxima y descanso entre tandas", () => {
  const sp = stintProfile(base());
  const ana = sp.find((p) => p.name === "Ana");
  assert.equal(ana.count, 3);
  assert.equal(ana.max, 780);
  assert.equal(ana.total, 1500);
  assert.equal(ana.restMean, 120, "en la 1ª: sale a 15:00 y vuelve a 13:00");
  assert.equal(ana.longStints, 3, "las tres tandas son de 4' o más");
  assert.equal(sp.find((p) => p.name === "Bea").restMean, null);
});

test("efectividad por zona y goles en contra", () => {
  const z = zoneEfficiency([base()]);
  const ataque = z.find((r) => r.zone === "ataque-centro");
  assert.equal(ataque.goals, 1); assert.equal(ataque.shotsOn, 2); assert.equal(ataque.finishes, 3);
  assert.equal(Math.round(ataque.pct * 100), 33);
  assert.equal(zoneEfficiency([base()], "fine").length, 18);
  const c = concededBreakdown([base()]);
  assert.equal(c.total, 2);
  assert.deepEqual(c.phases.map((p) => [p.phase, p.count]), [["Transición", 2]]);
  assert.equal(c.onCourt[0].name, "Meta"); assert.equal(c.onCourt[0].count, 2);
});

test("carga 7/14/28 días con entrenos y RPE, y aviso de semana alta", () => {
  const m1 = { ...base(), date: "2026-11-18T18:00:00.000Z", rpe: { a: 8 } };
  const m2 = { ...base(), date: "2026-10-30T18:00:00.000Z" };
  const tr = [{ date: "2026-11-17T18:00:00.000Z", players: [{ name: "Ana", number: 7, seconds: 3600 }] }];
  const l = loadWindows([m1, m2], tr, "2026-11-20T12:00:00.000Z");
  const ana = l.find((p) => p.name === "Ana");
  assert.equal(ana.m7, 85); // 25' partido + 60' entreno
  assert.equal(ana.m28, 110); // + 25' del 30-10
  assert.equal(ana.s7, 200); // RPE 8 x 25'
  assert.equal(ana.weeklyAvg, 27.5);
  assert.equal(ana.alert, true);
});

test("reparto de minutos, disciplina y evolución por temporada", () => {
  const ms = minutesShare([base()]);
  const cris = ms.find((p) => p.name === "Cris");
  assert.equal(cris.called, 1); assert.equal(cris.played, 0); assert.equal(cris.share, 0);
  assert.equal(ms.find((p) => p.name === "Meta").share, 1);
  const d = disciplineTable([base()]);
  assert.deepEqual(d.map((x) => [x.name, x.yellow, x.fouls]), [["Bea", 1, 2]]);
  const ev = playerSeasons([base(), { ...base(), date: "2025-11-01T10:00:00.000Z" }], "Ana", 7);
  assert.deepEqual(ev.map((e) => [e.season, e.goals]), [["2025-26", 1], ["2026-27", 1]]);
});

test("tendencia, objetivos y claves automáticas", () => {
  const ms = [0, 1, 2, 3, 4, 5].map((i) => ({ ...base(), date: `2026-10-${10 + i}T18:00:00.000Z` }));
  const t = trend(ms, 3);
  assert.ok(t.every((r) => r.dir === "igual"), "partidos iguales: sin cambios");
  const obj = evaluateObjectives([{ metric: "turnoversOwnHalf", op: "<=", value: 0 }, { metric: "finishes", op: ">=", value: 4 }], base());
  assert.deepEqual(obj.map((o) => o.ok), [false, true]);
  const facts = keyFacts(base(), ms);
  assert.ok(facts.length >= 1 && facts.length <= 3);
  assert.match(facts.map((f) => f.text).join(" "), /pérdida en campo propio acabó en gol rival|2 de 2 goles en contra llegaron en Transición/);
});

test("calidad del dato y cotejo con el acta", () => {
  const h = dataHealth(base());
  assert.equal(h.zonedWithZone, 1); assert.equal(h.goalsWithPhase, 1); assert.equal(h.hasRotations, true);
  assert.ok(["verde", "ambar", "rojo"].includes(h.level));
  const sinRot = dataHealth({ ...base(), rotations: [] });
  assert.equal(sinRot.level, "rojo");
  const acta = compareWithActa(base(), { gf: 1, ga: 3, fouls1: "1", fouls2: "", yellow: 1 });
  assert.deepEqual(acta.map((a) => [a.label, a.ok]), [["Goles a favor", true], ["Goles en contra", false], ["Faltas acumuladas 1ª parte", true], ["Amarillas", true]]);
});

test("los partidos de prueba pasan por todo sin romperse", () => {
  const ms = Object.values(FIXTURES).map((f) => f.match);
  ms.forEach((m) => { matchMetrics(m); stintProfile(m); dataHealth(m); keyFacts(m, ms); goalkeeperRows(m); });
  assert.ok(zoneEfficiency(ms).length === 9);
  assert.ok(minutesShare(ms).length > 0);
  assert.ok(Array.isArray(loadWindows(ms, [], "2026-11-20")));
});

/* ---- Editor de eventos ---- */
import { editableEvents, deleteEvent, updateEvent, addEvent } from "../src/domain/eventEdit.js";

const withFoul = () => {
  const m = base();
  m.halves = [{ half: 1, players: m.players.map((p) => ({ ...p })) }, { half: 2, players: m.players.map((p) => ({ ...p, fouls: 0 })) }];
  m.disciplineEvents = [{ type: "fouls", half: 1, remaining: 500, zone: "f2-der", playerId: "b", playerName: "Bea", playerNumber: 9 }];
  m.zonedEvents = [...m.zonedEvents, { key: "fouls", half: 1, remaining: 500, zone: "f2-der", playerId: "b", playerName: "Bea", playerNumber: 9 }];
  return m;
};

test("editor: la falta con zona sale una vez y se borra con su pareja", () => {
  const m = withFoul();
  const list = editableEvents(m);
  assert.equal(list.filter((e) => e.key === "fouls").length, 1);
  const i = m.disciplineEvents.length - 1;
  const out = deleteEvent(m, "disciplineEvents", i);
  assert.equal(out.disciplineEvents.length, 0);
  assert.equal(out.zonedEvents.filter((z) => z.key === "fouls").length, 0);
  assert.equal(out.players.find((p) => p.id === "b").fouls, 1);
  assert.equal(out.halves[0].players.find((p) => p.id === "b").fouls, 1);
  assert.equal(out.teamFouls[1], 0);
  assert.equal(m.disciplineEvents.length, 1, "el original no se toca");
});

test("editor: cambiar de jugador mueve el contador; cambiar zona solo la zona", () => {
  const m = withFoul();
  const idx = m.zonedEvents.findIndex((z) => z.key === "turnovers");
  const bea = m.players.find((p) => p.id === "b");
  const out = updateEvent(m, "zonedEvents", idx, { player: bea, zone: "f1-centro" });
  assert.equal(out.players.find((p) => p.id === "a").turnovers, 1);
  assert.equal(out.players.find((p) => p.id === "b").turnovers, 1);
  assert.equal(out.zonedEvents[idx].playerName, "Bea");
  assert.equal(out.zonedEvents[idx].zone, "f1-centro");
  const onlyZone = updateEvent(m, "zonedEvents", idx, { zone: "f6-izq" });
  assert.deepEqual(onlyZone.players, m.players);
  const foulMoved = updateEvent(m, "disciplineEvents", 0, { player: m.players.find((p) => p.id === "a") });
  assert.equal(foulMoved.zonedEvents.find((z) => z.key === "fouls").playerName, "Ana", "la pareja también cambia");
});

test("editor: añadir una acción olvidada", () => {
  const m = withFoul();
  const ana = m.players.find((p) => p.id === "a");
  const out = addEvent(m, { key: "recoveries", player: ana, half: 2, remaining: 300, zone: "f4-der" });
  assert.equal(out.players.find((p) => p.id === "a").recoveries, 3);
  assert.equal(out.zonedEvents.length, m.zonedEvents.length + 1);
  const f = addEvent(m, { key: "fouls", player: ana, half: 2, remaining: 100, zone: "f3-izq" });
  assert.equal(f.teamFouls[2], 2);
  assert.equal(f.disciplineEvents.length, 2);
  assert.equal(f.zonedEvents.length, m.zonedEvents.length + 1);
  assert.equal(addEvent(m, { key: "goals", player: ana, half: 1, remaining: 0 }), m, "los goles van por su propio asistente");
});

/* ---- Informes por perfil ---- */
import { buildRoleReportHtml, ROLES } from "../src/reports/roleReport.js";

const textOf = (html) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");

test("informe por perfil: cada visión con sus secciones, escapado y sin romperse con los partidos de prueba", () => {
  const m = { ...base(), conclusions: "Presionar <alto>", rpe: { a: 7 }, acta: { gf: 1, ga: 2 } };
  const season = [m, { ...base(), date: "2026-10-01T18:00:00.000Z" }, { ...base(), date: "2026-10-03T18:00:00.000Z" }];
  const expect = {
    entrenador: ["Claves del partido", "Conclusiones", "Objetivos", "Qué nos marcan", "Comparado con la media"],
    analista: ["Línea de tiempo", "Finalizaciones por zona", "Secuencias"],
    direccion: ["Minutos de cada convocado", "Convocados sin minutos", "Disciplina"],
    fisico: ["Tandas en pista", "Portero", "Carga acumulada", "Esfuerzo percibido"],
    anotador: ["Calidad del dato", "Cotejo con el acta", "Eventos anotados"],
  };
  ROLES.forEach(({ key }) => {
    const html = buildRoleReportHtml({ role: key, match: m, season, teamName: "Equipo", objectives: [{ metric: "fouls", op: "<=", value: 3 }] });
    const t = textOf(html);
    expect[key].forEach((s) => assert.ok(t.includes(s), `${key}: falta «${s}»`));
    assert.equal(html.includes("<alto>"), false, "texto escapado");
  });
  Object.values(FIXTURES).forEach(({ match }) => ROLES.forEach(({ key }) => buildRoleReportHtml({ role: key, match, season: Object.values(FIXTURES).map((f) => f.match), teamName: "E" })));
});
