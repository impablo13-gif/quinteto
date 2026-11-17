/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { useState } from "react";
import { Settings } from "lucide-react";
import { T, iconBtnSm, alpha } from "../theme/theme.js";
import { BallIcon } from "./icons.jsx";
import { fmtClock, fmtMin, groupRotations, halfLabel } from "../domain/match.js";
import { DISCIPLINE_COLOR, DISCIPLINE_LABEL, PITCH_ZONE_LABEL, ZONED_COLOR, ZONED_LABEL } from "../domain/catalog.js";
import { TEAM_TOTAL_ITEMS } from "./catalog.jsx";
import { SectionHeading } from "./common.jsx";
/* Tabla de estadísticas reutilizada por cada sección del resumen. */
export function StatsTable({ players, statsMap }) {
  const rows = players.filter((p) => {
    const s = statsMap[p.id];
    return s && (s.seconds > 0 || s.goals || s.assists || s.shotsOn || s.shotsOff || s.shotsPost || s.turnovers || s.recoveries || s.fouls || s.foulsReceived || s.yellow || s.red || s.saves);
  });
  if (!rows.length) {
    return <div style={{ padding: "10px 4px", color: T.dim, fontSize: 12 }}>Sin actividad registrada en esta parte.</div>;
  }
  const th = { padding: "4px 6px", position: "sticky", top: 0, background: T.surface };
  const td = { padding: "4px 6px" };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ color: T.dim, textAlign: "left" }}>
            <th style={th}>#</th><th style={th}>Jugador</th><th style={th}>Min</th>
            <th style={th}>G</th><th style={th}>A</th>
            <th style={th}>TP</th><th style={th}>TF</th><th style={th}>TPa</th>
            <th style={th}>Pér</th><th style={th}>Rec</th>
            <th style={th}>FC</th><th style={th}>FR</th><th style={th}>TA</th><th style={th}>TR</th><th style={th}>Par</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const s = statsMap[p.id];
            return (
              <tr key={p.id} style={{ borderTop: `1px solid ${T.line}` }}>
                <td style={{ ...td, color: T.accent, fontWeight: 600 }}>{p.number}</td>
                <td style={td}>{p.name}</td>
                <td style={td}>{fmtMin(s.seconds)}</td>
                <td style={td}>{s.goals}</td><td style={td}>{s.assists}</td>
                <td style={td}>{s.shotsOn}</td><td style={td}>{s.shotsOff}</td><td style={td}>{s.shotsPost || 0}</td>
                <td style={td}>{s.turnovers}</td><td style={td}>{s.recoveries}</td>
                <td style={td}>{s.fouls}</td><td style={td}>{s.foulsReceived || 0}</td><td style={td}>{s.yellow}</td><td style={td}>{s.red}</td><td style={td}>{s.saves}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
export function TeamTotalsStrip({ players, statsMap }) {
  const totals = {};
  TEAM_TOTAL_ITEMS.forEach((it) => { totals[it.key] = 0; });
  players.forEach((p) => {
    const s = statsMap[p.id];
    if (!s) return;
    TEAM_TOTAL_ITEMS.forEach((it) => { totals[it.key] += s[it.key] || 0; });
  });
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 8, padding: "10px 14px",
      background: `linear-gradient(135deg, ${alpha(T.accent, 0.06)}, ${alpha(T.accent, 0.015)})`,
      border: `1.5px solid ${T.accent}`, borderRadius: 10, boxShadow: `0 0 16px ${alpha(T.accent, 0.09)}`,
    }}>
      <span style={{ fontSize: 9, fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: 0.6 }}>Total equipo</span>
      {TEAM_TOTAL_ITEMS.map((it) => (
        <span key={it.key} style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 9, color: T.dim, fontWeight: 700 }}>{it.label}</span>
          <span className="display" style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{totals[it.key]}</span>
        </span>
      ))}
    </div>
  );
}

export function GoalLine({ ev, onEdit }) {
  return (
    <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, padding: "6px 10px", fontSize: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <span style={{ fontWeight: 700, color: ev.type === "for" ? T.positive : T.negative }}>
            <BallIcon size={13} /> {ev.type === "for" ? (ev.authorName || "Autogol del rival") : "Rival"}
          </span>
          {" · "}{ev.phase} · {fmtClock(ev.remaining !== undefined ? ev.remaining : ev.seconds)}
          {ev.assistName ? ` · Asist. ${ev.assistName}` : ""}
        </div>
        {onEdit && (
          <button onClick={onEdit} title="Editar este gol" style={{ ...iconBtnSm, width: 20, height: 20, flexShrink: 0 }}>
            <Settings size={11} />
          </button>
        )}
      </div>
      <div style={{ color: T.dim, marginTop: 2 }}>Quinteto en pista: {(ev.onCourt || []).map((p) => `#${p.number} ${p.name}`).join(", ")}</div>
    </div>
  );
}

