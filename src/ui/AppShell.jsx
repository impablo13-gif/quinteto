/* Armazón de navegación (DISENO-TRANSFORMACION.md §8.3).
 *
 *   · Tablet y ordenador (≥ 768 px): barra lateral con el logotipo, el equipo
 *     activo (toque = cambiar o gestionar equipos) y los destinos. Entre 768 y
 *     1023 px se compacta a iconos con etiqueta pequeña.
 *   · Móvil (< 768 px): barra inferior con cuatro destinos y «Más».
 *   · El partido en directo y el cronómetro de entrenamiento NO usan este
 *     armazón: son pantallas de foco, sin navegación que distraiga.
 */
import { useState } from "react";
import { BarChart3, Dumbbell, Home, MoreHorizontal, Play, Shield, Shirt, Trophy, Users } from "lucide-react";
import { T, alpha } from "../theme/theme.js";
import { Logo, LogoMark } from "../brand/Logo.jsx";
import { useIsNarrow } from "./common.jsx";
import { Overlay } from "./kit.jsx";

export const SECTIONS = [
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "directo", label: "Directo", icon: Play },
  { id: "partidos", label: "Partidos", icon: Trophy },
  { id: "jugadores", label: "Jugadores", icon: Users },
  { id: "analisis", label: "Análisis", icon: BarChart3 },
  { id: "entrenos", label: "Entrenos", icon: Dumbbell },
  { id: "equipo", label: "Equipo", icon: Shirt },
];
const MOBILE_MAIN = ["inicio", "directo", "partidos", "analisis"];

/* Escudo del equipo, solo para mostrar (se edita en Inicio). */
function CrestBadge({ crest, size }) {
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", background: T.surface3, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {crest ? <img src={crest} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Shield size={size * 0.5} color={T.accent} aria-hidden="true" />}
    </span>
  );
}

function LiveDot() {
  return <span aria-label="partido en curso" style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, boxShadow: `0 0 0 3px ${alpha(T.accent, 0.25)}`, flexShrink: 0 }} />;
}

function RailItem({ s, active, compact, live, onClick }) {
  const Icon = s.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex", alignItems: "center", gap: compact ? 4 : 12, flexDirection: compact ? "column" : "row",
        width: "100%", minHeight: compact ? 58 : 44, padding: compact ? "8px 4px" : "0 12px", borderRadius: 10, border: "none",
        background: active ? T.surface2 : "transparent", color: active ? T.text : T.dim, cursor: "pointer",
        boxShadow: active ? `inset 3px 0 0 ${T.accent}` : "none", fontSize: compact ? 11 : 14, fontWeight: 600, textAlign: "left",
      }}
    >
      <Icon size={compact ? 20 : 18} color={active ? T.accent : "currentColor"} aria-hidden="true" />
      <span style={{ flex: compact ? "none" : 1 }}>{s.label}</span>
      {live && !compact && <LiveDot />}
    </button>
  );
}

export function AppShell({ section, onNavigate, team, onOpenTeams, matchInProgress, children }) {
  const mobile = useIsNarrow(767);
  const compact = useIsNarrow(1023);
  const [moreOpen, setMoreOpen] = useState(false);

  if (mobile) {
    const main = SECTIONS.filter((s) => MOBILE_MAIN.includes(s.id));
    const more = SECTIONS.filter((s) => !MOBILE_MAIN.includes(s.id));
    const moreActive = more.some((s) => s.id === section);
    return (
      <div style={{ minHeight: "100dvh" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${T.line}`, background: T.bg, position: "sticky", top: 0, zIndex: 50 }}>
          <LogoMark size={28} />
          <button type="button" onClick={onOpenTeams} aria-label="Cambiar o gestionar equipos" style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, background: "transparent", border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 12px 4px 4px", color: T.text, cursor: "pointer" }}>
            <CrestBadge crest={team.crest} size={26} />
            <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "52vw" }}>{team.name}</span>
          </button>
        </header>
        <main style={{ padding: "16px 16px calc(84px + env(safe-area-inset-bottom, 0px))" }}>{children}</main>
        <nav aria-label="Navegación principal" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 60, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", background: T.surface, borderTop: `1px solid ${T.line}`, padding: "6px 4px calc(6px + env(safe-area-inset-bottom, 0px))" }}>
          {[...main, { id: "__more", label: "Más", icon: MoreHorizontal }].map((s) => {
            const Icon = s.icon;
            const active = s.id === "__more" ? moreActive : s.id === section;
            return (
              <button key={s.id} type="button" aria-current={active ? "page" : undefined} onClick={() => (s.id === "__more" ? setMoreOpen(true) : onNavigate(s.id))}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minHeight: 52, justifyContent: "center", border: "none", background: "transparent", color: active ? T.text : T.dim, fontSize: 11, fontWeight: 600, cursor: "pointer", position: "relative" }}>
                <Icon size={21} color={active ? T.accent : "currentColor"} aria-hidden="true" />
                {s.label}
                {s.id === "directo" && matchInProgress && <span style={{ position: "absolute", top: 6, right: "calc(50% - 16px)" }}><LiveDot /></span>}
              </button>
            );
          })}
        </nav>
        {moreOpen && (
          <Overlay onClose={() => setMoreOpen(false)} label="Más secciones">
            <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "18px 18px 12px 12px", padding: 12, width: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
              {more.map((s) => (
                <RailItem key={s.id} s={s} active={s.id === section} compact={false} onClick={() => { setMoreOpen(false); onNavigate(s.id); }} />
              ))}
            </div>
          </Overlay>
        )}
      </div>
    );
  }

  const railW = compact ? 92 : 232;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `${railW}px minmax(0, 1fr)`, minHeight: "100dvh" }}>
      <nav aria-label="Navegación principal" style={{ position: "sticky", top: 0, height: "100dvh", overflowY: "auto", borderRight: `1px solid ${T.line}`, background: T.bg, padding: compact ? "16px 8px" : "20px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ padding: compact ? "0 0 12px" : "0 6px 14px", display: "flex", justifyContent: compact ? "center" : "flex-start" }}>
          {compact ? <LogoMark size={36} /> : <Logo size={30} />}
        </div>
        <button type="button" onClick={onOpenTeams} title="Cambiar o gestionar equipos" aria-label={`Equipo activo: ${team.name}. Cambiar o gestionar equipos`}
          style={{ display: "flex", alignItems: "center", gap: 10, flexDirection: compact ? "column" : "row", padding: compact ? "8px 4px" : 10, marginBottom: 10, borderRadius: 12, border: `1px solid ${T.line}`, background: T.surface, color: T.text, cursor: "pointer", textAlign: "left", minWidth: 0 }}>
          <CrestBadge crest={team.crest} size={compact ? 34 : 38} />
          {!compact && (
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.name}</span>
              {team.subtitle && <span style={{ display: "block", fontSize: 11, color: T.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.subtitle}</span>}
            </span>
          )}
        </button>
        {SECTIONS.map((s) => (
          <RailItem key={s.id} s={s} active={s.id === section} compact={compact} live={s.id === "directo" && matchInProgress} onClick={() => onNavigate(s.id)} />
        ))}
      </nav>
      <main style={{ padding: compact ? "20px 20px 40px" : "28px 32px 48px", minWidth: 0, maxWidth: 1240 }}>{children}</main>
    </div>
  );
}
