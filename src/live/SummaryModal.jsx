/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { X } from "lucide-react";
import { T, iconBtnSm, modalCard, overlayStyle } from "../theme/theme.js";
import { halfLabel, halvesPresent } from "../domain/match.js";
import { SectionHeading } from "../ui/common.jsx";
import { DisciplineSection, GoalLine, RotationsSection, StatsTable, TeamTotalsStrip, ZonedEventsSection } from "../ui/matchSections.jsx";
import { Overlay } from "../ui/kit.jsx";
/* Resumen en tres bloques: 1ª parte, 2ª parte y total del partido. Cada parte
   lleva su propio marcador y sus goles, que es como se lee un partido de
   fútbol sala: casi siempre importa en qué mitad pasó cada cosa. */
export function SummaryModal({ players, stats, statsByHalf, goalEvents, disciplineEvents, zonedEvents, rotations, openStints, currentRemaining, onClose, onEditGoal }) {
  const halves = halvesPresent(statsByHalf, goalEvents);
  // A las rotaciones ya cerradas se le suma, como fila "en curso", la de
  // quien sigue en pista en este momento — así el resumen a mitad de partido
  // también refleja lo que está pasando ahora mismo, no solo lo cerrado.
  const liveRotations = [
    ...(rotations || []),
    ...(openStints || []).map(([playerId, st]) => {
      const player = players.find((p) => p.id === playerId);
      return {
        id: `ongoing-${playerId}`, playerId,
        playerName: player ? player.name : "?", playerNumber: player ? player.number : "?",
        half: st.half, startRemaining: st.startRemaining, endRemaining: currentRemaining,
        durationSeconds: Math.max(0, st.startRemaining - currentRemaining), ongoing: true,
      };
    }),
  ];
  const scoreOf = (h) => {
    const evs = (goalEvents || []).filter((ev) => Number(ev.half) === h);
    return `${evs.filter((e) => e.type === "for").length}-${evs.filter((e) => e.type !== "for").length}`;
  };
  const totalFor = (goalEvents || []).filter((e) => e.type === "for").length;
  const totalAgainst = (goalEvents || []).length - totalFor;

  return (
    <Overlay onClose={onClose}>
      <div style={{ ...modalCard, maxWidth: 620, maxHeight: "84vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()} className="fadein">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, position: "sticky", top: -18, background: T.surface, paddingTop: 2, zIndex: 1 }}>
          <div className="display" style={{ fontSize: 17, fontWeight: 600 }}>Resumen del partido</div>
          <button onClick={onClose} style={iconBtnSm} aria-label="Cerrar"><X size={16} /></button>
        </div>

        {halves.map((h) => {
          const goalsThisHalf = (goalEvents || []).filter((ev) => Number(ev.half) === h);
          return (
            <div key={h} style={{ marginBottom: 22 }}>
              <SectionHeading title={halfLabel(h)} right={scoreOf(h)} />
              <StatsTable players={players} statsMap={statsByHalf[h] || {}} />
              <TeamTotalsStrip players={players} statsMap={statsByHalf[h] || {}} />
              {goalsThisHalf.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {goalsThisHalf.map((ev) => <GoalLine key={ev.id} ev={ev} onEdit={onEditGoal ? () => onEditGoal(ev) : null} />)}
                </div>
              )}
            </div>
          );
        })}

        <div>
          <SectionHeading title="Total del partido" right={`${totalFor}-${totalAgainst}`} accent={T.accent} />
          <StatsTable players={players} statsMap={stats} />
          <TeamTotalsStrip players={players} statsMap={stats} />
        </div>

        <DisciplineSection events={disciplineEvents} />
        <ZonedEventsSection events={zonedEvents} />
        <RotationsSection rotations={liveRotations} />
      </div>
    </Overlay>
  );
}
