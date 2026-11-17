/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { useState } from "react";
import { ClipboardList, FileSpreadsheet, Settings, Trash2 } from "lucide-react";
import { T, ghostBtn, iconBtnSm } from "../../theme/theme.js";
import { BallIcon } from "../../ui/icons.jsx";
import { fmtClock, fmtMin, halfLabel, halfScore, halfShortLabel, halvesOf, hasActivity } from "../../domain/match.js";
import { exportSingleMatchToExcel } from "../../reports/excel.js";
import { SubTabBtn } from "../../ui/common.jsx";
import { DisciplineSection, RotationsSection, ZonedEventsSection } from "../../ui/matchSections.jsx";
/* Ficha de un partido ya guardado. Igual que el resumen en directo, deja ver
   cada parte por separado o el total, sin apilar tres tablas en pantalla. */
export function SavedMatchCard({ match: m, teamName, teamCrest, rosterPlayers, isOpen, onToggle, onDelete, onCreateReport, onEditGoal }) {
  const halves = halvesOf(m);
  const [tab, setTab] = useState("total");
  const scoreOf = (h) => { const s = halfScore(m, h); return `${s.favor}-${s.contra}`; };

  const shown = tab === "total" ? m.players : (halves.find((h) => String(h.half) === String(tab)) || { players: [] }).players;
  const goalsShown = tab === "total" ? (m.goalEvents || []) : (m.goalEvents || []).filter((ev) => String(ev.half) === String(tab));
  const td = { padding: "4px 6px" };

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, overflow: "hidden" }}>
      <div onClick={onToggle} style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: T.dim }}>{new Date(m.date).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</div>
          <div className="display" style={{ fontSize: 16, fontWeight: 600 }}>{teamName || "Equipo"} {m.teamGoals} — {m.rivalScore} {m.rivalName}</div>
          {halves.length > 0 && (
            <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>{halves.map((h) => `${halfShortLabel(h.half)} ${scoreOf(h.half)}`).join(" · ")}</div>
          )}
          {Array.isArray(m.timeouts) && m.timeouts.length > 0 && (
            <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>
              T.M.: {[["for", teamName || "Nosotros"], ["against", "Rival"]]
                .map(([team, label]) => `${label} ${m.timeouts.filter((t) => t.team === team).map((t) => halfShortLabel(t.half)).join(", ") || "—"}`).join(" · ")}
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <div style={{ borderTop: `1px solid ${T.line}`, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: T.dim }}>
              {m.startTime ? `Inicio: ${m.startTime}` : ""}{m.venue ? `${m.startTime ? " · " : ""}${m.venue}` : ""}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => exportSingleMatchToExcel(m, teamName)} style={{ ...ghostBtn, fontSize: 11, padding: "5px 10px" }}><FileSpreadsheet size={12} /> Excel</button>
              {/* El informe (fotos, cronología, tiros, parejas en pista...) se
                  genera solo al pulsar aquí — no al finalizar el partido, para
                  no interrumpir justo entonces. Antes pide los datos de
                  cabecera (ciudad, pabellón, competición...). */}
              <button onClick={() => onCreateReport(m)} style={{ ...ghostBtn, fontSize: 11, padding: "5px 10px", borderColor: T.accent, color: T.accent, fontWeight: 700 }}><ClipboardList size={12} /> Crear informe</button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ ...ghostBtn, fontSize: 11, padding: "5px 10px", borderColor: T.negative, color: T.negative }}><Trash2 size={12} /> Borrar</button>
            </div>
          </div>

          {/* Los partidos guardados antes de que existiera el desglose solo
              tienen el total, y entonces no hay nada que elegir. */}
          {halves.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              {halves.map((h) => (
                <SubTabBtn key={h.half} active={String(tab) === String(h.half)} onClick={() => setTab(String(h.half))} label={`${halfLabel(h.half)} · ${scoreOf(h.half)}`} />
              ))}
              <SubTabBtn active={tab === "total"} onClick={() => setTab("total")} label={`Total · ${m.teamGoals}-${m.rivalScore}`} />
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: T.dim, textAlign: "left" }}>
                  <th style={td}>#</th><th style={td}>Jugador</th><th style={td}>Min</th>
                  <th style={td}>G</th><th style={td}>A</th>
                  <th style={td}>TP</th><th style={td}>TF</th><th style={td}>TPa</th>
                  <th style={td}>FC</th><th style={td}>FR</th>
                  <th style={td}>TA</th><th style={td}>TR</th><th style={td}>Par</th>
                  <th style={td}>Rec</th><th style={td}>Pér</th>
                </tr>
              </thead>
              <tbody>
                {shown.filter(hasActivity).map((p, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${T.line}` }}>
                    <td style={{ ...td, color: T.accent, fontWeight: 600 }}>{p.number}</td>
                    <td style={td}>{p.name}</td>
                    <td style={td}>{fmtMin(p.seconds)}</td>
                    <td style={td}>{p.goals}</td><td style={td}>{p.assists}</td>
                    <td style={td}>{p.shotsOn || 0}</td><td style={td}>{p.shotsOff || 0}</td><td style={td}>{p.shotsPost || 0}</td>
                    <td style={td}>{p.fouls}</td><td style={td}>{p.foulsReceived || 0}</td><td style={td}>{p.yellow}</td>
                    <td style={td}>{p.red}</td><td style={td}>{p.saves}</td>
                    <td style={td}>{p.recoveries}</td><td style={td}>{p.turnovers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {goalsShown.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Goles</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {goalsShown.map((ev) => (
                  <div key={ev.id} style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, padding: "6px 10px", fontSize: 11 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div>
                        <span style={{ fontWeight: 700, color: ev.type === "for" ? T.positive : T.negative }}>
                          <BallIcon size={13} /> {ev.type === "for" ? (ev.authorName || "Autogol del rival") : "Rival"}
                        </span>
                        {" · "}{ev.phase} · {halfLabel(ev.half)} · {fmtClock(ev.remaining !== undefined ? ev.remaining : ev.seconds)}
                        {ev.assistName ? ` · Asist. ${ev.assistName}` : ""}
                      </div>
                      <button onClick={() => onEditGoal(ev)} title="Editar este gol" style={{ ...iconBtnSm, width: 20, height: 20, flexShrink: 0 }}>
                        <Settings size={11} />
                      </button>
                    </div>
                    <div style={{ color: T.dim, marginTop: 2 }}>En pista: {(ev.onCourt || []).map((p) => `#${p.number} ${p.name}`).join(", ")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Igual que las rotaciones: faltas y tarjetas se muestran siempre
              enteras, sin depender de la pestaña 1ª/2ª/Total de arriba. */}
          <DisciplineSection events={m.disciplineEvents || []} />
          <ZonedEventsSection events={m.zonedEvents || []} />

          {/* Las rotaciones ya agrupan por parte, así que se muestran siempre
              enteras, sin depender de la pestaña 1ª/2ª/Total de arriba. */}
          <RotationsSection rotations={m.rotations || []} />
        </div>
      )}
    </div>
  );
}
