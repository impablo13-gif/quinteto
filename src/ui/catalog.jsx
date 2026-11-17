/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { AlertTriangle, ArrowLeftRight, Footprints, Hand, Minus, Shield, Target, X } from "lucide-react";
import { T } from "../theme/theme.js";
import { signedN } from "../domain/match.js";
export function Square({ size = 16, color = "currentColor" }) {
  return <div style={{ width: size * 0.62, height: size * 0.85, background: color, borderRadius: 2 }} />;
}

export const STAT_DEFS = [
  { key: "goals", label: "Gol", icon: Target, color: T.accent },
  { key: "assists", label: "Asistencia", icon: ArrowLeftRight, color: T.positive },
  { key: "shotsOn", label: "Tiro a puerta", icon: Target, color: T.positive },
  { key: "shotsOff", label: "Tiro fuera", icon: X, color: T.dim },
  { key: "shotsPost", label: "Tiro al palo", icon: Minus, color: T.warning },
  { key: "recoveries", label: "Recuperación", icon: Shield, color: T.positive },
  { key: "turnovers", label: "Pérdida", icon: Footprints, color: T.dim },
  { key: "fouls", label: "Falta cometida", icon: AlertTriangle, color: T.negative },
  { key: "foulsReceived", label: "Falta recibida", icon: Shield, color: T.positive },
  { key: "yellow", label: "Amarilla", icon: Square, color: T.warning },
  { key: "red", label: "Roja", icon: Square, color: T.negative },
];

// The bottom quick-action bar's "Acciones" button opens a picker of these.
// "Parada" es un caso especial: no se arma como las demás para tocar luego a
// un jugador — se anota directa al portero que esté en pista (ver
// armStatAction), así que no hace falta tocar nada más.
export const QUICK_STAT_ACTIONS = [
  { key: "shotsOn", label: "Tiro a puerta", icon: Target, color: T.positive },
  { key: "shotsOff", label: "Tiro fuera", icon: X, color: T.dim },
  { key: "shotsPost", label: "Tiro al palo", icon: Minus, color: T.warning },
  { key: "turnovers", label: "Pérdida", icon: Footprints, color: T.dim },
  { key: "recoveries", label: "Recuperación", icon: Shield, color: T.positive },
  { key: "fouls", label: "Falta cometida", icon: AlertTriangle, color: T.negative },
  { key: "foulsReceived", label: "Falta recibida", icon: Shield, color: T.positive },
  { key: "saves", label: "Parada", icon: Hand, color: T.positive },
];

// The bottom bar's own dedicated "Tarjeta" button opens this separate, smaller picker.
export const CARD_ACTIONS = [
  { key: "yellow", label: "Amarilla", icon: (p) => <Square {...p} />, color: T.warning },
  { key: "red", label: "Roja", icon: (p) => <Square {...p} />, color: T.negative },
];

// Sumatorio del equipo entero para esa sección (parte o total), resaltado y
// con brillo a propósito para que se distinga de un vistazo de la tabla
// jugador a jugador de justo encima.
export const TEAM_TOTAL_ITEMS = [
  { key: "goals", label: "G" }, { key: "assists", label: "A" },
  { key: "shotsOn", label: "TP" }, { key: "shotsOff", label: "TF" }, { key: "shotsPost", label: "TPa" },
  { key: "turnovers", label: "Pér" }, { key: "recoveries", label: "Rec" },
  { key: "fouls", label: "FC" }, { key: "foulsReceived", label: "FR" },
  { key: "yellow", label: "TA" }, { key: "red", label: "TR" }, { key: "saves", label: "Par" },
];

export const PLAYER_COLS = [
  { key: "pj", label: "PJ", title: "Partidos con minutos", get: (p) => p.total.matchesPlayed },
  { key: "min", label: "Min", title: "Minutos jugados", get: (p) => p.total.minutes, fmt: (v) => String(Math.round(v)) },
  { key: "g", label: "G", title: "Goles", get: (p) => p.total.goals },
  { key: "a", label: "A", title: "Asistencias", get: (p) => p.total.assists },
  { key: "fin", label: "Fin", title: "Finalizaciones: goles + tiros a puerta, fuera y al palo", get: (p) => p.total.finishes },
  { key: "ef", label: "Ef %", title: "Goles / finalizaciones", get: (p) => (p.total.efficiency === null ? null : p.total.efficiency * 100), fmt: (v) => `${Math.round(v)}` },
  { key: "rec", label: "Rec", title: "Recuperaciones", get: (p) => p.total.recoveries },
  { key: "per", label: "Pér", title: "Pérdidas", get: (p) => p.total.turnovers },
  { key: "fc", label: "FC", title: "Faltas cometidas", get: (p) => p.total.fouls },
  { key: "ta", label: "TA", title: "Tarjetas amarillas", get: (p) => p.total.yellow },
  { key: "tr", label: "TR", title: "Tarjetas rojas", get: (p) => p.total.red },
  { key: "bal", label: "+/-", title: "Goles a favor menos en contra con el jugador en pista (solo partidos con minutos)", get: (p) => (p.total.matchesPlayed ? p.total.balance : null), fmt: signedN, color: true },
];