// Cada falta (cometida o recibida) y cada tarjeta, con el minuto exacto en
// que se marcó — orden cronológico, parte a parte.
export function DisciplineSection({ events }) {
  if (!events || !events.length) return null;
  const sorted = [...events].sort((a, b) => (a.half - b.half) || (b.remaining - a.remaining));
  return (
    <div style={{ marginTop: 22 }}>
      <SectionHeading title="Faltas y tarjetas" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sorted.map((ev) => (
          <div key={ev.id} style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, padding: "6px 10px", fontSize: 11, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span>
              <span style={{ fontWeight: 700, color: DISCIPLINE_COLOR[ev.type] || T.text }}>{DISCIPLINE_LABEL[ev.type] || ev.type}</span>
              {" · "}#{ev.playerNumber} {ev.playerName}
              {ev.zone ? ` · ${PITCH_ZONE_LABEL[ev.zone] || ev.zone}` : ""}
            </span>
            <span style={{ color: T.dim, flexShrink: 0 }}>{halfLabel(ev.half)} · {fmtClock(ev.remaining)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Cada pérdida, recuperación y tiro, con jugador, zona del campo y minuto.
export function ZonedEventsSection({ events }) {
  if (!events || !events.length) return null;
  const sorted = [...events].sort((a, b) => (a.half - b.half) || (b.remaining - a.remaining));
  return (
    <div style={{ marginTop: 22 }}>
      <SectionHeading title="Pérdidas, recuperaciones y tiros" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sorted.map((ev) => (
          <div key={ev.id} style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, padding: "6px 10px", fontSize: 11, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span>
              <span style={{ fontWeight: 700, color: ZONED_COLOR[ev.key] || T.text }}>{ZONED_LABEL[ev.key] || ev.key}</span>
              {" · "}#{ev.playerNumber} {ev.playerName} · {PITCH_ZONE_LABEL[ev.zone] || ev.zone}
            </span>
            <span style={{ color: T.dim, flexShrink: 0 }}>{halfLabel(ev.half)} · {fmtClock(ev.remaining)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Cada entrada y salida de la pista, jugador a jugador: la rotación en sí
   (de qué marca a qué marca), el acumulado de cada parte y el acumulado
   total. Un jugador por fila, plegado por defecto — con 15-20 jugadores con
   minutos, mostrarlo todo abierto a la vez sería ilegible. */
export function RotationsSection({ rotations }) {
  const grouped = groupRotations(rotations);
  const [openId, setOpenId] = useState(null);
  if (!grouped.length) return null;
  return (
    <div style={{ marginTop: 22 }}>
      <SectionHeading title="Rotaciones" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {grouped.map((g) => {
          const isOpen = openId === g.playerId;
          return (
            <div key={g.playerId} style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 10, overflow: "hidden" }}>
              <div onClick={() => setOpenId(isOpen ? null : g.playerId)} style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>#{g.number} {g.name}</span>
                <span className="display" style={{ fontSize: 13, fontWeight: 700, color: T.accent, flexShrink: 0 }}>{fmtMin(g.total)}</span>
              </div>
              {isOpen && (
                <div style={{ borderTop: `1px solid ${T.line}`, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {[...g.halves.entries()].sort((a, b) => a[0] - b[0]).map(([half, h]) => (
                    <div key={half}>
                      <div style={{ fontSize: 10, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{halfLabel(Number(half))}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {h.list.map((r, i) => (
                          <div key={r.id} style={{ fontSize: 11, color: T.text, display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <span>{i + 1}ª rotación: {fmtClock(r.startRemaining)} → {fmtClock(r.endRemaining)}{r.ongoing ? " · en curso" : ""}</span>
                            <span style={{ fontWeight: 600, flexShrink: 0 }}>{fmtMin(r.durationSeconds)}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>Acumulado {halfLabel(Number(half))}: <strong style={{ color: T.text }}>{fmtMin(h.total)}</strong></div>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.accent, borderTop: `1px solid ${T.line}`, paddingTop: 6 }}>
                    Acumulado total: {fmtMin(g.total)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
