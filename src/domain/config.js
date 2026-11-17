/* Configuracion por equipo (DISENO-TRANSFORMACION.md §8.4): reglas del
 * partido, nombres de las posiciones y fases de gol.
 *
 * Se guarda dentro del propio equipo (`team.config`), igual que el escudo y los
 * colores: viaja en la copia de seguridad sin tocar su formato y un equipo sin
 * `config` se comporta exactamente como hasta ahora (los valores por defecto
 * son los de siempre).
 *
 * Las claves de posicion y de fase NO cambian nunca: son las que llevan los
 * partidos guardados. Lo que se edita es la etiqueta que se ve. Una fase que
 * ya se uso no se puede borrar, solo ocultar (deja de ofrecerse al anotar,
 * pero el historico la sigue contando y mostrando).
 */
import { POS_LABEL, POSITIONS, OT_HALF_MIN } from "./match.js";
import { GOAL_PHASES, GOAL_PHASE_GROUPS } from "./catalog.js";
import { PHASE_COLORS } from "../brand/tokens.js";

export const DEFAULT_RULES = Object.freeze({
  halfMinutes: 20,
  overtimeHalfMinutes: OT_HALF_MIN,
  timeoutsPerHalf: 1, // 0 = sin limite
  foulsForDoublePenalty: 6,
  runningClock: false,
});

export const RULE_LIMITS = Object.freeze({
  halfMinutes: [1, 60],
  overtimeHalfMinutes: [1, 15],
  timeoutsPerHalf: [0, 5],
  foulsForDoublePenalty: [2, 20],
});

export const RULE_TEMPLATES = Object.freeze([
  { id: "estandar", label: "Estándar", hint: "2 × 20 a reloj parado", rules: { ...DEFAULT_RULES } },
  { id: "formacion", label: "Formación", hint: "2 × 25 a tiempo corrido", rules: { ...DEFAULT_RULES, halfMinutes: 25, runningClock: true } },
]);

// Copia intacta de lo que trae la app, para poder volver a ello.
const BASE_PHASES = GOAL_PHASES.map((p) => ({ ...p }));
const BASE_POS_LABEL = { ...POS_LABEL };
export const OTHER_PHASE_GROUP = 8;
export const BASE_PHASE_KEYS = new Set(BASE_PHASES.map((p) => p.key));

const clampInt = (v, [min, max], fallback) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const cleanLabel = (s, max = 30) => String(s == null ? "" : s).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

/* Cualquier cosa (null, un objeto antiguo, datos a medias) -> config completa y valida. */
export function normalizeConfig(raw) {
  const c = raw && typeof raw === "object" ? raw : {};
  const r = c.rules && typeof c.rules === "object" ? c.rules : {};
  const rules = {
    halfMinutes: clampInt(r.halfMinutes, RULE_LIMITS.halfMinutes, DEFAULT_RULES.halfMinutes),
    overtimeHalfMinutes: clampInt(r.overtimeHalfMinutes, RULE_LIMITS.overtimeHalfMinutes, DEFAULT_RULES.overtimeHalfMinutes),
    timeoutsPerHalf: clampInt(r.timeoutsPerHalf, RULE_LIMITS.timeoutsPerHalf, DEFAULT_RULES.timeoutsPerHalf),
    foulsForDoublePenalty: clampInt(r.foulsForDoublePenalty, RULE_LIMITS.foulsForDoublePenalty, DEFAULT_RULES.foulsForDoublePenalty),
    runningClock: r.runningClock === true,
  };
  const positions = {};
  POSITIONS.forEach((k) => {
    const l = cleanLabel(c.positions && c.positions[k], 20);
    if (l && l !== BASE_POS_LABEL[k]) positions[k] = l;
  });
  const phases = {};
  const srcPhases = c.phases && typeof c.phases === "object" ? c.phases : {};
  const customPhases = [];
  const seen = new Set(BASE_PHASE_KEYS);
  (Array.isArray(c.customPhases) ? c.customPhases : []).forEach((p) => {
    const key = cleanLabel(p && p.key, 30);
    if (!key || seen.has(key)) return;
    seen.add(key);
    const group = clampInt(p.group, [1, OTHER_PHASE_GROUP], OTHER_PHASE_GROUP);
    customPhases.push({ key, group });
  });
  seen.forEach((key) => {
    const o = srcPhases[key];
    if (!o || typeof o !== "object") return;
    const label = cleanLabel(o.label, 30);
    const entry = {};
    if (label && label !== key) entry.label = label;
    if (o.hidden === true) entry.hidden = true;
    if (Object.keys(entry).length) phases[key] = entry;
  });
  return { rules, positions, phases, customPhases };
}

