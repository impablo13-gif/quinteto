/* Componente raiz: solo lo que se pinta. El estado y la logica (equipos,
 * partido en directo, entrenamiento, historial, copias, actualizaciones)
 * viven en src/state/useAppController.jsx. */
import { AlertTriangle, CheckCheck, Trophy, ChevronLeft, ChevronRight, ClipboardList, Clock3, Dumbbell, MapPin, Maximize2, Minimize2, Minus, Pause, Play, Plus, RotateCcw, Save, Trash2, Undo2, Users, X } from "lucide-react";
import { appEvent } from "./brand/brand.js";
import { T, bigBtn, ghostBtn, iconBtnSm, modalCard, alpha } from "./theme/theme.js";
import { FONTS } from "./brand/tokens.js";
import { MAX_HALVES, clamp, emptyStats, fmtClock, halfLabel, halfMinutesFor, matchHalvesPresent } from "./domain/match.js";
import { COMPETITION_SUGGESTIONS } from "./domain/catalog.js";
import { exportClubDataToExcel } from "./reports/excel.js";
import { Avatar, CrestAvatar, PhotoCropEditor, ScoreColumn } from "./ui/common.jsx";
import { MatchReportView } from "./features/reports/MatchReportView.jsx";
import { ReportMetaModal } from "./features/reports/ReportMetaModal.jsx";
import { FirstTeamScreen } from "./features/home/FirstTeamScreen.jsx";
import { UpdateBanner } from "./features/home/HomeView.jsx";
import { TeamManagerModal } from "./features/home/TeamManagerModal.jsx";
import { BackupModal } from "./features/backup/BackupModal.jsx";
import { DraftRecoveryModal } from "./features/backup/DraftRecoveryModal.jsx";
import { ClockAdjust, ClockDial, FoulsDots, PlayerCard, QuickActionBar, StatDrawer, TrainingPlayerCard } from "./live/controls.jsx";
import { ActionsPopover, AssistPopover, CardsPopover, ConvocatoriaModal, GoalEditModal, GoalPhasePopover, GoalkeeperSwapModal, PitchZonePicker, SubstitutionPicker } from "./live/modals.jsx";
import { SummaryModal } from "./live/SummaryModal.jsx";
import { HistoryView } from "./features/history/HistoryView.jsx";
import { AppShell } from "./ui/AppShell.jsx";
import { Button } from "./ui/kit.jsx";
import { Dashboard } from "./features/home/Dashboard.jsx";
import { TeamView } from "./features/team/TeamView.jsx";
import { BallIcon, CardIcon } from "./ui/icons.jsx";
import { Overlay } from "./ui/kit.jsx";
import { useAppController } from "./state/useAppController.jsx";
import { describeLastRecord } from "./live/lastRecord.js";

