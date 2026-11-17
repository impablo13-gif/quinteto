/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, Shield, X, ZoomIn } from "lucide-react";
import { T, bigBtn, ghostBtn, modalCard, overlayStyle, alpha } from "../theme/theme.js";
import { clamp } from "../domain/match.js";
import { Overlay } from "./kit.jsx";
/* Avatars ------------------------------------------------------------ */
export function Avatar({ player, size = 44, onClick }) {
  if (player.photo) {
    return <img src={player.photo} alt="" onClick={onClick} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `2px solid ${T.line}`, flexShrink: 0, cursor: onClick ? "pointer" : "default" }} />;
  }
  return (
    <div onClick={onClick} style={{ width: size, height: size, borderRadius: "50%", background: T.surface3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `2px solid ${T.line}`, cursor: onClick ? "pointer" : "default" }}>
      <span className="display" style={{ fontSize: size * 0.38, fontWeight: 700, color: T.dim }}>{player.number}</span>
    </div>
  );
}

export function EditableAvatar({ player, size = 48, onNewFile, onReframe, onRemove }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) onNewFile(f);
  };
  return (
    <div
      style={{ position: "relative", flexShrink: 0, borderRadius: "50%", outline: dragOver ? `3px solid ${T.accent}` : "none", outlineOffset: 2 }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <Avatar player={player} size={size} onClick={player.photo ? onReframe : () => inputRef.current && inputRef.current.click()} />
      <button onClick={() => inputRef.current && inputRef.current.click()} style={{ position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderRadius: "50%", background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${T.surface}`, cursor: "pointer" }} title="Elegir otra foto">
        <Camera size={10} color={T.ink} />
      </button>
      {player.photo && (
        <button onClick={onRemove} style={{ position: "absolute", top: -4, left: -4, width: 18, height: 18, borderRadius: "50%", background: T.negative, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${T.surface}`, cursor: "pointer" }} title="Quitar foto">
          <X size={10} color={T.ink} />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { onNewFile(e.target.files && e.target.files[0]); e.target.value = ""; }} />
    </div>
  );
}

/* square crest badge — used for both "own" and rival, always square so they line up */
export function CrestAvatar({ crest, size = 44, onPick, onReframe, onRemove, shape = "square" }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const radius = shape === "circle" ? "50%" : 10;
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) onPick(f);
  };
  return (
    <div
      style={{ position: "relative", flexShrink: 0, borderRadius: radius, outline: dragOver ? `3px solid ${T.accent}` : "none", outlineOffset: 2 }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div onClick={crest ? onReframe : () => inputRef.current && inputRef.current.click()} style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", background: T.surface3, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${T.line}`, cursor: "pointer" }} title={crest ? "Encuadrar escudo" : "Añadir escudo"}>
        {crest ? <img src={crest} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Shield size={size * 0.5} color={T.accent} />}
      </div>
      <button onClick={() => inputRef.current && inputRef.current.click()} style={{ position: "absolute", bottom: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${T.surface}`, cursor: "pointer" }} title="Elegir escudo">
        <Camera size={8} color={T.ink} />
      </button>
      {crest && (
        <button onClick={onRemove} style={{ position: "absolute", top: -4, left: -4, width: 14, height: 14, borderRadius: "50%", background: T.negative, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${T.surface}`, cursor: "pointer" }} title="Quitar escudo">
          <X size={8} color={T.ink} />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { onPick(e.target.files && e.target.files[0]); e.target.value = ""; }} />
    </div>
  );
}

