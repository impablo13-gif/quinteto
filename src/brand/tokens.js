/* Tokens de diseño de Quinteto: la ÚNICA fuente de colores y tipografías.
 *
 * Paleta B · «Volt» (elegida el 16-11-2026, DISENO-TRANSFORMACION.md §6.3 y
 * §17). Reglas que estos valores ya respetan:
 *   · La marca (volt) no significa «bueno» ni «malo»: solo marca, selección y
 *     «está en pista». Lo positivo va en turquesa, lo negativo en rojo.
 *   · Sobre el volt (y sobre cualquier relleno vivo) el texto es tinta, nunca
 *     blanco: el blanco sobre volt no se lee.
 *   · El portero va en azul y siempre con su etiqueta, nunca solo por color
 *     (el turquesa y el azul están cerca).
 *   · En papel (informes, PDF, paneles claros) el volt no se lee: se usa
 *     `paper.accent`.
 *
 * Los componentes no escriben colores: leen `T` (src/theme/theme.js), que sale
 * de aquí. Cambiar la identidad es cambiar este fichero.
 */

export const PALETTE = Object.freeze({
  // superficies
  bg: "#0E1110",
  surface: "#171B19",
  surface2: "#20251F",
  surface3: "#2A3029",
  line: "rgba(238,242,236,0.10)",
  overlay: "rgba(5,7,6,0.62)",
  shadow: "rgba(0,0,0,0.45)",
  // texto
  text: "#EEF2EC",
  textMuted: "#9AA597",
  white: "#F7F8F5",
  ink: "#0E1110", // texto sobre rellenos vivos
  // marca
  accent: "#C6F432",
  // significado
  positive: "#2DD4BF",
  negative: "#F0525F",
  warning: "#F2B640",
  gk: "#60A5FA",
  info: "#7CC4FA",
  orange: "#E08A3C",
});

/* Para fondos claros dentro de la app (marcador de fases) y para informes. */
export const PAPER = Object.freeze({
  bg: "#FFFFFF",
  bgAlt: "#FAFBFC",
  highlight: "#FDF6DD",
  track: "#F0F1F3",
  line: "#EEF0F2",
  ink: "#15181C",
  inkSoft: "#3A3A3A",
  muted: "#6B7280",
  subtle: "#9AA0A6",
  faint: "#AAAAAA",
  onDark: "#FFFFFF",
  accent: "#4D7C0F",
  positive: "#1FA971",
  negative: "#D93B4A",
  shadow: "rgba(15,23,32,0.08)",
});

/* Colores categóricos de los grupos de fases de gol (una sola definición para
 * app, informe y Excel). Son categorías, no «bueno/malo». */
export const PHASE_COLORS = Object.freeze({
  abp: "#8E5FD9",
  positional: "#E0A030",
  transition: "#2FBF87",
  powerPlay: "#3B82C4",
  numerical: "#E08A3C",
  penalty: "#F0525F",
  doublePenalty: "#B8323F",
  ownGoal: "#6B7280",
  other: "#5B8DA6", // fases que añade cada equipo (grupo «Otras»)
});

/* Colores por posición en el informe (categóricos). */
export const POSITION_COLORS = Object.freeze({ POR: "#E0A030", CIE: "#2E9BD6", ALA: "#16B889", PIV: "#E2574C" });

export const FONTS = Object.freeze({
  ui: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
  display: '"Barlow Condensed", "Inter", "Arial Narrow", sans-serif',
});

