/* Describe el último registro del partido en directo: lo mismo que quitaría
 * «Deshacer». Se enseña en una línea encima de la barra de acciones para
 * confirmar lo anotado sin abrir nada (DISENO-TRANSFORMACION.md §9.1).
 * Función pura: solo lee el estado, no lo cambia. */
import { fmtClock } from "../domain/match.js";
import { DISCIPLINE_LABEL, ZONED_LABEL, PITCH_ZONE_LABEL } from "../domain/catalog.js";

const ACTION_LABEL = { ...ZONED_LABEL, ...DISCIPLINE_LABEL, saves: "Parada", goals: "Gol", assists: "Asistencia" };
const POSITIVE = new Set(["recoveries", "shotsOn", "foulsReceived", "saves"]);
const NEGATIVE = new Set(["turnovers", "fouls", "red"]);
const WARNING = new Set(["yellow", "shotsPost"]);

const playerLabel = (players, id) => {
  const p = (players || []).find((x) => x.id === id);
  return p ? `${p.number} · ${p.name}` : null;
};

/* -> null | { label, detail, tone: "accent"|"positive"|"negative"|"warning"|"neutral" } */
export function describeLastRecord(entry, { players = [], goalEvents = [], disciplineEvents = [], timeouts = [] } = {}) {
  if (!entry) return null;
  if (entry.kind === "goal") {
    const ev = goalEvents.find((e) => e.id === entry.id) || entry;
    const when = typeof ev.remaining === "number" ? fmtClock(ev.remaining) : null;
    if (ev.type === "against") {
      return { label: "Gol rival", detail: [ev.phase, when].filter(Boolean).join(" · "), tone: "negative" };
    }
    const author = ev.ownGoal ? "Autogol del rival" : (playerLabel(players, ev.authorId) || ev.authorName || "Sin autor");
    const assist = ev.assistId ? `asist. ${(players.find((p) => p.id === ev.assistId) || {}).name || ev.assistName || ""}`.trim() : null;
    const zone = ev.zone ? PITCH_ZONE_LABEL[ev.zone] : null;
    return { label: "Gol", detail: [author, ev.phase, assist, zone, when].filter(Boolean).join(" · "), tone: "accent" };
  }
  if (entry.kind === "timeout") {
    const t = timeouts.find((x) => x.id === entry.id);
    const who = t ? (t.team === "for" ? "nuestro" : "rival") : "";
    return { label: "Tiempo muerto", detail: [who, t && typeof t.remaining === "number" ? fmtClock(t.remaining) : null].filter(Boolean).join(" · "), tone: "neutral" };
  }
  // acción de un jugador (con o sin zona, con o sin minuto)
  const disc = entry.discId ? disciplineEvents.find((e) => e.id === entry.discId) : null;
  const zone = disc && disc.zone ? PITCH_ZONE_LABEL[disc.zone] : null;
  const when = disc && typeof disc.remaining === "number" ? fmtClock(disc.remaining) : null;
  const tone = POSITIVE.has(entry.key) ? "positive" : NEGATIVE.has(entry.key) ? "negative" : WARNING.has(entry.key) ? "warning" : "neutral";
  return {
    label: ACTION_LABEL[entry.key] || entry.key,
    detail: [playerLabel(players, entry.playerId), zone, when].filter(Boolean).join(" · "),
    tone,
  };
}