export default function App() {
  const {
    actionsPopoverOpen,
    activeRivalShortHanded,
    activeShortHanded,
    activeTeam,
    activeTeamId,
    addPlayer,
    addPlayerQuick,
    addTeamAction,
    applyUpdate,
    armCardAction,
    armGoal,
    armRivalExpulsion,
    armRivalGoal,
    armStatAction,
    askRemovePlayer,
    askRemoveTeam,
    backupOpen,
    bump,
    cancelGoalWizard,
    cancelPendingAction,
    cancelZonedWizard,
    cardsPopoverOpen,
    checkForUpdateNow,
    chooseAssist,
    choosePhase,
    commitTeams,
    commitTime,
    commitTrainingTime,
    confirmConvocatoria,
    confirmDeleteMatch,
    confirmEnd,
    confirmEndTraining,
    confirmRemovePlayer,
    confirmRemoveTeam,
    convocados,
    convocatoriaMode,
    createFirstTeam,
    cropTarget,
    currentRivalTeamFouls,
    currentTeamFouls,
    deleteMatch,
    discardMatchDraft,
    discardTrainingDraft,
    disciplineEvents,
    doGoalkeeperSwap,
    doInstall,
    doSubstitution,
    durationLocked,
    endChecks,
    editTeamField,
    editingGoal,
    editingSavedGoal,
    finalizeGoalZone,
    finalizeZonedAction,
    finishMatch,
    finishTraining,
    focusMode,
    generateReport,
    goalEvents,
    goalWizard,
    goalkeeperSwapFor,
    half,
    halfLength,
    halfProgress,
    halfUndo,
    halfUndoValid,
    handleCropSave,
    handleNewFile,
    handlePlayerTap,
    handleReframe,
    handleRivalCrestFile,
    handleRivalCrestReframe,
    handleRivalCrestRemove,
    handleTeamCrestFile,
    handleTeamCrestReframe,
    handleTeamCrestRemove,
    handleTeamColors,
    handleTeamConfig,
    importRoster,
    updateSavedMatch,
    teamConfig,
    overtimeLength,
    historySubTab,
    installPrompt,
    isActingKeeper,
    isFullscreen,
    keeperOnCourtId,
    keeperRedPrompt,
    lastBackupAt,
    loading,
    markBackupDone,
    matchInProgress,
    matchStartTime,
    maxOnCourt,
    narrow,
    navigate,
    onCourt,
    onCourtCount,
    pendingAction,
    pendingDrafts,
    players,
    registerRivalOwnGoal,
    registerTimeout,
    adjustClock,
    remaining,
    removePlayer,
    removeRivalGoal,
    removeTeamAction,
    reportMetaFor,
    resetTraining,
    restrictionTimeLeft,
    resumeMatchDraft,
    resumeTrainingDraft,
    rivalCrest,
    rivalName,
    rivalScore,
    rotations,
    running,
    saveDraftNow,
    saveGoalEdit,
    savePlayerEdit,
    saveSavedGoalEdit,
    savedMatches,
    savedTrainings,
    section,
    sentOffIds,
    setActionsPopoverOpen,
    setAllTrainingActive,
    setBackupOpen,
    setCardsPopoverOpen,
    setChosenGoalkeeperId,
    setClockRunning,
    setConfirmDeleteMatch,
    setConfirmEnd,
    setConfirmEndTraining,
    setConfirmRemovePlayer,
    setConfirmRemoveTeam,
    setConvocatoriaMode,
    setCropTarget,
    setEditingGoal,
    setEditingSavedGoal,
    setGoalkeeperSwapFor,
    setHalfLength,
    setHistorySubTab,
    setKeeperRedPrompt,
    setMatchStartTime,
    setReportMetaFor,
    setRivalName,
    setRivalTeamFouls,
    setStatPlayer,
    setSubPickerFor,
    setSummaryOpen,
    setTeamFouls,
    setTeamManagerOpen,
    setTrainingClockRunning,
    setVenue,
    competition,
    setCompetition,
    setView,
    setViewingReport,
    showToast,
    sortedPlayers,
    standalone,
    startNewMatch,
    startNextHalf,
    statP,
    stats,
    statsByHalf,
    stintsRef,
    subPickerFor,
    summaryOpen,
    switchTeam,
    teamGoals,
    teamManagerOpen,
    teams,
    timeouts,
    toast,
    toggleFullscreen,
    toggleTrainingActive,
    trainingActive,
    trainingRunning,
    trainingSeconds,
    trainingStats,
    undoLast,
    undoNextHalf,
    undoStack,
    updateReady,
    venue,
    view,
    viewingReport,
    zonedActionWizard,
    zonedEvents,
  } = useAppController();

  if (loading) {
    return <div style={{ background: T.bg, color: T.dim, minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTS.ui }}>Cargando…</div>;
  }

  if (teams.length === 0) return <FirstTeamScreen onCreate={createFirstTeam} />;

  return (
    <div style={{
      background: T.bg, color: T.text, fontFamily: FONTS.ui,
      paddingBottom: focusMode ? `calc(104px + env(safe-area-inset-bottom, 0px))` : 0,
      paddingTop: "env(safe-area-inset-top, 0px)",
      ...(isFullscreen
        ? { position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto", minHeight: "100dvh" }
        : { position: "relative", minHeight: "100dvh" }),
    }}>
      {focusMode && (
        <>
          {/* HEADER */}
          <div style={{ background: T.surface, borderBottom: `1px solid ${T.line}`, padding: narrow ? "8px 12px 10px" : "14px 16px" }}>
            {view === "entrenamiento" ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setView("inicio")}>
                  <CrestAvatar crest={activeTeam.crest} size={40} onPick={(f) => handleTeamCrestFile(activeTeamId, f)} onReframe={() => handleTeamCrestReframe(activeTeamId, activeTeam.crest)} onRemove={() => handleTeamCrestRemove(activeTeamId)} />
                  <div>
                    <div className="display" style={{ fontSize: 15, fontWeight: 600, letterSpacing: 0.5 }}>{activeTeam.name}</div>
                    <div style={{ fontSize: 9, color: T.dim, letterSpacing: 1 }}>{activeTeam.subtitle}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: trainingRunning ? T.accent : T.dim }} />
                  <div className="display" style={{ fontSize: 32, fontWeight: 700 }}>{fmtClock(trainingSeconds)}</div>
                  <div style={{ fontSize: 11, color: T.dim }}>{trainingRunning ? "en marcha" : "parado"}</div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setTrainingClockRunning(!trainingRunning)} style={{ ...bigBtn, background: trainingRunning ? T.negative : T.accent, color: T.ink, fontSize: 19, fontWeight: 700, padding: "18px 30px", borderRadius: 14, gap: 10 }}>
                    {trainingRunning ? <Pause size={26} /> : <Play size={26} />} {trainingRunning ? "Pausar" : "Iniciar"}
                  </button>
                  <button onClick={resetTraining} style={ghostBtn} title="Reiniciar sesión"><RotateCcw size={14} /> Reiniciar</button>
                </div>
              </div>
            ) : (
            /* Cabecera del directo en tres bloques (DISENO-TRANSFORMACION.md §9.1):
               marcador con las faltas de cada equipo · reloj · controles. Mismos
               controles y mismos manejadores que antes; solo cambia el orden. */
            <div style={{ display: "flex", flexDirection: "column", gap: narrow ? 10 : 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12, color: T.dim }}>
                <Button size="sm" variant="ghost" icon={ChevronLeft} onClick={() => setView("inicio")} title="Volver a la app (el partido se sigue guardando)">Salir</Button>
                {!isFullscreen && (
                  <>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Clock3 size={13} aria-hidden="true" />{matchStartTime ? `Inicio: ${matchStartTime}` : "Inicio: pendiente de empezar"}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <MapPin size={13} aria-hidden="true" />
                      <input aria-label="Pabellón" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Pabellón" style={{ background: "transparent", border: "none", borderBottom: `1px dashed ${T.line}`, color: T.text, fontSize: 13, outline: "none", width: 140 }} />
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <Trophy size={13} aria-hidden="true" />
                      <input aria-label="Competición" value={competition} onChange={(e) => setCompetition(e.target.value)} placeholder="Competición" list="live-competition-suggestions" style={{ background: "transparent", border: "none", borderBottom: `1px dashed ${T.line}`, color: T.text, fontSize: 13, outline: "none", width: 130 }} />
                      <datalist id="live-competition-suggestions">{COMPETITION_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
                    </span>
                  </>
                )}
                <div style={{ flex: 1 }} />
                {half <= 2 ? (
                  // Cambiar la duración con el partido empezado recalcula el reloj
                  // y descuadra las rotaciones y goles ya anotados con la anterior:
                  // solo se puede fijar antes de arrancar la 1ª parte.
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }} title={durationLocked ? "La duración solo se puede cambiar antes de empezar el partido" : undefined}>
                    Duración
                    <input
                      type="number" min={1} max={60} value={halfLength} disabled={durationLocked} aria-label="Duración de cada parte, en minutos"
                      onChange={(e) => { if (e.target.value === "") return; setHalfLength(clamp(Math.round(Number(e.target.value)) || 1, 1, 60)); }}
                      style={{ width: 56, background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, color: T.text, padding: "4px 6px", fontSize: 14, opacity: durationLocked ? 0.5 : 1 }}
                    />
                    min
                  </span>
                ) : (
                  <span>Prórroga: 3 min fijos</span>
                )}
                <button onClick={toggleFullscreen} style={ghostBtn} title={isFullscreen ? "Volver a la vista normal" : "Ampliar y aprovechar todo el espacio"}>
                  {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />} {isFullscreen ? "Vista normal" : "Ampliar vista"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0, 1fr)" : "minmax(0, 1.3fr) auto minmax(0, 1fr)", gap: narrow ? 10 : 18, alignItems: "stretch" }}>
                {/* Marcador: cada equipo con su escudo, nombre, goles y faltas acumuladas */}
                <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 16, padding: narrow ? 10 : 14, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", gap: 8, alignItems: "start" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <CrestAvatar crest={activeTeam.crest} size={narrow ? 32 : 40} onPick={(f) => handleTeamCrestFile(activeTeamId, f)} onReframe={() => handleTeamCrestReframe(activeTeamId, activeTeam.crest)} onRemove={() => handleTeamCrestRemove(activeTeamId)} />
                    <div title={activeTeam.name} style={{ fontSize: 12, fontWeight: 600, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeTeam.name || "Equipo"}</div>
                    <div className="display" style={{ fontSize: narrow ? 46 : 60, fontWeight: 700, lineHeight: 1, color: T.accent }}>{teamGoals}</div>
                    <FoulsDots label="nuestras faltas" compact={narrow} limit={teamConfig.rules.foulsForDoublePenalty} value={currentTeamFouls} onInc={() => setTeamFouls((v) => ({ ...v, [half]: (v[half] || 0) + 1 }))} onDec={() => setTeamFouls((v) => ({ ...v, [half]: Math.max(0, (v[half] || 0) - 1) }))} />
                  </div>
                  <div className="display" aria-hidden="true" style={{ fontSize: narrow ? 28 : 36, color: T.dim, paddingTop: narrow ? 52 : 66 }}>–</div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <CrestAvatar crest={rivalCrest} size={narrow ? 32 : 40} onPick={handleRivalCrestFile} onReframe={handleRivalCrestReframe} onRemove={handleRivalCrestRemove} />
                    <input aria-label="Nombre del rival" value={rivalName} onChange={(e) => setRivalName(e.target.value)} style={{ background: "transparent", border: "none", borderBottom: `1px dashed ${T.line}`, color: T.text, fontSize: 12, fontWeight: 600, width: "100%", maxWidth: 140, textAlign: "center", outline: "none" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={removeRivalGoal} style={{ ...iconBtnSm, width: 32, height: 32, borderRadius: 9 }} title="Quitar el último gol rival" aria-label="Quitar el último gol rival"><Minus size={14} /></button>
                      <div className="display" style={{ fontSize: narrow ? 46 : 60, fontWeight: 700, lineHeight: 1, color: T.text }}>{rivalScore}</div>
                      <button onClick={armRivalGoal} style={{ ...iconBtnSm, width: 32, height: 32, borderRadius: 9, background: T.negative, color: T.ink }} title="Registrar gol rival" aria-label="Registrar gol rival"><Plus size={14} /></button>
                    </div>
                    <FoulsDots label="faltas del rival" compact={narrow} limit={teamConfig.rules.foulsForDoublePenalty} value={currentRivalTeamFouls} onInc={() => setRivalTeamFouls((v) => ({ ...v, [half]: (v[half] || 0) + 1 }))} onDec={() => setRivalTeamFouls((v) => ({ ...v, [half]: Math.max(0, (v[half] || 0) - 1) }))} />
                  </div>
                </div>

                {/* Reloj (en móvil, al lado del botón de iniciar) */}
                <div style={{ display: "flex", flexDirection: narrow ? "row" : "column", alignItems: "center", justifyContent: "center", gap: narrow ? 12 : 8 }}>
                  <ClockDial seconds={remaining} progress={halfProgress} running={running} half={half} size={narrow ? 84 : 128} />
                  {(activeShortHanded.length > 0 || activeRivalShortHanded.length > 0) && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
                      {activeShortHanded.map((r) => (
                        <span key={r.id} className="display" style={{ background: T.negative, color: T.ink, borderRadius: 7, padding: "2px 7px", fontSize: 12, fontWeight: 700 }} title="Tiempo que queda de nuestra inferioridad">
                          <CardIcon size={11} color={T.ink} /> {fmtClock(restrictionTimeLeft(r))}
                        </span>
                      ))}
                      {activeRivalShortHanded.map((r) => (
                        <span key={r.id} className="display" style={{ background: T.info, color: T.ink, borderRadius: 7, padding: "2px 7px", fontSize: 12, fontWeight: 700 }} title="Tiempo que queda de superioridad por expulsión del rival">
                          <CardIcon size={11} color={T.ink} /> {fmtClock(restrictionTimeLeft(r))}
                        </span>
                      ))}
                    </div>
                  )}
                  {narrow && (
                    <button onClick={() => { const next = !running; setClockRunning(next); if (next && !matchStartTime) setMatchStartTime(new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })); }} style={{ ...bigBtn, flex: 1, justifyContent: "center", background: running ? T.negative : T.accent, color: T.ink, fontSize: 20, fontWeight: 700, minHeight: 64, borderRadius: 16, gap: 10 }}>
                      {running ? <Pause size={24} /> : <Play size={24} />} {running ? "Pausar" : "Iniciar"}
                    </button>
                  )}
                </div>

                {/* Controles: iniciar/pausar, partes, tiempos muertos y expulsión rival */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center", minWidth: 0 }}>
                  {!narrow && (
                    <button onClick={() => { const next = !running; setClockRunning(next); if (next && !matchStartTime) setMatchStartTime(new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })); }} style={{ ...bigBtn, justifyContent: "center", background: running ? T.negative : T.accent, color: T.ink, fontSize: 24, fontWeight: 700, minHeight: 76, borderRadius: 16, gap: 12 }}>
                      {running ? <Pause size={30} /> : <Play size={30} />} {running ? "Pausar" : "Iniciar"}
                    </button>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {/* Solo 2 partes reglamentarias. La prórroga (2 partes fijas de 3 min,
                        solo para partidos de eliminatoria) se activa cuando se agota el
                        tiempo de la 2ª parte y no se ha pulsado Finalizar partido — en
                        liga, con empate, se finaliza directamente sin tocar este botón. */}
                    {half === 1 && (
                      <button onClick={startNextHalf} style={{ ...ghostBtn, minHeight: 40 }}><ChevronRight size={14} /> Empezar 2ª parte</button>
                    )}
                    {half >= 2 && half < MAX_HALVES && remaining <= 0 && (
                      <button onClick={startNextHalf} style={{ ...ghostBtn, minHeight: 40, borderColor: T.accent, color: T.accent }}><ChevronRight size={14} /> Empezar {halfLabel(half + 1)} (3 min)</button>
                    )}
                    {halfUndoValid && (
                      <button onClick={undoNextHalf} style={{ ...ghostBtn, minHeight: 40, borderColor: T.warning, color: T.warning, fontWeight: 700 }} title="Vuelve a la parte anterior, al minuto en que estaba al pulsar el botón">
                        <Undo2 size={14} /> Deshacer: volver a la {halfLabel(halfUndo.prevHalf)} ({fmtClock(Math.max(0, halfMinutesFor(halfUndo.prevHalf, halfLength) * 60 - halfUndo.prevSeconds))})
                      </button>
                    )}
                    {["for", "against"].map((team) => {
                      const n = timeouts.filter((t) => t.team === team && t.half === half).length;
                      const tLimit = teamConfig.rules.timeoutsPerHalf; // 0 = sin límite
                      const used = half <= 2 && tLimit > 0 && n >= tLimit;
                      return (
                        <button key={team} onClick={() => registerTimeout(team)} title={used ? "Ya usado en esta parte" : "Tiempo muerto: para el reloj y lo anota"} style={{ ...ghostBtn, minHeight: 40, ...(used ? { opacity: 0.5, textDecoration: "line-through" } : {}) }}>
                          <Clock3 size={13} /> T.M. {team === "for" ? "nuestro" : "rival"}{half > 2 && n > 0 ? ` · ${n}` : ""}{used ? " · usado" : ""}
                        </button>
                      );
                    })}
                    <ClockAdjust onAdjust={adjustClock} />
                    <button onClick={armRivalExpulsion} style={{ ...ghostBtn, minHeight: 40, borderColor: T.negative, color: T.negative }}><AlertTriangle size={13} /> Expulsión rival</button>
                  </div>
                </div>
              </div>
            </div>
            )}

          </div>

          {/* Barra del modo foco: salir a la app y ampliar vista. Sin
              navegación completa: en el banquillo solo se ve el partido. */}
          {view === "entrenamiento" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px 0", background: T.bg, flexWrap: "wrap" }}>
            <Button size="sm" variant="ghost" icon={ChevronLeft} onClick={() => setView("inicio")} title={view === "partido" ? "Volver a la app (el partido se sigue guardando)" : "Volver a la app (el entrenamiento se sigue guardando)"}>Salir</Button>
            <span className="display" style={{ fontSize: 16, fontWeight: 600, color: T.dim }}>{view === "partido" ? "Partido en directo" : "Entrenamiento"}</span>
            <div style={{ flex: 1 }} />
            <button onClick={toggleFullscreen} style={{ ...ghostBtn, marginBottom: 8 }} title={isFullscreen ? "Volver a la vista normal" : "Ampliar y aprovechar todo el espacio"}>
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />} {isFullscreen ? "Vista normal" : "Ampliar vista"}
            </button>
          </div>
          )}
        </>
      )}

      <ShellOrPlain
        enabled={!focusMode}
        section={section} onNavigate={navigate} team={activeTeam}
        onOpenTeams={() => setTeamManagerOpen(true)} matchInProgress={matchInProgress}
      >
        {view === "inicio" && (
          <Dashboard
            team={activeTeam}
            onPickCrest={(f) => handleTeamCrestFile(activeTeamId, f)}
            onReframeCrest={() => handleTeamCrestReframe(activeTeamId, activeTeam.crest)}
            onRemoveCrest={() => handleTeamCrestRemove(activeTeamId)}
            onOpenTeams={() => setTeamManagerOpen(true)}
            teamCount={teams.length}
            matches={savedMatches}
            trainings={savedTrainings}
            onNewMatch={startNewMatch}
            onNewTraining={() => { resetTraining(); setView("entrenamiento"); }}
            onGoMatches={() => navigate("partidos")}
            onGoTeam={() => navigate("equipo")}
            matchInProgress={matchInProgress}
            onResumeMatch={() => setView("partido")}
            updateReady={updateReady}
            onApplyUpdate={applyUpdate}
            lastBackupAt={lastBackupAt}
            onOpenBackup={() => setBackupOpen(true)}
            standalone={standalone}
            canInstall={!!installPrompt}
            onInstall={doInstall}
          />
        )}

        {view === "partido" && (
          <div className="fadein" style={{ paddingBottom: 90 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={16} color={T.accent} />
                <span className="display" style={{ fontSize: 15, fontWeight: 600 }}>En pista: {onCourtCount}/{maxOnCourt}</span>
                {convocados && <span style={{ fontSize: 11, color: T.dim }}>· Convocados: {convocados.length}</span>}
                {sentOffIds.size > 0 && <span style={{ fontSize: 11, color: T.negative }}>· {sentOffIds.size} expulsado{sentOffIds.size === 1 ? "" : "s"}</span>}
              </div>
              <button onClick={() => setConvocatoriaMode(convocados ? "editar" : "nuevo")} style={ghostBtn}><ClipboardList size={13} /> {convocados ? "Editar convocatoria" : "Hacer convocatoria"}</button>
            </div>

            {activeShortHanded.length > 0 && (
              <div style={{ background: alpha(T.negative, 0.18), border: `1.5px solid ${T.negative}`, borderRadius: 12, padding: "8px 14px", marginBottom: 14, fontSize: 12, color: T.text }}>
                <CardIcon size={12} color={T.negative} /> Jugando con {maxOnCourt} en pista — {activeShortHanded.length > 1 ? `${activeShortHanded.length} rojas sirviéndose` : "roja sirviéndose"} (2 min de juego o hasta gol del rival)
              </div>
            )}

            {activeRivalShortHanded.length > 0 && (
              <div style={{ background: alpha(T.info, 0.18), border: `1.5px solid ${T.info}`, borderRadius: 12, padding: "8px 14px", marginBottom: 14, fontSize: 12, color: T.text }}>
                <CardIcon size={12} color={T.info} /> Superioridad por expulsión del rival — {activeRivalShortHanded.length > 1 ? `${activeRivalShortHanded.length} sirviéndose` : "sirviéndose"} (2 min de juego o hasta que marquéis)
              </div>
            )}

            {pendingAction && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: alpha(T.accent, 0.09), border: `1.5px solid ${T.accent}`, borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Anotando: {pendingAction.label} — toca un jugador</span>
                <button onClick={cancelPendingAction} style={iconBtnSm} aria-label="Cerrar"><X size={14} /></button>
              </div>
            )}

            {goalWizard && goalWizard.type === "for" && !goalWizard.authorId && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: alpha(T.accent, 0.09), border: `1.5px solid ${T.accent}`, borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}><BallIcon size={14} /> ¿Quién marcó? — toca un jugador</span>
                <button onClick={registerRivalOwnGoal} style={{ ...ghostBtn, padding: "6px 10px", fontSize: 11, marginLeft: "auto", marginRight: 8, flexShrink: 0 }} title="Gol a favor que mete el propio rival en su puerta: no es de ningún jugador nuestro">Autogol del rival</button>
                <button onClick={cancelGoalWizard} style={iconBtnSm} aria-label="Cerrar"><X size={14} /></button>
              </div>
            )}

            {zonedActionWizard && !zonedActionWizard.playerId && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: alpha(T.accent, 0.09), border: `1.5px solid ${T.accent}`, borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{zonedActionWizard.label} — toca un jugador</span>
                <button onClick={cancelZonedWizard} style={iconBtnSm} aria-label="Cerrar"><X size={14} /></button>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fill, minmax(210px, 1fr))", gap: narrow ? 8 : 10 }}>
              {sortedPlayers.filter((p) => (!convocados || convocados.includes(p.id)) && !sentOffIds.has(p.id)).map((p) => {
                const isOn = onCourt.includes(p.id);
                // El acumulado de la parte SIGUE sumando por debajo cada
                // segundo (statsByHalf), porque de ahí salen el resumen, el
                // historial y las exportaciones — eso no cambia. Lo que
                // cambia es lo que se ENSEÑA: mientras el jugador está en
                // pista no interesa verlo subir solo; se muestra congelado en
                // lo que ya llevaba ANTES de esta tanda, y salta de golpe a
                // incluirla en cuanto sale (exactamente en la sustitución).
                const halfSecondsLive = (statsByHalf[half] && statsByHalf[half][p.id] && statsByHalf[half][p.id].seconds) || 0;
                const stint = stintsRef.current.get(p.id);
                const stintSeconds = isOn && stint && stint.half === half ? Math.max(0, stint.startRemaining - remaining) : 0;
                const accumulatedSeconds = isOn ? Math.max(0, halfSecondsLive - stintSeconds) : halfSecondsLive;
                const isKeeperCard = isOn && p.id === keeperOnCourtId;
                return (
                  <PlayerCard
                    key={p.id} player={p} stats={stats[p.id] || emptyStats()} onCourt={isOn}
                    accumulatedSeconds={accumulatedSeconds} stintSeconds={stintSeconds}
                    isKeeperCard={isKeeperCard} isActingKeeper={isKeeperCard && isActingKeeper} compact={narrow}
                    armed={!!pendingAction || !!(goalWizard && goalWizard.type === "for" && !goalWizard.authorId) || !!(zonedActionWizard && !zonedActionWizard.playerId)}
                    onTap={() => handlePlayerTap(p)}
                    onOpenStats={() => setStatPlayer(p.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {updateReady && view === "historial" && <UpdateBanner onApply={applyUpdate} />}

        {view === "plantilla" && (
          <TeamView
            team={activeTeam} teamCount={teams.length} onOpenTeams={() => setTeamManagerOpen(true)}
            onPickCrest={(f) => handleTeamCrestFile(activeTeamId, f)}
            onReframeCrest={() => handleTeamCrestReframe(activeTeamId, activeTeam.crest)}
            onRemoveCrest={() => handleTeamCrestRemove(activeTeamId)}
            onChangeColors={(colors) => handleTeamColors(activeTeamId, colors)}
            onChangeConfig={(config) => handleTeamConfig(activeTeamId, config)} matches={savedMatches}
            roster={{ players, onAdd: addPlayer, onRemove: askRemovePlayer, onSave: savePlayerEdit, onNewFile: handleNewFile, onReframe: handleReframe }}
            onImportRoster={importRoster} rosterLocked={matchInProgress}
            hasHistory={savedMatches.length > 0 || savedTrainings.length > 0}
            onExport={() => exportClubDataToExcel(savedMatches, savedTrainings, activeTeam.name)}
            onOpenBackup={() => setBackupOpen(true)}
            lastBackupAt={lastBackupAt}
            maintenance={{
              canInstall: !!installPrompt, onInstall: doInstall, standalone, updateReady, onApplyUpdate: applyUpdate,
              onCheckUpdate: checkForUpdateNow, matchInProgress,
              onForceUpdate: () => window.dispatchEvent(new CustomEvent(appEvent("force-update"))),
            }}
          />
        )}

        {view === "entrenamiento" && (
          <div className="fadein">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Dumbbell size={16} color={T.accent} />
                <span className="display" style={{ fontSize: 15, fontWeight: 600 }}>Activos: {trainingActive.length}/{players.length}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setAllTrainingActive(true)} style={ghostBtn}><CheckCheck size={13} /> Activar todos</button>
                <button onClick={() => setAllTrainingActive(false)} style={ghostBtn}>Parar todos</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 10 }}>
              {players.map((p) => {
                const isActive = trainingActive.includes(p.id);
                const secs = (trainingStats[p.id] && trainingStats[p.id].seconds) || 0;
                return <TrainingPlayerCard key={p.id} player={p} seconds={secs} active={isActive} onToggle={() => toggleTrainingActive(p.id)} />;
              })}
            </div>
          </div>
        )}

        {view === "historial" && (
          <HistoryView
            teams={teams} onUpdateMatch={updateSavedMatch} matches={savedMatches} trainings={savedTrainings} teamId={activeTeamId} teamName={activeTeam.name} teamCrest={activeTeam.crest} teamColors={activeTeam.colors}
            rosterPlayers={players}
            subTab={historySubTab} onSubTabChange={setHistorySubTab}
            onExport={() => exportClubDataToExcel(savedMatches, savedTrainings, activeTeam.name)}
            onDeleteMatch={setConfirmDeleteMatch}
            onCreateReport={setReportMetaFor}
            onEditGoal={(match, event) => setEditingSavedGoal({ match, event })}
            onNewTraining={() => { resetTraining(); setView("entrenamiento"); }}
          />
        )}
      </ShellOrPlain>

      {statP && (
        <StatDrawer
          player={statP} stats={stats[statP.id] || emptyStats()}
          canSave={statP.isGK || statP.id === keeperOnCourtId}
          onClose={() => setStatPlayer(null)} onBump={(key, d) => bump(statP.id, key, d)}
        />
      )}

      {cropTarget && <PhotoCropEditor src={cropTarget.src} onCancel={() => setCropTarget(null)} onSave={handleCropSave} />}

      {actionsPopoverOpen && (
        <ActionsPopover onPick={armStatAction} onClose={() => setActionsPopoverOpen(false)} keeperName={(players.find((p) => p.id === keeperOnCourtId) || {}).name} />
      )}

      {cardsPopoverOpen && (
        <CardsPopover onPick={armCardAction} onClose={() => setCardsPopoverOpen(false)} />
      )}

      {goalWizard && (goalWizard.type === "against" || goalWizard.authorId) && !goalWizard.phase && (
        <GoalPhasePopover
          goalWizard={goalWizard}
          onPick={choosePhase}
          onClose={cancelGoalWizard}
        />
      )}

      {goalWizard && goalWizard.type === "for" && goalWizard.phase && !goalWizard.assistChosen && (
        <AssistPopover
          goalWizard={goalWizard}
          players={players.filter((p) => onCourt.includes(p.id) && p.id !== goalWizard.authorId)}
          onPick={chooseAssist}
          onClose={cancelGoalWizard}
        />
      )}

      {goalWizard && goalWizard.type === "for" && goalWizard.assistChosen && (
        <PitchZonePicker wizard={{ label: "Gol", playerName: goalWizard.authorName }} onPick={finalizeGoalZone} onClose={cancelGoalWizard} />
      )}

      {zonedActionWizard && zonedActionWizard.playerId && (
        <PitchZonePicker wizard={zonedActionWizard} onPick={finalizeZonedAction} onClose={cancelZonedWizard} />
      )}

      {convocatoriaMode && (
        <ConvocatoriaModal
          players={players}
          initialSelected={convocados}
          mode={convocatoriaMode}
          onConfirm={(ids) => confirmConvocatoria(ids, convocatoriaMode)}
          onAddPlayer={addPlayerQuick}
          onClose={() => setConvocatoriaMode(null)}
        />
      )}

      {backupOpen && (
        <BackupModal
          onExported={markBackupDone}
          onClose={() => setBackupOpen(false)}
          showToast={showToast}
          clockBusy={running || trainingRunning}
          matchInProgress={matchInProgress}
          onBeforeExport={() => { commitTime(); commitTrainingTime(); return saveDraftNow(); }}
        />
      )}

      {pendingDrafts && (
        <DraftRecoveryModal
          drafts={pendingDrafts}
          teamName={activeTeam.name}
          onResumeMatch={resumeMatchDraft}
          onDiscardMatch={discardMatchDraft}
          onResumeTraining={resumeTrainingDraft}
          onDiscardTraining={discardTrainingDraft}
        />
      )}

      {subPickerFor && (
        <SubstitutionPicker
          incoming={subPickerFor}
          // El portero aparece en la lista igual que cualquier otro — se
          // puede cambiar tocando su propia tarjeta en pista (selector
          // dedicado) o, como aquí, eligiéndolo directamente al meter a
          // otro jugador. Va marcado aparte para que se note qué es.
          onCourtPlayers={players.filter((p) => onCourt.includes(p.id))}
          keeperOnCourtId={keeperOnCourtId}
          stats={stats}
          onPick={doSubstitution}
          onClose={() => setSubPickerFor(null)}
        />
      )}

      {goalkeeperSwapFor && (
        <GoalkeeperSwapModal
          outgoing={goalkeeperSwapFor}
          benchPlayers={players.filter((p) => !onCourt.includes(p.id) && !sentOffIds.has(p.id) && (!convocados || convocados.includes(p.id)))}
          stats={stats}
          onPick={doGoalkeeperSwap}
          onClose={() => setGoalkeeperSwapFor(null)}
        />
      )}

      {keeperRedPrompt && (
        <Overlay onClose={() => setKeeperRedPrompt(false)}>
          <div style={{ ...modalCard, maxWidth: 460 }} onClick={(e) => e.stopPropagation()} className="fadein">
            <div className="display" style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}><CardIcon size={14} color={T.negative} /> Portero expulsado</div>
            <div style={{ fontSize: 12, color: T.dim, lineHeight: 1.5, marginBottom: 12 }}>
              Es una expulsión normal: jugáis con uno menos 2 minutos de juego o hasta que os marquen, y el expulsado no puede volver a jugar este partido.
              Podéis meter al portero suplente (sale un jugador de pista) o poner de portero a uno de los que siguen en pista.
            </div>
            {(() => {
              const benchKeepers = players.filter((p) => (p.isGK || p.position === "POR") && !onCourt.includes(p.id) && !sentOffIds.has(p.id) && (!convocados || convocados.includes(p.id)));
              return (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Meter al portero suplente</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                    {benchKeepers.length === 0 && <div style={{ fontSize: 12, color: T.dim }}>No hay otro portero convocado en el banquillo.</div>}
                    {benchKeepers.map((p) => (
                      <button key={p.id} onClick={() => { setKeeperRedPrompt(false); setSubPickerFor(p); }} style={{ display: "flex", alignItems: "center", gap: 10, background: alpha(T.gk, 0.18), border: `1.5px solid ${T.gk}`, borderRadius: 10, padding: "9px 12px", cursor: "pointer", textAlign: "left" }}>
                        <Avatar player={p} size={30} />
                        <span style={{ fontSize: 14, fontWeight: 600, flex: 1, color: T.text }}>{p.name} entra de portero — elegir quién sale</span>
                        <span className="display" style={{ fontSize: 16, fontWeight: 700, color: T.accent }}>{p.number}</span>
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>O poner de portero a uno de pista</div>
                </>
              );
            })()}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {players.filter((p) => onCourt.includes(p.id)).map((p) => (
                <button key={p.id} onClick={() => { setChosenGoalkeeperId(p.id); setKeeperRedPrompt(false); showToast(`${p.name} se pone de portero-jugador`); saveDraftNow(); }} style={{ display: "flex", alignItems: "center", gap: 10, background: T.surface2, border: `1.5px solid ${T.line}`, borderRadius: 10, padding: "9px 12px", cursor: "pointer", textAlign: "left" }}>
                  <Avatar player={p} size={30} />
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1, color: T.text }}>{p.name}</span>
                  <span className="display" style={{ fontSize: 16, fontWeight: 700, color: T.accent }}>{p.number}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setKeeperRedPrompt(false)} style={{ ...ghostBtn, width: "100%", justifyContent: "center" }}>Más tarde</button>
          </div>
        </Overlay>
      )}

      {summaryOpen && (
        <SummaryModal
          players={sortedPlayers} stats={stats} statsByHalf={statsByHalf} goalEvents={goalEvents} disciplineEvents={disciplineEvents} zonedEvents={zonedEvents}
          rotations={rotations} openStints={[...stintsRef.current.entries()]} currentRemaining={remaining}
          onClose={() => setSummaryOpen(false)}
          onEditGoal={setEditingGoal}
        />
      )}

      {editingGoal && (
        <GoalEditModal
          event={editingGoal} players={sortedPlayers} onSave={saveGoalEdit} onClose={() => setEditingGoal(null)}
          presentHalves={matchHalvesPresent({ goalEvents, disciplineEvents, zonedEvents })} halfLength={halfLength} overtimeLength={overtimeLength}
        />
      )}

      {editingSavedGoal && (
        <GoalEditModal
          event={editingSavedGoal.event} players={players} onSave={saveSavedGoalEdit} onClose={() => setEditingSavedGoal(null)}
          presentHalves={matchHalvesPresent(editingSavedGoal.match)} halfLength={editingSavedGoal.match.halfLength} overtimeLength={editingSavedGoal.match.overtimeLength}
        />
      )}

      {teamManagerOpen && (
        <TeamManagerModal
          teams={teams} activeTeamId={activeTeamId}
          onSelect={switchTeam}
          onFieldChange={editTeamField}
          onFieldBlur={commitTeams}
          onPickCrest={handleTeamCrestFile}
          onReframeCrest={handleTeamCrestReframe}
          onRemoveCrest={handleTeamCrestRemove}
          onAdd={addTeamAction}
          onRemove={askRemoveTeam}
          onClose={() => setTeamManagerOpen(false)}
        />
      )}

      {confirmRemoveTeam && (
        <Overlay onClose={() => setConfirmRemoveTeam(null)} style={{ alignItems: "center", zIndex: 96 }}>
          <div style={{ ...modalCard, maxWidth: 340, borderRadius: 16 }} onClick={(e) => e.stopPropagation()}>
            <div className="display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>¿Borrar el equipo «{confirmRemoveTeam.name}»?</div>
            <div style={{ fontSize: 13, color: T.dim, marginBottom: 18 }}>
              Se borrarán su plantilla con las fotos, todos sus partidos y entrenos guardados y cualquier partido a medias.
              <strong style={{ color: T.negative }}> No se puede deshacer.</strong> Si dudas, crea antes una copia de seguridad.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmRemoveTeam(null)} style={{ ...ghostBtn, flex: 1, justifyContent: "center" }}>Cancelar</button>
              <button onClick={() => removeTeamAction(confirmRemoveTeam.id)} style={{ ...bigBtn, flex: 1, justifyContent: "center", background: T.negative, color: T.white }}><Trash2 size={15} /> Borrar</button>
            </div>
          </div>
        </Overlay>
      )}

      {confirmRemovePlayer && (
        <Overlay onClose={() => setConfirmRemovePlayer(null)} style={{ alignItems: "center", zIndex: 96 }}>
          <div style={{ ...modalCard, maxWidth: 340, borderRadius: 16 }} onClick={(e) => e.stopPropagation()}>
            <div className="display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>¿Quitar a {confirmRemovePlayer.name} de la plantilla?</div>
            <div style={{ fontSize: 13, color: T.dim, marginBottom: 18 }}>
              Los partidos ya guardados conservan sus datos.
              {matchInProgress && <> <strong style={{ color: T.warning }}>Si hay un partido en marcha, sus estadísticas de ese partido no se guardarán.</strong></>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmRemovePlayer(null)} style={{ ...ghostBtn, flex: 1, justifyContent: "center" }}>Cancelar</button>
              <button onClick={() => removePlayer(confirmRemovePlayer.id)} style={{ ...bigBtn, flex: 1, justifyContent: "center", background: T.negative, color: T.white }}><Trash2 size={15} /> Quitar</button>
            </div>
          </div>
        </Overlay>
      )}

      {view === "partido" && (
        <QuickActionBar
          hasLastEvent={undoStack.length > 0}
          lastRecord={describeLastRecord(undoStack[undoStack.length - 1], { players, goalEvents, disciplineEvents, timeouts })}
          onGoal={armGoal}
          onOpenActions={() => setActionsPopoverOpen(true)}
          onOpenCards={() => setCardsPopoverOpen(true)}
          onOpenSummary={() => setSummaryOpen(true)}
          onUndo={undoLast}
          onFinish={() => setConfirmEnd(true)}
          compact={narrow}
        />
      )}

      {view === "entrenamiento" && (
        <button onClick={() => setConfirmEndTraining(true)} style={{ position: "fixed", bottom: `calc(20px + env(safe-area-inset-bottom, 0px))`, right: 20, zIndex: 80, ...bigBtn, background: T.white, color: T.bg, boxShadow: `0 8px 24px ${alpha(T.ink, 0.5)}`, padding: "13px 20px" }}>
          <Save size={17} /> Finalizar entrenamiento
        </button>
      )}

      {confirmEnd && (
        <Overlay onClose={() => setConfirmEnd(false)}>
          <div style={{ ...modalCard, maxWidth: endChecks.length ? 460 : 340, maxHeight: "86vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>¿Finalizar partido?</div>
            <div style={{ fontSize: 13, color: T.dim, marginBottom: endChecks.length ? 12 : 18 }}>Se guardará el resultado y las estadísticas de cada jugador en el historial de {activeTeam.name}. El marcador y los minutos se reiniciarán.</div>
            {endChecks.length > 0 && (
              <div role="status" style={{ border: `1px solid ${T.line}`, borderRadius: 12, padding: "10px 12px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Antes de guardar, revisa:</div>
                {endChecks.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, lineHeight: 1.45, color: T.text }}>
                    <AlertTriangle size={14} aria-hidden="true" color={c.level === "warn" ? T.warning : T.dim} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span><span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{c.level === "warn" ? "Aviso: " : "Nota: "}</span>{c.text}</span>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: T.dim }}>Puedes guardar igual: los goles se pueden corregir después desde Partidos.</div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmEnd(false)} style={{ ...ghostBtn, flex: 1, justifyContent: "center" }}>Cancelar</button>
              <button onClick={finishMatch} style={{ ...bigBtn, flex: 1, justifyContent: "center", background: T.accent, color: T.ink }}>Guardar y finalizar</button>
            </div>
          </div>
        </Overlay>
      )}

      {confirmDeleteMatch && (
        <Overlay onClose={() => setConfirmDeleteMatch(null)}>
          <div style={{ ...modalCard, maxWidth: 340 }} onClick={(e) => e.stopPropagation()}>
            <div className="display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>¿Borrar este partido?</div>
            <div style={{ fontSize: 13, color: T.dim, marginBottom: 18 }}>
              {confirmDeleteMatch.rivalName || "Rival"} · {new Date(confirmDeleteMatch.date).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}.
              Se borrará del historial de {activeTeam.name}, junto con sus estadísticas y goles. <strong style={{ color: T.negative }}>No se puede deshacer.</strong>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDeleteMatch(null)} style={{ ...ghostBtn, flex: 1, justifyContent: "center" }}>Cancelar</button>
              <button onClick={() => deleteMatch(confirmDeleteMatch.date)} style={{ ...bigBtn, flex: 1, justifyContent: "center", background: T.negative, color: T.white }}><Trash2 size={15} /> Borrar</button>
            </div>
          </div>
        </Overlay>
      )}

      {reportMetaFor && (
        <ReportMetaModal match={reportMetaFor} onClose={() => setReportMetaFor(null)} onGenerate={generateReport} />
      )}

      {viewingReport && (
        <MatchReportView html={viewingReport.html} title={viewingReport.title} fileName={viewingReport.fileName} matchData={viewingReport.matchData} teamName={viewingReport.teamName} onExportError={() => showToast("No se pudo exportar el PDF — prueba con Imprimir")} onClose={() => setViewingReport(null)} />
      )}

      {confirmEndTraining && (
        <Overlay onClose={() => setConfirmEndTraining(false)}>
          <div style={{ ...modalCard, maxWidth: 340 }} onClick={(e) => e.stopPropagation()}>
            <div className="display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>¿Finalizar entrenamiento?</div>
            <div style={{ fontSize: 13, color: T.dim, marginBottom: 18 }}>Se guardará el tiempo de actividad de cada jugador en el historial de {activeTeam.name}. La sesión se reiniciará.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmEndTraining(false)} style={{ ...ghostBtn, flex: 1, justifyContent: "center" }}>Cancelar</button>
              <button onClick={finishTraining} style={{ ...bigBtn, flex: 1, justifyContent: "center", background: T.accent, color: T.ink }}>Guardar y finalizar</button>
            </div>
          </div>
        </Overlay>
      )}

      {toast && (
        // Arriba, no abajo: pegado al suelo se montaba encima de la barra de
        // Gol/Resumen/Acciones/Deshacer, justo lo que hay que volver a tocar
        // nada más marcar algo -- muy incómodo en mitad de un partido.
        <div style={{ position: "fixed", top: `calc(14px + env(safe-area-inset-top, 0px))`, left: "50%", transform: "translateX(-50%)", background: T.surface3, border: `1px solid ${T.line}`, color: T.text, padding: "10px 16px", borderRadius: 10, fontSize: 13, boxShadow: `0 8px 24px ${alpha(T.ink, 0.4)}`, zIndex: 100, maxWidth: "90vw", textAlign: "center" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* Fuera del modo foco, el contenido va dentro del armazón de navegación; en el
   partido en directo y el entrenamiento, a pantalla limpia. */
function ShellOrPlain({ enabled, children, ...shell }) {
  if (!enabled) return <div style={{ padding: 16 }}>{children}</div>;
  return <AppShell {...shell}>{children}</AppShell>;
}
