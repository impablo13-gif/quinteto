/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { toCoarseKey } from "../zonas.js";
export const POSITIONS = ["POR", "CIE", "ALA", "PIV"];
export const POS_LABEL = { POR: "Portero", CIE: "Cierre", ALA: "Ala", PIV: "Pívot" };

export const DRAFT_VERSION = 1;
export const matchDraftKey = (teamId) => `draft:match:${teamId}`;
export const trainingDraftKey = (teamId) => `draft:training:${teamId}`;

export const defaultRoster = () =>
  Array.from({ length: 22 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Jugador ${i + 1}`,
    number: i + 1,
    position: i < 2 ? "POR" : POSITIONS[1 + (i % 3)],
    isGK: i < 2,
    photo: null,
  }));

export const emptyStats = () => ({
  seconds: 0, goals: 0, assists: 0, fouls: 0, foulsReceived: 0, yellow: 0, red: 0,
  saves: 0, turnovers: 0, recoveries: 0, shotsOn: 0, shotsOff: 0, shotsPost: 0,
});
export const STAT_KEYS = Object.keys(emptyStats());

// Todo se anota dentro de la parte en la que ocurrio: los totales del partido
// se calculan sumando las partes, nunca al reves. Asi el desglose por parte y
// el total no pueden acabar contando cosas distintas.
export function sumHalves(statsByHalf, players) {
  const out = {};
  (players || []).forEach((p) => { out[p.id] = emptyStats(); });
  Object.values(statsByHalf || {}).forEach((halfMap) => {
    Object.entries(halfMap || {}).forEach(([id, s]) => {
      if (!out[id]) out[id] = emptyStats();
      STAT_KEYS.forEach((k) => { out[id][k] += s[k] || 0; });
    });
  });
  return out;
}

// Las partes a mostrar: siempre 1ª y 2ª (futbol sala), mas las prorrogas que
// existan si alguna vez se juegan.
export function halvesPresent(statsByHalf, goalEvents) {
  const set = new Set([1, 2]);
  Object.keys(statsByHalf || {}).forEach((h) => set.add(Number(h)));
  (goalEvents || []).forEach((ev) => set.add(Number(ev.half) || 1));
  return [...set].filter((h) => h > 0).sort((a, b) => a - b);
}

export const halfLabel = (h) => (h <= 2 ? `${h}ª parte` : `Prórroga ${h - 2}`);

// Las faltas acumuladas se cuentan por parte, pero según la FIFA las de la 2ª
// parte siguen sumando en la prórroga: la 6ª falta acumulada ya es de 10 m
// aunque se cometa en el tiempo extra. Cada falta se guarda en su propia parte
// (para el historial); aquí solo se suma lo que cuenta de cara a la 6ª.
export function accumulatedFouls(byHalf, half) {
  const map = byHalf || {};
  if (half <= 2) return map[half] || 0;
  return Object.entries(map)
    .filter(([k]) => Number(k) >= 2 && Number(k) <= half)
    .reduce((s, [, v]) => s + (v || 0), 0);
}

// El fútbol sala solo tiene 2 partes reglamentarias. La prórroga (solo en
// partidos de eliminatoria, nunca en liga) son 2 partes iguales, de 3 minutos
// salvo que el equipo configure otra duración (se guarda en cada partido como
// overtimeLength; los partidos antiguos no lo llevan y siguen siendo 3).
export const OT_HALF_MIN = 3;
export const MAX_HALVES = 4; // 2 partes + 2 prórrogas; a partir de ahí, penaltis (fuera de la app)
export const halfMinutesFor = (h, baseHalfLength, overtimeLength) => (h <= 2 ? baseHalfLength : (Number(overtimeLength) || OT_HALF_MIN));
export const halfShortLabel = (h) => (h <= 2 ? `${h}ª` : `P${h - 2}`);

// Como mucho un portero en el quinteto inicial -- nunca dos, aunque los dos
// primeros de la convocatoria (o de la plantilla) sean porteros. Se recorre
// en orden y se salta cualquier portero de más, dejando su hueco al
// siguiente jugador de campo disponible. Es el mismo criterio que ya aplica
// wouldDoubleGoalkeeper() durante el partido, pero aplicado también al
// quinteto de salida, que antes se montaba con un simple slice(0,5) sin
// mirar la posición.
export function pickStartingFive(ids, roster) {
  const out = [];
  let usedGK = false;
  for (const id of ids || []) {
    if (out.length >= 5) break;
    const p = (roster || []).find((pp) => pp.id === id);
    const isGK = p && p.position === "POR";
    if (isGK && usedGK) continue;
    out.push(id);
    if (isGK) usedGK = true;
  }
  return out;
}

// Agrupa las rotaciones (cada entrada y salida de la pista) primero por
// jugador y dentro de cada jugador por parte — así es como se lee en el
// resumen y en las exportaciones: la ficha de un jugador, parte a parte.
export function groupRotations(rotations) {
  const byPlayer = new Map();
  (rotations || []).forEach((r) => {
    if (!byPlayer.has(r.playerId)) {
      byPlayer.set(r.playerId, { playerId: r.playerId, name: r.playerName, number: r.playerNumber, halves: new Map(), total: 0 });
    }
    const entry = byPlayer.get(r.playerId);
    if (!entry.halves.has(r.half)) entry.halves.set(r.half, { list: [], total: 0 });
    const h = entry.halves.get(r.half);
    h.list.push(r);
    h.total += r.durationSeconds;
    entry.total += r.durationSeconds;
  });
  return [...byPlayer.values()].sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
}

export function fmtClock(t) { const m = Math.floor(t / 60), s = t % 60; return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`; }
export function fmtMin(t) { const m = Math.floor(t / 60), s = t % 60; return `${m}'${String(s).padStart(2, "0")}"`; }
export function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

// El informe dibuja el campo en 9 zonas: las zonas finas de los partidos nuevos
// se pasan a la zona gruesa que las contiene antes de pintarlo, sin tocar el
// partido guardado.
export function withCoarseZones(match) {
  const fix = (ev) => (ev && ev.zone ? { ...ev, zone: toCoarseKey(ev.zone) } : ev);
  return {
    ...match,
    zonedEvents: (match.zonedEvents || []).map(fix),
    disciplineEvents: (match.disciplineEvents || []).map(fix),
    goalEvents: (match.goalEvents || []).map(fix),
  };
}

// Un jugador con solo una asistencia se quedaba fuera de todas las
// exportaciones, porque las asistencias faltaban en este filtro.
export const hasActivity = (p) =>
  p.seconds > 0 || p.goals || p.assists || p.fouls || p.foulsReceived || p.yellow || p.red ||
  p.saves || p.recoveries || p.turnovers || p.shotsOn || p.shotsOff || p.shotsPost;

// Marcador de una parte concreta, para poder leer de un vistazo en que mitad
// se decidio el partido.
export function halfScore(match, half) {
  const evs = (match.goalEvents || []).filter((ev) => Number(ev.half) === Number(half));
  return { favor: evs.filter((e) => e.type === "for").length, contra: evs.filter((e) => e.type !== "for").length };
}

/* Un partido guardado lleva `halves`: el desglose de cada parte por separado.
   Los partidos guardados antes de existir ese desglose solo tienen el total,
   y entonces estas funciones simplemente no generan las hojas por parte. */
export const halvesOf = (match) => (Array.isArray(match.halves) ? match.halves : []);

// Qué partes tiene realmente un partido guardado — 1ª y 2ª siempre, más las
// prórrogas que se hayan jugado, mirando cualquier rastro que hayan dejado
// (desglose por parte, goles, faltas o pérdidas/tiros).
export function matchHalvesPresent(match) {
  const set = new Set([1, 2]);
  halvesOf(match).forEach((h) => set.add(Number(h.half)));
  (match.goalEvents || []).forEach((e) => set.add(Number(e.half) || 1));
  (match.disciplineEvents || []).forEach((e) => set.add(Number(e.half) || 1));
  (match.zonedEvents || []).forEach((e) => set.add(Number(e.half) || 1));
  return [...set].filter((h) => h > 0).sort((a, b) => a - b);
}

/* ---------------------------------------------------------------------- */
/* ANÁLISIS PARA EL INFORME: quiénes coincidieron más tiempo en pista       */
/*                                                                          */
/* Cada rotación es un intervalo en "tiempo restante" (baja segundo a       */
/* segundo dentro de una parte, igual que el reloj grande) — se puede medir */
/* el solape de dos intervalos así igual que con tiempo transcurrido, sin   */
/* necesidad de conocer la duración de la parte para convertir nada.        */
/* ---------------------------------------------------------------------- */

// half -> playerId -> [{start, end}] (start >= end, en tiempo restante)
export function buildRotationIndex(rotations) {
  const idx = new Map();
  (rotations || []).forEach((r) => {
    if (!idx.has(r.half)) idx.set(r.half, new Map());
    const halfMap = idx.get(r.half);
    if (!halfMap.has(r.playerId)) halfMap.set(r.playerId, []);
    halfMap.get(r.playerId).push({ start: r.startRemaining, end: r.endRemaining });
  });
  return idx;
}

// Cuánto tiempo coincidieron EN PISTA A LA VEZ todos los jugadores de
// `playerIds`, dentro de una parte concreta. Barrido por los puntos de corte
// de sus propias rachas: entre dos puntos de corte consecutivos, o están
// todos dentro de alguna racha suya, o no cuenta ese trozo.
export function comboOverlapSecondsInHalf(halfMap, playerIds) {
  const lists = playerIds.map((id) => halfMap.get(id) || []);
  if (lists.some((l) => l.length === 0)) return 0;
  const cuts = new Set();
  lists.forEach((list) => list.forEach((iv) => { cuts.add(iv.start); cuts.add(iv.end); }));
  const sorted = [...cuts].sort((a, b) => b - a);
  let total = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const hi = sorted[i], lo = sorted[i + 1];
    if (hi <= lo) continue;
    const cubierto = lists.every((list) => list.some((iv) => iv.start >= hi && iv.end <= lo));
    if (cubierto) total += hi - lo;
  }
  return total;
}

