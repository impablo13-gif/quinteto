/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { useMemo } from "react";
import { ArrowRight, BarChart3, FileSpreadsheet } from "lucide-react";
import { PAL_CONTRA, PAL_FAVOR, T, ghostBtn, PAPER } from "../../theme/theme.js";
import { GOAL_PHASES, GOAL_PHASE_GROUPS } from "../../domain/catalog.js";
import { exportSeasonGoalStatsToExcel, seasonGoalStatsRows, sumSeasonGoalCounts } from "../../reports/excel.js";
/* Donut sencillo en SVG (sin canvas: esto vive en pantalla, no en un PDF
   rasterizado) para ver de un vistazo qué categoría pesa más en el reparto. */
export function StatDonut({ segments, size = 128, strokeWidth = 20 }) {
  const active = segments.filter((s) => s.value > 0);
  const total = active.reduce((s, x) => s + x.value, 0);
  if (!total) return <div style={{ fontSize: 11, color: PAPER.faint, textAlign: "center", padding: 20 }}>Sin goles registrados.</div>;
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke={PAPER.line} strokeWidth={strokeWidth} />
      {active.map((s, i) => {
        const dash = (s.value / total) * circumference;
        const el = (
          <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={s.color} strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset}
            transform={`rotate(-90 ${c} ${c})`} strokeLinecap="butt" />
        );
        offset += dash;
        return el;
      })}
      <text x={c} y={c - 6} textAnchor="middle" fontSize={size * 0.22} fontWeight={800} fill={PAPER.ink}>{total}</text>
      <text x={c} y={c + 14} textAnchor="middle" fontSize={size * 0.09} fontWeight={600} fill={PAPER.subtle}>GOLES</text>
    </svg>
  );
}

/* Barra horizontal de comparación a favor / en contra por categoría --
   mismo patrón visual que el ranking de minutos del informe de partido
   (una barra de color con el ancho proporcional al máximo del bloque). */
export function GoalStatBar({ label, color, forValue, againstValue, max }) {
  const pct = (v) => `${max ? (v / max) * 100 : 0}%`;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, fontWeight: 700, color: PAPER.inkSoft, marginBottom: 3 }}>
        <span>{label}</span>
        <span><span style={{ color: PAL_FAVOR }}>{forValue}</span> · <span style={{ color: PAL_CONTRA }}>{againstValue}</span></span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ background: PAPER.track, borderRadius: 5, height: 8, overflow: "hidden" }}>
          <div style={{ width: pct(forValue), height: "100%", background: color }} />
        </div>
        <div style={{ background: PAPER.track, borderRadius: 5, height: 8, overflow: "hidden" }}>
          <div style={{ width: pct(againstValue), height: "100%", background: color, opacity: 0.45 }} />
        </div>
      </div>
    </div>
  );
}

/* Marcador de temporada de "fases de gol": tabla coloreada por categoría con GOLES A FAVOR y EN
   CONTRA espejados, fila de TOTALES y una fila por partido -- aquí una fila
   por partido propio, no por equipo rival de liga, que es la unidad que
   tiene sentido siguiendo a un solo equipo durante la temporada. Se calcula
   solo a partir de las fases que ya se etiquetan al registrar cada gol
   durante el partido: no hace falta teclear nada aparte. */
