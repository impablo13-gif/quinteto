/* Colores del club para los informes (informe de partido, ficha, memoria y
 * PDF). No cambian la interfaz de la app: la app sigue siendo Quinteto y el
 * informe lleva la identidad del club (DISENO-TRANSFORMACION.md §4). Sin
 * colores, el informe usa la cabecera en tinta de la marca. */
import { Palette, X } from "lucide-react";
import { T } from "../../theme/theme.js";
import { isHexColor, reportTheme, REPORT } from "../../brand/tokens.js";
import { Button } from "../../ui/kit.jsx";

function Swatch({ label, value, fallback, onChange, onClear }) {
  const has = isHexColor(value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <label style={{ position: "relative", width: 40, height: 40, borderRadius: 10, border: `1px solid ${T.line}`, background: has ? value : T.surface2, cursor: "pointer", flexShrink: 0, overflow: "hidden" }}>
        {!has && <Palette size={16} color={T.dim} aria-hidden="true" style={{ position: "absolute", inset: 0, margin: "auto" }} />}
        <input
          type="color" aria-label={`Elegir ${label.toLowerCase()}`} value={has ? value : fallback}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", border: 0, padding: 0 }}
        />
      </label>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11, color: T.dim, fontVariantNumeric: "tabular-nums" }}>{has ? value : "Sin elegir"}</div>
      </div>
      {has && (
        <button type="button" onClick={onClear} aria-label={`Quitar ${label.toLowerCase()}`} style={{ marginLeft: "auto", width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.line}`, background: "transparent", color: T.dim, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function ClubColors({ team, onChange }) {
  const colors = team.colors || {};
  const theme = reportTheme(colors);
  const set = (patch) => onChange({ ...colors, ...patch });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, color: T.dim, lineHeight: 1.45 }}>Colores del club para la portada de los informes y el PDF. La app no cambia.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <Swatch label="Principal" value={colors.primary} fallback={REPORT.ink} onChange={(v) => set({ primary: v })} onClear={() => set({ primary: null })} />
        <Swatch label="Secundario" value={colors.secondary} fallback={REPORT.bg} onChange={(v) => set({ secondary: v })} onClear={() => set({ secondary: null })} />
      </div>
      {/* Vista previa de la cabecera del informe con estos colores */}
      <div aria-hidden="true" style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${T.line}` }}>
        <div style={{ background: theme.header, color: theme.onHeader, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.name}</span>
          <span style={{ background: REPORT.bg, color: REPORT.ink, borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>3 - 2</span>
        </div>
        {theme.stripe && <div style={{ height: 4, background: theme.stripe }} />}
        <div style={{ background: REPORT.bg, padding: "6px 12px", fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: theme.title }}>Minutos y rotaciones</div>
      </div>
      {(colors.primary || colors.secondary) && (
        <div><Button size="sm" variant="ghost" onClick={() => onChange(null)}>Volver a los colores de Quinteto</Button></div>
      )}
    </div>
  );
}
