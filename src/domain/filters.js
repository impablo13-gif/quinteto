/* Temporada, competicion y rival (DISENO §10): filtros sobre los partidos que ya
 * estan guardados, sin pedir datos nuevos.
 *
 * - Temporada: julio-junio. Si el partido lleva `season` se respeta; si no, se
 *   deduce de la fecha (los partidos antiguos no lo llevan).
 * - Competicion: la que se escribe al crear el informe (`competition`).
 * - Rival: el nombre normalizado (sin mayusculas, tildes ni espacios de mas),
 *   para que «C.D. Rival» y «c.d.  rival» cuenten como el mismo.
 */
import { seasonSummary, goalsByPhase } from "../analisis.js";

export const ALL = "all";
export const NO_COMPETITION = "__none__";

export function seasonOf(match) {
  if (match && typeof match.season === "string" && match.season.trim()) return match.season.trim();
  const d = new Date(match && match.date);
  if (Number.isNaN(d.getTime())) return "Sin fecha";
  const y = d.getFullYear();
  const start = d.getMonth() >= 6 ? y : y - 1; // julio (6) abre temporada
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export const competitionOf = (match) => String((match && match.competition) || "").replace(/\s+/g, " ").trim();

export const rivalKey = (name) => String(name || "")
  .normalize("NFD").replace(/\p{M}/gu, "") // tildes fuera
  .toLowerCase().replace(/[.'’]/g, "") // «C.D.» = «CD»
  .replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/* Opciones disponibles, de la mas reciente a la mas antigua. */
export function seasonsIn(matches) {
  return [...new Set((matches || []).map(seasonOf))].sort((a, b) => b.localeCompare(a));
}

export function competitionsIn(matches) {
  const map = new Map(); // clave normalizada -> etiqueta mas usada
  (matches || []).forEach((m) => {
    const c = competitionOf(m);
    if (!c) return;
    const k = c.toLowerCase();
    if (!map.has(k)) map.set(k, { label: c, n: 0 });
    map.get(k).n += 1;
  });
  return [...map.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)).map((x) => x.label);
}

// De las formas en que se escribió un rival, la más repetida; si empatan, la
// mejor escrita (más mayúsculas, tildes y puntos: «C.D. Ríos» antes que «cd rios»).
const care = (s) => (s.match(/[\p{Lu}.]|[^\x00-\x7F]/gu) || []).length;
export function rivalsIn(matches) {
  const map = new Map();
  (matches || []).forEach((m) => {
    const k = rivalKey(m.rivalName);
    if (!k) return;
    const label = String(m.rivalName).replace(/\s+/g, " ").trim();
    if (!map.has(k)) map.set(k, { key: k, n: 0, forms: new Map() });
    const e = map.get(k);
    e.n += 1;
    e.forms.set(label, (e.forms.get(label) || 0) + 1);
  });
  return [...map.values()].map(({ key, n, forms }) => {
    const label = [...forms.entries()].sort((a, b) => b[1] - a[1] || care(b[0]) - care(a[0]) || a[0].localeCompare(b[0]))[0][0];
    return { key, label, n };
  }).sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export function filterMatches(matches, { season = ALL, competition = ALL, rival = ALL } = {}) {
  return (matches || []).filter((m) => {
    if (season !== ALL && seasonOf(m) !== season) return false;
    if (competition !== ALL) {
      const c = competitionOf(m);
      if (competition === NO_COMPETITION ? !!c : c.toLowerCase() !== String(competition).toLowerCase()) return false;
    }
    if (rival !== ALL && rivalKey(m.rivalName) !== rival) return false;
    return true;
  });
}

/* Cara a cara con un rival: resultados y goles por fase en esos partidos. */
export function headToHead(matches, key) {
  const list = (matches || []).filter((m) => rivalKey(m.rivalName) === key);
  return { summary: seasonSummary(list), phases: goalsByPhase(list) };
}

/* Situaciones especiales: goles a favor y en contra en las fases de ABP,
 * superioridad/inferioridad y penaltis, tal y como se etiquetaron. */
export const SPECIAL_PHASES = ["ABP", "5x4", "4x5", "4x3", "3x4", "6M (Penalti)", "10M (Doble penalti)"];
export function specialSituations(matches) {
  const phases = goalsByPhase(matches);
  return SPECIAL_PHASES.map((key) => {
    const p = phases.get(key) || { favor: 0, contra: 0 };
    return { key, favor: p.favor, contra: p.contra, diff: p.favor - p.contra };
  });
}
