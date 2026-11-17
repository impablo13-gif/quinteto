/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { RefreshCw } from "lucide-react";
import { T, ghostBtn, alpha } from "../../theme/theme.js";
export function UpdateBanner({ onApply }) {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto 16px", background: alpha(T.accent, 0.06), border: `1.5px solid ${T.accent}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>Hay una versión nueva de la app lista para instalar.</span>
      <button onClick={onApply} style={{ ...ghostBtn, borderColor: T.accent, color: T.accent, fontSize: 12, padding: "8px 14px", fontWeight: 700 }}><RefreshCw size={13} /> Actualizar ahora</button>
    </div>
  );
}