export function comboMinutesTogether(idx, playerIds) {
  let total = 0;
  idx.forEach((halfMap) => { total += comboOverlapSecondsInHalf(halfMap, playerIds); });
  return total;
}

export function kCombinations(arr, k) {
  const out = [];
  const pick = (start, combo) => {
    if (combo.length === k) { out.push(combo.slice()); return; }
    for (let i = start; i < arr.length; i++) { combo.push(arr[i]); pick(i + 1, combo); combo.pop(); }
  };
  pick(0, []);
  return out;
}

// Las combinaciones con más minutos juntos, de entre quienes de verdad
// pisaron la pista (limitar a esos evita miles de combinaciones vacías).
export function topCombosTogether(rotations, size, limit) {
  const idx = buildRotationIndex(rotations);
  const playerIds = [...new Set((rotations || []).map((r) => r.playerId))];
  if (playerIds.length < size) return [];
  const results = kCombinations(playerIds, size)
    .map((combo) => ({ combo, seconds: comboMinutesTogether(idx, combo) }))
    .filter((r) => r.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, limit);
  return results;
}

// Busca la foto de un jugador guardado en el partido cruzando con la
// plantilla actual: por id si el partido ya lo guarda, si no por nombre y
// dorsal (partidos guardados antes de que se empezara a guardar el id).
export function resolveRosterPlayer(row, rosterPlayers) {
  if (!rosterPlayers || !rosterPlayers.length) return null;
  if (row.id) { const byId = rosterPlayers.find((p) => p.id === row.id); if (byId) return byId; }
  return rosterPlayers.find((p) => p.name === row.name && String(p.number) === String(row.number)) || null;
}

