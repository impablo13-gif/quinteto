/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { useEffect, useState } from "react";
import { findLegacyData, importLegacyData } from "../../data/migrate.js";
import { T } from "../../theme/theme.js";
import { FONTS } from "../../brand/tokens.js";
/* ==================================================================== */

/* Primera vez (o sin equipos): no hay equipo predeterminado, hay que crearlo. */
export function FirstTeamScreen({ onCreate }) {
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [busy, setBusy] = useState(false);
  // Datos de la app de origen en este mismo dispositivo (ver data/migrate.js).
  const [legacy, setLegacy] = useState(null);
  const [legacyError, setLegacyError] = useState(null);
  useEffect(() => {
    let alive = true;
    findLegacyData().then((found) => { if (alive) setLegacy(found); });
    return () => { alive = false; };
  }, []);
  const traerLegacy = async () => {
    setBusy(true); setLegacyError(null);
    try {
      await importLegacyData(legacy);
      window.location.reload();
    } catch (e) {
      setLegacyError("No se pudieron traer los datos: " + (e && e.message ? e.message : "error desconocido"));
      setBusy(false);
    }
  };
  const ok = name.trim().length > 0 && !busy;
  const input = { width: "100%", background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, color: T.text, padding: "10px 12px", fontSize: 15, boxSizing: "border-box" };
  return (
    <div style={{ background: T.bg, color: T.text, minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTS.ui, padding: 20 }}>
      <form onSubmit={async (e) => { e.preventDefault(); if (!ok) return; setBusy(true); await onCreate(name.trim(), subtitle.trim()); }} style={{ width: "100%", maxWidth: 380, display: "grid", gap: 12 }}>
        {legacy && (
          <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 8, marginBottom: 6 }}>
            <div className="display" style={{ fontSize: 17, fontWeight: 600 }}>Hay datos de {legacy.label} en este dispositivo</div>
            <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.5 }}>
              {legacy.summary.equipos.length} equipo{legacy.summary.equipos.length === 1 ? "" : "s"} · {legacy.summary.partidos} partido{legacy.summary.partidos === 1 ? "" : "s"} · {legacy.summary.entrenos} entreno{legacy.summary.entrenos === 1 ? "" : "s"}
              {" "}({legacy.summary.equipos.map((t) => t.name).join(", ")}). Se copian aquí; {legacy.label} no se modifica y puedes seguir usándola.
            </div>
            {legacyError && <div style={{ fontSize: 12, color: T.negative }}>{legacyError}</div>}
            <button type="button" onClick={traerLegacy} disabled={busy} style={{ background: T.accent, color: T.ink, border: "none", borderRadius: 8, padding: "12px 14px", fontSize: 15, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Trayendo datos…" : `Traer los datos de ${legacy.label}`}
            </button>
            <div style={{ fontSize: 12, color: T.dim, textAlign: "center" }}>o empieza desde cero:</div>
          </div>
        )}
        <div className="display" style={{ fontSize: 24, fontWeight: 600, letterSpacing: 0.5 }}>Crea tu primer equipo</div>
        <div style={{ fontSize: 13, color: T.dim }}>Todavía no hay ningún equipo en este dispositivo. Ponle nombre para empezar; podrás añadir el escudo y la plantilla después.</div>
        <label style={{ fontSize: 12, color: T.dim }}>Nombre del equipo<input autoFocus value={name} maxLength={60} onChange={(e) => setName(e.target.value)} style={{ ...input, marginTop: 4 }} /></label>
        <label style={{ fontSize: 12, color: T.dim }}>Competición o categoría (opcional)<input value={subtitle} maxLength={60} onChange={(e) => setSubtitle(e.target.value)} style={{ ...input, marginTop: 4 }} /></label>
        <button type="submit" disabled={!ok} style={{ background: ok ? T.accent : T.surface3, color: ok ? T.ink : T.dim, border: "none", borderRadius: 8, padding: "12px 14px", fontSize: 15, fontWeight: 600, cursor: ok ? "pointer" : "default" }}>Crear equipo</button>
      </form>
    </div>
  );
}
