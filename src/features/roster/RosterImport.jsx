/* Importar jugadores desde un .json (copia de Quinteto o NPA Stats, copia del
 * planificador o lista de jugadores). Antes de tocar nada enseña qué trae el
 * archivo y cómo quedaría la plantilla. La lógica vive en domain/rosterImport.js. */
import { useRef, useState } from "react";
import { FileUp, X } from "lucide-react";
import { T, iconBtnSm, modalCard } from "../../theme/theme.js";
import { Button, Overlay } from "../../ui/kit.jsx";
import { POS_LABEL } from "../../domain/match.js";
import { isPlaceholderRoster, mergeRoster, parseRosterFile } from "../../domain/rosterImport.js";

export function RosterImport({ roster, onApply, replaceLocked }) {
  const inputRef = useRef(null);
  const [state, setState] = useState(null); // { fileName, groups, group, mode } | { error }
  const placeholder = isPlaceholderRoster(roster);

  const onFile = async (file) => {
    if (!file) return;
    let data = null;
    try { data = JSON.parse(await file.text()); } catch (e) { setState({ error: "El archivo no es un JSON válido." }); return; }
    const { groups } = parseRosterFile(data);
    if (!groups.length) { setState({ error: "No he encontrado jugadores en ese archivo (hace falta al menos un nombre por jugador)." }); return; }
    setState({ fileName: file.name, groups, group: 0, mode: placeholder && !replaceLocked ? "replace" : "merge" });
  };

  const close = () => { setState(null); if (inputRef.current) inputRef.current.value = ""; };
  const g = state && state.groups ? state.groups[state.group] : null;
  const preview = g ? mergeRoster(roster, g.players, state.mode) : null;

  return (
    <>
      <Button size="sm" variant="ghost" icon={FileUp} onClick={() => inputRef.current && inputRef.current.click()}>Importar jugadores (.json)</Button>
      <input ref={inputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(e) => onFile(e.target.files && e.target.files[0])} />
      {state && (
        <Overlay onClose={close} label="Importar jugadores">
          <div style={{ ...modalCard, maxWidth: 480, maxHeight: "86vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div className="display" style={{ fontSize: 18, fontWeight: 600 }}>Importar jugadores</div>
              <button type="button" onClick={close} style={iconBtnSm} aria-label="Cerrar"><X size={16} /></button>
            </div>
            {state.error ? (
              <div role="alert" style={{ fontSize: 13, color: T.negative, marginBottom: 12 }}>{state.error}</div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: T.dim, marginBottom: 10 }}>{state.fileName}</div>
                {state.groups.length > 1 && (
                  <label style={{ display: "block", marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: 0.4 }}>El archivo trae varias plantillas</span>
                    <select value={state.group} onChange={(e) => setState({ ...state, group: Number(e.target.value) })} style={{ display: "block", width: "100%", marginTop: 4, background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, color: T.text, padding: "8px 10px", minHeight: 40 }}>
                      {state.groups.map((gr, i) => <option key={i} value={i}>{gr.label} ({gr.players.length})</option>)}
                    </select>
                  </label>
                )}
                <div style={{ border: `1px solid ${T.line}`, borderRadius: 10, maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
                  {g.players.map((p, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "6px 10px", borderTop: i ? `1px solid ${T.line}` : "none", fontSize: 13 }}>
                      <span style={{ width: 28, color: T.accent, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{p.number ?? "—"}</span>
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                      <span style={{ color: T.dim, fontSize: 12 }}>{p.position ? POS_LABEL[p.position] : "sin posición"}{p.photo ? " · foto" : ""}</span>
                    </div>
                  ))}
                </div>
                <div role="radiogroup" aria-label="Cómo entran los jugadores" style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  {[
                    ["merge", "Añadir y actualizar", "Los nuevos se añaden; a los que ya están (mismo nombre) se les actualiza dorsal, posición y foto. No se borra a nadie."],
                    ["replace", "Sustituir la plantilla", replaceLocked ? "No disponible con un partido en curso." : "La plantilla pasa a ser la del archivo. Quien ya estaba conserva su historial; los que no vienen en el archivo salen de la plantilla (sus partidos guardados no cambian)."],
                  ].map(([value, label, hint]) => (
                    <label key={value} style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: value === "replace" && replaceLocked ? "not-allowed" : "pointer", opacity: value === "replace" && replaceLocked ? 0.5 : 1 }}>
                      <input type="radio" name="roster-mode" value={value} checked={state.mode === value} disabled={value === "replace" && replaceLocked} onChange={() => setState({ ...state, mode: value })} style={{ marginTop: 3, accentColor: T.accent }} />
                      <span><span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span><span style={{ display: "block", fontSize: 11.5, color: T.dim, lineHeight: 1.45 }}>{hint}</span></span>
                    </label>
                  ))}
                </div>
                <div role="status" style={{ fontSize: 12.5, marginBottom: 14 }}>
                  Quedarán <b>{preview.roster.length}</b> jugadores: {preview.added} nuevo{preview.added === 1 ? "" : "s"}, {preview.updated} actualizado{preview.updated === 1 ? "" : "s"}{preview.removed ? `, ${preview.removed} fuera de la plantilla` : ""}.
                  {placeholder && state.mode === "merge" && <span style={{ display: "block", color: T.dim, fontSize: 11.5, marginTop: 4 }}>Tu plantilla actual son los jugadores de ejemplo («Jugador 1…»): si eliges añadir, se quedan.</span>}
                </div>
              </>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button size="sm" variant="ghost" onClick={close}>Cancelar</Button>
              {!state.error && <Button size="sm" variant="primary" onClick={() => { onApply(preview.roster, preview); close(); }}>Importar</Button>}
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}
