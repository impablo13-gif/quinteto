/* Visión del entrenador: claves del partido, tendencia, qué nos marcan,
 * efectividad por zona y objetivos de la semana. */
import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { T } from "../../../theme/theme.js";
import { Button } from "../../../ui/kit.jsx";
import { storage } from "../../../storage.js";
import { METRICS, concededBreakdown, evaluateObjectives, fmtMetric, keyFacts, metricDef, trend, zoneEfficiency } from "../../../domain/insights.js";
import { Empty, MatchPicker, Section, Table, labelStyle, matchLabel, pickMatch, selectStyle, ShareBar, toneColor } from "./shared.jsx";

export function useObjectives(teamId) {
  const key = teamId ? `objectives:${teamId}` : null;
  const [list, setList] = useState([]);
  useEffect(() => {
    setList([]);
    if (!key) return undefined;
    let alive = true;
    storage.get(key).then((r) => { if (alive && r && r.value) { try { const v = JSON.parse(r.value); if (Array.isArray(v)) setList(v); } catch (e) {} } });
    return () => { alive = false; };
  }, [key]);
  const save = (next) => { setList(next); if (key) { if (next.length) storage.set(key, JSON.stringify(next)); else storage.del(key); } };
  return [list, save];
}

export function CoachView({ matches, teamId }) {
  const [date, setDate] = useState(null);
  const [objectives, setObjectives] = useObjectives(teamId);
  const [draft, setDraft] = useState({ metric: "turnoversOwnHalf", op: "<=", value: "" });
  const m = pickMatch(matches, date);
  const facts = m ? keyFacts(m, matches) : [];
  const tr = trend(matches, 5);
  const conc = concededBreakdown(matches);
  const zones = zoneEfficiency(matches);
  const recent = [...matches].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  const Arrow = ({ dir }) => (dir === "sube" ? <ArrowUpRight size={14} aria-hidden="true" /> : dir === "baja" ? <ArrowDownRight size={14} aria-hidden="true" /> : <ArrowRight size={14} aria-hidden="true" />);

  return (
    <div className="fadein">
      <Section title="Claves del partido" hint="Lo más llamativo del partido frente a la media de los demás. Solo frases que dicen los datos.">
        <MatchPicker matches={matches} value={m && m.date} onChange={setDate} />
        {facts.length ? facts.map((f, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14, lineHeight: 1.45, marginBottom: 8 }}>
            <span aria-hidden="true" style={{ flexShrink: 0, width: 9, height: 9, borderRadius: "50%", marginTop: 6, background: toneColor[f.tone] || T.dim }} />
            <span>{f.text}</span>
          </div>
        )) : <Empty>No hay nada que destaque claramente frente a la media (hacen falta al menos 3 partidos para comparar).</Empty>}
      </Section>

      <Section title="Tendencia: últimos 5 frente a la temporada" hint="Media por partido. La flecha dice si sube o baja; el color, si es para bien o para mal.">
        {matches.length < 3 ? <Empty>Hacen falta al menos 3 partidos.</Empty> : (
          <Table head={["Dato", "Temporada", "Últimos 5", ""]} rows={tr.map((r) => [
            r.label, fmtMetric(r.key, r.season), fmtMetric(r.key, r.recent),
            <span key="a" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: r.good === null ? T.dim : r.good ? T.positive : T.negative, fontWeight: 700 }}>
              <Arrow dir={r.dir} /> {r.dir === "igual" ? "igual" : r.good ? "mejor" : "peor"}
            </span>,
          ])} />
        )}
      </Section>

      <Section title="Qué nos marcan" hint="Goles en contra por fase y quién estaba en pista (el quinteto de cada gol queda guardado).">
        {!conc.total ? <Empty>Sin goles en contra en estos partidos.</Empty> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
            <Table head={["Fase", "Goles", "%"]} rows={conc.phases.map((p) => [p.label, p.count, <ShareBar key="b" value={p.share} color={T.negative} />])} />
            <Table head={["En pista en goles en contra", "Veces"]} rows={conc.onCourt.slice(0, 8).map((p) => [`${p.number} · ${p.name}`, p.count])} />
          </div>
        )}
      </Section>

      <Section title="Efectividad por zona" hint="Finalizaciones y goles por zona de tiro (arriba, la portería rival). Eficacia = goles / finalizaciones.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, maxWidth: 520 }}>
          {[...zones].sort((a, b) => b.row - a.row || a.col - b.col).map((z) => (
            <div key={z.zone} style={{ border: `1px solid ${T.line}`, borderRadius: 10, padding: "8px 6px", textAlign: "center", background: z.pct ? `color-mix(in srgb, ${T.accent} ${Math.round(z.pct * 60)}%, ${T.surface2})` : T.surface2 }}>
              <div style={{ fontSize: 10, color: T.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{z.label}</div>
              <div className="display" style={{ fontSize: 20, fontWeight: 700, color: z.pct ? T.ink : T.text }}>{z.finishes ? `${z.goals}/${z.finishes}` : "—"}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: z.pct ? T.ink : T.dim }}>{z.pct === null ? "" : `${Math.round(z.pct * 100)}%`}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Objetivos" hint="Objetivos medibles para cada partido (p. ej. «pérdidas en campo propio ≤ 5»). Se comprueban solos con lo anotado.">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
          <label style={{ flex: "2 1 220px" }}><span style={labelStyle}>Dato</span>
            <select value={draft.metric} onChange={(e) => setDraft({ ...draft, metric: e.target.value })} style={{ ...selectStyle, width: "100%" }}>
              {METRICS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </label>
          <label style={{ flex: "0 0 80px" }}><span style={labelStyle}>Condición</span>
            <select value={draft.op} onChange={(e) => setDraft({ ...draft, op: e.target.value })} style={{ ...selectStyle, width: "100%" }}>
              <option value="<=">como mucho</option><option value=">=">al menos</option>
            </select>
          </label>
          <label style={{ flex: "0 0 90px" }}><span style={labelStyle}>{metricDef(draft.metric).pct ? "Valor (0-1)" : "Valor"}</span>
            <input type="number" inputMode="decimal" step={metricDef(draft.metric).pct ? 0.05 : 1} value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} style={{ ...selectStyle, width: "100%", boxSizing: "border-box" }} />
          </label>
          <Button size="sm" variant="secondary" icon={Plus} disabled={draft.value === ""} onClick={() => { setObjectives([...objectives, { metric: draft.metric, op: draft.op, value: Number(draft.value) }]); setDraft({ ...draft, value: "" }); }}>Añadir</Button>
        </div>
        {!objectives.length ? <Empty>Sin objetivos todavía.</Empty> : (
          <Table minWidth={420} head={["Partido", ...objectives.map((o, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {`${metricDef(o.metric) ? metricDef(o.metric).label : o.metric} ${o.op === "<=" ? "≤" : "≥"} ${fmtMetric(o.metric, o.value)}`}
              <button type="button" onClick={() => setObjectives(objectives.filter((_, j) => j !== i))} aria-label="Quitar objetivo" style={{ border: "none", background: "transparent", color: T.dim, cursor: "pointer", padding: 4 }}><Trash2 size={12} /></button>
            </span>
          ))]} rows={recent.map((mm) => [matchLabel(mm), ...evaluateObjectives(objectives, mm).map((o, i) => (
            <span key={i} style={{ fontWeight: 700, color: o.ok === null ? T.dim : o.ok ? T.positive : T.negative }}>{fmtMetric(o.metric, o.actual)} {o.ok === null ? "" : o.ok ? "✓" : "✗"}</span>
          ))])} />
        )}
      </Section>
    </div>
  );
}