export const isDefaultConfig = (raw) => {
  const c = normalizeConfig(raw);
  return JSON.stringify(c) === JSON.stringify(normalizeConfig(null));
};

export const templateOf = (rules) => {
  const t = RULE_TEMPLATES.find((tp) => Object.keys(DEFAULT_RULES).every((k) => tp.rules[k] === rules[k]));
  return t ? t.id : "personalizada";
};

/* Aplica la config del equipo activo a los catalogos que lee toda la app
 * (etiquetas de posicion, lista de fases y sus grupos). Se cambian en su
 * sitio para que cada pantalla, el informe y el Excel lean lo mismo sin pasar
 * la config de mano en mano. Con null vuelve a lo de serie. */
export function applyConfig(raw) {
  const c = normalizeConfig(raw);
  POSITIONS.forEach((k) => { POS_LABEL[k] = c.positions[k] || BASE_POS_LABEL[k]; });

  const groupColor = new Map(BASE_PHASES.map((p) => [p.group, p.color]));
  groupColor.set(OTHER_PHASE_GROUP, PHASE_COLORS.other);
  const list = [
    ...BASE_PHASES.map((p) => ({ ...p })),
    ...c.customPhases.map((p) => ({ key: p.key, label: p.key, group: p.group, color: groupColor.get(p.group), custom: true })),
  ].map((p) => {
    const o = c.phases[p.key] || {};
    const out = { ...p, label: o.label || p.label };
    if (o.hidden) out.hidden = true;
    return out;
  });
  // Las fases nuevas se colocan junto a las de su grupo.
  list.sort((a, b) => a.group - b.group || (a.custom ? 1 : 0) - (b.custom ? 1 : 0));
  GOAL_PHASES.splice(0, GOAL_PHASES.length, ...list);

  const map = new Map();
  GOAL_PHASES.forEach((p) => {
    if (!map.has(p.group)) map.set(p.group, { id: p.group, color: p.color, phases: [] });
    map.get(p.group).phases.push(p);
  });
  const groups = [...map.values()].sort((a, b) => a.id - b.id).map((g) => ({ ...g, label: g.phases.map((p) => p.label).join(" / ") }));
  GOAL_PHASE_GROUPS.splice(0, GOAL_PHASE_GROUPS.length, ...groups);
  return c;
}

/* Fases que se ofrecen al anotar un gol: las visibles, mas la que ya lleve el
 * gol que se esta corrigiendo (aunque se haya ocultado despues). */
export const selectablePhases = (currentKey) => GOAL_PHASES.filter((p) => !p.hidden || p.key === currentKey);

/* Que fases tienen goles guardados: esas no se pueden borrar. */
export function phasesInUse(matches) {
  const used = new Map();
  (matches || []).forEach((m) => (m.goalEvents || []).forEach((g) => { if (g.phase) used.set(g.phase, (used.get(g.phase) || 0) + 1); }));
  return used;
}

/* Plural para las cabeceras del informe («Porteros», «Pívots»). */
export function pluralLabel(label) {
  const l = String(label || "");
  if (/s$/i.test(l)) return l;
  if (/[aeiouáéíóút]$/i.test(l)) return `${l}s`;
  return `${l}es`;
}
