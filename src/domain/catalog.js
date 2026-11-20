/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { ZONES_COARSE, ZONES_FINE, ZONE_LABELS } from "../zonas.js";
import { T } from "../theme/theme.js";
import { PHASE_COLORS, POSITION_COLORS, rgbTriplet } from "../brand/tokens.js";
// Estas cuatro llevan minuto: cada vez que se anotan (desde Acciones, la
// tarjeta dedicada, o la ficha del jugador) queda registrado a qué marca del
// reloj pasó, para la sección "Faltas y tarjetas" del resumen e historial.
export const DISCIPLINE_KEYS = new Set(["fouls", "foulsReceived", "yellow", "red"]);
export const DISCIPLINE_LABEL = { fouls: "Falta cometida", foulsReceived: "Falta recibida", yellow: "Amarilla", red: "Roja" };
export const DISCIPLINE_COLOR = { fouls: T.negative, foulsReceived: T.positive, yellow: T.warning, red: T.negative };
export const ZONED_LABEL = { turnovers: "Pérdida", recoveries: "Recuperación", shotsOn: "Tiro a puerta", shotsOff: "Tiro fuera", shotsPost: "Tiro al palo", fouls: "Falta cometida", foulsReceived: "Falta recibida" };
export const ZONED_COLOR = { turnovers: T.dim, recoveries: T.positive, shotsOn: T.positive, shotsOff: T.dim, shotsPost: T.warning, fouls: T.negative, foulsReceived: T.positive };

// Every goal (a favor or en contra) must be tagged with exactly one of these — mandatory,
// no "skip" option — grouped and color-coded so the origin is readable at a glance.
export const GOAL_PHASES = [
  { key: "ABP", label: "ABP", group: 1, color: PHASE_COLORS.abp },
  { key: "Ataque Posicional", label: "Ataque Posicional", group: 2, color: PHASE_COLORS.positional },
  { key: "Incorporación", label: "Incorporación", group: 2, color: PHASE_COLORS.positional },
  { key: "Recuperación", label: "Recuperación", group: 3, color: PHASE_COLORS.transition },
  { key: "Transición", label: "Transición", group: 3, color: PHASE_COLORS.transition },
  { key: "5x4", label: "5x4", group: 4, color: PHASE_COLORS.powerPlay },
  { key: "4x5", label: "4x5", group: 4, color: PHASE_COLORS.powerPlay },
  { key: "4x3", label: "4x3", group: 5, color: PHASE_COLORS.numerical },
  { key: "3x4", label: "3x4", group: 5, color: PHASE_COLORS.numerical },
  { key: "6M (Penalti)", label: "6M (Penalti)", group: 6, color: PHASE_COLORS.penalty },
  { key: "10M (Doble penalti)", label: "10M (Doble penalti)", group: 6, color: PHASE_COLORS.doublePenalty },
  { key: "En propia", label: "En propia", group: 7, color: PHASE_COLORS.ownGoal },
];

// GOAL_PHASES agrupadas por su "group" -- la base del marcador de temporada
// por fases de gol: cada bloque de fases afines comparte una
// franja de color (la de su primera fase) en vez de que cada una lleve la suya,
// para que la cabecera de cada categoría se lea de un solo golpe de vista.
export const GOAL_PHASE_GROUPS = (() => {
  const map = new Map();
  GOAL_PHASES.forEach((p) => {
    if (!map.has(p.group)) map.set(p.group, { id: p.group, color: p.color, phases: [] });
    map.get(p.group).phases.push(p);
  });
  return [...map.values()]
    .sort((a, b) => a.id - b.id)
    .map((g) => ({ ...g, label: g.phases.map((p) => p.label).join(" / ") }));
})();

// Pérdidas, recuperaciones, tiros y faltas llevan zona del campo — campo propio
// abajo, campo rival arriba, como se ve el campo de pie en la banda.
// Desde ahora se registran en 18 zonas (6 filas x 3 carriles, ~6,7 m de lado):
// PITCH_ZONES_FINE. Los partidos ya guardados llevan las 9 de antes (3x3,
// PITCH_ZONES) y siguen valiendo; el informe PDF las sigue dibujando en 9, y
// cada zona fina cae entera en una de esas 9 (ver zonas.js). Todas las
// definiciones viven en zonas.js, que es lo que prueban los tests.
export const PITCH_ZONES = ZONES_COARSE;
export const PITCH_ZONES_FINE = ZONES_FINE;
export const PITCH_ZONE_LABEL = ZONE_LABELS;

// Estas acciones llevan quién y en qué zona del campo, con el mismo
// asistente en tres pasos que ya usan los goles: acción → jugador → zona.
// Las faltas, además, siguen llevando el minuto exacto (bump las trata
// también como DISCIPLINE_KEYS), así que la zona se suma a lo que ya había.
export const ZONED_KEYS = new Set(["turnovers", "recoveries", "shotsOn", "shotsOff", "shotsPost", "fouls", "foulsReceived"]);

// Acciones de portero: se anotan directamente al portero que esté en pista
// (el de la plantilla o quien juegue de portero-jugador), sin elegir jugador.
export const GK_ACTION_LABEL = { saves: "Parada", gkOneVsOne: "1x1 ganado", gkInterceptions: "Salida / corte", gkDistOk: "Saque bueno", gkDistBad: "Saque fallado" };
export const GK_KEYS = new Set(Object.keys(GK_ACTION_LABEL));

export const POS_GROUP_COLOR = POSITION_COLORS;
export const POS_GROUP_ICON = { POR: "🧤", CIE: "🛡", ALA: "🪽", PIV: "🎯" };

export const COMPETITION_SUGGESTIONS = ["Liga regular", "Copa", "Amistoso", "Play-off / Eliminatoria", "Torneo"];
export const PITCH_MATERIAL_SUGGESTIONS = ["Parquet", "Cemento pulido", "PVC deportivo", "Terrazo"];

/* Mapa de zonas de la temporada. Lo unico espacial que registra la app es la
   ZONA (rejilla 3x3 que se toca al anotar la accion), asi que esto es la
   distribucion de acciones por zona -- no posiciones exactas ni ocupacion de la
   pista. Mismo orden que el selector de zona: vuestra porteria abajo, la rival
   arriba. La logica (filtros, conteos, CSV) vive en zonas.js y esta probada. */
export const ZONE_ACTION_RGB = {
  finish: rgbTriplet(T.accent), goal: rgbTriplet(T.accent), shotsOn: rgbTriplet(T.accent), shotsOff: rgbTriplet(T.dim), shotsPost: rgbTriplet(T.warning),
  recoveries: rgbTriplet(T.positive), turnovers: rgbTriplet(T.negative), fouls: rgbTriplet(T.orange), foulsReceived: rgbTriplet(T.info),
};
export const ZONE_LOW_DATA = 15;
