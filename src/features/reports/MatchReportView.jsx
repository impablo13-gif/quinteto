/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { T, PAPER, alpha } from "../../theme/theme.js";
import { useState } from "react";
import { downloadMatchDataJson } from "../../reports/matchReport.js";
import { exportReportToPdf } from "../../reports/pdf.js";
// Muestra el informe a pantalla completa DENTRO de la propia app -- una PWA
// instalada (sin barra de pestañas) no puede fiarse de window.open(): en
// modo standalone, la mayoría de navegadores lo ignoran o lo bloquean sin
// avisar, que es justo por lo que antes "no generaba nada" en la tablet.
// Desde aquí, "Imprimir" llama a window.print() (funciona igual instalada
// en la tablet), y "Exportar a PDF" descarga el archivo directamente --
// separado a propósito, porque en varias tablets el diálogo de impresión
// no deja guardar como PDF de forma sencilla.
export function MatchReportView({ html, title, fileName, matchData, teamName, onExportError, onClose }) {
  const [exporting, setExporting] = useState(false);
  const handleExportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try { await exportReportToPdf(html, fileName || "informe.pdf"); }
    catch (e) { if (onExportError) onExportError(); }
    setExporting(false);
  };
  const handleDownloadJson = () => {
    const jsonFileName = (fileName || "informe.pdf").replace(/\.pdf$/i, "") + "_datos.json";
    downloadMatchDataJson(matchData, teamName, jsonFileName);
  };
  return (
    <div className="match-report-view" style={{ position: "fixed", inset: 0, zIndex: 300, background: PAPER.track, overflowY: "auto" }}>
      <style>{`
        @media print {
          /* .match-report-view no es hija directa de <body> (va dentro de
             #root), así que ocultar "los demás hijos de body" no basta --
             hay que ocultar TODO por visibilidad y volver a mostrar solo
             esto, que es lo que de verdad no depende de dónde cuelga en el
             árbol. Sin este ajuste, "Guardar como PDF" salía en blanco. */
          body * { visibility: hidden !important; }
          .match-report-view, .match-report-view * { visibility: visible !important; }
          .match-report-view { position: absolute !important; top: 0; left: 0; width: 100%; background: ${PAPER.bg} !important; }
          .match-report-view .report-toolbar { display: none !important; }
        }
      `}</style>
      <div className="report-toolbar" style={{ position: "sticky", top: 0, zIndex: 1, background: T.bg, color: T.text, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontFamily: "Arial, Helvetica, sans-serif" }}>
        <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={handleExportPdf} disabled={exporting} style={{ background: T.accent, color: T.ink, border: "none", borderRadius: 6, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: exporting ? "default" : "pointer", opacity: exporting ? 0.7 : 1 }}>{exporting ? "Generando…" : "Exportar a PDF"}</button>
          {matchData && (
            <button onClick={handleDownloadJson} title="Datos del partido en JSON, para usarlos en otras herramientas" style={{ background: "transparent", color: T.text, border: `1px solid ${alpha(T.white, 0.35)}`, borderRadius: 6, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Descargar datos (JSON)</button>
          )}
          <button onClick={() => window.print()} style={{ background: "transparent", color: T.text, border: `1px solid ${alpha(T.white, 0.35)}`, borderRadius: 6, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Imprimir</button>
          <button onClick={onClose} style={{ background: "transparent", color: T.text, border: `1px solid ${alpha(T.white, 0.35)}`, borderRadius: 6, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cerrar</button>
        </div>
      </div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
