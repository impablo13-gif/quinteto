/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { useState } from "react";
import { ClipboardList, FileText, X } from "lucide-react";
import { T, bigBtn, iconBtnSm, modalCard, overlayStyle } from "../../theme/theme.js";
import { COMPETITION_SUGGESTIONS, PITCH_MATERIAL_SUGGESTIONS } from "../../domain/catalog.js";
import { fileToDataUrl } from "../../lib/files.js";
import { CrestAvatar } from "../../ui/common.jsx";
import { Overlay } from "../../ui/kit.jsx";
// Datos de cabecera del informe que no se registran durante el partido en
// vivo (ciudad, pabellón, material de la pista, competición, hora de fin,
// observaciones) más el rival "por si acaso" hay que corregirlo a toro
// pasado. Se guardan en el propio partido para no volver a pedirlos si se
// regenera el informe más adelante.
export const reportFieldLabelStyle = { fontSize: 11, fontWeight: 600, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" };
// Definido fuera del componente a propósito: si se define dentro, React lo
// trata como un tipo de componente nuevo en cada render (porque cambia la
// propia referencia de la función) y desmonta y vuelve a montar cada campo
// en cada pulsación -- eso es lo que hacía el tecleo nada fluido, con el
// foco saltando del input a cada letra.
export function ReportField({ label, children }) {
  return <div style={{ marginBottom: 12 }}><label style={reportFieldLabelStyle}>{label}</label>{children}</div>;
}

export function ReportMetaModal({ match, onGenerate, onClose }) {
  const [city, setCity] = useState(match.city || "");
  const [venue, setVenue] = useState(match.venue || "");
  const [pitchMaterial, setPitchMaterial] = useState(match.pitchMaterial || "");
  const [rivalName, setRivalName] = useState(match.rivalName || "");
  const [rivalCrest, setRivalCrest] = useState(match.rivalCrest || null);
  const [startTime, setStartTime] = useState(match.startTime || "");
  const [endTime, setEndTime] = useState(match.endTime || "");
  const [competition, setCompetition] = useState(match.competition || "");
  const [observations, setObservations] = useState(match.observations || "");
  const [conclusions, setConclusions] = useState(match.conclusions || "");
  const meta = () => ({ city, venue, pitchMaterial, rivalName, rivalCrest, startTime, endTime, competition, observations, conclusions });

  const handleCrestFile = async (file) => {
    if (!file) return;
    try { setRivalCrest(await fileToDataUrl(file)); } catch (e) {}
  };

  const inputStyle = { width: "100%", background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, color: T.text, padding: "8px 10px", fontSize: 13, boxSizing: "border-box" };

  return (
    <Overlay onClose={onClose}>
      <div style={{ ...modalCard, maxWidth: 480, maxHeight: "86vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()} className="fadein">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div className="display" style={{ fontSize: 17, fontWeight: 600 }}>Crear informe</div>
          <button onClick={onClose} style={iconBtnSm} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div style={{ fontSize: 11, color: T.dim, margin: "6px 0 14px" }}>
          Datos para la cabecera del informe — quedan guardados en este partido para la próxima vez.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <ReportField label="Ciudad / lugar"><input value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle} placeholder="Ciudad o localidad" /></ReportField>
          <ReportField label="Pabellón"><input value={venue} onChange={(e) => setVenue(e.target.value)} style={inputStyle} /></ReportField>
        </div>

        <ReportField label="Material de la pista">
          <input value={pitchMaterial} onChange={(e) => setPitchMaterial(e.target.value)} style={inputStyle} list="pitch-material-suggestions" placeholder="p. ej. Parquet" />
          <datalist id="pitch-material-suggestions">{PITCH_MATERIAL_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
        </ReportField>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 12 }}>
          <CrestAvatar crest={rivalCrest} size={44} onPick={handleCrestFile} onReframe={() => {}} onRemove={() => setRivalCrest(null)} />
          <div style={{ flex: 1 }}>
            <label style={reportFieldLabelStyle}>Nombre del rival</label>
            <input value={rivalName} onChange={(e) => setRivalName(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <ReportField label="Hora de inicio"><input value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} placeholder="18:30" /></ReportField>
          <ReportField label="Hora de fin"><input value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} placeholder="19:30" /></ReportField>
        </div>

        <ReportField label="Competición / naturaleza del partido">
          <input value={competition} onChange={(e) => setCompetition(e.target.value)} style={inputStyle} list="competition-suggestions" placeholder="p. ej. Liga regular" />
          <datalist id="competition-suggestions">{COMPETITION_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
        </ReportField>

        <ReportField label="Observaciones">
          <textarea value={observations} onChange={(e) => setObservations(e.target.value)} style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontFamily: "inherit" }} />
        </ReportField>

        <ReportField label="Conclusiones del partido">
          <textarea value={conclusions} onChange={(e) => setConclusions(e.target.value)} placeholder="Qué funcionó, qué no y qué trabajar esta semana (opcional)" style={{ ...inputStyle, minHeight: 90, resize: "vertical", fontFamily: "inherit" }} />
        </ReportField>

        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => onGenerate(meta())}
            style={{ ...bigBtn, justifyContent: "center", flex: "2 1 200px", background: T.accent, color: T.ink }}
          >
            <ClipboardList size={15} /> Generar informe
          </button>
          <button
            onClick={() => onGenerate(meta(), { summary: true })}
            title="Cabecera, top 5 de minutos, goles, balance y conclusiones"
            style={{ ...bigBtn, justifyContent: "center", flex: "1 1 140px", background: "transparent", color: T.text, border: `1px solid ${T.line}` }}
          >
            <FileText size={15} /> Resumido
          </button>
        </div>
      </div>
    </Overlay>
  );
}
