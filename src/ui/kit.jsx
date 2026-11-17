/* Componentes base de Quinteto (DISENO-TRANSFORMACION.md §7.2). Todo lo
 * visual sale del tema (src/theme/theme.js); aquí no hay colores propios. */
import { useEffect, useRef } from "react";
import { T, alpha, overlayStyle } from "../theme/theme.js";

/* ---------- Ventana modal accesible ----------
 * Sustituye al <div style={overlayStyle} onClick={cerrar}> de siempre:
 *   · role="dialog" y aria-modal para lectores de pantalla,
 *   · Escape cierra (solo la ventana de más arriba si hay varias),
 *   · el foco entra en la ventana al abrirla y vuelve a donde estaba al cerrar,
 *   · tocar fuera sigue cerrando, como antes.
 * Sin `onClose` (decisiones obligatorias) ni Escape ni tocar fuera cierran. */
const overlayStack = [];

export function Overlay({ onClose, style, label, children }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const me = {};
    overlayStack.push(me);
    const previous = document.activeElement;
    const node = ref.current;
    // Foco al primer control de la ventana (o a la propia ventana).
    const first = node && node.querySelector("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    if (first && typeof first.focus === "function") first.focus({ preventScroll: true });
    else if (node) node.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key !== "Escape" || overlayStack[overlayStack.length - 1] !== me) return;
      if (typeof closeRef.current === "function") { e.stopPropagation(); closeRef.current(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const i = overlayStack.indexOf(me);
      if (i >= 0) overlayStack.splice(i, 1);
      if (previous && typeof previous.focus === "function" && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      style={{ ...overlayStyle, ...(style || {}), outline: "none" }}
      onClick={typeof onClose === "function" ? (e) => { if (e.target === e.currentTarget || !e.currentTarget.contains(e.target)) onClose(); } : undefined}
    >
      {children}
    </div>
  );
}

/* ---------- Botones ---------- */
const BTN_SIZES = { sm: { height: 36, padding: "0 12px", fontSize: 12 }, md: { height: 44, padding: "0 16px", fontSize: 14 }, lg: { height: 56, padding: "0 22px", fontSize: 16 } };

export function Button({ variant = "secondary", size = "md", icon: Icon, children, style, ...rest }) {
  const v = {
    primary: { background: T.accent, color: T.ink, border: "1px solid transparent" },
    secondary: { background: T.surface2, color: T.text, border: `1px solid ${T.line}` },
    ghost: { background: "transparent", color: T.text, border: `1px solid ${T.line}` },
    danger: { background: T.negative, color: T.ink, border: "1px solid transparent" },
  }[variant];
  const s = BTN_SIZES[size];
  return (
    <button
      type="button"
      {...rest}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10, fontWeight: 600,
        cursor: rest.disabled ? "default" : "pointer", opacity: rest.disabled ? 0.5 : 1, whiteSpace: "nowrap",
        transition: "background-color .12s ease, border-color .12s ease", ...s, ...v, ...(style || {}),
      }}
    >
      {Icon && <Icon size={size === "lg" ? 20 : 16} aria-hidden="true" />}
      {children}
    </button>
  );
}

/* Botón de solo icono: el nombre accesible es obligatorio. */
export function IconButton({ icon: Icon, label, size = 36, style, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 10, border: `1px solid ${T.line}`, background: T.surface2, color: T.text, cursor: "pointer", flexShrink: 0, ...(style || {}) }}
    >
      <Icon size={Math.round(size * 0.45)} aria-hidden="true" />
    </button>
  );
}

/* ---------- Contenedores ---------- */
export function Card({ children, style, onClick, ...rest }) {
  const interactive = typeof onClick === "function";
  return (
    <div
      {...rest}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); } } : undefined}
      className={interactive ? "tap-target" : undefined}
      style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, minWidth: 0, cursor: interactive ? "pointer" : "default", ...(style || {}) }}
    >
      {children}
    </div>
  );
}

export function SectionHeader({ title, subtitle, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
      <div style={{ minWidth: 0 }}>
        <h1 className="display" style={{ margin: 0, fontSize: 28, fontWeight: 700, lineHeight: 1.05, letterSpacing: 0.2 }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 13, color: T.dim, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {right && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{right}</div>}
    </div>
  );
}

/* Etiqueta pequeña en mayúsculas para encabezar bloques. */
export function Eyebrow({ children, style }) {
  return <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.1, textTransform: "uppercase", color: T.dim, ...(style || {}) }}>{children}</div>;
}

/* Indicador: etiqueta, cifra grande y una línea de contexto. */
export function StatCard({ label, value, detail, detailColor, children }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 6, padding: 14 }}>
      <Eyebrow>{label}</Eyebrow>
      {value !== null && value !== undefined && <div className="display" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1 }}>{value}</div>}
      {children}
      {detail && <div style={{ fontSize: 12, color: detailColor || T.dim }}>{detail}</div>}
    </Card>
  );
}

/* Selector segmentado (sustituye a las pestañas en píldora). */
export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} style={{ display: "inline-flex", gap: 2, padding: 3, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, maxWidth: "100%", overflowX: "auto" }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            style={{ border: "none", borderRadius: 9, padding: "8px 14px", minHeight: 36, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer", background: active ? T.surface3 : "transparent", color: active ? T.text : T.dim, boxShadow: active ? `inset 0 -2px 0 ${T.accent}` : "none" }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div style={{ padding: "28px 20px", textAlign: "center", border: `1px dashed ${T.line}`, borderRadius: 14, color: T.dim, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      {Icon && <Icon size={28} aria-hidden="true" />}
      <div className="display" style={{ fontSize: 18, fontWeight: 600, color: T.text }}>{title}</div>
      {children && <div style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 420 }}>{children}</div>}
      {action}
    </div>
  );
}

/* Aviso en línea (partido a medias, copia, actualización…). */
export function Notice({ tone = "accent", icon: Icon, children, action, onClick }) {
  const color = { accent: T.accent, warning: T.warning, negative: T.negative, info: T.info }[tone] || T.accent;
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(e); } : undefined}
      style={{ display: "flex", alignItems: "center", gap: 12, background: alpha(color, 0.08), border: `1px solid ${alpha(color, 0.55)}`, borderRadius: 12, padding: "10px 14px", cursor: onClick ? "pointer" : "default", flexWrap: "wrap" }}
    >
      {Icon && <Icon size={18} color={color} aria-hidden="true" style={{ flexShrink: 0 }} />}
      <div style={{ flex: "1 1 200px", fontSize: 13, lineHeight: 1.45, minWidth: 0 }}>{children}</div>
      {action}
    </div>
  );
}
