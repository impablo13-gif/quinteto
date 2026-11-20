/* Importar jugadores desde .json y acciones de portero. */
import test from "node:test";
import assert from "node:assert/strict";
import { parseRosterFile, mergeRoster, normalizePosition, isPlaceholderRoster, toPlayer } from "../src/domain/rosterImport.js";
import { emptyStats, hasActivity, defaultRoster } from "../src/domain/match.js";
import { describeLastRecord } from "../src/live/lastRecord.js";

const PHOTO = "data:image/jpeg;base64,AAAA";

test("posiciones en español o inglés", () => {
  assert.deepEqual(["Portero", "POR", "cierre", "Pívot", "pivot", "Ala", "Universal", "", "otra"].map((v) => normalizePosition(v)), ["POR", "POR", "CIE", "PIV", "PIV", "ALA", "ALA", "ALA", "ALA"]);
  assert.equal(normalizePosition("Ala", true), "POR");
});

test("lista simple, objeto con jugadores y campos variados", () => {
  const a = parseRosterFile([{ nombre: "Ana", apellidos: "Pérez", dorsal: "7", posicion: "Cierre", foto: PHOTO }, { name: "Bea", number: 9 }, { dorsal: 3 }, null]);
  assert.equal(a.groups.length, 1);
  assert.deepEqual(a.groups[0].players, [{ name: "Ana Pérez", number: 7, position: "CIE", photo: PHOTO }, { name: "Bea", number: 9, position: null, photo: null }]);
  const b = parseRosterFile({ equipo: "Juvenil", jugadores: [{ nombre: "<b>Cris</b>", dorsal: "x", foto: "javascript:alert(1)" }] });
  assert.equal(b.groups[0].label, "Juvenil");
  assert.deepEqual(b.groups[0].players[0], { name: "bCris/b", number: null, position: null, photo: null }, "sin HTML, sin dorsal inválido, sin fotos peligrosas");
  assert.deepEqual(parseRosterFile({ hola: 1 }).groups, []);
  assert.equal(toPlayer({ name: "   " }), null);
});

test("copia de seguridad (Quinteto o NPA Stats): una plantilla por equipo", () => {
  const backup = { formato: "npa-stats-copia", datos: {
    teams: JSON.stringify([{ id: "t1", name: "Senior" }, { id: "t2", name: "Juvenil" }]),
    "roster:t1": JSON.stringify([{ id: "p1", name: "Ana", number: 1, position: "POR", isGK: true }]),
    "roster:t2": JSON.stringify([{ id: "p2", name: "Bea", number: 5, position: "PIV" }, { id: "p3", name: "Cris", number: 6, position: "CIE" }]),
    "matches:t1:x": "{}",
  } };
  const { groups } = parseRosterFile(backup);
  assert.deepEqual(groups.map((g) => [g.label, g.players.length]), [["Senior", 1], ["Juvenil", 2]]);
  assert.equal(groups[0].players[0].position, "POR");
});

test("copia del planificador: agrupa por equipo", () => {
  const plan = { localStorage: { "noia-plan:players": JSON.stringify([
    { id: "a", nombre: "Ana", dorsal: "1", posicion: "Portero", equipo: "Juvenil" },
    { id: "b", nombre: "Bea", dorsal: "8", posicion: "Ala", equipo: "Senior" },
    { id: "c", nombre: "Cris", dorsal: "", posicion: "Pívot", equipo: "Juvenil" },
  ]), "noia-plan:otra": "[1,2]" } };
  const { groups } = parseRosterFile(plan);
  assert.deepEqual(groups.map((g) => [g.label, g.players.map((p) => p.name)]), [["Juvenil", ["Ana", "Cris"]], ["Senior", ["Bea"]]]);
});

