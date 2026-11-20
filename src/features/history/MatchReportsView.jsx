/* Análisis › Informes: todos los informes de los partidos en un sitio.
 * Por cada partido (respetando los filtros de temporada y competición):
 *   · PDF completo y PDF resumido (se generan al momento con los datos guardados)
 *   · CSV de eventos (orden de juego, con segundo de partido para cortes de vídeo)
 *   · CSV de jugadores (las columnas del Excel del partido)
 *   · JSON del partido (formato quinteto-partido: lo leen herramientas de
 *     análisis de vídeo y de planificación compatibles)
 * y un paquete con todos los partidos filtrados en un solo .json. */
import { useState } from "react";
import { Braces, FileDown, FileText, Package, Table, UserRound } from "lucide-react";
import { T } from "../../theme/theme.js";
import { Button } from "../../ui/kit.jsx";
import { buildMatchReportHtml, buildMatchJsonPayload } from "../../reports/matchReport.js";
import { exportReportToPdf } from "../../reports/pdf.js";
import { matchEventsCsv, matchPlayersCsv } from "../../reports/csv.js";
import { downloadTextFile, dateLabelOf, sanitizeFileName } from "../../lib/files.js";
import { BACKUP_FORMAT, BACKUP_VERSION } from "../../data/formats.js";
import { BRAND } from "../../brand/brand.js";
import { competitionOf, seasonOf } from "../../domain/filters.js";
import { ROLES, buildRoleReportHtml } from "../../reports/roleReport.js";
import { useObjectives } from "./visiones/CoachView.jsx";

