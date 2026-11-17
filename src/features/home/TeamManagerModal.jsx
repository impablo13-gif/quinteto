/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { Plus, Star, Trash2, X } from "lucide-react";
import { T, ghostBtn, iconBtnSm, modalCard, overlayStyle } from "../../theme/theme.js";
import { CrestAvatar, EditableText } from "../../ui/common.jsx";
import { Overlay } from "../../ui/kit.jsx";
export function TeamManagerModal({ teams, activeTeamId, onSelect, onFieldChange, onFieldBlur, onPickCrest, onReframeCrest, onRemoveCrest, onAdd, onRemove, onClose }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ ...modalCard, maxWidth: 460 }} onClick={(e) => e.stopPropagation()} className="fadein">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div className="display" style={{ fontSize: 18, fontWeight: 600 }}>Mis equipos</div>
          <button onClick={onClose} style={iconBtnSm} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div style={{ fontSize: 12, color: T.dim, marginBottom: 14 }}>Cada equipo tiene su propia plantilla, marcador e historial de partidos.</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
          {teams.map((t) => {
            const isActive = t.id === activeTeamId;
            return (
              <div key={t.id} style={{ display: "flex", gap: 10, alignItems: "center", background: isActive ? T.surface2 : T.surface, border: `1.5px solid ${isActive ? T.accent : T.line}`, borderRadius: 12, padding: 10, flexWrap: "wrap" }}>
                <CrestAvatar crest={t.crest} size={40} onPick={(f) => onPickCrest(t.id, f)} onReframe={() => onReframeCrest(t.id, t.crest)} onRemove={() => onRemoveCrest(t.id)} />
                <div style={{ flex: 1, minWidth: 120 }}>
                  <EditableText value={t.name} onChange={(v) => onFieldChange(t.id, { name: v })} onBlurCommit={onFieldBlur} style={{ fontSize: 14, fontWeight: 600, color: T.text, width: "100%" }} placeholder="Nombre del equipo" />
                  <EditableText value={t.subtitle} onChange={(v) => onFieldChange(t.id, { subtitle: v })} onBlurCommit={onFieldBlur} style={{ fontSize: 12, color: T.dim, width: "100%", display: "block", marginTop: 2 }} placeholder="Categoría" />
                </div>
                {isActive ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: T.accent, padding: "6px 10px" }}><Star size={12} /> Activo</span>
                ) : (
                  <button onClick={() => onSelect(t.id)} style={{ ...ghostBtn, borderColor: T.accent, color: T.accent, fontSize: 11, padding: "6px 10px" }}>Usar este</button>
                )}
                {teams.length > 1 && (
                  <button onClick={() => onRemove(t.id)} style={{ ...iconBtnSm, width: 30, height: 30, color: T.negative }}><Trash2 size={13} /></button>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={onAdd} style={{ ...ghostBtn, borderColor: T.accent, color: T.accent, width: "100%", justifyContent: "center", marginTop: 12 }}>
          <Plus size={14} /> Añadir equipo
        </button>
      </div>
    </Overlay>
  );
}
