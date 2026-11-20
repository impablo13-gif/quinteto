/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { useState } from "react";
import { Dumbbell, FileSpreadsheet } from "lucide-react";
import { T, ghostBtn } from "../../theme/theme.js";
import { fmtMin } from "../../domain/match.js";
import { Button, SectionHeader, Segmented } from "../../ui/kit.jsx";
import { SavedMatchCard } from "./SavedMatchCard.jsx";
import { SeasonGoalStatsView } from "./SeasonGoalStatsView.jsx";
import { SeasonAnalysisView } from "./SeasonAnalysisView.jsx";
import { SeasonPlayersView } from "./SeasonPlayersView.jsx";
import { SeasonZonesView } from "./SeasonZonesView.jsx";
import { HeadToHead, MatchFilters } from "./MatchFilters.jsx";
import { MatchReportsView } from "./MatchReportsView.jsx";
import { CoachView } from "./visiones/CoachView.jsx";
import { AnalystView } from "./visiones/AnalystView.jsx";
import { DirectionView } from "./visiones/DirectionView.jsx";
import { PhysicalView } from "./visiones/PhysicalView.jsx";
import { ScorerView } from "./visiones/ScorerView.jsx";
import { ALL, NO_COMPETITION, filterMatches } from "../../domain/filters.js";
export function HistoryView({ teams = [], onUpdateMatch, matches: allMatches, trainings, teamId, teamName, teamCrest, teamColors, rosterPlayers, subTab, onSubTabChange, onExport, onDeleteMatch, onCreateReport, onEditGoal, onNewTraining }) {
  const [open, setOpen] = useState(null);
  // Temporada / competición / rival. Por defecto todo: se ve lo de siempre.
  const [filters, setFilters] = useState({ season: ALL, competition: ALL, rival: ALL });
  const total = allMatches.length + trainings.length;
  // Cada destino de la navegación muestra su parte del antiguo «Historial»:
  // Partidos, Jugadores, Análisis (resumen, fases de gol y zonas) y Entrenos.
  const section = subTab === "partidos" ? "partidos" : subTab === "jugadores" ? "jugadores" : subTab === "entrenamientos" ? "entrenos" : subTab === "informes" ? "informes" : "analisis";
  const rivalOn = section === "partidos" && filters.rival !== ALL;
  const matches = filterMatches(allMatches, { ...filters, rival: section === "partidos" ? filters.rival : ALL });
  const filtered = matches.length !== allMatches.length;
  const hideEmpty = filtered && !matches.length; // ya se avisa arriba: «Ningún partido con estos filtros»
  const scopeLabel = [filters.season !== ALL ? `Temporada ${filters.season}` : null, filters.competition !== ALL ? (filters.competition === NO_COMPETITION ? "Sin competición" : filters.competition) : null].filter(Boolean).join(" · ");
  const head = {
    partidos: {
      title: "Partidos",
      subtitle: allMatches.length ? `${filtered ? `${matches.length} de ` : ""}${allMatches.length} partido${allMatches.length === 1 ? "" : "s"} guardado${allMatches.length === 1 ? "" : "s"} · toca uno para ver su ficha, corregir goles o crear el informe` : "Los partidos finalizados aparecen aquí",
      right: total > 0 && <Button size="sm" variant="ghost" icon={FileSpreadsheet} onClick={onExport}>Exportar a Excel</Button>,
    },
    jugadores: { title: "Jugadores", subtitle: "Totales por periodo, ficha de cada jugador y conclusiones" },
    analisis: { title: "Análisis", subtitle: "Temporada, fases de gol, zonas y la mirada de cada perfil: entrenador, analista, dirección, físico y anotador" },
    informes: { title: "Informes", subtitle: "El informe en PDF de cada partido, sus datos en CSV y su archivo .json" },
    entrenos: {
      title: "Entrenos",
      subtitle: `${trainings.length} sesión${trainings.length === 1 ? "" : "es"} guardada${trainings.length === 1 ? "" : "s"}`,
      right: onNewTraining && <Button size="sm" variant="primary" icon={Dumbbell} onClick={onNewTraining}>Nuevo entrenamiento</Button>,
    },
  }[section];
  return (
    <div className="fadein">
      <SectionHeader title={head.title} subtitle={head.subtitle} right={head.right} />

      {section !== "entrenos" && allMatches.length > 0 && (
        <MatchFilters matches={allMatches} value={filters} onChange={setFilters} showRival={section === "partidos"} />
      )}

      {section === "analisis" && (
        <div style={{ marginBottom: 16 }}>
          <Segmented
            label="Tipo de análisis"
            value={subTab}
            onChange={onSubTabChange}
            options={[{ value: "analisis", label: "Temporada" }, { value: "estadisticas", label: "Fases de gol" }, { value: "zonas", label: "Zonas" }, { value: "v-entrenador", label: "Entrenador" }, { value: "v-analista", label: "Analista" }, { value: "v-direccion", label: "Dirección" }, { value: "v-fisico", label: "Físico" }, { value: "v-anotador", label: "Anotador" }]}
          />
        </div>
      )}

      {subTab === "partidos" && rivalOn && <HeadToHead matches={matches} rival={filters.rival} />}

      {section !== "entrenos" && filtered && !matches.length && (
        <div style={{ padding: 20, textAlign: "center", color: T.dim, fontSize: 13, border: `1px dashed ${T.line}`, borderRadius: 12, marginBottom: 12 }}>Ningún partido con estos filtros.</div>
      )}

      {subTab === "partidos" && (
        !matches.length ? (
          filtered ? null : <div style={{ padding: 20, textAlign: "center", color: T.dim, fontSize: 13, border: `1px dashed ${T.line}`, borderRadius: 12 }}>Todavía no hay partidos guardados. Finaliza un partido para verlo aquí.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {matches.map((m) => (
              <SavedMatchCard
                key={m.date} match={m} teamName={teamName} teamCrest={teamCrest} rosterPlayers={rosterPlayers}
                isOpen={open === m.date}
                onToggle={() => setOpen(open === m.date ? null : m.date)}
                onDelete={() => onDeleteMatch(m)}
                onCreateReport={onCreateReport}
                onEditGoal={(event) => onEditGoal(m, event)}
              />
            ))}
          </div>
        )
      )}

      {subTab === "entrenamientos" && (
        !trainings.length ? (
          <div style={{ padding: 20, textAlign: "center", color: T.dim, fontSize: 13, border: `1px dashed ${T.line}`, borderRadius: 12 }}>Todavía no hay entrenamientos guardados. Finaliza una sesión para verla aquí.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {trainings.map((t) => {
              const isOpen = open === t.date;
              const activeCount = t.players.filter((p) => p.seconds > 0).length;
              return (
                <div key={t.date} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, overflow: "hidden" }}>
                  <div onClick={() => setOpen(isOpen ? null : t.date)} style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: T.dim }}>{new Date(t.date).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</div>
                      <div className="display" style={{ fontSize: 16, fontWeight: 600 }}>Duración: {fmtMin(t.durationSeconds)}</div>
                    </div>
                    <div style={{ fontSize: 11, color: T.dim }}>{activeCount} jugador{activeCount === 1 ? "" : "es"} con actividad</div>
                  </div>
                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${T.line}`, padding: 12, overflowX: "auto" }}>
                      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ color: T.dim, textAlign: "left" }}>
                            <th style={{ padding: "4px 6px" }}>#</th><th style={{ padding: "4px 6px" }}>Jugador</th><th style={{ padding: "4px 6px" }}>Posición</th><th style={{ padding: "4px 6px" }}>Tiempo activo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.players.filter((p) => p.seconds > 0).sort((a, b) => b.seconds - a.seconds).map((p, i) => (
                            <tr key={i} style={{ borderTop: `1px solid ${T.line}` }}>
                              <td style={{ padding: "4px 6px", color: T.accent, fontWeight: 600 }}>{p.number}</td>
                              <td style={{ padding: "4px 6px" }}>{p.name}</td>
                              <td style={{ padding: "4px 6px" }}>{p.position}</td>
                              <td style={{ padding: "4px 6px" }}>{fmtMin(p.seconds)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {subTab === "estadisticas" && !hideEmpty && (
        <SeasonGoalStatsView
          matches={matches} teamName={teamName}
          onRowClick={(date) => { setOpen(date); onSubTabChange("partidos"); }}
        />
      )}

      {subTab === "zonas" && !hideEmpty && <SeasonZonesView matches={matches} teamName={teamName} />}

      {subTab === "jugadores" && !hideEmpty && <SeasonPlayersView matches={matches} teamId={teamId} teamName={teamName} teamColors={teamColors} scopeLabel={scopeLabel} />}

      {subTab === "informes" && !hideEmpty && <MatchReportsView matches={matches} teamId={teamId} teamName={teamName} teamCrest={teamCrest} teamColors={teamColors} rosterPlayers={rosterPlayers} trainings={trainings} />}

      {subTab === "v-entrenador" && !hideEmpty && matches.length > 0 && <CoachView matches={matches} teamId={teamId} />}
      {subTab === "v-analista" && !hideEmpty && matches.length > 0 && <AnalystView matches={matches} teamName={teamName} />}
      {subTab === "v-direccion" && !hideEmpty && matches.length > 0 && <DirectionView matches={matches} teams={teams} />}
      {subTab === "v-fisico" && !hideEmpty && matches.length > 0 && <PhysicalView matches={matches} trainings={trainings} onUpdateMatch={onUpdateMatch} />}
      {subTab === "v-anotador" && !hideEmpty && matches.length > 0 && <ScorerView matches={matches} onUpdateMatch={onUpdateMatch} />}

      {subTab === "analisis" && !hideEmpty && <SeasonAnalysisView matches={matches} teamId={teamId} teamName={teamName} teamColors={teamColors} scopeLabel={scopeLabel} />}
    </div>
  );
}
