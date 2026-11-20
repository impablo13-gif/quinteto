/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { useState } from "react";
import { AlertTriangle, BarChart3, ClipboardList, Footprints, Hand, Minus, Plus, Save, TimerReset, Undo2, X } from "lucide-react";
import { T, bigBtn, ghostBtn, iconBtnSm, modalCard, overlayStyle, alpha } from "../theme/theme.js";
import { BallIcon, CardIcon } from "../ui/icons.jsx";
import { FONTS, rgbTriplet } from "../brand/tokens.js";
import { fmtClock, fmtMin, halfLabel, safeImgSrc } from "../domain/match.js";
import { GK_ACTIONS, STAT_DEFS, Square } from "../ui/catalog.jsx";
import { Avatar, MiniBadge } from "../ui/common.jsx";
import { Overlay } from "../ui/kit.jsx";
/* Bottom quick-action bar for the Partido tab: tap an action, then tap a player to record it. */
export function QuickActionBar({ hasLastEvent, lastRecord, onGoal, onOpenActions, onOpenCards, onOpenSummary, onUndo, onFinish, compact = false }) {
  // En movil los 6 controles caben en UNA fila (antes saltaban a dos y la barra
  // fija se comia ~175 px de una pantalla de 844).
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 80, background: T.surface, borderTop: `1px solid ${T.line}`, padding: `${compact ? 6 : 10}px ${compact ? 8 : 14}px calc(${compact ? 6 : 10}px + env(safe-area-inset-bottom, 0px))`, boxShadow: `0 -8px 24px ${alpha(T.ink, 0.35)}` }}>
      {lastRecord && (
        <div aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: 700, margin: "0 auto 8px", fontSize: 12, color: T.dim, minWidth: 0 }}>
          <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>Último</span>
          <span style={{ flexShrink: 0, borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700, color: T.ink, background: { accent: T.accent, positive: T.positive, negative: T.negative, warning: T.warning }[lastRecord.tone] || T.surface3, ...(lastRecord.tone === "neutral" ? { color: T.text } : {}) }}>{lastRecord.label}</span>
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.text }}>{lastRecord.detail}</span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: compact ? "space-between" : "center", gap: compact ? 2 : 20, maxWidth: 700, margin: "0 auto", flexWrap: compact ? "nowrap" : "wrap" }}>
        <QuickActionButton compact={compact} icon={() => <BallIcon size={20} />} label="Gol" onClick={onGoal} accent={T.accent} />
        <QuickActionButton compact={compact} icon={ClipboardList} label="Resumen" onClick={onOpenSummary} />
        <QuickActionButton compact={compact} icon={Footprints} label="Acciones" onClick={onOpenActions} />
        <QuickActionButton compact={compact} icon={(p) => <Square {...p} />} label="Tarjeta" onClick={onOpenCards} accent={T.warning} />
        <QuickActionButton compact={compact} icon={Undo2} label="Deshacer" onClick={onUndo} disabled={!hasLastEvent} />
        <button onClick={onFinish} style={{ ...bigBtn, background: T.white, color: T.bg, padding: compact ? "12px 11px" : "12px 18px", marginLeft: compact ? 2 : 8, fontSize: compact ? 12 : 13, flexShrink: 0 }}>
          <Save size={16} /> Finalizar
        </button>
      </div>
    </div>
  );
}

