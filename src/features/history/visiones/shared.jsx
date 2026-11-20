/* Piezas comunes de las visiones de Análisis (entrenador, analista, dirección,
 * físico, anotador): tarjetas, tablas, selector de partido y barras. */
import { T } from "../../../theme/theme.js";

export const box = { background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, marginBottom: 12 };
export const selectStyle = { background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, color: T.text, padding: "8px 10px", minHeight: 40, maxWidth: "100%" };
export const labelStyle = { fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };

export function Section({ title, hint, right, children }) {
  return (
    <section style={box} aria-label={title}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: hint ? 4 : 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
        {right}
      </div>
      {hint && <div style={{ fontSize: 11.5, color: T.dim, lineHeight: 1.45, marginBottom: 10 }}>{hint}</div>}
      {children}
    </section>
  );
}

export function Table({ head, rows, firstLeft = true, minWidth = 0 }) {
  const th = { padding: "6px 8px", fontSize: 10.5, fontWeight: 700, color: T.dim, textAlign: "right", whiteSpace: "nowrap" };
  const td = { padding: "6px 8px", fontSize: 12.5, textAlign: "right", borderTop: `1px solid ${T.line}`, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth }}>
        <thead><tr>{head.map((h, i) => <th key={i} style={{ ...th, ...(i === 0 && firstLeft ? { textAlign: "left" } : {}) }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, j) => <tr key={j}>{r.map((c, i) => <td key={i} style={{ ...td, ...(i === 0 && firstLeft ? { textAlign: "left", whiteSpace: "normal" } : {}) }}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function Empty({ children }) {
  return <div style={{ fontSize: 12.5, color: T.dim, padding: "4px 0" }}>{children}</div>;
}

export function ShareBar({ value, color = T.accent, warn }) {
  const pct = Math.round(Math.max(0, Math.min(1, value || 0)) * 100);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
      <span aria-hidden="true" style={{ width: 90, height: 7, borderRadius: 4, background: T.surface3, overflow: "hidden", display: "inline-block" }}>
        <span style={{ display: "block", width: `${pct}%`, height: "100%", background: warn ? T.warning : color }} />
      </span>
      <span style={{ minWidth: 34 }}>{pct}%</span>
    </span>
  );
}

export const matchLabel = (m) => `${new Date(m.date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" })} · ${m.rivalName || "Rival"} (${m.teamGoals ?? 0}-${m.rivalScore ?? 0})`;

export function MatchPicker({ matches, value, onChange, label = "Partido" }) {
  const sorted = [...matches].sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <label style={{ display: "block", marginBottom: 12, maxWidth: 420 }}>
      <span style={labelStyle}>{label}</span>
      <select value={value || (sorted[0] && sorted[0].date) || ""} onChange={(e) => onChange(e.target.value)} style={{ ...selectStyle, width: "100%" }}>
        {sorted.map((m) => <option key={m.date} value={m.date}>{matchLabel(m)}</option>)}
      </select>
    </label>
  );
}

export const pickMatch = (matches, date) => {
  const sorted = [...matches].sort((a, b) => new Date(b.date) - new Date(a.date));
  return sorted.find((m) => m.date === date) || sorted[0] || null;
};

export const toneColor = { positive: T.positive, negative: T.negative, warning: T.warning, neutral: T.dim };
