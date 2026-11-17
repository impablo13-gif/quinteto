/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, DatabaseBackup, Share2, Upload, X } from "lucide-react";
import { applyBackup, backupFileName, buildBackup, fmtBytes, readBackupFile, shareOrDownload, summarizeBackup } from "../../backup.js";
import { findLegacyData } from "../../data/migrate.js";
import { T, bigBtn, ghostBtn, iconBtnSm, modalCard, overlayStyle, alpha } from "../../theme/theme.js";
import { Overlay } from "../../ui/kit.jsx";
/* SUBCOMPONENTS ---------------------------------------------------- */

/* Copia de seguridad: pasar los datos a otra tablet o recuperarlos.
   Importar es destructivo, asi que nunca se aplica nada sin ver antes qué trae
   la copia y elegir explícitamente cómo entra. */
export function BackupModal({ onClose, showToast, clockBusy, matchInProgress, onBeforeExport, onExported }) {
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // copia leída, esperando confirmación
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  // Datos de la app de origen en este dispositivo: se ofrecen como una copia
  // más, pero solo en modo «añadir» (ver data/migrate.js).
  const [legacy, setLegacy] = useState(null);
  useEffect(() => {
    let alive = true;
    findLegacyData().then((found) => { if (alive) setLegacy(found); });
    return () => { alive = false; };
  }, []);

  const exportar = async () => {
    setBusy(true); setError(null);
    try {
      if (onBeforeExport) await onBeforeExport();
      const backup = await buildBackup();
      const resumen = summarizeBackup(backup);
      if (!resumen.equipos.length) { setError("No hay nada que copiar todavía."); return; }
      const res = await shareOrDownload(JSON.stringify(backup), backupFileName());
      if (res === "cancelado") return;
      if (onExported) onExported();
      showToast(res === "compartido" ? "Copia compartida" : "Copia guardada en Descargas");
    } catch (e) {
      setError("No se pudo crear la copia: " + (e && e.message ? e.message : "error desconocido"));
    } finally { setBusy(false); }
  };

  const elegirArchivo = async (file) => {
    if (!file) return;
    setError(null);
    try {
      const backup = await readBackupFile(file);
      setPending({ backup, resumen: summarizeBackup(backup) });
    } catch (e) { setError(e.message); }
  };

  const importar = async (mode) => {
    if (!pending) return;
    setBusy(true); setError(null);
    try {
      await applyBackup(pending.backup, mode);
      showToast("Copia importada — recargando…");
      // Recargar es lo más limpio: la app vuelve a leer todo desde cero y no
      // queda nada del estado anterior en pantalla.
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      setError("No se pudo importar: " + (e && e.message ? e.message : "error desconocido"));
      setBusy(false);
    }
  };

  const fecha = (iso) => { try { return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } };

  return (
    <Overlay onClose={busy ? undefined : onClose} style={{ alignItems: "center" }}>
      <div style={{ ...modalCard, maxWidth: 480, borderRadius: 16, maxHeight: "86vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()} className="fadein">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div className="display" style={{ fontSize: 18, fontWeight: 600 }}>Copia de seguridad</div>
          <button onClick={onClose} style={iconBtnSm} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div style={{ fontSize: 12, color: T.dim, lineHeight: 1.5, marginBottom: 16 }}>
          Los datos viven solo en este dispositivo. Una copia sirve para pasárselos a otra persona
          y para no perderlos si el dispositivo se rompe.
        </div>

        {error && (
          <div style={{ background: alpha(T.negative, 0.25), border: `1px solid ${T.negative}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, marginBottom: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertTriangle size={14} color={T.negative} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {!pending && (
          <>
            <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Share2 size={15} color={T.accent} />
                <span className="display" style={{ fontSize: 15, fontWeight: 600 }}>Crear copia</span>
              </div>
              <div style={{ fontSize: 12, color: T.dim, lineHeight: 1.5, marginBottom: 12 }}>
                Genera un archivo con todo: equipos, plantillas, fotos, partidos y entrenos.
                {matchInProgress && <><br /><strong style={{ color: T.warning }}>El partido en curso no entra en la copia</strong> — termínalo antes si quieres incluirlo.</>}
              </div>
              <button onClick={exportar} disabled={busy} style={{ ...bigBtn, background: T.accent, color: T.ink, opacity: busy ? 0.6 : 1, cursor: busy ? "default" : "pointer" }}>
                <Share2 size={15} /> {busy ? "Preparando…" : "Crear y compartir copia"}
              </button>
            </div>

            <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Upload size={15} color={T.text} />
                <span className="display" style={{ fontSize: 15, fontWeight: 600 }}>Importar copia</span>
              </div>
              <div style={{ fontSize: 12, color: T.dim, lineHeight: 1.5, marginBottom: 12 }}>
                {clockBusy
                  ? "Para el reloj antes de importar: al cargar una copia se recarga la app."
                  : "Elige el archivo que te hayan pasado. Antes de aplicar nada verás qué contiene."}
              </div>
              <button onClick={() => fileRef.current && fileRef.current.click()} disabled={busy || clockBusy} style={{ ...ghostBtn, borderColor: clockBusy ? T.line : T.text, opacity: busy || clockBusy ? 0.5 : 1, cursor: busy || clockBusy ? "default" : "pointer" }}>
                <Upload size={14} /> Elegir archivo de copia
              </button>
              <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: "none" }}
                onChange={(e) => { elegirArchivo(e.target.files && e.target.files[0]); e.target.value = ""; }} />
            </div>

            {legacy && (
              <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, marginTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <DatabaseBackup size={15} color={T.text} />
                  <span className="display" style={{ fontSize: 15, fontWeight: 600 }}>Traer datos de {legacy.label}</span>
                </div>
                <div style={{ fontSize: 12, color: T.dim, lineHeight: 1.5, marginBottom: 12 }}>
                  {legacy.label} tiene datos guardados en este dispositivo. Se pueden copiar aquí sin archivo; {legacy.label} no se modifica.
                </div>
                <button onClick={() => setPending({ backup: legacy.backup, resumen: legacy.summary, legacyLabel: legacy.label })} disabled={busy || clockBusy} style={{ ...ghostBtn, borderColor: clockBusy ? T.line : T.text, opacity: busy || clockBusy ? 0.5 : 1, cursor: busy || clockBusy ? "default" : "pointer" }}>
                  <DatabaseBackup size={14} /> Ver qué contiene
                </button>
              </div>
            )}
          </>
        )}

        {pending && (
          <div>
            <div style={{ background: T.surface2, border: `1.5px solid ${T.accent}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {pending.legacyLabel ? `Datos de ${pending.legacyLabel} en este dispositivo` : `Copia del ${fecha(pending.resumen.creada)}`} · {fmtBytes(pending.resumen.bytes)}
              </div>
              <div className="display" style={{ fontSize: 16, fontWeight: 600, margin: "6px 0 4px" }}>
                {pending.resumen.equipos.length} equipo{pending.resumen.equipos.length === 1 ? "" : "s"} · {pending.resumen.jugadores} jugadores
              </div>
              <div style={{ fontSize: 12, color: T.dim }}>
                {pending.resumen.partidos} partido{pending.resumen.partidos === 1 ? "" : "s"} · {pending.resumen.entrenos} entreno{pending.resumen.entrenos === 1 ? "" : "s"}
              </div>
              <div style={{ fontSize: 11, color: T.dim, marginTop: 8 }}>
                {pending.resumen.equipos.map((t) => t.name).join(" · ")}
              </div>
            </div>

            <div style={{ fontSize: 12, color: T.text, fontWeight: 600, marginBottom: 8 }}>¿Cómo quieres importarla?</div>

            <button onClick={() => importar("anadir")} disabled={busy} style={{ width: "100%", textAlign: "left", background: T.surface2, border: `1.5px solid ${T.line}`, borderRadius: 12, padding: 14, cursor: busy ? "default" : "pointer", color: T.text, marginBottom: 8 }}>
              <div className="display" style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Añadir estos equipos</div>
              <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.5 }}>
                Los equipos que ya tengas y no vengan en la copia no se tocan. Si un equipo ya estaba,
                su plantilla pasa a ser la de la copia y sus partidos se suman a los que hubiera.
              </div>
            </button>

            {!pending.legacyLabel && <button onClick={() => importar("reemplazar")} disabled={busy} style={{ width: "100%", textAlign: "left", background: alpha(T.negative, 0.18), border: `1.5px solid ${T.negative}`, borderRadius: 12, padding: 14, cursor: busy ? "default" : "pointer", color: T.text, marginBottom: 12 }}>
              <div className="display" style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={14} color={T.negative} /> Reemplazar todo
              </div>
              <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.5 }}>
                Borra lo que haya ahora en este dispositivo y la deja igual que la que hizo la copia.
                Es lo que se quiere en un dispositivo nuevo. <strong style={{ color: T.negative }}>No se puede deshacer.</strong>
              </div>
            </button>}

            <button onClick={() => { setPending(null); setError(null); }} disabled={busy} style={{ ...ghostBtn, width: "100%", justifyContent: "center" }}>
              Cancelar
            </button>
          </div>
        )}
      </div>
    </Overlay>
  );
}
