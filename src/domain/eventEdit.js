/* Editor de eventos de un partido ya guardado (visión del anotador).
 *
 * Corregir una acción no es solo cambiar la fila: el contador del jugador (en
 * el total y en su parte), y en las faltas las faltas acumuladas, tienen que
 * moverse con ella, o el informe y el Excel dirían otra cosa. Estas funciones
 * devuelven el partido nuevo, coherente; no tocan el original.
 *
 * Una falta anotada con zona vive en dos listas (disciplineEvents y
 * zonedEvents, misma parte, minuto y jugador): se corrigen las dos juntas.
 */
const n = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

const samePlayer = (row, ref) => (row.id && ref.playerId ? row.id === ref.playerId : row.name === ref.playerName && String(row.number) === String(ref.playerNumber));

function bumpRows(rows, ref, key, delta) {
  return (rows || []).map((p) => (samePlayer(p, ref) ? { ...p, [key]: Math.max(0, n(p[key]) + delta) } : p));
}

function bumpMatch(m, ref, key, half, delta) {
  const out = { ...m, players: bumpRows(m.players, ref, key, delta) };
  if (Array.isArray(m.halves)) out.halves = m.halves.map((h) => (Number(h.half) === Number(half) ? { ...h, players: bumpRows(h.players, ref, key, delta) } : h));
  if (key === "fouls") out.teamFouls = { ...(m.teamFouls || {}), [half]: Math.max(0, n((m.teamFouls || {})[half]) + delta) };
  if (key === "foulsReceived") out.rivalTeamFouls = { ...(m.rivalTeamFouls || {}), [half]: Math.max(0, n((m.rivalTeamFouls || {})[half]) + delta) };
  return out;
}

const refOf = (ev) => ({ playerId: ev.playerId, playerName: ev.playerName, playerNumber: ev.playerNumber });
const pairKey = (ev) => `${ev.half}|${ev.remaining}|${ev.playerId || `${ev.playerName}#${ev.playerNumber}`}`;
const isFoulKey = (k) => k === "fouls" || k === "foulsReceived";

/* Lista única para la pantalla: cada evento con su origen. */
export function editableEvents(m) {
  const out = [];
  const zonedFoulPairs = new Set();
  (m.disciplineEvents || []).forEach((ev, i) => {
    out.push({ list: "disciplineEvents", index: i, key: ev.type, ...ev });
    if (isFoulKey(ev.type)) zonedFoulPairs.add(`${ev.type}|${pairKey(ev)}`);
  });
  (m.zonedEvents || []).forEach((ev, i) => {
    if (isFoulKey(ev.key) && zonedFoulPairs.has(`${ev.key}|${pairKey(ev)}`)) return; // ya está como falta
    out.push({ list: "zonedEvents", index: i, ...ev });
  });
  return out.sort((a, b) => (Number(a.half) || 1) - (Number(b.half) || 1) || n(b.remaining) - n(a.remaining));
}

function findPair(m, list, ev) {
  const other = list === "disciplineEvents" ? "zonedEvents" : "disciplineEvents";
  const k = list === "disciplineEvents" ? ev.type : ev.key;
  if (!isFoulKey(k)) return null;
  const idx = (m[other] || []).findIndex((x) => (other === "zonedEvents" ? x.key : x.type) === k && pairKey(x) === pairKey(ev));
  return idx >= 0 ? { list: other, index: idx } : null;
}

/* Borrar un evento (y su pareja si es una falta con zona). */
export function deleteEvent(m, list, index) {
  const ev = (m[list] || [])[index];
  if (!ev) return m;
  const key = list === "disciplineEvents" ? ev.type : ev.key;
  const pair = findPair(m, list, ev);
  let out = bumpMatch(m, refOf(ev), key, ev.half, -1);
  out = { ...out, [list]: (m[list] || []).filter((_, i) => i !== index) };
  if (pair) out[pair.list] = (m[pair.list] || []).filter((_, i) => i !== pair.index);
  return out;
}

/* Cambiar jugador y/o zona de un evento. player = fila de m.players. */
export function updateEvent(m, list, index, { player, zone } = {}) {
  const ev = (m[list] || [])[index];
  if (!ev) return m;
  const key = list === "disciplineEvents" ? ev.type : ev.key;
  const pair = findPair(m, list, ev);
  let out = m;
  const patch = {};
  if (player && !samePlayer(player, refOf(ev))) {
    out = bumpMatch(out, refOf(ev), key, ev.half, -1);
    const ref = { playerId: player.id || null, playerName: player.name, playerNumber: player.number };
    out = bumpMatch(out, ref, key, ev.half, +1);
    Object.assign(patch, { playerId: player.id || ev.playerId || null, playerName: player.name, playerNumber: player.number });
  }
  if (zone !== undefined) patch.zone = zone || null;
  const apply = (arr, i) => arr.map((x, j) => (j === i ? { ...x, ...patch } : x));
  out = { ...out, [list]: apply(out[list] || [], index) };
  if (pair) out = { ...out, [pair.list]: apply(out[pair.list] || [], pair.index) };
  return out;
}

const DISCIPLINE = new Set(["fouls", "foulsReceived", "yellow", "red"]);
const ZONED = new Set(["turnovers", "recoveries", "shotsOn", "shotsOff", "shotsPost", "fouls", "foulsReceived"]);

/* Añadir una acción olvidada: { key, player, half, remaining, zone }. */
export function addEvent(m, { key, player, half, remaining, zone = null }) {
  if (!player || !(DISCIPLINE.has(key) || ZONED.has(key))) return m;
  const base = { playerId: player.id || null, playerName: player.name, playerNumber: player.number, half: Number(half) || 1, remaining: Math.max(0, Math.round(n(remaining))) };
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  let out = bumpMatch(m, base, key, base.half, +1);
  if (DISCIPLINE.has(key)) out = { ...out, disciplineEvents: [...(m.disciplineEvents || []), { id: `disc-${stamp}`, type: key, zone, ...base }] };
  if (ZONED.has(key) && (zone || !DISCIPLINE.has(key))) out = { ...out, zonedEvents: [...(m.zonedEvents || []), { id: `z-${stamp}`, key, zone, ...base }] };
  return out;
}