export function QuickActionButton({ icon: Icon, label, onClick, accent, disabled, compact = false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, padding: compact ? "2px 1px" : "4px 6px", minWidth: 0 }}>
      <div style={{ width: 46, height: 46, borderRadius: "50%", background: T.surface3, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${accent || T.line}` }}>
        <Icon size={20} color={accent || T.text} />
      </div>
      <span style={{ fontSize: 9, color: T.dim, fontWeight: 600 }}>{label}</span>
    </button>
  );
}

export function ClockDial({ seconds, progress, running, half, size = 68 }) {
  const box = size / 2;
  const r = box - 4, c = 2 * Math.PI * r;
  const strokeWidth = size >= 90 ? 7 : 5;
  const fontSize = Math.round(size * 0.22);
  const labelSize = size >= 90 ? 13 : 11;
  const ringColor = !running ? T.white : seconds <= 60 ? T.warning : T.accent;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, transform: "rotate(-90deg)" }}>
          <circle cx={box} cy={box} r={r} fill="none" stroke={T.surface3} strokeWidth={strokeWidth} />
          <circle cx={box} cy={box} r={r} fill="none" stroke={ringColor} strokeWidth={strokeWidth} strokeDasharray={c} strokeDashoffset={c * (1 - progress)} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="display" style={{ fontSize, fontWeight: 600 }}>{fmtClock(seconds)}</div>
        </div>
      </div>
      <div style={{ fontSize: labelSize, color: T.dim }}>
        <div>{halfLabel(half)}</div>
        <div style={{ color: running ? T.accent : T.dim }}>{running ? "● en juego" : "○ parado"}</div>
      </div>
    </div>
  );
}

// A la 4ª falta acumulada de la parte, un resaltado pequeño (aviso); a la
// 5ª (y en adelante), uno grande con brillo -- porque la siguiente ya es
// lanzamiento de 10M. Vale igual para el marcador propio que para el rival.
// Mismo lenguaje visual que el marcador de goles (número grande en la tipografía de marcador
// flanqueado por Menos/Más, con el Más coloreado) porque es el gesto que ya
// se usa a toda velocidad en pista -- práctico, sin reinventar nada nuevo.
// Regla real (FIFA): las 5 primeras faltas acumuladas de la parte se sancionan
// como siempre; desde la 6ª el rival tira libre directo sin barrera desde 10 m.
// Por eso la 4ª es aviso, la 5ª avisa de que la siguiente ya es 10M, y la 6ª y
// siguientes llevan la marca 10M.
/* Faltas acumuladas de un equipo en la parte: cinco puntos que se llenan.
 * A la 4ª se ponen en ámbar; con 5 la siguiente es doble penalti (10 m) y a
 * partir de la 6ª ya se tira. Los botones ajustan a mano, como antes. */
/* Corrección del reloj: se abre con un botón para no tocarlo sin querer.
 * Cada botón sube (+) o baja (−) el tiempo que se ve en el reloj. */
const CLOCK_STEPS = [[1, '0:01'], [5, '0:05'], [10, '0:10'], [30, '0:30'], [60, '1:00']];
export function ClockAdjust({ onAdjust }) {
  const [open, setOpen] = useState(false);
  const step = { ...ghostBtn, minHeight: 40, minWidth: 52, justifyContent: "center", padding: "6px 8px", fontVariantNumeric: "tabular-nums", fontWeight: 700 };
  return (
    <>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} title="Corregir el reloj para cuadrarlo con el del pabellón" style={{ ...ghostBtn, minHeight: 40, ...(open ? { borderColor: T.accent, color: T.accent } : {}) }}>
        <TimerReset size={13} aria-hidden="true" /> Corregir reloj
      </button>
      {open && (
        <div role="group" aria-label="Corregir el reloj" style={{ flexBasis: "100%", display: "flex", flexDirection: "column", gap: 6, background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 12, padding: 8 }}>
          {[[-1, "Bajar", Minus, T.negative], [1, "Subir", Plus, T.positive]].map(([sign, label, Icon, color]) => (
            <div key={sign} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: T.dim, width: 40 }}>{label}</span>
              {CLOCK_STEPS.map(([secs, txt]) => (
                <button key={secs} type="button" onClick={() => onAdjust(sign * secs)} aria-label={`${label} el reloj ${txt}`} style={{ ...step, color }}>
                  <Icon size={11} aria-hidden="true" />{txt}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function FoulsDots({ label, value, onInc, onDec, compact = false, limit = 6 }) {
  // limit = falta con la que ya se tira el doble penalti (6 por defecto, configurable por equipo).
  const free = Math.max(1, limit - 1);
  const danger = value >= free;
  const warn = value === free - 1;
  const color = danger ? T.negative : warn ? T.warning : T.text;
  const dotOn = danger ? T.negative : warn ? T.warning : T.dim;
  const btn = { width: compact ? 32 : 36, height: compact ? 32 : 36, borderRadius: 9, border: `1px solid ${T.line}`, background: T.surface2, color: T.text, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }} aria-label={`${label}: ${value} faltas acumuladas`}>
      <button type="button" onClick={onDec} style={btn} aria-label={`Restar falta (${label})`}><Minus size={14} aria-hidden="true" /></button>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 4 }} aria-hidden="true">
          {Array.from({ length: free }, (_, k) => k + 1).map((i) => (
            <span key={i} style={{ width: compact ? 8 : 10, height: compact ? 8 : 10, borderRadius: "50%", background: i <= value ? dotOn : "transparent", border: `1.5px solid ${i <= value ? dotOn : alpha(T.text, 0.28)}` }} />
          ))}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color, whiteSpace: "nowrap" }}>
          {value >= limit ? `${value} · 10 M` : value === free ? `${value} · PRÓXIMA 10 M` : `${value} FALTA${value === 1 ? "" : "S"}`}
        </span>
      </div>
      <button type="button" onClick={onInc} style={btn} aria-label={`Sumar falta (${label})`}><Plus size={14} aria-hidden="true" /></button>
    </div>
  );
}

// Tramo seguido en pista: aviso a los 4 minutos y barra llena a los 6.
export const STINT_WARN_SECONDS = 4 * 60;
const STINT_FULL_SECONDS = 6 * 60;

export function PlayerCard({ player, stats, onCourt, accumulatedSeconds, stintSeconds, isKeeperCard, isActingKeeper, armed, onTap, onOpenStats, compact = false }) {
  const hasBadges = stats.goals > 0 || stats.yellow > 0 || stats.red > 0 || stats.fouls > 0 || stats.saves > 0;
  // En pista: superficie clara con borde y franja superior de marca (volt);
  // el portero (o portero-jugador) con las suyas en azul y su etiqueta. El
  // banquillo, apagado. Así el estado se lee a simple vista sin que el color
  // de marca signifique «bueno» o «malo» (DISENO-TRANSFORMACION.md §7.3).
  const stateColor = isKeeperCard ? T.gk : T.accent;
  const cardBg = !onCourt ? T.surface : isKeeperCard ? alpha(T.gk, 0.14) : alpha(T.accent, 0.04);
  const borderTint = !onCourt ? T.line : stateColor;
  const glowColor = rgbTriplet(stateColor);
  const fgColor = T.text;
  const jerseyColor = !onCourt ? T.dim : stateColor;
  const accumColor = T.dim;
  const chipBg = !onCourt ? T.surface2 : T.surface3;
  const chipBorder = T.line;
  const chipColor = T.dim;
  // En pista y con foto, la foto llena la tarjeta (con un degradado oscuro
  // abajo para que el tiempo y el nombre se lean). En el banquillo, como
  // siempre: foto pequeña y tarjeta apagada.
  const photo = onCourt ? safeImgSrc(player.photo) : "";
  const photoBg = photo ? `linear-gradient(180deg, ${alpha(T.ink, 0.05)} 0%, ${alpha(T.ink, 0.35)} 40%, ${alpha(T.ink, 0.9)} 78%), url("${photo}") center 18% / cover no-repeat` : null;
  return (
    <div
      onClick={onTap}
      className={`tap-target${armed ? " armable" : ""}`}
      style={{
        background: photoBg || cardBg,
        ...(photo ? { minHeight: compact ? 150 : 210, display: "flex", flexDirection: "column", justifyContent: "flex-end" } : {}),
        border: `${compact ? 2 : 3}px solid ${borderTint}`,
        boxShadow: onCourt ? `inset 0 ${compact ? 3 : 4}px 0 ${stateColor}, 0 0 0 1px rgba(${glowColor},0.25), 0 6px 18px rgba(${glowColor},0.12)` : "none",
        borderRadius: 14, padding: compact ? 8 : 12, cursor: "pointer", minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 10 }}>
        {!photo && <Avatar player={player} size={compact ? 36 : 56} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: compact ? 12 : 14, fontWeight: 700, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: photo ? T.white : fgColor, textShadow: photo ? `0 1px 3px ${alpha(T.ink, 0.8)}` : "none" }}>{player.name}</div>
          {/* El portero va anclado: no sale con un toque normal, así que esta
              etiqueta recuerda por qué su tarjeta se ve distinta y avisa
              cuando quien está parando no es el portero de plantilla. */}
          {isKeeperCard && (
            <div style={{ display: "inline-block", marginTop: 3, padding: "1px 6px", borderRadius: 999, background: T.gk, fontSize: 8, fontWeight: 700, letterSpacing: 0.4, color: T.ink }}>
              {isActingKeeper ? "PORTERO·JUGADOR" : "PORTERO"}
            </div>
          )}
        </div>
        <div className="display" style={{ fontSize: compact ? 26 : 34, fontWeight: 700, color: jerseyColor, lineHeight: 1, flexShrink: 0, textShadow: photo ? `0 1px 4px ${alpha(T.ink, 0.9)}` : "none" }}>{player.number}</div>
      </div>

      {/* El tiempo de ESTA tanda en pista: solo existe mientras el jugador
          está en pista, así que solo se enseña entonces — a todo lo ancho de
          la tarjeta para aprovecharla, sin etiqueta porque es el único número
          grande, y en blanco para que se distinga del acumulado de más abajo
          a simple vista. */}
      {onCourt && (
        <div className="display" style={{ fontSize: compact ? 34 : 42, fontWeight: 700, lineHeight: 1, color: T.white, marginTop: compact ? 4 : 8 }}>
          {fmtMin(stintSeconds)}
        </div>
      )}
      {/* Cuánto lleva seguido en pista: la barra se llena hasta 6' y se pone en
          ámbar a partir de 4'. Solo informa; no decide nada. El portero no la
          lleva: su tiempo en pista no se gestiona por tandas. */}
      {onCourt && !isKeeperCard && (
        <div title={stintSeconds >= STINT_WARN_SECONDS ? "Lleva 4 minutos o más seguidos en pista" : undefined} style={{ height: 4, borderRadius: 2, background: T.surface3, marginTop: compact ? 5 : 8, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, (stintSeconds / STINT_FULL_SECONDS) * 100)}%`, height: "100%", background: stintSeconds >= STINT_WARN_SECONDS ? T.warning : T.accent, transition: "width .4s linear" }} />
        </div>
      )}

      {/* La ficha detallada del jugador estaba programada pero no había forma de
          llegar a ella: este botón es su acceso. El acumulado de la parte va
          justo encima, ya bien separado del número grande de arriba — mientras
          el jugador está en pista se queda congelado en lo que ya llevaba
          antes de esta tanda, y en cuanto sale salta de golpe a incluirla, en
          el mismo instante de la sustitución. */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: onCourt ? (compact ? 6 : 14) : 6 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.3, color: photo ? alpha(T.white, 0.8) : accumColor }}>Parte</span>
        <span className="display" style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.1, color: photo ? alpha(T.white, 0.8) : accumColor }}>{fmtMin(accumulatedSeconds)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: compact ? 4 : 6, gap: 6, minHeight: 22 }}>
        <div style={{ display: "flex", gap: compact ? 3 : 6, alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
          {hasBadges && (
            <>
              {stats.goals > 0 && <MiniBadge color={fgColor}><BallIcon size={11} /> {stats.goals}</MiniBadge>}
              {stats.yellow > 0 && <MiniBadge color={onCourt ? fgColor : T.warning}><CardIcon size={11} color={T.warning} /> {stats.yellow}</MiniBadge>}
              {stats.red > 0 && <MiniBadge color={onCourt ? fgColor : T.negative}><CardIcon size={11} color={T.negative} /> {stats.red}</MiniBadge>}
              {stats.fouls > 0 && <MiniBadge color={fgColor}><AlertTriangle size={11} style={{ verticalAlign: "-0.15em" }} /> {stats.fouls}</MiniBadge>}
              {stats.saves > 0 && <MiniBadge color={fgColor}><Hand size={11} style={{ verticalAlign: "-0.15em" }} /> {stats.saves}</MiniBadge>}
            </>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenStats(); }}
          title={`Estadísticas de ${player.name}`}
          style={{
            display: "flex", alignItems: "center", gap: 4, background: chipBg,
            border: `1px solid ${chipBorder}`, borderRadius: 8, padding: "3px 8px",
            color: chipColor, fontSize: 10, fontWeight: 600, cursor: "pointer", flexShrink: 0,
          }}
        >
          <BarChart3 size={12} /> Ficha
        </button>
      </div>
    </div>
  );
}

