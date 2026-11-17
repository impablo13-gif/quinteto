/* Tema de la interfaz: lo que leen los componentes. Todo sale de
 * src/brand/tokens.js; aqui solo se dan nombres de uso y variantes con
 * transparencia. Ningun componente debe escribir un color literal. */
import { PALETTE, PAPER, alpha } from "../brand/tokens.js";

export { alpha, PAPER };

export const T = {
  // superficies y texto
  bg: PALETTE.bg,
  surface: PALETTE.surface,
  surface2: PALETTE.surface2,
  surface3: PALETTE.surface3,
  line: PALETTE.line,
  text: PALETTE.text,
  dim: PALETTE.textMuted,
  white: PALETTE.white,
  ink: PALETTE.ink, // texto sobre rellenos vivos (marca, positivo, negativo, aviso)
  overlay: PALETTE.overlay,
  shadow: PALETTE.shadow,
  // marca: seleccion, foco, «en pista», accion principal
  accent: PALETTE.accent,
  // significado
  positive: PALETTE.positive,
  negative: PALETTE.negative,
  warning: PALETTE.warning,
  gk: PALETTE.gk, // portero (o portero-jugador) en pista
  info: PALETTE.info,
  orange: PALETTE.orange,
};

// Colores del marcador +/- y de las barras a favor / en contra en paneles claros.
export const PAL_FAVOR = PAPER.positive, PAL_CONTRA = PAPER.negative;

/* estilos compartidos */
export const bigBtn = { display: "flex", alignItems: "center", gap: 6, border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" };
export const ghostBtn = { display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${T.line}`, borderRadius: 10, padding: "9px 14px", color: T.text, fontSize: 12, cursor: "pointer" };
export const iconBtnSm = { display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 6, border: "none", background: T.surface3, color: T.text, cursor: "pointer" };
export const overlayStyle = { position: "fixed", inset: 0, background: T.overlay, display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 90, padding: 16 };
export const modalCard = { background: T.surface, border: `1px solid ${T.line}`, borderRadius: "18px 18px 12px 12px", padding: 18, width: "100%", boxShadow: `0 -8px 32px ${T.shadow}` };
