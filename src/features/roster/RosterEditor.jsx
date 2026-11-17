/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { Plus, Shirt, Trash2 } from "lucide-react";
import { T, ghostBtn, iconBtnSm } from "../../theme/theme.js";
import { POSITIONS, POS_LABEL } from "../../domain/match.js";
import { EditableAvatar } from "../../ui/common.jsx";
export function RosterEditor({ players, onAdd, onRemove, onSave, onNewFile, onReframe }) {
  return (
    <div className="fadein">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: T.text, textTransform: "uppercase" }}>
          <Shirt size={14} /> Plantilla · {players.length}
        </div>
        <button onClick={onAdd} style={{ ...ghostBtn, borderColor: T.accent, color: T.accent }}><Plus size={14} /> Añadir jugador</button>
      </div>
      <div style={{ fontSize: 12, color: T.dim, marginBottom: 12 }}>Toca la foto para moverla y encuadrarla, la cámara para elegir otra, o la X para quitarla.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {players.map((p) => (
          <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "center", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: 10, flexWrap: "wrap" }}>
            <EditableAvatar player={p} size={58} onNewFile={(file) => onNewFile(p.id, file)} onReframe={() => onReframe(p.id, p.photo)} onRemove={() => onSave(p.id, { photo: null })} />
            <input type="number" inputMode="numeric" value={p.number} onChange={(e) => onSave(p.id, { number: Number(e.target.value) || 0 })} style={{ width: 56, background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, color: T.accent, padding: "8px 4px", textAlign: "center", fontWeight: 700 }} />
            <input value={p.name} onChange={(e) => onSave(p.id, { name: e.target.value })} style={{ flex: 1, minWidth: 110, background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, color: T.text, padding: "8px 10px" }} />
            <select value={p.position} onChange={(e) => onSave(p.id, { position: e.target.value, isGK: e.target.value === "POR" })} style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, color: T.text, padding: "8px 6px" }}>
              {POSITIONS.map((pos) => <option key={pos} value={pos}>{POS_LABEL[pos]}</option>)}
            </select>
            <button onClick={() => onRemove(p.id)} style={{ ...iconBtnSm, width: 34, height: 34, color: T.negative }}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