// Monta el HTML del informe (mismo diseño de siempre: cabecera, minutos,
// goles, cronología, faltas, tiros, presencia en pista, fichas). Es una
// función pura -- no toca el DOM -- para que openMatchReportTab, más abajo,
// pueda escribirla directamente en una pestaña nueva.
//
// `rosterPlayers` es la plantilla ACTUAL (con fotos) — se cruza con los datos
// guardados del partido para poder ilustrarlo, ya que las fotos no se
// guardan dentro del propio partido. `teamCrest` es el escudo del equipo.
// Las fotos y escudos se guardan como data URL y el informe los mete dentro de
// un atributo src="...". Una copia de seguridad ajena podia traer en ese campo
// algo como `x" onerror="...` y ejecutar codigo al abrir el informe, asi que solo
// pasa lo que de verdad es una imagen en base64 (lo unico que genera la app).
export const SAFE_IMG_SRC = /^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;
export function safeImgSrc(v) {
  return typeof v === "string" && SAFE_IMG_SRC.test(v) ? v : "";
}

export const newTeam = (name) => ({ id: `team-${Date.now()}-${Math.floor(Math.random() * 1000)}`, name: name || "Nuevo equipo", subtitle: "", crest: null });

export function periodFromValue(v) {
  if (v === "all") return { mode: "all" };
  if (v.startsWith("last")) return { mode: "last", count: Number(v.slice(4)) };
  return { mode: "match", date: v.slice(2) };
}
export function periodLabelOf(v, matches) {
  if (v === "all") return "Toda la temporada";
  if (v.startsWith("last")) return `Últimos ${v.slice(4)} partidos`;
  const m = matches.find((mm) => mm.date === v.slice(2));
  return m ? `${new Date(m.date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })} vs ${m.rivalName || "Rival"}` : "Un partido";
}
export const dec1 = (v) => (v === null || v === undefined ? "—" : String(Number(v.toFixed(1))).replace(".", ","));
export const signedN = (v) => (v > 0 ? `+${v}` : String(v));
