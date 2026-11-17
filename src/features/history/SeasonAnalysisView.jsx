/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { storage } from "../../storage.js";
import { seasonTable, selectMatches } from "../../jugadores.js";
import { BUCKET_OPTIONS, goalsByMinute, goalsByPhase, quintetBalance, seasonSummary } from "../../analisis.js";
import { buildSeasonReportHtml } from "../../memoriaHtml.js";
import { T, ghostBtn } from "../../theme/theme.js";
import { periodFromValue, periodLabelOf } from "../../domain/match.js";
import { GOAL_PHASES } from "../../domain/catalog.js";
import { sanitizeFileName } from "../../lib/files.js";
import { specialSituations } from "../../domain/filters.js";
import { exportReportToPdf } from "../../reports/pdf.js";
/* Jugadores: totales de la plantilla en el periodo elegido y ficha individual
   (pantalla + PDF + CSV). La logica vive en jugadores.js y el HTML de la ficha
   en fichaHtml.js, los dos probados; aqui solo hay pantalla. La ficha que se ve
   es el mismo HTML que se vuelca al PDF. */
/* Análisis de temporada: la memoria (resultados, fases, goles por minuto,
   jugadores y quintetos) del periodo elegido. Lo que se ve es el mismo HTML que
   se vuelca al PDF. La lógica vive en analisis.js y el HTML en memoriaHtml.js. */
export function SeasonAnalysisView({ matches, teamId, teamName, teamColors, scopeLabel = "" }) {
  const [periodValue, setPeriodValue] = useState("all");
  const [bucketMin, setBucketMin] = useState(5); // tamaño del tramo de "goles por minuto": 2, 3, 5 o 10
  const [notes, setNotes] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const notesRef = useRef({ text: "", dirty: false });
  const timerRef = useRef(null);
  const noteKey = teamId ? `seasonnote:${teamId}` : null;

  const period = useMemo(() => periodFromValue(periodValue), [periodValue]);
  const periodLabel = [scopeLabel, periodLabelOf(periodValue, matches)].filter(Boolean).join(" · ");
  const chosen = useMemo(() => selectMatches(matches, period), [matches, period]);
  const sortedMatches = useMemo(() => [...matches].sort((a, b) => new Date(b.date) - new Date(a.date)), [matches]);

  const flushNotes = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (!notesRef.current.dirty || !noteKey) return;
    notesRef.current.dirty = false;
    if (notesRef.current.text.trim()) storage.set(noteKey, notesRef.current.text); else storage.del(noteKey);
  };
  useEffect(() => {
    notesRef.current = { text: "", dirty: false };
    setNotes("");
    if (!noteKey) return undefined;
    let alive = true;
    storage.get(noteKey).then((r) => { if (alive && r && typeof r.value === "string") { notesRef.current.text = r.value; setNotes(r.value); } });
    return () => { alive = false; flushNotes(); };
  }, [noteKey]);
  const onNotes = (text) => {
    setNotes(text);
    notesRef.current = { text, dirty: true };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flushNotes, 800);
  };

  const html = useMemo(() => buildSeasonReportHtml({
    teamName, teamColors, periodLabel, summary: seasonSummary(chosen), minutes: goalsByMinute(chosen, bucketMin), quintets: quintetBalance(chosen),
    phases: goalsByPhase(chosen), phaseOrder: GOAL_PHASES, playersTable: seasonTable(matches, period), notes,
  }), [chosen, matches, period, teamName, teamColors, periodLabel, notes, bucketMin]);

  const exportPdf = async () => {
    if (exporting) return;
    setExporting(true); setExportError("");
    try { await exportReportToPdf(html, `${sanitizeFileName(teamName) || "equipo"}_memoria_${new Date().toISOString().slice(0, 10)}.pdf`); }
    catch (e) { setExportError("No se pudo generar el PDF. Prueba otra vez."); }
    setExporting(false);
  };

  if (!matches.length) {
    return <div style={{ padding: 20, textAlign: "center", color: T.dim, fontSize: 13, border: `1px dashed ${T.line}`, borderRadius: 12 }}>Todavía no hay partidos guardados para analizar.</div>;
  }
  const labelStyle = { fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };
  const selectStyle = { background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, color: T.text, padding: "8px 10px", width: "100%" };
  return (
    <div className="fadein">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
        <label style={{ flex: "1 1 220px" }}><span style={labelStyle}>Periodo</span>
          <select value={periodValue} onChange={(e) => setPeriodValue(e.target.value)} style={selectStyle}>
            <option value="all">Toda la temporada ({matches.length})</option>
            {matches.length > 3 && <option value="last3">Últimos 3 partidos</option>}
            {matches.length > 5 && <option value="last5">Últimos 5 partidos</option>}
            {sortedMatches.map((m) => <option key={m.date} value={`m:${m.date}`}>{new Date(m.date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })} vs {m.rivalName || "Rival"}</option>)}
          </select>
        </label>
        <label style={{ flex: "0 1 170px" }}><span style={labelStyle}>Goles por minuto: tramo</span>
          <select value={bucketMin} onChange={(e) => setBucketMin(Number(e.target.value))} style={selectStyle}>
            {BUCKET_OPTIONS.map((n) => <option key={n} value={n}>{n} minutos</option>)}
          </select>
        </label>
        <button onClick={exportPdf} disabled={exporting} style={{ ...ghostBtn, borderColor: T.accent, color: T.accent, fontWeight: 700, opacity: exporting ? 0.6 : 1 }}><Download size={14} /> {exporting ? "Generando…" : "Descargar memoria (PDF)"}</button>
      </div>
      {exportError && <div style={{ color: T.negative, fontSize: 12, marginBottom: 10 }}>{exportError}</div>}
      <SpecialSituations matches={chosen} />
      <div style={{ overflowX: "auto", borderRadius: 12 }}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: 12, marginTop: 12 }}>
        <label><span style={labelStyle}>Conclusiones del entrenador (salen en el PDF · se guardan solas)</span>
          <textarea value={notes} onChange={(e) => onNotes(e.target.value)} onBlur={flushNotes} rows={4} maxLength={2000} placeholder="Balance de la fase, qué ha funcionado, objetivos para la siguiente…" style={{ ...selectStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
        </label>
      </div>
    </div>
  );
}

