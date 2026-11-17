/* Comparador: dos o tres jugadores lado a lado en el periodo elegido, con las
 * mismas columnas (y las mismas cifras) que la tabla de Jugadores. Se marca
 * la mejor cifra de cada fila; en pérdidas, faltas y tarjetas, la menor. El
 * +/- no se marca: es contexto, no mérito individual. */
import { X } from "lucide-react";
import { T } from "../../theme/theme.js";
import { PLAYER_COLS } from "../../ui/catalog.jsx";

const LOWER_IS_BETTER = new Set(["per", "fc", "ta", "tr"]);
const NOT_RANKED = new Set(["bal"]);
const SHORT = {
  pj: "Partidos con minutos", min: "Minutos jugados", g: "Goles", a: "Asistencias", fin: "Finalizaciones", ef: "Eficacia (%)",
  rec: "Recuperaciones", per: "Pérdidas", fc: "Faltas cometidas", ta: "Amarillas", tr: "Rojas", bal: "Más/menos en pista",
};

export function bestIndexes(values, key) {
  if (NOT_RANKED.has(key)) return new Set();
  const nums = values.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : null));
  const valid = nums.filter((v) => v !== null);
  if (valid.length < 2) return new Set();
  const target = LOWER_IS_BETTER.has(key) ? Math.min(...valid) : Math.max(...valid);
  if (valid.every((v) => v === target)) return new Set(); // empate total: no se marca a nadie
  return new Set(nums.map((v, i) => (v === target ? i : -1)).filter((i) => i >= 0));
}

export function PlayerComparator({ players, onRemove }) {
  if (players.length < 2) return null;
  const th = { padding: "8px 8px", textAlign: "right", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", minWidth: 0 };
  const td = { padding: "6px 8px", textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
  return (
    <div role="region" aria-label="Comparador de jugadores" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, marginBottom: 12, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${T.line}` }}>
            <th style={{ ...th, textAlign: "left", color: T.dim, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>Comparar</th>
            {players.map((p) => (
              <th key={p.key} style={th}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span><span style={{ color: T.accent }}>{p.number}</span> {p.name}</span>
                  <button type="button" onClick={() => onRemove(p.key)} aria-label={`Quitar a ${p.name} del comparador`} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${T.line}`, background: "transparent", color: T.dim, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <X size={13} aria-hidden="true" />
                  </button>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PLAYER_COLS.map((c) => {
            const values = players.map((p) => c.get(p));
            const best = bestIndexes(values, c.key);
            return (
              <tr key={c.key} style={{ borderTop: `1px solid ${T.line}` }}>
                <td title={c.title} style={{ ...td, textAlign: "left", color: T.dim, fontSize: 12, whiteSpace: "normal", width: "40%", minWidth: 120 }}>{SHORT[c.key] || c.title}</td>
                {values.map((v, i) => (
                  <td key={players[i].key} style={{ ...td, fontWeight: best.has(i) ? 800 : 400, color: best.has(i) ? T.accent : T.text }}>
                    {v === null ? "—" : (c.fmt ? c.fmt(v) : v)}
                    {best.has(i) && <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}> (mejor)</span>}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ fontSize: 11, color: T.dim, padding: "6px 10px 10px" }}>En color, la mejor cifra de cada fila (en pérdidas, faltas y tarjetas, la menor). El +/- no se compara: depende de con quién comparte pista.</div>
    </div>
  );
}
