/* Motor de análisis por visiones (entrenador, analista, dirección deportiva,
 * preparación física y anotador). PROPUESTA-ANALISIS.md, en local.
 *
 * Todo sale de lo que YA se anota en directo, con su marca de tiempo: no se
 * pide ningún dato nuevo durante el partido. Lo único que se añade fuera del
 * directo es opcional: el esfuerzo percibido (RPE) y los objetivos.
 *
 * Funciones puras (sin React ni almacenamiento): se prueban en tests/visiones.test.js.
 */
import { halfMinutesFor, fmtClock, fmtMin } from "./match.js";
import { GOAL_PHASES } from "./catalog.js";
import { matchChecks } from "./checks.js";
import { toCoarseKey, ZONE_LABELS, ZONES_COARSE, ZONES_FINE } from "../zonas.js";
import { seasonOf } from "./filters.js";

const n = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const sum = (arr, f) => arr.reduce((s, x) => s + n(f(x)), 0);
const round1 = (v) => Math.round(v * 10) / 10;
const phaseLabel = (k) => (GOAL_PHASES.find((p) => p.key === k) || { label: k || "Sin fase" }).label;
const byDate = (a, b) => new Date(a.date) - new Date(b.date);

/* ---------- Tiempo ---------- */

const halfSeconds = (m, h) => halfMinutesFor(Number(h) || 1, Number(m.halfLength) || 20, m.overtimeLength) * 60;
/* Segundos transcurridos dentro de la parte para una marca de reloj restante. */
const elapsedIn = (m, h, remaining) => (typeof remaining === "number" ? Math.max(0, halfSeconds(m, h) - remaining) : null);
/* Duración total del partido jugado (partes presentes), en segundos. */
export function matchDurationSeconds(m) {
  const halves = new Set([1, 2]);
  (m.halves || []).forEach((h) => halves.add(Number(h.half)));
  (m.goalEvents || []).forEach((g) => halves.add(Number(g.half) || 1));
  return [...halves].reduce((s, h) => s + halfSeconds(m, h), 0);
}

/* Zonas de campo propio: filas finas 1-3 (de 6) o la fila gruesa «def». */
export const isOwnHalfZone = (z) => /^f[123]-/.test(z || "") || /^def-/.test(z || "");
export const isOppHalfZone = (z) => /^f[456]-/.test(z || "") || /^ataque-/.test(z || "");

/* ---------- Métricas de un partido ---------- */

export function matchMetrics(m) {
  const ps = m.players || [];
  const zoned = m.zonedEvents || [];
  const goals = m.goalEvents || [];
  const gfPlayers = sum(ps, (p) => p.goals);
  const finishes = sum(ps, (p) => n(p.goals) + n(p.shotsOn) + n(p.shotsOff) + n(p.shotsPost));
  const lateGoals = (type) => goals.filter((g) => g.type === type && Number(g.half) <= 2 && typeof g.remaining === "number" && g.remaining <= 300).length;
  const earlyGoals = (type) => goals.filter((g) => g.type === type && Number(g.half) <= 2 && typeof g.remaining === "number" && halfSeconds(m, g.half) - g.remaining < 300).length;
  const gk = goalkeeperRows(m);
  const saves = sum(gk, (r) => r.saves), conceded = sum(gk, (r) => r.conceded);
  return {
    gf: n(m.teamGoals), ga: n(m.rivalScore),
    finishes, shotsOn: sum(ps, (p) => p.shotsOn), shotsOff: sum(ps, (p) => p.shotsOff), shotsPost: sum(ps, (p) => p.shotsPost),
    efficiency: finishes ? gfPlayers / finishes : null,
    turnovers: sum(ps, (p) => p.turnovers), recoveries: sum(ps, (p) => p.recoveries),
    turnoversOwnHalf: zoned.filter((z) => z.key === "turnovers" && isOwnHalfZone(z.zone)).length,
    recoveriesOppHalf: zoned.filter((z) => z.key === "recoveries" && isOppHalfZone(z.zone)).length,
    fouls: sum(ps, (p) => p.fouls), foulsReceived: sum(ps, (p) => p.foulsReceived),
    yellow: sum(ps, (p) => p.yellow), red: sum(ps, (p) => p.red),
    saves, conceded, savePct: saves + conceded ? saves / (saves + conceded) : null,
    gfLate: lateGoals("for"), gaLate: lateGoals("against"), gfEarly: earlyGoals("for"), gaEarly: earlyGoals("against"),
    dangerousTurnovers: dangerousTurnovers(m).length,
    recoveryToShot: recoveryToShot(m).length,
  };
}