export function MatchReportsView({ matches, teamId, teamName, teamCrest, teamColors, rosterPlayers, trainings = [] }) {
  const [role, setRole] = useState("entrenador");
  const [objectives] = useObjectives(teamId);
  const roleDef = ROLES.find((r) => r.key === role);
  const [busy, setBusy] = useState(null); // `${date}:${kind}` mientras se genera un PDF
  const [error, setError] = useState("");
  const sorted = [...matches].sort((a, b) => new Date(b.date) - new Date(a.date));
  const base = (m) => `${sanitizeFileName(teamName) || "equipo"}_${dateLabelOf(m.date)}_vs_${sanitizeFileName(m.rivalName) || "rival"}`;

  const pdf = async (m, summary) => {
    const id = `${m.date}:${summary ? "res" : "pdf"}`;
    if (busy) return;
    setBusy(id); setError("");
    try {
      const html = buildMatchReportHtml(m, teamName, rosterPlayers, teamCrest, teamColors, { summary });
      await exportReportToPdf(html, `${base(m)}_${summary ? "resumen" : "informe"}.pdf`);
    } catch (e) { setError("No se pudo generar el PDF. Prueba otra vez."); }
    setBusy(null);
  };
  const rolePdf = async (m) => {
    if (busy) return;
    setBusy(`${m.date}:rol`); setError("");
    try {
      const html = buildRoleReportHtml({ role, match: m, season: matches, teamName, teamColors, objectives, trainings });
      await exportReportToPdf(html, `${base(m)}_informe_${role}.pdf`);
    } catch (e) { setError("No se pudo generar el PDF. Prueba otra vez."); }
    setBusy(null);
  };
  const json = (m) => downloadTextFile(JSON.stringify(buildMatchJsonPayload(m, teamName), null, 2), `${base(m)}_datos.json`, "application/json");
  const pack = () => {
    // Mismo formato que una copia de seguridad, pero solo con este equipo, su
    // plantilla y los partidos filtrados: quien lee copias de seguridad la lee igual.
    const datos = {
      teams: JSON.stringify([{ id: teamId, name: teamName }]),
      [`roster:${teamId}`]: JSON.stringify(rosterPlayers || []),
    };
    sorted.forEach((m) => { const { reportHtml, ...rest } = m; datos[`matches:${teamId}:${m.date}`] = JSON.stringify(rest); });
    const payload = { formato: BACKUP_FORMAT, version: BACKUP_VERSION, app: BRAND.name, creada: new Date().toISOString(), parcial: true, datos };
    downloadTextFile(JSON.stringify(payload), `${sanitizeFileName(teamName) || "equipo"}_partidos_${sorted.length}_${new Date().toISOString().slice(0, 10)}.json`, "application/json");
  };

  if (!sorted.length) {
    return <div style={{ padding: 20, textAlign: "center", color: T.dim, fontSize: 13, border: `1px dashed ${T.line}`, borderRadius: 12 }}>Todavía no hay partidos guardados.</div>;
  }
  const chip = { fontSize: 11, color: T.dim, border: `1px solid ${T.line}`, borderRadius: 999, padding: "1px 8px", whiteSpace: "nowrap" };
  return (
    <div className="fadein" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 12.5, color: T.dim, lineHeight: 1.5, flex: "1 1 260px" }}>
          Cada partido con su informe en PDF (completo o resumido), sus datos en CSV y su archivo <b style={{ color: T.text }}>.json</b> para cargarlo en tu herramienta de análisis de vídeo (cortes) o de planificación.
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.dim }}>Informe por perfil
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, color: T.text, padding: "6px 8px", minHeight: 36 }}>
            {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </label>
        <Button size="sm" variant="primary" icon={Package} onClick={pack} title="Un solo .json con todos los partidos de la lista">Paquete .json ({sorted.length})</Button>
      </div>
      {error && <div role="alert" style={{ color: T.negative, fontSize: 12 }}>{error}</div>}
      {sorted.map((m) => {
        const gf = Number(m.teamGoals) || 0, ga = Number(m.rivalScore) || 0;
        const res = gf > ga ? ["V", T.positive] : gf === ga ? ["E", T.dim] : ["D", T.negative];
        const comp = competitionOf(m);
        return (
          <div key={m.date} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span aria-label={res[0] === "V" ? "Victoria" : res[0] === "E" ? "Empate" : "Derrota"} style={{ width: 26, height: 26, borderRadius: 7, background: res[1], color: T.ink, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>{res[0]}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{teamName} {gf} – {ga} {m.rivalName || "Rival"}</div>
                <div style={{ fontSize: 11.5, color: T.dim }}>{new Date(m.date).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "long", year: "numeric" })}</div>
              </div>
              {comp && <span style={chip}>{comp}</span>}
              <span style={chip}>{seasonOf(m)}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Button size="sm" variant="secondary" icon={FileDown} onClick={() => pdf(m, false)} disabled={!!busy}>{busy === `${m.date}:pdf` ? "Generando…" : "PDF completo"}</Button>
              <Button size="sm" variant="ghost" icon={FileText} onClick={() => pdf(m, true)} disabled={!!busy}>{busy === `${m.date}:res` ? "Generando…" : "PDF resumido"}</Button>
              <Button size="sm" variant="ghost" icon={UserRound} onClick={() => rolePdf(m)} disabled={!!busy} title={roleDef.hint}>{busy === `${m.date}:rol` ? "Generando…" : `PDF ${roleDef.label.toLowerCase()}`}</Button>
              <Button size="sm" variant="ghost" icon={Table} onClick={() => downloadTextFile(matchEventsCsv(m), `${base(m)}_eventos.csv`, "text/csv;charset=utf-8")} title="Una fila por evento, en orden de juego, con el segundo de partido">CSV eventos</Button>
              <Button size="sm" variant="ghost" icon={Table} onClick={() => downloadTextFile(matchPlayersCsv(m), `${base(m)}_jugadores.csv`, "text/csv;charset=utf-8")}>CSV jugadores</Button>
              <Button size="sm" variant="ghost" icon={Braces} onClick={() => json(m)} title="Datos completos del partido para otras herramientas">JSON</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