test("unir: actualiza por nombre, añade nuevos, no borra a nadie", () => {
  let n = 0; const id = () => `new${++n}`;
  const current = [{ id: "p1", name: "Ana Pérez", number: 7, position: "ALA", isGK: false, photo: null }, { id: "p2", name: "Bea", number: 9, position: "CIE", isGK: false, photo: PHOTO }];
  const incoming = [{ name: "ana perez", number: 10, position: "POR", photo: PHOTO }, { name: "Cris", number: null, position: "PIV", photo: null }, { name: "Cris", number: 4, position: "ALA", photo: null }];
  const r = mergeRoster(current, incoming, "merge", id);
  assert.equal(r.added, 1); assert.equal(r.updated, 1); assert.equal(r.removed, 0);
  assert.deepEqual(r.roster.map((p) => [p.id, p.name, p.number, p.position, p.isGK, !!p.photo]), [
    ["p1", "Ana Pérez", 10, "POR", true, true],
    ["p2", "Bea", 9, "CIE", false, true],
    ["new1", "Cris", 1, "PIV", false, false],
  ], "mismo id para quien ya estaba (sus partidos siguen enlazados); el repetido del archivo se ignora; dorsal libre si no trae");
  const rep = mergeRoster(current, incoming, "replace", id);
  assert.deepEqual(rep.roster.map((p) => p.name), ["Ana Pérez", "Cris"]);
  assert.equal(rep.roster[0].id, "p1");
  assert.equal(rep.removed, 1);
  const keep = mergeRoster(current, [{ name: "Bea", number: null, position: null, photo: null }], "merge", id);
  assert.equal(keep.roster[1].position, "CIE", "sin posición en el archivo se conserva la que tenía");
  assert.equal(keep.updated, 0);
  assert.equal(mergeRoster([], [{ name: "Nuevo", number: 3, position: null, photo: null }], "merge", id).roster[0].position, "ALA");
});

test("plantilla de ejemplo de un equipo nuevo", () => {
  assert.equal(isPlaceholderRoster(defaultRoster()), true);
  assert.equal(isPlaceholderRoster([{ name: "Ana" }]), false);
  assert.equal(isPlaceholderRoster([]), false);
});

test("acciones de portero: cuentan como actividad y salen en «Último»", () => {
  ["gkOneVsOne", "gkInterceptions", "gkDistOk", "gkDistBad"].forEach((k) => {
    assert.equal(emptyStats()[k], 0);
    assert.ok(hasActivity({ ...emptyStats(), [k]: 1 }));
  });
  const players = [{ id: "g", name: "Meta", number: 1 }];
  const r = describeLastRecord({ kind: "action", playerId: "g", key: "gkOneVsOne", half: 1 }, { players });
  assert.match(r.label + " " + r.detail, /1x1 ganado/);
  assert.equal(r.tone, "positive");
  assert.equal(describeLastRecord({ kind: "action", playerId: "g", key: "gkDistBad", half: 1 }, { players }).tone, "negative");
});

/* ---- Análisis › Informes: CSV de eventos ---- */
import { matchSecondOf, matchEventsRows, matchEventsCsv, matchPlayersCsv } from "../src/reports/csv.js";
import { ALL as FIXTURES } from "./fixtures/partidos.js";

test("segundo de partido: suma las partes anteriores", () => {
  const m = { halfLength: 20 };
  assert.equal(matchSecondOf(m, 1, 1200), 0);
  assert.equal(matchSecondOf(m, 1, 600), 600);
  assert.equal(matchSecondOf(m, 2, 1200), 1200);
  assert.equal(matchSecondOf(m, 3, 120), 2460, "prórroga de 3' tras 2x20");
  assert.equal(matchSecondOf({ halfLength: 20, overtimeLength: 5 }, 4, 300), 2700);
  assert.equal(matchSecondOf(m, 1, undefined), null);
});

test("CSV de eventos de los partidos de prueba: todo, en orden y sin duplicar faltas", () => {
  Object.values(FIXTURES).forEach(({ match: m }) => {
    const rows = matchEventsRows(m);
    const expected = (m.goalEvents || []).length + (m.disciplineEvents || []).length
      + (m.zonedEvents || []).filter((z) => z.key !== "fouls" && z.key !== "foulsReceived").length
      + (m.timeouts || []).length + 2 * (m.rotations || []).length;
    assert.equal(rows.length, expected);
    const ts = rows.map((r) => r.t).filter((t) => t != null);
    assert.deepEqual(ts, [...ts].sort((a, b) => a - b), "orden de juego");
    const csv = matchEventsCsv(m);
    assert.ok(csv.startsWith("﻿\"parte\";\"reloj\";\"segundo_partido\""));
    assert.equal(csv.split("\r\n").length, expected + 1);
    assert.ok(matchPlayersCsv(m).includes("\"Paradas\""));
  });
});