export function SeasonGoalStatsView({ matches, teamName, onRowClick }) {
  const rows = useMemo(() => seasonGoalStatsRows(matches), [matches]);
  const totalsFor = useMemo(() => sumSeasonGoalCounts(rows, "forCounts"), [rows]);
  const totalsAgainst = useMemo(() => sumSeasonGoalCounts(rows, "againstCounts"), [rows]);
  const totalForAll = Object.values(totalsFor).reduce((a, b) => a + b, 0);
  const totalAgainstAll = Object.values(totalsAgainst).reduce((a, b) => a + b, 0);

  if (!rows.length) {
    return <div style={{ padding: 20, textAlign: "center", color: T.dim, fontSize: 13, border: `1px dashed ${T.line}`, borderRadius: 12 }}>Todavía no hay partidos guardados para calcular el marcador de fases de gol.</div>;
  }

  const groupTotal = (totals, group) => group.phases.reduce((s, p) => s + (totals[p.key] || 0), 0);
  const maxPhaseValue = Math.max(1, ...GOAL_PHASES.map((p) => Math.max(totalsFor[p.key] || 0, totalsAgainst[p.key] || 0)));

  const thGroup = (color) => ({ background: color, color: PAPER.onDark, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.3, padding: "6px 4px", textAlign: "center", whiteSpace: "nowrap" });
  const thPhase = (color) => ({ background: `${color}22`, color: PAPER.ink, fontSize: 9.5, fontWeight: 700, padding: "5px 4px", textAlign: "center", borderTop: `2px solid ${color}`, minWidth: 46 });
  const tdNum = { padding: "5px 4px", textAlign: "center", fontSize: 12, fontVariantNumeric: "tabular-nums" };

  return (
    <div className="fadein">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: T.text, textTransform: "uppercase" }}>
          <BarChart3 size={14} /> Fases de gol de la temporada
        </div>
        <button onClick={() => exportSeasonGoalStatsToExcel(matches, teamName)} style={{ ...ghostBtn, borderColor: T.accent, color: T.accent }}>
          <FileSpreadsheet size={14} /> Exportar a Excel
        </button>
      </div>

      {/* ---- Donuts de origen: a favor y en contra, uno junto al otro ---- */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        {[{ label: "De dónde vienen nuestros goles", totals: totalsFor, total: totalForAll }, { label: "De dónde nos hacen goles", totals: totalsAgainst, total: totalAgainstAll }].map((block, i) => (
          <div key={i} style={{ flex: "1 1 260px", background: PAPER.bg, borderRadius: 14, padding: 14, boxShadow: `0 1px 3px ${PAPER.shadow}` }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: PAPER.muted, textTransform: "uppercase", textAlign: "center", marginBottom: 8 }}>{block.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <StatDonut segments={GOAL_PHASE_GROUPS.map((g) => ({ value: groupTotal(block.totals, g), color: g.color }))} />
              <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, minWidth: 0 }}>
                {GOAL_PHASE_GROUPS.filter((g) => groupTotal(block.totals, g) > 0).map((g) => {
                  const v = groupTotal(block.totals, g);
                  const pct = block.total ? Math.round((v / block.total) * 100) : 0;
                  return (
                    <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: PAPER.ink }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: g.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.label}</span>
                      <b>{v}</b><span style={{ color: PAPER.subtle, width: 30, textAlign: "right" }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ---- Barras de comparación por fase individual, a favor vs en contra ---- */}
      <div style={{ background: PAPER.bg, borderRadius: 14, padding: 14, marginBottom: 16, boxShadow: `0 1px 3px ${PAPER.shadow}` }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: PAPER.muted, textTransform: "uppercase", marginBottom: 10 }}>
          <span style={{ color: PAL_FAVOR }}>■</span> A favor &nbsp; <span style={{ color: PAL_CONTRA }}>■</span> En contra &nbsp;·&nbsp; por fase
        </div>
        {GOAL_PHASES.filter((p) => (totalsFor[p.key] || 0) + (totalsAgainst[p.key] || 0) > 0).map((p) => (
          <GoalStatBar key={p.key} label={p.label} color={p.color} forValue={totalsFor[p.key] || 0} againstValue={totalsAgainst[p.key] || 0} max={maxPhaseValue} />
        ))}
      </div>

      {/* ---- Tabla coloreada: TOTALES + una fila por partido ----
         Con 2x9 fases + 2 totales la tabla es ancha de verdad en una tablet, así
         que la columna de fecha/rival queda fija al hacer scroll horizontal --
         si no, es fácil perder de qué partido es cada fila. Cada fila, además,
         lleva al partido correspondiente en "Partidos" (mismo gesto que ya usan
         las tarjetas del historial: tocar para abrir). */}
      <div style={{ background: PAPER.bg, borderRadius: 14, padding: 14, overflowX: "auto", boxShadow: `0 1px 3px ${PAPER.shadow}` }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th rowSpan={3} style={{ ...thGroup(PAPER.ink), textAlign: "left", padding: "6px 8px", position: "sticky", left: 0, zIndex: 2 }}>Partido</th>
              <th colSpan={GOAL_PHASES.length + 1} style={thGroup(PAPER.inkSoft)}>GOLES A FAVOR ({totalForAll})</th>
              <th colSpan={GOAL_PHASES.length + 1} style={thGroup(PAPER.inkSoft)}>GOLES EN CONTRA ({totalAgainstAll})</th>
            </tr>
            <tr>
              {GOAL_PHASE_GROUPS.map((g) => (
                <th key={`for-g-${g.id}`} colSpan={g.phases.length} style={thGroup(g.color)}>{g.label}</th>
              ))}
              <th rowSpan={2} style={thGroup(PAPER.inkSoft)}>Total</th>
              {GOAL_PHASE_GROUPS.map((g) => (
                <th key={`against-g-${g.id}`} colSpan={g.phases.length} style={thGroup(g.color)}>{g.label}</th>
              ))}
              <th rowSpan={2} style={thGroup(PAPER.inkSoft)}>Total</th>
            </tr>
            <tr>
              {GOAL_PHASES.map((p) => (
                <th key={`for-p-${p.key}`} style={thPhase(p.color)}>{p.label}</th>
              ))}
              {GOAL_PHASES.map((p) => (
                <th key={`against-p-${p.key}`} style={thPhase(p.color)}>{p.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: PAPER.highlight }}>
              <td style={{ padding: "6px 8px", fontWeight: 800, fontSize: 12, position: "sticky", left: 0, background: PAPER.highlight, zIndex: 1 }}>TOTALES</td>
              {GOAL_PHASES.map((p) => <td key={`ft-${p.key}`} style={{ ...tdNum, fontWeight: 800 }}>{totalsFor[p.key] || 0}</td>)}
              <td style={{ ...tdNum, fontWeight: 800 }}>{totalForAll}</td>
              {GOAL_PHASES.map((p) => <td key={`at-${p.key}`} style={{ ...tdNum, fontWeight: 800 }}>{totalsAgainst[p.key] || 0}</td>)}
              <td style={{ ...tdNum, fontWeight: 800 }}>{totalAgainstAll}</td>
            </tr>
            {rows.map((row, i) => {
              const rowForTotal = Object.values(row.forCounts).reduce((a, b) => a + b, 0);
              const rowAgainstTotal = Object.values(row.againstCounts).reduce((a, b) => a + b, 0);
              const rowBg = i % 2 ? PAPER.bgAlt : PAPER.bg;
              return (
                <tr
                  key={row.date} onClick={() => onRowClick && onRowClick(row.date)}
                  style={{ borderTop: `1px solid ${PAPER.line}`, background: rowBg, cursor: onRowClick ? "pointer" : "default" }}
                >
                  <td style={{ padding: "5px 8px", fontSize: 11, whiteSpace: "nowrap", position: "sticky", left: 0, background: rowBg, zIndex: 1 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {new Date(row.date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })} <span style={{ color: PAPER.subtle }}>vs {row.rivalName}</span>
                      {onRowClick && <ArrowRight size={11} color={PAPER.negative} />}
                    </span>
                  </td>
                  {GOAL_PHASES.map((p) => <td key={`fr-${p.key}`} style={tdNum}>{row.forCounts[p.key] || 0}</td>)}
                  <td style={{ ...tdNum, fontWeight: 700 }}>{rowForTotal}</td>
                  {GOAL_PHASES.map((p) => <td key={`ar-${p.key}`} style={tdNum}>{row.againstCounts[p.key] || 0}</td>)}
                  <td style={{ ...tdNum, fontWeight: 700 }}>{rowAgainstTotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