/* Photo framer — native pointer listeners, re-attached once the image container actually mounts */
export function PhotoCropEditor({ src, onCancel, onSave }) {
  const containerSize = 260;
  const outputSize = 320;
  const [natural, setNatural] = useState(null);
  const [zoom, setZoom] = useState(1.3);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const imgElRef = useRef(null);
  const boundsRef = useRef({ minX: 0, minY: 0 });
  const dragState = useRef({ dragging: false, lastX: 0, lastY: 0 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgElRef.current = img;
      const baseScale = containerSize / Math.min(img.naturalWidth, img.naturalHeight);
      const z = 1.3;
      const w = img.naturalWidth * baseScale * z, h = img.naturalHeight * baseScale * z;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setZoom(z);
      setOffset({ x: -(w - containerSize) / 2, y: -(h - containerSize) / 2 });
    };
    img.src = src;
  }, [src]);

  const baseScale = natural ? containerSize / Math.min(natural.w, natural.h) : 1;
  const scale = baseScale * zoom;
  const dispW = natural ? natural.w * scale : 0;
  const dispH = natural ? natural.h * scale : 0;
  boundsRef.current = { minX: -(dispW - containerSize), minY: -(dispH - containerSize) };

  // Callback ref: React calls this the instant the draggable div is actually created in
  // the DOM (and again with null when it's removed). Uses unified Pointer Events with
  // setPointerCapture — one consistent event stream per finger/mouse, captured to this
  // element specifically, so there's no risk of touch and mouse events double-firing
  // on hybrid touchscreen devices (a common cause of "drag feels broken").
  const dragCleanupRef = useRef(null);
  const attachContainer = useCallback((node) => {
    if (dragCleanupRef.current) { dragCleanupRef.current(); dragCleanupRef.current = null; }
    if (!node) return;
    const down = (e) => {
      dragState.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
      try { node.setPointerCapture(e.pointerId); } catch (err) {}
    };
    const move = (e) => {
      if (!dragState.current.dragging) return;
      const dx = e.clientX - dragState.current.lastX, dy = e.clientY - dragState.current.lastY;
      dragState.current.lastX = e.clientX; dragState.current.lastY = e.clientY;
      const { minX, minY } = boundsRef.current;
      setOffset((o) => ({ x: clamp(o.x + dx, minX, 0), y: clamp(o.y + dy, minY, 0) }));
    };
    const up = (e) => {
      dragState.current.dragging = false;
      try { node.releasePointerCapture(e.pointerId); } catch (err) {}
    };
    node.addEventListener("pointerdown", down);
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerup", up);
    node.addEventListener("pointercancel", up);
    dragCleanupRef.current = () => {
      node.removeEventListener("pointerdown", down);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerup", up);
      node.removeEventListener("pointercancel", up);
    };
  }, []);

  if (!natural) {
    return <Overlay><div style={{ ...modalCard, maxWidth: 320, textAlign: "center", color: T.dim }}>Cargando imagen…</div></Overlay>;
  }

  const changeZoom = (val) => {
    const z = Number(val);
    setZoom(z);
    const s = baseScale * z;
    const w = natural.w * s, h = natural.h * s;
    setOffset((o) => ({ x: clamp(o.x, -(w - containerSize), 0), y: clamp(o.y, -(h - containerSize), 0) }));
  };

  const save = () => {
    const factor = outputSize / containerSize;
    const canvas = document.createElement("canvas");
    canvas.width = outputSize; canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgElRef.current, offset.x * factor, offset.y * factor, dispW * factor, dispH * factor);
    onSave(canvas.toDataURL("image/jpeg", 0.85));
  };

  return (
    <Overlay onClose={onCancel}>
      <div style={{ ...modalCard, maxWidth: 340, textAlign: "center" }} onClick={(e) => e.stopPropagation()} className="fadein">
        <div className="display" style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Encuadrar foto</div>
        <div style={{ fontSize: 12, color: T.dim, marginBottom: 14 }}>Arrastra con el dedo para moverla</div>

        <div ref={attachContainer} style={{ width: containerSize, height: containerSize, borderRadius: "50%", overflow: "hidden", margin: "0 auto", position: "relative", background: T.surface3, border: `2px solid ${T.accent}`, touchAction: "none", cursor: "grab", userSelect: "none" }}>
          <img src={src} alt="" draggable={false} style={{ position: "absolute", left: offset.x, top: offset.y, width: dispW, height: dispH, userSelect: "none", pointerEvents: "none" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, padding: "0 8px" }}>
          <ZoomIn size={16} color={T.dim} />
          <input type="range" min="1" max="3.5" step="0.01" value={zoom} onChange={(e) => changeZoom(e.target.value)} style={{ flex: 1, accentColor: T.accent }} />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button onClick={onCancel} style={{ ...ghostBtn, flex: 1, justifyContent: "center" }}>Cancelar</button>
          <button onClick={save} style={{ ...bigBtn, flex: 1, justifyContent: "center", background: T.accent, color: T.ink }}><Check size={15} /> Guardar encuadre</button>
        </div>
      </div>
    </Overlay>
  );
}

export function EditableText({ value, onChange, onBlurCommit, className, style, placeholder }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlurCommit}
      className={className}
      style={{ background: "transparent", border: "none", borderBottom: "1px dashed transparent", outline: "none", padding: 0, ...style }}
      onFocus={(e) => (e.target.style.borderBottom = `1px dashed ${T.dim}`)}
    />
  );
}

/* true en pantallas de movil (< 600 px). Se usa para compactar la pantalla de
   partido: en 390 px la cabecera ocupaba ~660 px y la primera tarjeta de
   jugador quedaba fuera de la pantalla. La tablet no cambia. */
export function useIsNarrow(maxWidth = 600) {
  const query = `(max-width: ${maxWidth}px)`;
  const read = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;
  const [narrow, setNarrow] = useState(read);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia(query);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return narrow;
}

export function SectionHeading({ title, right, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${accent || T.line}` }}>
      <span className="display" style={{ fontSize: 15, fontWeight: 600, color: accent || T.text, textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</span>
      {right && <span className="display" style={{ fontSize: 15, fontWeight: 700, color: accent || T.dim }}>{right}</span>}
    </div>
  );
}

export function ScoreColumn({ labelNode, crest, score }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 70 }}>
      {labelNode}
      {crest}
      {score}
    </div>
  );
}

export function StatPill({ label, value, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className="display" style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 9, color: T.dim, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

export function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: active ? T.surface : "transparent", border: "none", borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent", color: active ? T.text : T.dim, fontSize: 13, fontWeight: 500, cursor: "pointer", borderRadius: "8px 8px 0 0" }}>
      <Icon size={15} /> {label}
    </button>
  );
}

export function MiniBadge({ children, color }) { return <span style={{ fontSize: 11, color, fontWeight: 600 }}>{children}</span>; }

export function SubTabBtn({ active, onClick, label }) {
  return (
    <button onClick={onClick} style={{ padding: "6px 14px", borderRadius: 999, border: `1px solid ${active ? T.accent : T.line}`, background: active ? alpha(T.accent, 0.075) : "transparent", color: active ? T.accent : T.dim, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
      {label}
    </button>
  );
}
