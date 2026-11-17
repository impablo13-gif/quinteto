import test from "node:test";
import assert from "node:assert/strict";
import { describeLastRecord } from "../src/live/lastRecord.js";

const players = [{ id: "p4", name: "Cierre Cuatro", number: 4 }, { id: "p7", name: "Ala Siete", number: 7 }];

test("sin registros no hay linea", () => {
  assert.equal(describeLastRecord(null, { players }), null);
});

test("gol a favor: autor, fase, asistencia, zona y minuto", () => {
  const goalEvents = [{ id: "g1", type: "for", authorId: "p4", assistId: "p7", phase: "ABP", zone: "f5-centro", remaining: 751 }];
  assert.deepEqual(describeLastRecord({ kind: "goal", id: "g1" }, { players, goalEvents }), {
    label: "Gol", detail: "4 · Cierre Cuatro · ABP · asist. Ala Siete · Ataque centro · 12:31", tone: "accent",
  });
});

test("gol rival y autogol del rival", () => {
  const goalEvents = [{ id: "g2", type: "against", phase: "5x4", remaining: 60 }, { id: "g3", type: "for", ownGoal: true, phase: "En propia" }];
  assert.deepEqual(describeLastRecord({ kind: "goal", id: "g2" }, { goalEvents }), { label: "Gol rival", detail: "5x4 · 01:00", tone: "negative" });
  assert.equal(describeLastRecord({ kind: "goal", id: "g3" }, { goalEvents }).detail, "Autogol del rival · En propia");
});

test("accion con zona y minuto (via disciplina) y su color de significado", () => {
  const disciplineEvents = [{ id: "d1", type: "fouls", zone: "f2-izq", remaining: 300 }];
  assert.deepEqual(describeLastRecord({ kind: "action", playerId: "p7", key: "fouls", discId: "d1" }, { players, disciplineEvents }), {
    label: "Falta cometida", detail: "7 · Ala Siete · Defensa izquierda · 05:00", tone: "negative",
  });
  assert.equal(describeLastRecord({ kind: "action", playerId: "p4", key: "recoveries" }, { players }).tone, "positive");
  assert.equal(describeLastRecord({ kind: "action", playerId: "p4", key: "yellow" }, { players }).tone, "warning");
});

test("tiempo muerto", () => {
  const timeouts = [{ id: "t1", team: "against", remaining: 900 }];
  assert.deepEqual(describeLastRecord({ kind: "timeout", id: "t1" }, { timeouts }), { label: "Tiempo muerto", detail: "rival · 15:00", tone: "neutral" });
});