export function TrainingPlayerCard({ player, seconds, active, onToggle }) {
  return (
    <div
      onClick={onToggle}
      className="tap-target"
      style={{
        background: active ? alpha(T.accent, 0.15) : T.surface,
        border: `2px solid ${active ? T.accent : T.line}`,
        borderRadius: 14, padding: 12, cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar player={player} size={56} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, color: active ? T.text : T.dim, fontWeight: 600 }}>{player.position}{player.isGK ? " · GK" : ""}</div>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>{player.name}</div>
          <div className="display" style={{ fontSize: 18, fontWeight: 700, color: active ? T.accent : T.dim }}>{fmtMin(seconds)}</div>
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, letterSpacing: 0.3, color: active ? T.accent : T.dim }}>
        {active ? "● ACTIVO" : "○ PARADO"}
      </div>
    </div>
  );
}

export function StatDrawer({ player, stats, canSave, onClose, onBump }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ ...modalCard, maxWidth: 420, maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()} className="fadein">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar player={player} size={48} />
            <div>
              <div style={{ fontSize: 11, color: T.dim }}>{player.position}{player.isGK ? " · Portero" : ""} · #{player.number}</div>
              <div className="display" style={{ fontSize: 19, fontWeight: 600 }}>{player.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={iconBtnSm} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div className="display" style={{ fontSize: 24, fontWeight: 700, color: T.accent, margin: "12px 0 14px" }}>{fmtMin(stats.seconds)} <span style={{ fontSize: 12, color: T.dim, fontFamily: FONTS.ui }}>jugados</span></div>

        {/* Goles y asistencias NO se tocan desde aqui: un gol sumado a mano sube el
            marcador pero no deja fase, asistente, zona ni quinteto, y el resumen, la
            tabla de fases y el informe no lo ven. Se anotan con el boton Gol. */}
        <div style={{ fontSize: 11, color: T.dim, marginBottom: 10 }}>
          Goles: <strong style={{ color: T.text }}>{stats.goals || 0}</strong> · Asistencias: <strong style={{ color: T.text }}>{stats.assists || 0}</strong> — se anotan con el botón <strong>Gol</strong>.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {STAT_DEFS.filter((d) => d.key !== "goals" && d.key !== "assists").map((d) => (
            <StatButton key={d.key} def={d} value={stats[d.key] || 0} onInc={() => onBump(d.key, 1)} onDec={() => onBump(d.key, -1)} />
          ))}
          {/* Paradas: solo para quien puede pararlas — el portero de plantilla,
              o quien esté ahora mismo jugando de portero-jugador. */}
          {canSave && GK_ACTIONS.map((d) => (
            <StatButton key={d.key} def={d} value={stats[d.key] || 0} onInc={() => onBump(d.key, 1)} onDec={() => onBump(d.key, -1)} />
          ))}
        </div>
      </div>
    </Overlay>
  );
}

export function StatButton({ def, value, onInc, onDec }) {
  const Icon = def.icon;
  return (
    <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon size={16} color={def.color} /><span style={{ fontSize: 13 }}>{def.label}</span></div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={onDec} style={iconBtnSm} aria-label="Restar"><Minus size={12} /></button>
        <span className="display" style={{ minWidth: 16, textAlign: "center", fontWeight: 600 }}>{value}</span>
        <button onClick={onInc} style={{ ...iconBtnSm, background: def.color, color: T.ink }} aria-label="Sumar"><Plus size={12} /></button>
      </div>
    </div>
  );
}