/* Situaciones especiales: ABP, superioridad/inferioridad y penaltis, con los
   goles tal y como se etiquetaron al anotarlos (no es un dato nuevo). */
function SpecialSituations({ matches }) {
  const rows = specialSituations(matches);
  if (!rows.some((r) => r.favor + r.contra > 0)) return null;
  const labelOf = (k) => (GOAL_PHASES.find((p) => p.key === k) || { label: k }).label;
  const colorOf = (k) => (GOAL_PHASES.find((p) => p.key === k) || { color: T.dim }).color;
  return (
    <section aria-label="Situaciones especiales" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Situaciones especiales</div>
      <div style={{ fontSize: 11, color: T.dim, marginBottom: 10 }}>Goles en ABP, en superioridad o inferioridad y de penalti, según la fase con que se anotó cada gol.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
        {rows.map((r) => (
          <div key={r.key} style={{ border: `1px solid ${T.line}`, borderTop: `3px solid ${colorOf(r.key)}`, borderRadius: 10, padding: "8px 10px", opacity: r.favor + r.contra ? 1 : 0.55 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{labelOf(r.key)}</div>
            <div className="display" style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{r.favor}<span style={{ color: T.dim, fontSize: 14 }}> – </span>{r.contra}</div>
            <div style={{ fontSize: 11, color: r.diff > 0 ? T.positive : r.diff < 0 ? T.negative : T.dim }}>{r.favor + r.contra ? (r.diff > 0 ? `+${r.diff}` : r.diff < 0 ? String(r.diff) : "igualado") : "sin goles"}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: T.dim, marginTop: 8 }}>Cifras: a favor – en contra.</div>
    </section>
  );
}
