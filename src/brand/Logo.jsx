/* Símbolo y logotipo de Quinteto: cinco puntos en rombo 1-2-1 (pívot en el
 * color de marca, portero en anillo). Misma geometría que los iconos de la
 * PWA (tools/make-icons.mjs). */
import { PALETTE } from "./tokens.js";
import { BRAND } from "./brand.js";

export function LogoMark({ size = 28, tile = PALETTE.surface2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
      <rect x="0" y="0" width="100" height="100" rx="22" fill={tile} />
      <circle cx="50" cy="24" r="8.5" fill={PALETTE.accent} />
      <circle cx="28" cy="45" r="8.5" fill={PALETTE.text} />
      <circle cx="72" cy="45" r="8.5" fill={PALETTE.text} />
      <circle cx="50" cy="62" r="8.5" fill={PALETTE.text} />
      <circle cx="50" cy="81" r="6.5" fill="none" stroke={PALETTE.text} strokeWidth="3.5" />
    </svg>
  );
}

export function Logo({ size = 28, showName = true }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }} aria-label={BRAND.name}>
      <LogoMark size={size} />
      {showName && <span className="display" style={{ fontSize: size * 0.82, fontWeight: 600, letterSpacing: 0.6, color: PALETTE.text, lineHeight: 1 }}>{BRAND.name.toLowerCase()}</span>}
    </span>
  );
}
