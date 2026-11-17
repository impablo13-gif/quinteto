/* Filtros de temporada, competición y rival para Partidos, Jugadores y
 * Análisis. Por defecto «todas»: sin tocar nada se ve lo mismo que antes.
 * Solo aparece un filtro cuando hay algo que elegir (más de una temporada,
 * alguna competición anotada, varios rivales). */
import { T } from "../../theme/theme.js";
import { ALL, NO_COMPETITION, competitionOf, competitionsIn, headToHead, rivalsIn, seasonsIn } from "../../domain/filters.js";
import { GOAL_PHASES } from "../../domain/catalog.js";

const labelStyle = { fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };
const selectStyle = { background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, color: T.text, padding: "8px 10px", width: "100%", minHeight: 40 };

export function MatchFilters({ matches, value, onChange, showRival }) {
  const seasons = seasonsIn(matches);
  const comps = competitionsIn(matches);
  const someWithout = matches.some((m) => !competitionOf(m));
  const rivals = showRival ? rivalsIn(matches) : [];
  const showSeason = seasons.length > 1;
  const showComp = comps.length > 0;
  const showRivalSel = showRival && rivals.length > 1;
  if (!showSeason && !showComp && !showRivalSel) return null;
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
      {showSeason && (
        <label style={{ flex: "1 1 150px" }}><span style={labelStyle}>Temporada</span>
          <select value={value.season} onChange={(e) => set({ season: e.target.value })} style={selectStyle}>
            <option value={ALL}>Todas</option>
            {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      )}
      {showComp && (
        <label style={{ flex: "1 1 170px" }}><span style={labelStyle}>Competición</span>
          <select value={value.competition} onChange={(e) => set({ competition: e.target.value })} style={selectStyle}>
            <option value={ALL}>Todas</option>
            {comps.map((c) => <option key={c} value={c}>{c}</option>)}
            {someWithout && <option value={NO_COMPETITION}>Sin indicar</option>}
          </select>
        </label>
      )}
      {showRivalSel && (
        <label style={{ flex: "1 1 170px" }}><span style={labelStyle}>Rival (cara a cara)</span>
          <select value={value.rival} onChange={(e) => set({ rival: e.target.value })} style={selectStyle}>
            <option value={ALL}>Todos</option>
            {rivals.map((r) => <option key={r.key} value={r.key}>{r.label} ({r.n})</option>)}
          </select>
        </label>
      )}
    </div>
  );
}

/* Resumen del cara a cara con el rival elegido (sobre los partidos ya filtrados). */
export function HeadToHead({ matches, rival }) {
  const { summary: s, phases } = headToHead(matches, rival);
  if (!s.played) return null;
  const name = (rivalsIn(matches).find((r) => r.key === rival) || { label: "Rival" }).label;
  const diff = s.gf - s.ga;
  const phaseRows = GOAL_PHASES.map((p) => ({ ...p, ...(phases.get(p.key) || { favor: 0, contra: 0 }) })).filter((p) => p.favor + p.contra > 0);
  const extra = [...phases.values()].filter((p) => !GOAL_PHASES.some((g) => g.key === p.phase));
  const stat = (label, v, color) => (
    <div style={{ minWidth: 70 }}>
      <div style={{ fontSize: 10, color: T.dim, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700 }}>{label}</div>
      <div className="display" style={{ fontSize: 24, fontWeight: 700, color: color || T.text, fontVariantNumeric: "tabular-nums" }}>{v}</div>
    </div>
  );
  return (
    <section aria-label={`Cara a cara con ${name}`} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Cara a cara con {name}</div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: phaseRows.length ? 12 : 0 }}>
        {stat("Partidos", s.played)}
        {stat("V-E-D", `${s.wins}-${s.draws}-${s.losses}`)}
        {stat("Goles", `${s.gf}-${s.ga}`)}
        {stat("Diferencia", diff > 0 ? `+${diff}` : String(diff), diff > 0 ? T.positive : diff < 0 ? T.negative : T.text)}
      </div>
      {(phaseRows.length > 0 || extra.length > 0) && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ color: T.dim }}><th style={{ textAlign: "left", padding: "4px 6px" }}>Fase</th><th style={{ textAlign: "right", padding: "4px 6px" }}>A favor</th><th style={{ textAlign: "right", padding: "4px 6px" }}>En contra</th></tr></thead>
          <tbody>
            {[...phaseRows.map((p) => ({ k: p.key, label: p.label, color: p.color, favor: p.favor, contra: p.contra })), ...extra.map((p) => ({ k: p.phase, label: p.phase, color: T.dim, favor: p.favor, contra: p.contra }))].map((r) => (
              <tr key={r.k} style={{ borderTop: `1px solid ${T.line}` }}>
                <td style={{ padding: "5px 6px" }}><span aria-hidden="true" style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: r.color, marginRight: 6 }} />{r.label}</td>
                <td style={{ padding: "5px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.favor}</td>
                <td style={{ padding: "5px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.contra}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
