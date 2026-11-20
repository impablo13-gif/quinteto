/* CSV de un partido (Análisis › Informes).
 *
 * · Eventos: una fila por cosa que pasó, en orden de juego, con la parte, el
 *   reloj (lo que marcaba) y el SEGUNDO DE PARTIDO (tiempo de juego desde el
 *   inicio, sumando partes): es lo que se usa para sincronizar con el vídeo y
 *   hacer cortes en una herramienta de análisis de vídeo.
 * · Jugadores: las mismas columnas que la hoja de Excel del partido.
 *
 * Separador «;» y BOM, para que Excel en español lo abra bien. Funciones puras.
 */
import { halfMinutesFor, fmtClock, halfLabel, hasActivity } from "../domain/match.js";
import { DISCIPLINE_LABEL, ZONED_LABEL, GOAL_PHASES, PITCH_ZONE_LABEL } from "../domain/catalog.js";
import { playerRow } from "./excel.js";

const q = (v) => `"${String(v === null || v === undefined ? "" : v).replace(/"/g, '""')}"`;
const toCsv = (rows) => "﻿" + rows.map((r) => r.map(q).join(";")).join("\r\n");

/* Segundos de juego desde el inicio del partido para una marca (parte, reloj restante). */
export function matchSecondOf(match, half, remaining) {
  const h = Number(half) || 1;
  let before = 0;
  for (let x = 1; x < h; x += 1) before += halfMinutesFor(x, Number(match.halfLength) || 20, match.overtimeLength) * 60;
  const len = halfMinutesFor(h, Number(match.halfLength) || 20, match.overtimeLength) * 60;
  return typeof remaining === "number" ? before + Math.max(0, len - remaining) : null;
}

const who = (name, number) => [number != null && number !== "?" ? number : "", name || ""];
const phaseLabel = (k) => (GOAL_PHASES.find((p) => p.key === k) || { label: k || "" }).label;

export function matchEventsRows(match) {
  const rows = [];
  const push = (half, remaining, tipo, equipo, [dorsal, jugador], extra = {}) => rows.push({
    half: Number(half) || 1, remaining, t: matchSecondOf(match, half, remaining), tipo, equipo, dorsal, jugador,
    zona: extra.zona || "", fase: extra.fase || "", detalle: extra.detalle || "", duracion: extra.duracion ?? "",
  });
  const numOf = (id, fallbackName) => {
    const p = (match.players || []).find((x) => x.id === id) || (match.players || []).find((x) => x.name === fallbackName);
    return p ? p.number : "";
  };
  (match.goalEvents || []).forEach((g) => {
    const ours = g.type === "for";
    const quinteto = (g.onCourt || []).map((p) => p.number).join("-");
    push(g.half, g.remaining, ours ? "Gol a favor" : "Gol en contra", ours ? "nuestro" : "rival",
      ours && !g.ownGoal ? who(g.authorName, numOf(g.authorId, g.authorName)) : ["", g.ownGoal ? "Autogol del rival" : ""],
      { fase: phaseLabel(g.phase), zona: g.zone ? (PITCH_ZONE_LABEL[g.zone] || g.zone) : "", detalle: [g.assistName ? `asist. ${g.assistName}` : "", quinteto ? `en pista ${quinteto}` : ""].filter(Boolean).join(" · ") });
  });
  (match.disciplineEvents || []).forEach((d) => push(d.half, d.remaining, DISCIPLINE_LABEL[d.type] || d.type, "nuestro", who(d.playerName, d.playerNumber), { zona: d.zone ? (PITCH_ZONE_LABEL[d.zone] || d.zone) : "" }));
  (match.zonedEvents || []).forEach((z) => {
    if (z.key === "fouls" || z.key === "foulsReceived") return; // ya salen como falta (con su zona) arriba
    push(z.half, z.remaining, ZONED_LABEL[z.key] || z.key, "nuestro", who(z.playerName, z.playerNumber), { zona: z.zone ? (PITCH_ZONE_LABEL[z.zone] || z.zone) : "" });
  });
  (match.timeouts || []).forEach((t) => push(t.half, t.remaining, "Tiempo muerto", t.team === "for" ? "nuestro" : "rival", ["", ""]));
  (match.rotations || []).forEach((r) => {
    push(r.half, r.startRemaining, "Entra a pista", "nuestro", who(r.playerName, r.playerNumber), { duracion: r.durationSeconds });
    push(r.half, r.endRemaining, "Sale de pista", "nuestro", who(r.playerName, r.playerNumber), { duracion: r.durationSeconds });
  });
  return rows.sort((a, b) => (a.t ?? 1e9) - (b.t ?? 1e9) || a.half - b.half);
}

export function matchEventsCsv(match) {
  const head = ["parte", "reloj", "segundo_partido", "minuto_partido", "tipo", "equipo", "dorsal", "jugador", "zona", "fase", "detalle", "duracion_s"];
  const body = matchEventsRows(match).map((r) => [
    halfLabel(r.half), typeof r.remaining === "number" ? fmtClock(r.remaining) : "", r.t ?? "", r.t == null ? "" : fmtClock(r.t),
    r.tipo, r.equipo, r.dorsal, r.jugador, r.zona, r.fase, r.detalle, r.duracion,
  ]);
  return toCsv([head, ...body]);
}

export function matchPlayersCsv(match) {
  const rows = (match.players || []).filter(hasActivity).map(playerRow);
  if (!rows.length) return toCsv([["Sin datos de jugadores"]]);
  const head = Object.keys(rows[0]);
  return toCsv([head, ...rows.map((r) => head.map((k) => r[k]))]);
}