/* "#RRGGBB" -> "R,G,B" (para rgba(...) en SVG y CSS). */
export function rgbTriplet(hex) {
  const h = String(hex).replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/* Color con transparencia, desde un token hexadecimal. */
export const alpha = (hex, a) => `rgba(${rgbTriplet(hex)},${a})`;

/* Variables CSS con los mismos valores, para index.css y estilos globales. */
export function cssVariables() {
  const v = {
    "--q-bg": PALETTE.bg, "--q-surface": PALETTE.surface, "--q-text": PALETTE.text, "--q-text-muted": PALETTE.textMuted,
    "--q-accent": PALETTE.accent, "--q-accent-rgb": rgbTriplet(PALETTE.accent), "--q-ink": PALETTE.ink,
    "--q-positive": PALETTE.positive, "--q-negative": PALETTE.negative, "--q-warning": PALETTE.warning, "--q-gk": PALETTE.gk,
    "--q-font-ui": FONTS.ui, "--q-font-display": FONTS.display,
  };
  return `:root{${Object.entries(v).map(([k, val]) => `${k}:${val}`).join(";")}}`;
}

/* Papel de los informes (informe de partido, ficha, memoria, balance, PDF y
 * Excel). Mismos significados que en la app: positivo verde, negativo rojo,
 * aviso ámbar, información azul. La marca del club (si la hay) se suma con
 * `reportTheme()`; sin colores de club, la cabecera va en tinta. */
export const REPORT = Object.freeze({
  bg: "#FFFFFF",
  soft: "#F6F7F8",
  track: "#F0F1F3",
  line: "#E6E8EB",
  lineSoft: "#F2F3F5",
  ink: "#15181C",
  inkRaised: "#2A3029",
  inkSoft: "#3A3D42",
  muted: "#6B7280",
  subtle: "#8A9099",
  faint: "#B7BCC2",
  onDark: "#FFFFFF",
  accent: PAPER.accent,
  brand: PALETTE.accent,
  positive: "#147A52",
  positiveBg: "#EAFBF3",
  positiveLine: "#C8F0DD",
  negative: "#C93545",
  negativeBg: "#FDEEF0",
  negativeLine: "#F6D0D5",
  info: "#1C74A8",
  infoBg: "#EAF4FC",
  warning: "#9A6A12",
  warningBg: "#FEF8E7",
  warningLine: "#F0DCA0",
  // categorías de tiro (no son «bueno/malo»)
  shotOn: "#2E9BD6",
  shotOff: "#E08A3C",
  shotPost: "#D4A62A",
  shotPostBg: "#FBF1D8",
  shotOffBg: "#FBF1E1",
  // tarjetas
  yellowCard: "#E3B23C",
  yellowInk: "#7A5C12",
  redCard: "#B8323F",
  redCardBg: "#FBE6E9",
  // pista dibujada
  courtLine: "#B8D9F0",
  courtGrid: "#D6E9F7",
  courtBorder: "#BFDDF3",
  courtA: "#EFF6FC",
  courtB: "#F8FBFE",
  courtLabel: "#3A75A3",
  // calor de las zonas (ficha y campogramas)
  heat: { finish: "#C93545", shotsOff: "#787878", shotsPost: "#C8961E", recoveries: "#147A52", turnovers: "#C8961E", fouls: "#E08A3C", foulsReceived: "#2E9BD6" },
  // Excel
  sheetHead: "#15181C",
  sheetHeadAlt: "#3A3D42",
  sheetTotal: "#FDE9A8",
  sheetBorder: "#D9D9D9",
});

const HEX6 = /^#[0-9A-Fa-f]{6}$/;
export const isHexColor = (v) => typeof v === "string" && HEX6.test(v);

/* Luminancia relativa y contraste WCAG entre dos colores "#RRGGBB". */
export function relativeLuminance(hex) {
  return rgbTriplet(hex).split(",").map(Number).map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
}
export function contrastRatio(a, b) {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/* Mezcla un color hacia negro (amount 0..1). */
export function darken(hex, amount) {
  const [r, g, b] = rgbTriplet(hex).split(",").map(Number).map((c) => Math.round(c * (1 - amount)));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/* Tema del informe a partir de los colores del club (opcionales).
 *   header      fondo de la cabecera (degradado)
 *   onHeader    texto sobre la cabecera (blanco o tinta, el que se lea)
 *   stripe      franja bajo la cabecera (color secundario del club o el volt)
 *   title       color de los títulos de sección sobre papel (≥ 4,5:1)
 * Un color mal escrito se ignora: nunca llega al HTML. */
export function reportTheme(colors) {
  const primary = colors && isHexColor(colors.primary) ? colors.primary : null;
  const secondary = colors && isHexColor(colors.secondary) ? colors.secondary : null;
  const base = primary || REPORT.ink;
  const onHeader = contrastRatio(REPORT.onDark, base) >= 4.5 || contrastRatio(REPORT.onDark, base) >= contrastRatio(REPORT.ink, base) ? REPORT.onDark : REPORT.ink;
  let title = REPORT.accent;
  if (primary) {
    title = primary;
    for (let k = 0.1; contrastRatio(title, REPORT.bg) < 4.5 && k <= 0.8; k += 0.1) title = darken(primary, k);
    if (contrastRatio(title, REPORT.bg) < 4.5) title = REPORT.ink;
  }
  return {
    clubColors: Boolean(primary),
    header: primary ? `linear-gradient(120deg, ${darken(primary, 0.35)}, ${primary})` : `linear-gradient(120deg, ${REPORT.ink}, ${REPORT.inkRaised})`,
    onHeader,
    stripe: secondary || (primary ? null : REPORT.brand),
    title,
    bar: primary ? title : REPORT.accent,
  };
}

/* El mismo tono, oscurecido lo justo para leerse como texto sobre papel
 * (≥ 4,5:1). Para etiquetas de colores categóricos claros (naranja, ámbar). */
export function legibleOn(color, bg = REPORT.bg) {
  if (!isHexColor(color)) return REPORT.ink;
  let c = color;
  for (let k = 0.1; contrastRatio(c, bg) < 4.5 && k <= 0.8; k += 0.1) c = darken(color, k);
  return contrastRatio(c, bg) >= 4.5 ? c : REPORT.ink;
}
