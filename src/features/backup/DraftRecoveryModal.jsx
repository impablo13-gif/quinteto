/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { Play, Trash2 } from "lucide-react";
import { T, bigBtn, ghostBtn, modalCard, overlayStyle } from "../../theme/theme.js";
import { fmtClock, fmtMin, halfLabel, halfMinutesFor } from "../../domain/match.js";
import { Overlay } from "../../ui/kit.jsx";
/* Aviso al abrir la app si quedó un partido o un entreno sin cerrar. */
export function DraftRecoveryModal({ drafts, teamName, onResumeMatch, onDiscardMatch, onResumeTraining, onDiscardTraining }) {
  const when = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return ""; }
  };
  const m = drafts.match;
  const t = drafts.training;
  return (
    <Overlay style={{ alignItems: "center", zIndex: 95 }}>
      <div style={{ ...modalCard, maxWidth: 440, borderRadius: 16 }} className="fadein">
        <div className="display" style={{ fontSize: 19, fontWeight: 600, marginBottom: 4 }}>Hay algo sin terminar</div>
        <div style={{ fontSize: 12, color: T.dim, marginBottom: 16 }}>
          La app guarda sola lo que va pasando, así que esto sigue aquí aunque se cerrara el navegador o se apagara el dispositivo.
        </div>

        {m && (
          <div style={{ background: T.surface2, border: `1.5px solid ${T.accent}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5 }}>Partido · guardado {when(m.savedAt)}</div>
            <div className="display" style={{ fontSize: 17, fontWeight: 600, margin: "4px 0 2px" }}>
              {teamName || "Equipo"} {Object.values(m.stats || {}).reduce((s, x) => s + (x.goals || 0), 0)} — {m.rivalScore || 0} {m.rivalName || ""}
            </div>
            <div style={{ fontSize: 11, color: T.dim, marginBottom: 12 }}>
              {halfLabel(m.half)} · {fmtClock(Math.max(0, halfMinutesFor(m.half, m.halfLength || 20, m.overtimeLength) * 60 - (m.seconds || 0)))} por jugar
              {(m.goalEvents || []).length ? ` · ${m.goalEvents.length} gol${m.goalEvents.length === 1 ? "" : "es"} registrado${m.goalEvents.length === 1 ? "" : "s"}` : ""}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onDiscardMatch} style={{ ...ghostBtn, flex: 1, justifyContent: "center" }}><Trash2 size={13} /> Descartar</button>
              <button onClick={() => onResumeMatch(m)} style={{ ...bigBtn, flex: 2, justifyContent: "center", background: T.accent, color: T.ink }}><Play size={15} /> Retomar partido</button>
            </div>
          </div>
        )}

        {t && (
          <div style={{ background: T.surface2, border: `1.5px solid ${T.line}`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 10, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5 }}>Entrenamiento · guardado {when(t.savedAt)}</div>
            <div className="display" style={{ fontSize: 17, fontWeight: 600, margin: "4px 0 12px" }}>Duración: {fmtMin(t.trainingSeconds || 0)}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onDiscardTraining} style={{ ...ghostBtn, flex: 1, justifyContent: "center" }}><Trash2 size={13} /> Descartar</button>
              <button onClick={() => onResumeTraining(t)} style={{ ...bigBtn, flex: 2, justifyContent: "center", background: T.white, color: T.bg }}><Play size={15} /> Retomar entreno</button>
            </div>
          </div>
        )}
      </div>
    </Overlay>
  );
}