/* Catálogo de métricas (tendencia, objetivos). better: qué es «mejor». */
export const METRICS = [
  { key: "gf", label: "Goles a favor", better: "high" },
  { key: "ga", label: "Goles en contra", better: "low" },
  { key: "finishes", label: "Finalizaciones", better: "high" },
  { key: "shotsOn", label: "Tiros a puerta", better: "high" },
  { key: "efficiency", label: "Eficacia (goles / finalizaciones)", better: "high", pct: true },
  { key: "turnovers", label: "Pérdidas", better: "low" },
  { key: "turnoversOwnHalf", label: "Pérdidas en campo propio", better: "low" },
  { key: "recoveries", label: "Recuperaciones", better: "high" },
  { key: "recoveriesOppHalf", label: "Recuperaciones en campo rival", better: "high" },
  { key: "recoveryToShot", label: "Recuperaciones que acaban en tiro (≤10\")", better: "high" },
  { key: "dangerousTurnovers", label: "Pérdidas propias que acaban en gol rival (≤20\")", better: "low" },
  { key: "fouls", label: "Faltas cometidas", better: "low" },
  { key: "foulsReceived", label: "Faltas recibidas", better: "high" },
  { key: "gaLate", label: "Goles en contra en los últimos 5' de cada parte", better: "low" },
  { key: "savePct", label: "Porcentaje de paradas", better: "high", pct: true },
];
export const metricDef = (k) => METRICS.find((x) => x.key === k);
export const fmtMetric = (k, v) => (v === null || v === undefined ? "—" : metricDef(k) && metricDef(k).pct ? `${Math.round(v * 100)}%` : String(round1(v)).replace(".", ","));

