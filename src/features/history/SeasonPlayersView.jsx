/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Columns3, Download, FileSpreadsheet, Users } from "lucide-react";
import { PlayerComparator } from "./PlayerComparator.jsx";
import { storage } from "../../storage.js";
import { ZONE_ACTIONS, collectZoneEvents } from "../../zonas.js";
import { playerReport, seasonTable, selectMatches, seriesToCsv, tableToCsv } from "../../jugadores.js";
import { buildPlayerReportHtml } from "../../fichaHtml.js";
import { T, ghostBtn, alpha } from "../../theme/theme.js";
import { periodFromValue, periodLabelOf } from "../../domain/match.js";
import { PLAYER_COLS } from "../../ui/catalog.jsx";
import { downloadTextFile, sanitizeFileName } from "../../lib/files.js";
import { exportReportToPdf } from "../../reports/pdf.js";
export function SeasonPlayersView({ matches, teamId, teamName, teamColors, scopeLabel = "" }) {
  const [periodValue, setPeriodValue] = useState("all");
  const [selected, setSelected] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareKeys, setCompareKeys] = useState([]); // hasta 3 jugadores
  const toggleCompare = (key) => setCompareKeys((ks) => (ks.includes(key) ? ks.filter((k) => k !== key) : ks.length >= 3 ? ks : [...ks, key]));
  const [sort, setSort] = useState({ key: "number", dir: 1 });
  const [zoneAction, setZoneAction] = useState("finish");
  const [notes, setNotes] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const notesRef = useRef({ key: null, text: "", dirty: false });
  const timerRef = useRef(null);

  const period = useMemo(() => periodFromValue(periodValue), [periodValue]);
  const periodLabel = [scopeLabel, periodLabelOf(periodValue, matches)].filter(Boolean).join(" · ");
  const table = useMemo(() => seasonTable(matches, period), [matches, period]);
  const report = useMemo(() => (selected ? playerReport(matches, selected, period) : null), [matches, selected, period]);
  const sortedMatches = useMemo(() => [...matches].sort((a, b) => new Date(b.date) - new Date(a.date)), [matches]);

  // Conclusiones del entrenador: se guardan por equipo y jugador, y viajan en la copia de seguridad.
  const noteKey = selected && teamId ? `playernote:${teamId}:${selected}` : null;
  const flushNotes = () => {
    const n = notesRef.current;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (!n.dirty || !n.key) return;
    n.dirty = false;
    if (n.text.trim()) storage.set(n.key, n.text); else storage.del(n.key);
  };
  useEffect(() => {
    flushNotes();
    notesRef.current = { key: noteKey, text: "", dirty: false };
    setNotes("");
    if (!noteKey) return undefined;
    let alive = true;
    storage.get(noteKey).then((r) => {
      if (alive && r && typeof r.value === "string") { notesRef.current.text = r.value; setNotes(r.value); }
    });
    return () => { alive = false; flushNotes(); };
  }, [noteKey]);
  const onNotes = (text) => {
    setNotes(text);
    notesRef.current = { key: noteKey, text, dirty: true };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flushNotes, 800);
  };

  const zoneEvents = useMemo(() => {
    if (!selected) return [];
    return collectZoneEvents(selectMatches(matches, period)).events.filter((e) => e.playerKey === selected);
  }, [matches, period, selected]);

  const html = useMemo(() => (report ? buildPlayerReportHtml({ report, teamName, periodLabel, zoneEvents, zoneAction, notes, teamColors }) : ""), [report, teamName, periodLabel, zoneEvents, zoneAction, notes, teamColors]);

  const stamp = new Date().toISOString().slice(0, 10);
  const exportPdf = async () => {
    if (exporting || !report) return;
    setExporting(true); setExportError("");
    try { await exportReportToPdf(html, `${sanitizeFileName(teamName) || "equipo"}_ficha_${sanitizeFileName(report.name) || "jugador"}_${stamp}.pdf`); }
    catch (e) { setExportError("No se pudo generar el PDF. Prueba otra vez."); }
    setExporting(false);
  };

  if (!matches.length) {
    return <div style={{ padding: 20, textAlign: "center", color: T.dim, fontSize: 13, border: `1px dashed ${T.line}`, borderRadius: 12 }}>Todavía no hay partidos guardados para calcular las fichas de jugador.</div>;
  }

  const labelStyle = { fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };
  const selectStyle = { background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, color: T.text, padding: "8px 10px", width: "100%" };
  const periodSelect = (
    <label style={{ flex: "1 1 200px" }}><span style={labelStyle}>Periodo</span>
      <select value={periodValue} onChange={(e) => setPeriodValue(e.target.value)} style={selectStyle}>
        <option value="all">Toda la temporada ({matches.length})</option>
        {matches.length > 3 && <option value="last3">Últimos 3 partidos</option>}
        {matches.length > 5 && <option value="last5">Últimos 5 partidos</option>}
        {sortedMatches.map((m) => <option key={m.date} value={`m:${m.date}`}>{new Date(m.date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })} vs {m.rivalName || "Rival"}</option>)}
      </select>
    </label>
  );

  /* ---------- ficha individual ---------- */
  if (selected) {
    return (
      <div className="fadein">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
          <button onClick={() => setSelected(null)} style={{ ...ghostBtn, padding: "9px 12px" }}><ArrowRight size={14} style={{ transform: "rotate(180deg)" }} /> Plantilla</button>
          {periodSelect}
          <label style={{ flex: "1 1 200px" }}><span style={labelStyle}>Mapa de zonas</span>
            <select value={zoneAction} onChange={(e) => setZoneAction(e.target.value)} style={selectStyle}>
              {ZONE_ACTIONS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
          </label>
        </div>

        {!report ? (
          <div style={{ padding: 20, textAlign: "center", color: T.dim, fontSize: 13, border: `1px dashed ${T.line}`, borderRadius: 12 }}>
            Este jugador no fue convocado en el periodo elegido. Cambia el periodo o vuelve a la plantilla.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <button onClick={exportPdf} disabled={exporting} style={{ ...ghostBtn, borderColor: T.accent, color: T.accent, fontWeight: 700, opacity: exporting ? 0.6 : 1 }}><Download size={14} /> {exporting ? "Generando…" : "Descargar PDF"}</button>
              <button onClick={() => downloadTextFile(seriesToCsv(report), `${sanitizeFileName(teamName) || "equipo"}_${sanitizeFileName(report.name) || "jugador"}_partidos_${stamp}.csv`, "text/csv;charset=utf-8")} style={ghostBtn}><FileSpreadsheet size={14} /> CSV partido a partido</button>
            </div>
            {exportError && <div style={{ color: T.negative, fontSize: 12, marginBottom: 10 }}>{exportError}</div>}

            <div style={{ overflowX: "auto", borderRadius: 12 }}>
              <div style={{ minWidth: 0 }} dangerouslySetInnerHTML={{ __html: html }} />
            </div>

            <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: 12, marginTop: 12 }}>
              <label><span style={labelStyle}>Conclusiones del entrenador (salen en el PDF · se guardan solas)</span>
                <textarea value={notes} onChange={(e) => onNotes(e.target.value)} onBlur={flushNotes} rows={4} maxLength={2000} placeholder="Qué mantener, qué mejorar, objetivo para las próximas semanas…" style={{ ...selectStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
              </label>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ---------- tabla de plantilla ---------- */
  const colBy = PLAYER_COLS.find((c) => c.key === sort.key);
  const rows = [...table].sort((a, b) => {
    if (!colBy) return ((Number(a.number) || 999) - (Number(b.number) || 999)) * sort.dir;
    const va = colBy.get(a), vb = colBy.get(b);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    return (vb - va) * sort.dir;
  });
  const dupNames = (() => {
    const seen = new Map();
    table.forEach((p) => { const k = `${p.name}#${p.number}`; seen.set(k, (seen.get(k) || 0) + 1); });
    return [...seen.values()].some((c) => c > 1);
  })();
  const thS = { padding: "6px 6px", textAlign: "right", cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" };
  const tdS = { padding: "6px 6px", textAlign: "right", whiteSpace: "nowrap" };

  return (
    <div className="fadein">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: T.text, textTransform: "uppercase" }}>
          <Users size={14} /> Jugadores · {periodLabel}
        </div>
        <button onClick={() => downloadTextFile(tableToCsv(table), `${sanitizeFileName(teamName) || "equipo"}_jugadores_${stamp}.csv`, "text/csv;charset=utf-8")} disabled={!table.length} style={{ ...ghostBtn, borderColor: T.accent, color: T.accent, opacity: table.length ? 1 : 0.5 }}><FileSpreadsheet size={14} /> Exportar CSV</button>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
        {periodSelect}
        {table.length > 1 && (
          <button type="button" aria-pressed={compareMode} onClick={() => { setCompareMode((v) => !v); if (compareMode) setCompareKeys([]); }} style={{ ...ghostBtn, minHeight: 40, borderColor: compareMode ? T.accent : T.line, color: compareMode ? T.accent : T.text }}>
            <Columns3 size={14} aria-hidden="true" /> {compareMode ? "Salir de comparar" : "Comparar jugadores"}
          </button>
        )}
      </div>
      {compareMode && (
        <div style={{ fontSize: 12, color: T.dim, marginBottom: 10 }}>{compareKeys.length < 2 ? `Toca ${compareKeys.length ? "otro jugador" : "dos o tres jugadores"} de la tabla para compararlos.` : compareKeys.length === 3 ? "Máximo tres jugadores. Quita uno para cambiarlo." : "Puedes añadir uno más."}</div>
      )}
      {compareMode && <PlayerComparator players={compareKeys.map((k) => table.find((p) => p.key === k)).filter(Boolean)} onRemove={toggleCompare} />}

      {dupNames && (
        <div style={{ background: alpha(T.warning, 0.12), border: `1px solid ${T.warning}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
          Algún jugador sale dos veces: los partidos más antiguos no guardaron su identificador y no se pueden unir con seguridad a los nuevos. Las cifras de cada fila son correctas; solo están repartidas.
        </div>
      )}

      {!table.length ? (
        <div style={{ padding: 20, textAlign: "center", color: T.dim, fontSize: 13, border: `1px dashed ${T.line}`, borderRadius: 12 }}>Nadie fue convocado en este periodo.</div>
      ) : (
        <div style={{ overflowX: "auto", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12 }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr style={{ color: T.dim }}>
                <th onClick={() => setSort({ key: "number", dir: 1 })} style={{ ...thS, textAlign: "left", position: "sticky", left: 0, background: T.surface, zIndex: 1 }}>Jugador</th>
                {PLAYER_COLS.map((c) => (
                  <th key={c.key} title={c.title} onClick={() => setSort(sort.key === c.key ? { key: c.key, dir: -sort.dir } : { key: c.key, dir: 1 })} style={{ ...thS, color: sort.key === c.key ? T.accent : T.dim }}>
                    {c.label}{sort.key === c.key ? (sort.dir === 1 ? " ↓" : " ↑") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.key} onClick={() => (compareMode ? toggleCompare(p.key) : setSelected(p.key))} aria-selected={compareMode ? compareKeys.includes(p.key) : undefined} style={{ borderTop: `1px solid ${T.line}`, cursor: "pointer", background: compareMode && compareKeys.includes(p.key) ? alpha(T.accent, 0.08) : "transparent" }}>
                  <td style={{ ...tdS, textAlign: "left", position: "sticky", left: 0, background: T.surface, zIndex: 1 }}>
                    {compareMode && <input type="checkbox" readOnly checked={compareKeys.includes(p.key)} aria-label={`Comparar a ${p.name}`} style={{ marginRight: 6, accentColor: T.accent, verticalAlign: "middle" }} />}
                    <span style={{ color: T.accent, fontWeight: 700 }}>{p.number}</span> {p.name}{p.isGK ? <span style={{ color: T.gk, fontSize: 10, fontWeight: 700 }}> POR</span> : ""}
                  </td>
                  {PLAYER_COLS.map((c) => {
                    const v = c.get(p);
                    const shown = v === null ? "—" : (c.fmt ? c.fmt(v) : v);
                    const color = c.color && v !== null ? (v > 0 ? T.positive : v < 0 ? T.negative : T.dim) : T.text;
                    return <td key={c.key} style={{ ...tdS, color, fontWeight: c.color ? 700 : 400 }}>{shown}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.5, marginTop: 10 }}>
        Toca un jugador para ver su ficha y descargar el PDF. Toca una cabecera para ordenar. Solo salen los convocados en el periodo.
        El <strong style={{ color: T.text }}>+/-</strong> es contexto (depende de con quién comparte pista), no mérito individual, y solo cuenta partidos con minutos.
      </div>
    </div>
  );
}