/* Media por partido de cada métrica (las nulas no cuentan). */
export function averageMetrics(matches) {
  const all = (matches || []).map(matchMetrics);
  const out = {};
  METRICS.forEach(({ key }) => {
    const vals = all.map((x) => x[key]).filter((v) => v !== null && v !== undefined);
    out[key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  });
  return out;
}

/* Tendencia: últimos N frente a la temporada (por partido). */
export function trend(matches, last = 5) {
  const sorted = [...(matches || [])].sort(byDate);
  const recent = sorted.slice(-last);
  const season = averageMetrics(sorted), now = averageMetrics(recent);
  return METRICS.map((d) => {
    const a = season[d.key], b = now[d.key];
    const delta = a === null || b === null ? null : b - a;
    const rel = delta === null ? 0 : Math.abs(delta) / Math.max(Math.abs(a), d.pct ? 0.05 : 1);
    const dir = delta === null || rel < 0.1 ? "igual" : delta > 0 ? "sube" : "baja";
    const good = dir === "igual" ? null : (dir === "sube") === (d.better === "high");
    return { key: d.key, label: d.label, season: a, recent: b, delta, dir, good };
  });
}

/* ---------- Secuencias (con la marca de tiempo de cada evento) ---------- */

const timeline = (m) => {
  const ev = [];
  (m.zonedEvents || []).forEach((z) => ev.push({ kind: z.key, half: Number(z.half) || 1, t: elapsedIn(m, z.half, z.remaining), zone: z.zone, playerId: z.playerId, playerName: z.playerName, playerNumber: z.playerNumber, remaining: z.remaining }));
  (m.goalEvents || []).forEach((g) => ev.push({ kind: g.type === "for" ? "goalFor" : "goalAgainst", half: Number(g.half) || 1, t: elapsedIn(m, g.half, g.remaining), zone: g.zone, phase: g.phase, remaining: g.remaining }));
  return ev.filter((e) => e.t !== null).sort((a, b) => a.half - b.half || a.t - b.t);
};

/* Pérdidas en campo propio seguidas de gol rival en ≤ windowSec, en la misma parte. */
export function dangerousTurnovers(m, windowSec = 20) {
  const tl = timeline(m);
  return tl.filter((e) => e.kind === "turnovers" && isOwnHalfZone(e.zone)).map((e) => {
    const g = tl.find((x) => x.kind === "goalAgainst" && x.half === e.half && x.t >= e.t && x.t - e.t <= windowSec);
    return g ? { ...e, goal: g, gap: g.t - e.t } : null;
  }).filter(Boolean);
}

/* Recuperaciones seguidas de tiro o gol propio en ≤ windowSec. */
export function recoveryToShot(m, windowSec = 10) {
  const tl = timeline(m);
  const shotKinds = new Set(["shotsOn", "shotsOff", "shotsPost", "goalFor"]);
  return tl.filter((e) => e.kind === "recoveries").map((e) => {
    const s = tl.find((x) => shotKinds.has(x.kind) && x.half === e.half && x.t >= e.t && x.t - e.t <= windowSec);
    return s ? { ...e, shot: s, gap: s.t - e.t } : null;
  }).filter(Boolean);
}

/* ---------- Zonas ---------- */

/* Finalizaciones y goles por zona (gruesa o fina). Los goles salen de los goles
 * propios con zona; los tiros, de las acciones con zona. */
export function zoneEfficiency(matches, resolution = "coarse") {
  const zones = resolution === "fine" ? ZONES_FINE : ZONES_COARSE;
  const keyOf = (z) => (resolution === "fine" ? z : toCoarseKey(z));
  const rows = new Map(zones.map((z) => [z.key, { zone: z.key, label: ZONE_LABELS[z.key], row: z.row, col: z.col, goals: 0, shotsOn: 0, shotsOff: 0, shotsPost: 0 }]));
  (matches || []).forEach((m) => {
    (m.goalEvents || []).forEach((g) => { if (g.type === "for" && !g.ownGoal && g.zone && rows.has(keyOf(g.zone))) rows.get(keyOf(g.zone)).goals += 1; });
    (m.zonedEvents || []).forEach((z) => { if (["shotsOn", "shotsOff", "shotsPost"].includes(z.key) && rows.has(keyOf(z.zone))) rows.get(keyOf(z.zone))[z.key] += 1; });
  });
  return [...rows.values()].map((r) => {
    const finishes = r.goals + r.shotsOn + r.shotsOff + r.shotsPost;
    return { ...r, finishes, pct: finishes ? r.goals / finishes : null, onTargetPct: finishes ? (r.goals + r.shotsOn) / finishes : null };
  });
}

/* ---------- Goles en contra: cómo y con quién ---------- */

export function concededBreakdown(matches) {
  const phases = new Map();
  const players = new Map();
  let total = 0;
  (matches || []).forEach((m) => (m.goalEvents || []).forEach((g) => {
    if (g.type !== "against") return;
    total += 1;
    const k = g.phase || "Sin fase";
    phases.set(k, (phases.get(k) || 0) + 1);
    (g.onCourt || []).forEach((p) => {
      const key = `${p.name}#${p.number}`;
      if (!players.has(key)) players.set(key, { name: p.name, number: p.number, count: 0 });
      players.get(key).count += 1;
    });
  }));
  return {
    total,
    phases: [...phases.entries()].map(([k, c]) => ({ phase: k, label: phaseLabel(k), count: c, share: total ? c / total : 0 })).sort((a, b) => b.count - a.count),
    onCourt: [...players.values()].sort((a, b) => b.count - a.count),
  };
}

/* ---------- Rotaciones y carga ---------- */

/* Perfil de tandas de cada jugador en un partido: número, media, máxima y
 * descanso medio entre tandas de una misma parte. */
export function stintProfile(m) {
  const by = new Map();
  (m.rotations || []).forEach((r) => {
    const key = String(r.playerId);
    if (!by.has(key)) by.set(key, { playerId: r.playerId, name: r.playerName, number: r.playerNumber, stints: [] });
    by.get(key).stints.push({ half: Number(r.half) || 1, start: r.startRemaining, end: r.endRemaining, dur: n(r.durationSeconds) });
  });
  return [...by.values()].map((p) => {
    const durs = p.stints.map((s) => s.dur).filter((d) => d > 0);
    const rests = [];
    const halves = [...new Set(p.stints.map((s) => s.half))];
    halves.forEach((h) => {
      const list = p.stints.filter((s) => s.half === h).sort((a, b) => b.start - a.start);
      for (let i = 1; i < list.length; i += 1) { const gap = list[i - 1].end - list[i].start; if (gap > 0) rests.push(gap); }
    });
    const total = durs.reduce((a, b) => a + b, 0);
    return {
      playerId: p.playerId, name: p.name, number: p.number,
      count: durs.length, total, mean: durs.length ? total / durs.length : 0, max: durs.length ? Math.max(...durs) : 0,
      restMean: rests.length ? rests.reduce((a, b) => a + b, 0) / rests.length : null,
      longStints: durs.filter((d) => d >= 240).length,
      byHalf: Object.fromEntries(halves.map((h) => [h, p.stints.filter((s) => s.half === h).reduce((a, s) => a + s.dur, 0)])),
    };
  }).sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
}

const personKey = (name, number) => `${String(name || "").trim().toLowerCase()}#${number ?? "?"}`;

/* Minutos (y carga sRPE si hay RPE) en los últimos 7, 14 y 28 días desde refDate,
 * sumando partidos y entrenos. Aviso si la última semana supera en un 30 % la
 * media semanal de las 4 últimas (y es al menos media hora). */
export function loadWindows(matches, trainings, refDate = new Date()) {
  const ref = new Date(refDate).getTime();
  const DAY = 86400000;
  const people = new Map();
  const touch = (name, number) => {
    const k = personKey(name, number);
    if (!people.has(k)) people.set(k, { key: k, name: String(name || "").trim(), number, m7: 0, m14: 0, m28: 0, s7: 0, s28: 0, matches7: 0, rpeMatches: 0 });
    return people.get(k);
  };
  const add = (p, minutes, days, srpe) => {
    if (days < 0 || days >= 28) return;
    p.m28 += minutes; if (srpe !== null) p.s28 += srpe;
    if (days < 14) p.m14 += minutes;
    if (days < 7) { p.m7 += minutes; if (srpe !== null) p.s7 += srpe; }
  };
  (matches || []).forEach((m) => {
    const days = (ref - new Date(m.date).getTime()) / DAY;
    (m.players || []).forEach((pl) => {
      if (!(n(pl.seconds) > 0)) return;
      const p = touch(pl.name, pl.number);
      const min = n(pl.seconds) / 60;
      const rpe = m.rpe && (m.rpe[pl.id] ?? m.rpe[personKey(pl.name, pl.number)]);
      add(p, min, days, typeof rpe === "number" ? rpe * min : null);
      if (days >= 0 && days < 7) p.matches7 += 1;
    });
  });
  (trainings || []).forEach((t) => {
    const days = (ref - new Date(t.date).getTime()) / DAY;
    (t.players || []).forEach((pl) => { if (n(pl.seconds) > 0) add(touch(pl.name, pl.number), n(pl.seconds) / 60, days, null); });
  });
  return [...people.values()].map((p) => {
    const weekly = p.m28 / 4;
    const ratio = weekly > 0 ? p.m7 / weekly : null;
    return { ...p, m7: round1(p.m7), m14: round1(p.m14), m28: round1(p.m28), weeklyAvg: round1(weekly), ratio: ratio === null ? null : Math.round(ratio * 100) / 100, alert: ratio !== null && ratio > 1.3 && p.m7 >= 30 };
  }).sort((a, b) => b.m7 - a.m7 || (Number(a.number) || 0) - (Number(b.number) || 0));
}

/* ---------- Dirección deportiva ---------- */

/* Reparto de minutos: de los minutos posibles en los partidos en que fue
 * convocado, cuántos jugó. */
export function minutesShare(matches) {
  const people = new Map();
  (matches || []).forEach((m) => {
    const dur = matchDurationSeconds(m);
    const called = Array.isArray(m.convocados) && m.convocados.length ? m.convocados : (m.players || []).filter((p) => n(p.seconds) > 0);
    const calledKeys = new Set(called.map((c) => personKey(c.name, c.number)));
    (m.players || []).forEach((p) => {
      const k = personKey(p.name, p.number);
      if (!calledKeys.has(k)) return;
      if (!people.has(k)) people.set(k, { key: k, name: p.name, number: p.number, position: p.position, called: 0, played: 0, seconds: 0, possible: 0 });
      const e = people.get(k);
      e.called += 1; e.possible += dur; e.seconds += n(p.seconds);
      if (n(p.seconds) > 0) e.played += 1;
    });
  });
  return [...people.values()].map((e) => ({ ...e, minutes: round1(e.seconds / 60), share: e.possible ? e.seconds / e.possible : 0 })).sort((a, b) => b.share - a.share);
}

/* Disciplina por jugador (totales y partidos con tarjeta). */
export function disciplineTable(matches) {
  const people = new Map();
  (matches || []).forEach((m) => (m.players || []).forEach((p) => {
    if (!(n(p.fouls) || n(p.yellow) || n(p.red))) return;
    const k = personKey(p.name, p.number);
    if (!people.has(k)) people.set(k, { key: k, name: p.name, number: p.number, fouls: 0, yellow: 0, red: 0, matches: 0 });
    const e = people.get(k);
    e.fouls += n(p.fouls); e.yellow += n(p.yellow); e.red += n(p.red); e.matches += 1;
  }));
  return [...people.values()].sort((a, b) => b.red - a.red || b.yellow - a.yellow || b.fouls - a.fouls);
}

/* Evolución de un jugador por temporada (por nombre y dorsal, para unir temporadas). */
export function playerSeasons(matches, name, number) {
  const k = personKey(name, number);
  const by = new Map();
  (matches || []).forEach((m) => (m.players || []).forEach((p) => {
    if (personKey(p.name, p.number) !== k) return;
    const s = seasonOf(m);
    if (!by.has(s)) by.set(s, { season: s, matches: 0, seconds: 0, goals: 0, assists: 0, recoveries: 0, turnovers: 0, yellow: 0, red: 0 });
    const e = by.get(s);
    if (n(p.seconds) > 0) e.matches += 1;
    ["seconds", "goals", "assists", "recoveries", "turnovers", "yellow", "red"].forEach((f) => { e[f] += n(p[f]); });
  }));
  return [...by.values()].map((e) => ({ ...e, minutes: round1(e.seconds / 60), goalsPer40: e.seconds >= 1200 ? round1((e.goals / e.seconds) * 2400) : null }))
    .sort((a, b) => a.season.localeCompare(b.season));
}

/* ---------- Portero ---------- */

/* Por portero: paradas, acciones y goles encajados estando en pista (el
 * quinteto de cada gol en contra queda guardado). */
export function goalkeeperRows(m) {
  const gks = (m.players || []).filter((p) => p.isGK || p.position === "POR" || n(p.saves) || n(p.gkOneVsOne) || n(p.gkInterceptions) || n(p.gkDistOk) || n(p.gkDistBad));
  return gks.filter((p) => n(p.seconds) > 0 || n(p.saves)).map((p) => {
    const conceded = (m.goalEvents || []).filter((g) => g.type === "against" && (g.onCourt || []).some((o) => (p.id ? o.id === p.id : o.name === p.name && String(o.number) === String(p.number)))).length;
    const saves = n(p.saves);
    return {
      name: p.name, number: p.number, seconds: n(p.seconds), saves, conceded,
      savePct: saves + conceded ? saves / (saves + conceded) : null,
      oneVsOne: n(p.gkOneVsOne), interceptions: n(p.gkInterceptions), distOk: n(p.gkDistOk), distBad: n(p.gkDistBad),
      distPct: n(p.gkDistOk) + n(p.gkDistBad) ? n(p.gkDistOk) / (n(p.gkDistOk) + n(p.gkDistBad)) : null,
    };
  });
}

/* ---------- Anotador: calidad del dato ---------- */

export function dataHealth(m) {
  const zoned = m.zonedEvents || [];
  const goals = m.goalEvents || [];
  const goalsFor = goals.filter((g) => g.type === "for" && !g.ownGoal);
  const pct = (a, b) => (b ? a / b : null);
  const statsFromPlayers = Object.fromEntries((m.players || []).filter((p) => p.id).map((p) => [p.id, p]));
  const statsByHalf = Object.fromEntries((m.halves || []).map((h) => [h.half, Object.fromEntries((h.players || []).filter((p) => p.id).map((p) => [p.id, p]))]));
  const checks = matchChecks({
    goalEvents: goals, teamGoals: n(m.teamGoals), rivalScore: n(m.rivalScore), players: m.players || [],
    convocados: Array.isArray(m.convocados) && m.convocados.every((c) => c.id) ? m.convocados.map((c) => c.id) : null,
    stats: statsFromPlayers, statsByHalf: Object.keys(statsByHalf).length ? statsByHalf : {}, teamFouls: m.teamFouls || {},
  });
  const items = {
    zonedWithZone: pct(zoned.filter((z) => z.zone).length, zoned.length),
    goalsWithPhase: pct(goals.filter((g) => g.phase).length, goals.length),
    goalsForWithZone: pct(goalsFor.filter((g) => g.zone).length, goalsFor.length),
    eventsWithTime: pct([...zoned, ...goals].filter((e) => typeof e.remaining === "number").length, zoned.length + goals.length),
    hasRotations: (m.rotations || []).length > 0,
  };
  const scores = [items.zonedWithZone, items.goalsWithPhase, items.goalsForWithZone, items.eventsWithTime].filter((v) => v !== null);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 1;
  const warns = checks.filter((c) => c.level === "warn").length;
  const level = !items.hasRotations || avg < 0.7 || warns >= 2 ? "rojo" : avg < 0.95 || warns === 1 ? "ambar" : "verde";
  return { ...items, checks, level };
}

/* Cotejo con el acta: lo anotado frente a lo que pone el acta oficial. */
export function compareWithActa(m, acta) {
  const out = [];
  const cmp = (label, ours, theirs) => { if (theirs === "" || theirs === null || theirs === undefined || Number.isNaN(Number(theirs))) return; out.push({ label, ours, acta: Number(theirs), ok: ours === Number(theirs) }); };
  cmp("Goles a favor", n(m.teamGoals), acta.gf);
  cmp("Goles en contra", n(m.rivalScore), acta.ga);
  cmp("Faltas acumuladas 1ª parte", n((m.teamFouls || {})[1]), acta.fouls1);
  cmp("Faltas acumuladas 2ª parte", n((m.teamFouls || {})[2]), acta.fouls2);
  cmp("Amarillas", sum(m.players || [], (p) => p.yellow), acta.yellow);
  cmp("Rojas", sum(m.players || [], (p) => p.red), acta.red);
  return out;
}

/* ---------- Objetivos ---------- */

/* objetivo: { metric, op: "<=" | ">=", value } -> cumplido por partido. */
export function evaluateObjectives(objectives, m) {
  const mm = matchMetrics(m);
  return (objectives || []).map((o) => {
    const v = mm[o.metric];
    const target = Number(o.value);
    const ok = v === null || v === undefined ? null : o.op === "<=" ? v <= target : v >= target;
    return { ...o, value: target, actual: v, ok };
  });
}

/* ---------- Entrenador: claves automáticas del partido ---------- */

/* Hasta 3 frases con lo más llamativo del partido, comparado con la media de
 * los demás partidos. Solo afirma lo que dicen los datos. */
export function keyFacts(m, others = [], max = 3) {
  const facts = [];
  const mm = matchMetrics(m);
  const avg = averageMetrics((others || []).filter((x) => x.date !== m.date));
  const hasAvg = (others || []).filter((x) => x.date !== m.date).length >= 2;
  const goals = m.goalEvents || [];
  ["against", "for"].forEach((type) => {
    const list = goals.filter((g) => g.type === type);
    if (list.length < 2) return;
    const counts = new Map();
    list.forEach((g) => counts.set(g.phase || "Sin fase", (counts.get(g.phase || "Sin fase") || 0) + 1));
    const [phase, c] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (c >= 2 && c / list.length >= 0.5) facts.push({ score: 2 + c / list.length, tone: type === "against" ? "negative" : "positive", text: `${c} de ${list.length} goles ${type === "against" ? "en contra" : "a favor"} llegaron en ${phaseLabel(phase)}.` });
  });
  const dt = dangerousTurnovers(m);
  if (dt.length) facts.push({ score: 3 + dt.length, tone: "negative", text: `${dt.length} pérdida${dt.length === 1 ? "" : "s"} en campo propio acab${dt.length === 1 ? "ó" : "aron"} en gol rival en menos de 20".` });
  const rs = recoveryToShot(m);
  if (rs.length >= 2) facts.push({ score: 1.5 + rs.length / 2, tone: "positive", text: `${rs.length} recuperaciones terminaron en tiro o gol en menos de 10".` });
  if (mm.gaLate >= 2) facts.push({ score: 2.5, tone: "negative", text: `${mm.gaLate} goles en contra en los últimos 5' de las partes.` });
  if (hasAvg) {
    ["turnoversOwnHalf", "turnovers", "recoveries", "finishes", "fouls", "efficiency"].forEach((k) => {
      const v = mm[k], a = avg[k];
      if (v === null || a === null) return;
      const d = v - a;
      const rel = Math.abs(d) / Math.max(Math.abs(a), k === "efficiency" ? 0.05 : 1);
      if (rel < 0.3 || (k !== "efficiency" && Math.abs(d) < 2)) return;
      const def = metricDef(k);
      const good = (d > 0) === (def.better === "high");
      facts.push({
        score: 1 + rel, tone: good ? "positive" : "negative",
        text: k === "efficiency"
          ? `Eficacia del ${Math.round(v * 100)}% (media ${Math.round(a * 100)}%).`
          : `${def.label}: ${String(round1(v)).replace(".", ",")}, ${String(Math.abs(round1(d))).replace(".", ",")} ${d > 0 ? "más" : "menos"} que la media (${String(round1(a)).replace(".", ",")}).`,
      });
    });
  }
  const sp = stintProfile(m).filter((p) => p.max >= 360).sort((a, b) => b.max - a.max)[0];
  if (sp) facts.push({ score: 1.2, tone: "warning", text: `${sp.name} estuvo ${fmtMin(sp.max)} seguidos en pista.` });
  return facts.sort((a, b) => b.score - a.score).slice(0, max).map(({ score, ...f }) => f);
}

export { fmtClock };
