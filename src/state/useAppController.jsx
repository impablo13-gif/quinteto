/* Estado y lógica de la app (equipos, plantilla, partido en directo,
 * entrenamiento, historial, copias y actualizaciones), sacados de App.jsx
 * moviendo el código tal cual y en el mismo orden (fase 6). App.jsx queda
 * solo con lo que se pinta. Partirlo por dominios (partido, entrenamiento,
 * equipos) es el siguiente paso de mantenimiento. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { requestPersistence, storage } from "../storage.js";
import { appEvent } from "../brand/brand.js";
import { DRAFT_VERSION, STAT_KEYS, accumulatedFouls, defaultRoster, emptyStats, fmtClock, halfLabel, halfMinutesFor, halvesPresent, matchDraftKey, newTeam, pickStartingFive, sumHalves, trainingDraftKey } from "../domain/match.js";
import { DISCIPLINE_KEYS, PITCH_ZONE_LABEL, ZONED_KEYS } from "../domain/catalog.js";
import { OT_HALF_MIN } from "../domain/match.js";
import { applyConfig, normalizeConfig, isDefaultConfig } from "../domain/config.js";
import { matchChecks } from "../domain/checks.js";
import { dateLabelOf, fileToDataUrl, isStandaloneApp, sanitizeFileName } from "../lib/files.js";
import { exportSingleMatchToExcel } from "../reports/excel.js";
import { buildMatchReportHtml, matchReportTitle } from "../reports/matchReport.js";
import { useIsNarrow } from "../ui/common.jsx";

export function useAppController() {
  const [view, setView] = useState("inicio");
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [teamManagerOpen, setTeamManagerOpen] = useState(false);

  const [players, setPlayers] = useState([]);
  const [onCourt, setOnCourt] = useState([]);
  // Cada accion y cada segundo se anotan en la parte en la que ocurren:
  // { 1: { jugadorId: stats }, 2: { ... } }. El total del partido se calcula
  // sumando las partes, mas abajo.
  const [statsByHalf, setStatsByHalf] = useState({});
  // Foto del partido justo antes de pulsar "Empezar 2ª parte" (o prórroga), para
  // poder deshacerlo si se pulsó sin querer. Solo en memoria.
  const [halfUndo, setHalfUndo] = useState(null);
  // Tiempos muertos pedidos: { id, team: "for" | "against", half, remaining }.
  const [timeouts, setTimeouts] = useState([]);
  const [undoStack, setUndoStack] = useState([]); // registros que "Deshacer" puede quitar, del más antiguo al más reciente
  // Cada entrada y salida de la pista de cada jugador, ya cerrada: quién,
  // en qué parte, desde qué marca del reloj hasta cuál. Lo abierto ahora
  // mismo vive aparte, en `stintsRef` (ver más abajo).
  const [rotations, setRotations] = useState([]);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [half, setHalf] = useState(1);
  const [halfLength, setHalfLength] = useState(20);
  // Duración de cada parte de la prórroga en este partido (config del equipo).
  const [overtimeLength, setOvertimeLength] = useState(OT_HALF_MIN);
  const [rivalName, setRivalName] = useState("Rival");
  const [venue, setVenue] = useState("");
  const [competition, setCompetition] = useState(""); // liga, copa… (para filtrar después)
  const [matchStartTime, setMatchStartTime] = useState(null);
  const [rivalScore, setRivalScore] = useState(0);
  const [rivalCrest, setRivalCrest] = useState(null);
  // Faltas acumuladas de cada equipo, por parte (se resetean solas al
  // cambiar de parte porque se leen siempre con la parte actual como clave).
  // Las propias suman solas con cada "Falta cometida"; las del rival, con
  // cada "Falta recibida" (recibirla es que la cometió el rival). Las dos
  // también se pueden ajustar a mano.
  const [teamFouls, setTeamFouls] = useState({});
  const [rivalTeamFouls, setRivalTeamFouls] = useState({});
  const [statPlayer, setStatPlayer] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);
  const [savedMatches, setSavedMatches] = useState([]);
  const [toast, setToast] = useState(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmDeleteMatch, setConfirmDeleteMatch] = useState(null); // partido guardado a punto de borrarse
  const [reportMetaFor, setReportMetaFor] = useState(null); // partido guardado para el que se están pidiendo los datos del informe
  const [viewingReport, setViewingReport] = useState(null); // { html, title } del informe que se está mostrando
  const [editingGoal, setEditingGoal] = useState(null); // gol del partido en curso que se está corrigiendo
  const [editingSavedGoal, setEditingSavedGoal] = useState(null); // { match, event } de un partido ya guardado, en el Historial
  const [pendingAction, setPendingAction] = useState(null); // { key, label } | null
  const [actionsPopoverOpen, setActionsPopoverOpen] = useState(false);
  const [cardsPopoverOpen, setCardsPopoverOpen] = useState(false);
  const [subPickerFor, setSubPickerFor] = useState(null); // bench player object awaiting a substitution choice
  const [goalkeeperSwapFor, setGoalkeeperSwapFor] = useState(null); // portero en pista esperando a quien lo releva
  const [keeperRedPrompt, setKeeperRedPrompt] = useState(false); // el portero en pista acaba de ser expulsado: hay que elegir quién para
  // A quién se ha elegido a propósito para el puesto de portero, con el
  // selector dedicado — manda sobre la detección automática (que solo mira
  // quién de plantilla es portero), porque si hay más de un portero en la
  // plantilla la automática podría no ser la persona que se acaba de elegir.
  // Null hasta el primer cambio de portero; se limpia solo si ese jugador
  // deja la pista.
  const [chosenGoalkeeperId, setChosenGoalkeeperId] = useState(null);
  const [goalWizard, setGoalWizard] = useState(null); // { type, authorId, authorName, phase, assistId, assistName, assistChosen, zone } — mid-flow goal registration
  // Cada roja (directa o por doble amarilla) añade una entrada aquí: 2
  // minutos de juego con uno menos, o hasta que el rival marque — lo que
  // pase antes. Simplificado a la parte en la que se pitó: si cambia la
  // parte antes de cumplirse, se da por resuelta (un caso raro de por sí).
  const [shortHandedRestrictions, setShortHandedRestrictions] = useState([]);
  // Lo mismo que arriba pero para expulsiones del RIVAL: nos deja jugar con
  // superioridad 2 minutos de juego o hasta que marquemos, lo que pase antes.
  const [rivalShortHandedRestrictions, setRivalShortHandedRestrictions] = useState([]);
  const [convocados, setConvocados] = useState(null); // null = not set yet (show everyone); array of player ids once chosen
  const [convocatoriaMode, setConvocatoriaMode] = useState(null); // 'nuevo' | 'editar' | null
  const [goalEvents, setGoalEvents] = useState([]); // additive historical log: every goal with author/phase/on-court snapshot
  const [lastGoalEvent, setLastGoalEvent] = useState(null); // { id, type, authorId } of the most recent goal, for "Deshacer"
  // Cada falta (cometida o recibida) y cada tarjeta, con el minuto exacto en
  // que se marcó — igual que los goles, para poder repasar después a qué
  // minuto pasó cada cosa.
  const [disciplineEvents, setDisciplineEvents] = useState([]);
  // Asistente de tres pasos para pérdidas, recuperaciones y tiros: acción →
  // jugador → zona del campo. { key, label, playerId, playerName } | null.
  const [zonedActionWizard, setZonedActionWizard] = useState(null);
  const [zonedEvents, setZonedEvents] = useState([]); // cada una con jugador, zona y minuto
  const [isFullscreen, setIsFullscreen] = useState(false);
  const narrow = useIsNarrow();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [cropTarget, setCropTarget] = useState(null); // { kind: 'player'|'teamCrest'|'rivalCrest', id, src }
  const [pendingDrafts, setPendingDrafts] = useState(null); // { match?, training? } sesiones sin cerrar encontradas al abrir
  const [backupOpen, setBackupOpen] = useState(false);
  // Cuándo se hizo la última copia de seguridad (para el aviso de Inicio). No
  // viaja dentro de la propia copia: es una marca de ESTE dispositivo.
  const [lastBackupAt, setLastBackupAt] = useState(null);
  useEffect(() => {
    let alive = true;
    storage.get("lastBackupAt").then((r) => { if (alive && r && typeof r.value === "string") setLastBackupAt(r.value); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const markBackupDone = () => {
    const iso = new Date().toISOString();
    setLastBackupAt(iso);
    storage.set("lastBackupAt", iso).catch(() => {});
  };
  const [confirmRemovePlayer, setConfirmRemovePlayer] = useState(null); // jugador a punto de quitarse de la plantilla
  const [confirmRemoveTeam, setConfirmRemoveTeam] = useState(null); // equipo a punto de borrarse con todos sus datos
  const [installPrompt, setInstallPrompt] = useState(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [standalone] = useState(isStandaloneApp);

  const [trainingRunning, setTrainingRunning] = useState(false);
  const [trainingSeconds, setTrainingSeconds] = useState(0);
  const [trainingActive, setTrainingActive] = useState([]);
  const [trainingStats, setTrainingStats] = useState({});
  const [savedTrainings, setSavedTrainings] = useState([]);
  const [confirmEndTraining, setConfirmEndTraining] = useState(false);
  const [historySubTab, setHistorySubTab] = useState("partidos");

  const toastTimer = useRef(null);

  // Totales del partido = suma de las partes. Una sola fuente de verdad, para
  // que el desglose y el total no puedan discrepar.
  const stats = useMemo(() => sumHalves(statsByHalf, players), [statsByHalf, players]);

  const activeTeam = teams.find((t) => t.id === activeTeamId) || { id: null, name: "Mi equipo", subtitle: "", crest: null };
  // Config del equipo activo (reglas, posiciones, fases). Se aplica durante el
  // render, antes de pintar nada, para que todas las pantallas lean lo mismo.
  const teamConfig = useMemo(() => applyConfig(activeTeam.config), [activeTeam.config]);
  const teamRules = teamConfig.rules;

  // Quién ocupa el puesto de portero en pista ahora mismo. Si ya se ha
  // elegido a propósito con el selector dedicado, es ese — manda sobre la
  // detección automática, para que un segundo portero de plantilla que siga
  // en pista por lo que sea no le "robe" el puesto a quien se acaba de
  // elegir. Solo cuando todavía no se ha tocado nada (arranque del partido)
  // se recurre a detectar automáticamente qué portero de plantilla hay en
  // pista. De aquí sale el "anclado" (no se puede sacar con un toque normal)
  // y a quién se apunta la parada automáticamente.
  const chosenKeeperOnCourt = chosenGoalkeeperId && onCourt.includes(chosenGoalkeeperId) ? chosenGoalkeeperId : null;
  const rosterGoalkeeperOnCourtId = onCourt.find((id) => { const p = players.find((pp) => pp.id === id); return p && p.isGK; }) || null;
  const keeperOnCourtId = chosenKeeperOnCourt || rosterGoalkeeperOnCourtId;
  // La etiqueta "portero-jugador" solo aparece cuando quien ocupa el puesto
  // no es portero de plantilla — da igual si llegó ahí por elección explícita
  // o (caso raro) porque es el único portero que queda en pista.
  const isActingKeeper = !!keeperOnCourtId && !(players.find((p) => p.id === keeperOnCourtId) || {}).isGK;

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  /* ---------------------------------------------------------------- */
  /* RELOJ                                                             */
  /*                                                                   */
  /* El tiempo no se cuenta sumando "un segundo por cada tic": los     */
  /* navegadores de tablet frenan o congelan los temporizadores cuando */
  /* la pantalla se apaga o se cambia de app, y así los minutos        */
  /* jugados salían cortos. Aquí cada actualización mira el reloj real */
  /* del sistema y reparte los segundos que hayan pasado de verdad,    */
  /* aunque hayan sido 40 de golpe al volver a la app.                 */
  /*                                                                   */
  /* Además, al vivir el contador en refs y no en las dependencias del */
  /* efecto, cambiar el quinteto ya no reinicia el intervalo — que era */
  /* lo que hacía perder hasta un segundo en cada sustitución.         */
  /* ---------------------------------------------------------------- */
  const runningRef = useRef(false);
  const onCourtRef = useRef([]);
  const secondsRef = useRef(0);
  const halfLenRef = useRef(20);
  const otLenRef = useRef(OT_HALF_MIN);
  const halfRef = useRef(1); // parte en curso: a ella se imputan segundos y acciones
  const anchorRef = useRef(null); // instante real del último reparto de tiempo

  const trainingRunningRef = useRef(false);
  const trainingActiveRef = useRef([]);
  const trainingAnchorRef = useRef(null);

  useEffect(() => { onCourtRef.current = onCourt; }, [onCourt]);
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  useEffect(() => { halfLenRef.current = halfLength; }, [halfLength]);
  useEffect(() => { otLenRef.current = overtimeLength; }, [overtimeLength]);
  useEffect(() => { halfRef.current = half; }, [half]);
  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { trainingActiveRef.current = trainingActive; }, [trainingActive]);
  useEffect(() => { trainingRunningRef.current = trainingRunning; }, [trainingRunning]);

  /* ---------------------------------------------------------------- */
  /* ROTACIONES                                                         */
  /*                                                                    */
  /* Cada vez que un jugador entra o sale de la pista se abre o cierra  */
  /* una "rotación": desde qué marca del reloj hasta cuál estuvo en     */
  /* pista de un tirón. Se guarda en tiempo restante (el mismo que se   */
  /* ve en el reloj grande), igual que ya se hace con los goles, para   */
  /* que quede fijado tal y como se vio en su momento.                  */
  /* ---------------------------------------------------------------- */
  const stintsRef = useRef(new Map()); // en pista ahora mismo: id -> { half, startRemaining }
  const rotationsRef = useRef([]); // espejo síncrono de `rotations`, para leerlo sin esperar al re-render

  const halfSecondsNow = () => halfMinutesFor(halfRef.current, halfLenRef.current, otLenRef.current) * 60;
  const currentRemaining = () => Math.max(0, halfSecondsNow() - secondsRef.current);

  const openStint = (playerId, halfNum) => {
    stintsRef.current.set(playerId, { half: halfNum, startRemaining: currentRemaining() });
  };

  // Idempotente a propósito: si ya no hay una rotación abierta para este
  // jugador, no hace nada — así un reintento (p. ej. al reintentar guardar el
  // partido tras un fallo) nunca duplica ni corrompe el historial.
  const closeStint = (playerId) => {
    const st = stintsRef.current.get(playerId);
    if (!st) return;
    stintsRef.current.delete(playerId);
    const endRemaining = currentRemaining();
    const durationSeconds = Math.max(0, st.startRemaining - endRemaining);
    if (durationSeconds <= 0) return; // toque accidental en el mismo segundo: no deja rastro
    const player = players.find((p) => p.id === playerId);
    const next = [...rotationsRef.current, {
      id: `rot-${playerId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      playerId, playerName: player ? player.name : "?", playerNumber: player ? player.number : "?",
      half: st.half, startRemaining: st.startRemaining, endRemaining, durationSeconds,
    }];
    rotationsRef.current = next;
    setRotations(next);
  };

  // Punto de partida limpio: partido nuevo o cambio de media parte. Sustituye
  // el mapa de rotaciones abiertas por una nueva, una por cada jugador que
  // empieza en pista.
  const openStintsForCourt = (ids, halfNum) => {
    stintsRef.current = new Map();
    (ids || []).forEach((id) => openStint(id, halfNum));
  };

  // Reparte el tiempo transcurrido desde el último reparto entre el reloj del
  // partido y los jugadores que estaban en pista durante ese intervalo.
  const commitTime = useCallback(() => {
    const now = Date.now();
    if (!runningRef.current || anchorRef.current == null) { anchorRef.current = now; return; }
    const whole = Math.floor((now - anchorRef.current) / 1000);
    if (whole <= 0) return;
    anchorRef.current += whole * 1000; // conserva la fracción de segundo sobrante

    const total = Math.max(1, halfMinutesFor(halfRef.current, halfLenRef.current, otLenRef.current) * 60);
    const allowed = Math.max(0, Math.min(whole, total - secondsRef.current));

    if (allowed > 0) {
      secondsRef.current += allowed;
      setSeconds(secondsRef.current);
      const ids = onCourtRef.current;
      if (ids.length) {
        const h = halfRef.current;
        setStatsByHalf((prev) => {
          const halfMap = { ...(prev[h] || {}) };
          ids.forEach((id) => {
            const cur = halfMap[id] || emptyStats();
            halfMap[id] = { ...cur, seconds: cur.seconds + allowed };
          });
          return { ...prev, [h]: halfMap };
        });
      }
    }

    if (secondsRef.current >= total) {
      runningRef.current = false;
      anchorRef.current = null;
      setRunning(false);
      showToast("Fin de la parte");
    }
  }, [showToast]);

  // Único punto donde arranca o para el reloj: siempre liquida antes lo que
  // llevaba corrido, para que ni un segundo se quede sin asignar.
  const setClockRunning = useCallback((next) => {
    commitTime();
    runningRef.current = next;
    anchorRef.current = next ? Date.now() : null;
    setRunning(next);
  }, [commitTime]);

  const commitTrainingTime = useCallback(() => {
    const now = Date.now();
    if (!trainingRunningRef.current || trainingAnchorRef.current == null) { trainingAnchorRef.current = now; return; }
    const whole = Math.floor((now - trainingAnchorRef.current) / 1000);
    if (whole <= 0) return;
    trainingAnchorRef.current += whole * 1000;
    setTrainingSeconds((s) => s + whole);
    const ids = trainingActiveRef.current;
    if (ids.length) {
      setTrainingStats((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          const cur = next[id] || { seconds: 0 };
          next[id] = { seconds: cur.seconds + whole };
        });
        return next;
      });
    }
  }, []);

  const setTrainingClockRunning = useCallback((next) => {
    commitTrainingTime();
    trainingRunningRef.current = next;
    trainingAnchorRef.current = next ? Date.now() : null;
    setTrainingRunning(next);
  }, [commitTrainingTime]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(commitTime, 500);
    return () => clearInterval(id);
  }, [running, commitTime]);

  useEffect(() => {
    if (!trainingRunning) return;
    const id = setInterval(commitTrainingTime, 500);
    return () => clearInterval(id);
  }, [trainingRunning, commitTrainingTime]);

  /* ---------------------------------------------------------------- */
  /* GUARDADO DEL PARTIDO EN CURSO                                     */
  /*                                                                   */
  /* Antes, si se recargaba la página o el navegador cerraba la pestaña*/
  /* para liberar memoria, se perdía el partido entero. Ahora hay una  */
  /* copia continua en el dispositivo: cada 5 s, y de inmediato cada   */
  /* vez que la app pasa a segundo plano o se cierra.                  */
  /* ---------------------------------------------------------------- */
  const matchInProgress =
    convocados !== null || seconds > 0 || rivalScore > 0 || goalEvents.length > 0;
  const trainingInProgress = trainingSeconds > 0;
  // Mientras el partido no ha empezado, la duración sigue la del equipo
  // (si se cambia en Equipo o se cambia de equipo). Empezado, ya no se toca.
  useEffect(() => {
    if (runningRef.current || secondsRef.current > 0 || halfRef.current > 1) return;
    setHalfLength(teamRules.halfMinutes); halfLenRef.current = teamRules.halfMinutes;
    setOvertimeLength(teamRules.overtimeHalfMinutes); otLenRef.current = teamRules.overtimeHalfMinutes;
  }, [activeTeamId, teamRules.halfMinutes, teamRules.overtimeHalfMinutes]);

  const draftRef = useRef({ match: null, training: null, teamId: null });
  draftRef.current = {
    teamId: activeTeamId,
    match: matchInProgress
      ? {
          v: DRAFT_VERSION, savedAt: new Date().toISOString(),
          seconds, half, halfLength, overtimeLength, rivalName, rivalScore, rivalCrest, venue, competition, matchStartTime,
          teamFouls, rivalTeamFouls, onCourt, convocados, goalEvents, disciplineEvents, zonedEvents, statsByHalf,
          rotations, openStints: [...stintsRef.current.entries()], chosenGoalkeeperId, shortHandedRestrictions,
          rivalShortHandedRestrictions, timeouts,
        }
      : null,
    training: trainingInProgress
      ? { v: DRAFT_VERSION, savedAt: new Date().toISOString(), trainingSeconds, trainingActive, trainingStats }
      : null,
  };

  // Se congela mientras se cambia de equipo o se cierra un partido: en esos
  // instantes el estado en pantalla y el equipo activo pueden no corresponderse,
  // y un guardado automatico ahi dejaria un borrador falso.
  const autosaveSuspended = useRef(false);

  const saveDraftNow = useCallback(async () => {
    if (autosaveSuspended.current) return;
    const { teamId, match, training } = draftRef.current;
    if (!teamId) return;
    try {
      if (match) await storage.set(matchDraftKey(teamId), JSON.stringify(match));
      if (training) await storage.set(trainingDraftKey(teamId), JSON.stringify(training));
    } catch (e) { /* sin espacio o almacenamiento bloqueado: se reintenta en 5 s */ }
  }, []);

  const clearMatchDraft = useCallback(async (teamId) => {
    try { await storage.del(matchDraftKey(teamId)); } catch (e) {}
  }, []);
  const clearTrainingDraft = useCallback(async (teamId) => {
    try { await storage.del(trainingDraftKey(teamId)); } catch (e) {}
  }, []);

  useEffect(() => {
    if (loading) return;
    const id = setInterval(() => { saveDraftNow(); }, 5000);
    return () => clearInterval(id);
  }, [loading, saveDraftNow]);

  // Al minimizar, bloquear la tablet o cerrar la app: cerrar el reloj y guardar
  // al instante. `pagehide` es el único evento fiable para esto en iOS.
  useEffect(() => {
    const onHide = () => {
      commitTime();
      commitTrainingTime();
      saveDraftNow();
    };
    const onVisibility = () => {
      commitTime();
      commitTrainingTime();
      if (document.visibilityState === "hidden") saveDraftNow();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
    };
  }, [commitTime, commitTrainingTime, saveDraftNow]);

  /* ---- instalación y actualizaciones de la PWA ---- */
  const updateReadyRef = useRef(false);
  useEffect(() => { updateReadyRef.current = updateReady; }, [updateReady]);
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    const onUpdate = () => setUpdateReady(true);
    const onInstalled = () => { setInstallPrompt(null); showToast("App instalada — ya funciona sin conexión"); };
    if (window.__appUpdateReady) setUpdateReady(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener(appEvent("update-ready"), onUpdate);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener(appEvent("update-ready"), onUpdate);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [showToast]);

  const doInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    try { await installPrompt.userChoice; } catch (e) {}
    setInstallPrompt(null);
  };

  // Solo se aplica desde Inicio y con el reloj parado: nunca en mitad de un partido.
  const applyUpdate = () => {
    if (running || trainingRunning) { showToast("Para el reloj antes de actualizar"); return; }
    saveDraftNow().finally(() => window.dispatchEvent(new CustomEvent(appEvent("apply-update"))));
  };

  // La comprobación automática solo salta al volver a primer plano o cada
  // hora (ver main.jsx) -- una app instalada que se queda abierta puede
  // tardar en enterarse. Este botón fuerza la comprobación ahora mismo, sin
  // esperar a nada.
  const checkForUpdateNow = () => {
    window.dispatchEvent(new CustomEvent(appEvent("check-update")));
    showToast("Buscando actualización…");
    setTimeout(() => {
      if (!updateReadyRef.current) showToast(`Ya tienes la última versión (${__APP_VERSION__})`);
    }, 3000);
  };

  // Keep our fullscreen state in sync if the person exits via Esc / browser chrome.
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const iosTipShown = useRef(false);
  const toggleFullscreen = async () => {
    // Instalada en la pantalla de inicio, la app ya se abre sin barra del
    // navegador. Este botón solo aporta algo mientras se use desde el navegador:
    // estira el diseño a toda la pantalla disponible.
    const turningOn = !isFullscreen;
    setIsFullscreen(turningOn);
    if (turningOn && !standalone && !iosTipShown.current && /iPad|iPhone/.test(navigator.userAgent || "")) {
      iosTipShown.current = true;
      showToast("Para quitar también la barra de Safari: Compartir → Añadir a pantalla de inicio");
    }
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else if (document.exitFullscreen) await document.exitFullscreen();
    } catch (e) { /* no disponible en este navegador — el diseño ampliado sigue aplicándose */ }
  };

  const persistTeams = useCallback(async (list) => {
    try { await storage.set("teams", JSON.stringify(list)); } catch (e) {}
  }, []);

  const loadRosterFor = useCallback(async (teamId) => {
    let list = null;
    try {
      const r = await storage.get(`roster:${teamId}`);
      if (r && r.value) { const parsed = JSON.parse(r.value); if (Array.isArray(parsed) && parsed.length) list = parsed; }
    } catch (e) {}
    if (!list) list = defaultRoster();
    setPlayers(list);
    const startingFive = pickStartingFive(list.map((p) => p.id), list);
    setOnCourt(startingFive);
    onCourtRef.current = startingFive;
    setStatsByHalf({});
    // Escrito directo sobre los refs (no vía openStintsForCourt) porque esta
    // función va envuelta en useCallback con dependencias fijas: los refs son
    // estables pase lo que pase, una función capturada en un cierre viejo no.
    const fullRemaining = Math.max(0, halfLenRef.current * 60 - secondsRef.current);
    stintsRef.current = new Map(startingFive.map((id) => [id, { half: 1, startRemaining: fullRemaining }]));
    rotationsRef.current = [];
    setRotations([]);
    setChosenGoalkeeperId(null);
    setTrainingActive(list.map((p) => p.id));
    const ts = {}; list.forEach((p) => (ts[p.id] = { seconds: 0 }));
    setTrainingStats(ts);
    return list;
  }, []);

  const loadHistoryFor = useCallback(async (teamId) => {
    try {
      const list = await storage.list(`matches:${teamId}:`);
      if (!list || !list.keys) return setSavedMatches([]);
      const items = [];
      for (const key of list.keys) {
        try { const r = await storage.get(key); if (r && r.value) items.push(JSON.parse(r.value)); } catch (e) {}
      }
      items.sort((a, b) => new Date(b.date) - new Date(a.date));
      setSavedMatches(items);
    } catch (e) { setSavedMatches([]); }
  }, []);

  const deleteMatch = async (date) => {
    try { await storage.del(`matches:${activeTeamId}:${date}`); } catch (e) {}
    setConfirmDeleteMatch(null);
    showToast("Partido borrado");
    loadHistoryFor(activeTeamId);
  };

  // Guarda los datos de cabecera del informe (ciudad, pabellón, competición,
  // horas, observaciones, rival) en el propio partido guardado -- así, si se
  // vuelve a generar más adelante, no hay que volver a rellenarlos -- y
  // entonces lo muestra a pantalla completa dentro de la propia app. También
  // guarda el HTML completo ya generado (reportHtml/reportGeneratedAt) en el
  // partido: viaja tal cual dentro del export de "Copia de seguridad" ya
  // existente (buildBackup copia cada clave entera, sin filtrar campos), así
  // que otra herramienta que lea las copias puede recogerlo sin que aquí haga
  // falta ningún export/endpoint nuevo.
  const generateReport = (patch, opts = {}) => {
    const updated = { ...reportMetaFor, ...patch };
    const summary = !!opts.summary;
    const html = buildMatchReportHtml(updated, activeTeam.name, players, activeTeam.crest, activeTeam.colors, { summary });
    const fileName = `${sanitizeFileName(activeTeam.name) || "equipo"}_${dateLabelOf(updated.date)}_vs_${sanitizeFileName(updated.rivalName) || "rival"}_${summary ? "resumen" : "informe"}.pdf`;
    const reportGeneratedAt = new Date().toISOString();
    setViewingReport({ html, title: `${summary ? "Resumen · " : ""}${matchReportTitle(updated, activeTeam.name)}`, fileName, matchData: { ...updated, reportGeneratedAt }, teamName: activeTeam.name });
    // El resumido no sustituye al informe completo guardado: solo guarda los datos del formulario.
    const toSave = summary ? { ...reportMetaFor, ...patch } : { ...updated, reportHtml: html, reportGeneratedAt };
    storage.set(`matches:${activeTeamId}:${updated.date}`, JSON.stringify(toSave)).catch(() => {});
    loadHistoryFor(activeTeamId);
    setReportMetaFor(null);
  };

  const loadTrainingHistoryFor = useCallback(async (teamId) => {
    try {
      const list = await storage.list(`trainings:${teamId}:`);
      if (!list || !list.keys) return setSavedTrainings([]);
      const items = [];
      for (const key of list.keys) {
        try { const r = await storage.get(key); if (r && r.value) items.push(JSON.parse(r.value)); } catch (e) {}
      }
      items.sort((a, b) => new Date(b.date) - new Date(a.date));
      setSavedTrainings(items);
    } catch (e) { setSavedTrainings([]); }
  }, []);

  const checkDraftsFor = useCallback(async (teamId) => {
    const found = {};
    try { const r = await storage.get(matchDraftKey(teamId)); if (r && r.value) found.match = JSON.parse(r.value); } catch (e) {}
    try { const r = await storage.get(trainingDraftKey(teamId)); if (r && r.value) found.training = JSON.parse(r.value); } catch (e) {}
    setPendingDrafts(found.match || found.training ? found : null);
  }, []);

  // Loads whatever is already stored — never deletes or overwrites existing teams,
  // rosters, or history. A default team is only created the very first time this app is
  // ever opened with nothing saved yet (an empty "teams" list), never afterwards.
  const bootedRef = useRef(false);
  useEffect(() => {
    if (bootedRef.current) return; // React 18/19 monta dos veces en desarrollo
    bootedRef.current = true;
    (async () => {
      requestPersistence();

      let teamsList = null;
      try {
        const t = await storage.get("teams");
        if (t && t.value) { const parsed = JSON.parse(t.value); if (Array.isArray(parsed) && parsed.length) teamsList = parsed; }
      } catch (e) {}

      // Sin equipos guardados NO se crea ninguno: se muestra la pantalla «Crea tu primer equipo».
      if (!teamsList) { setTeams([]); setActiveTeamId(null); setLoading(false); return; }

      let activeId = null;
      try {
        const a = await storage.get("activeTeamId");
        if (a && a.value && teamsList.some((t) => t.id === a.value)) activeId = a.value;
      } catch (e) {}
      if (!activeId) activeId = teamsList[0].id;

      setTeams(teamsList);
      setActiveTeamId(activeId);
      try { await storage.set("activeTeamId", activeId); } catch (e) {}

      await loadRosterFor(activeId);
      await loadHistoryFor(activeId);
      await loadTrainingHistoryFor(activeId);
      await checkDraftsFor(activeId);
      setLoading(false);
    })();
  }, [persistTeams, loadRosterFor, loadHistoryFor, loadTrainingHistoryFor, checkDraftsFor]);

  /* ---- retomar o descartar una sesión sin cerrar ---- */
  const resumeMatchDraft = (d) => {
    setClockRunning(false);
    secondsRef.current = d.seconds || 0;
    setSeconds(d.seconds || 0);
    setHalf(d.half || 1);
    halfRef.current = d.half || 1;
    halfLenRef.current = d.halfLength || 20;
    setHalfLength(d.halfLength || 20);
    otLenRef.current = d.overtimeLength || OT_HALF_MIN;
    setOvertimeLength(d.overtimeLength || OT_HALF_MIN);
    setRivalName(d.rivalName || "Rival");
    setRivalScore(d.rivalScore || 0);
    setRivalCrest(d.rivalCrest || null);
    setVenue(d.venue || "");
    setCompetition(d.competition || "");
    setMatchStartTime(d.matchStartTime || null);
    setTeamFouls(d.teamFouls || {});
    setRivalTeamFouls(d.rivalTeamFouls || {});
    setConvocados(d.convocados || null);
    setGoalEvents(d.goalEvents || []);
    setDisciplineEvents(d.disciplineEvents || []);
    setZonedEvents(d.zonedEvents || []);
    setTimeouts(Array.isArray(d.timeouts) ? d.timeouts : []);
    setShortHandedRestrictions(d.shortHandedRestrictions || []);
    setRivalShortHandedRestrictions(d.rivalShortHandedRestrictions || []);
    setUndoStack([]);
    setLastGoalEvent(null);
    setLastEvent(null);

    // La plantilla puede haber cambiado desde entonces: se conserva lo que
    // encaje y se descarta lo que ya no existe, sin inventar jugadores.
    // `d.stats` es el formato antiguo (sin desglose): entra como 1ª parte.
    const savedHalves = d.statsByHalf || (d.stats ? { 1: d.stats } : {});
    const validIds = new Set(players.map((p) => p.id));
    const mergedHalves = {};
    Object.entries(savedHalves).forEach(([h, halfMap]) => {
      const clean = {};
      Object.entries(halfMap || {}).forEach(([id, s]) => {
        if (validIds.has(id)) clean[id] = { ...emptyStats(), ...s };
      });
      mergedHalves[h] = clean;
    });
    setStatsByHalf(mergedHalves);

    const oc = pickStartingFive((d.onCourt || []).filter((id) => validIds.has(id)), players);
    setOnCourt(oc);
    onCourtRef.current = oc;

    // Rotaciones ya cerradas, tal cual, y las que seguían abiertas cuando se
    // guardó el borrador — solo para quien de verdad sigue en pista ahora.
    const restoredStints = new Map();
    (d.openStints || []).forEach(([id, st]) => {
      if (oc.includes(id) && st && typeof st.startRemaining === "number") restoredStints.set(id, st);
    });
    stintsRef.current = restoredStints;
    rotationsRef.current = Array.isArray(d.rotations) ? d.rotations : [];
    setRotations(rotationsRef.current);
    // Solo se conserva si ese jugador sigue de verdad en pista al retomar.
    setChosenGoalkeeperId(d.chosenGoalkeeperId && oc.includes(d.chosenGoalkeeperId) ? d.chosenGoalkeeperId : null);

    setPendingDrafts((prev) => {
      const rest = prev && prev.training ? { training: prev.training } : null;
      return rest;
    });
    setView("partido");
    showToast("Partido retomado — el reloj sigue parado");
  };

  const discardMatchDraft = async () => {
    await clearMatchDraft(activeTeamId);
    setPendingDrafts((prev) => (prev && prev.training ? { training: prev.training } : null));
  };

  const resumeTrainingDraft = (d) => {
    setTrainingClockRunning(false);
    setTrainingSeconds(d.trainingSeconds || 0);
    const saved = d.trainingStats || {};
    const merged = {};
    players.forEach((p) => { merged[p.id] = { seconds: (saved[p.id] && saved[p.id].seconds) || 0 }; });
    setTrainingStats(merged);
    const active = (d.trainingActive || []).filter((id) => merged[id]);
    setTrainingActive(active);
    trainingActiveRef.current = active;
    setPendingDrafts((prev) => (prev && prev.match ? { match: prev.match } : null));
    setView("entrenamiento");
    showToast("Entrenamiento retomado — el reloj sigue parado");
  };

  const discardTrainingDraft = async () => {
    await clearTrainingDraft(activeTeamId);
    setPendingDrafts((prev) => (prev && prev.match ? { match: prev.match } : null));
  };

  const toggleTrainingActive = (id) => {
    commitTrainingTime();
    setTrainingActive((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const setAllTrainingActive = (active) => {
    commitTrainingTime();
    setTrainingActive(active ? players.map((p) => p.id) : []);
  };

  const resetTraining = () => {
    setTrainingClockRunning(false);
    setTrainingSeconds(0);
    const ts = {}; players.forEach((p) => (ts[p.id] = { seconds: 0 })); setTrainingStats(ts);
    const all = players.map((p) => p.id);
    setTrainingActive(all);
    trainingActiveRef.current = all;
    clearTrainingDraft(activeTeamId);
  };

  const finishTraining = async () => {
    commitTrainingTime();
    autosaveSuspended.current = true;
    const record = {
      date: new Date().toISOString(),
      durationSeconds: trainingSeconds,
      players: players.map((p) => ({ name: p.name, number: p.number, position: p.position, seconds: (trainingStats[p.id] && trainingStats[p.id].seconds) || 0 })),
    };
    try {
      await storage.set(`trainings:${activeTeamId}:${record.date}`, JSON.stringify(record));
      showToast("Entrenamiento guardado en el historial");
    } catch (e) { showToast("No se pudo guardar el entrenamiento"); }
    await clearTrainingDraft(activeTeamId);
    setConfirmEndTraining(false); resetTraining(); loadTrainingHistoryFor(activeTeamId);
    setHistorySubTab("entrenamientos"); setView("historial");
    autosaveSuspended.current = false;
  };

  const persistRoster = useCallback(async (list) => {
    try { await storage.set(`roster:${activeTeamId}`, JSON.stringify(list)); } catch (e) {}
  }, [activeTeamId]);

  // De plantilla puede haber más de un portero (titular + suplente) — pero
  // en pista, a la vez, solo uno con la posición de portero. El portero
  // "extra" para 5x4 entra como jugador de campo (portero-jugador), no
  // ocupando también la posición de portero.
  const wouldDoubleGoalkeeper = (incomingId, excludeIds = []) => {
    const incoming = players.find((p) => p.id === incomingId);
    if (!incoming || incoming.position !== "POR") return false;
    return onCourt.some((id) => {
      if (id === incomingId || excludeIds.includes(id)) return false;
      const p = players.find((pp) => pp.id === id);
      return p && p.position === "POR";
    });
  };

  const toggleCourt = (id) => {
    commitTime(); // liquida el tiempo del quinteto anterior antes de cambiarlo
    if (onCourt.includes(id)) {
      closeStint(id);
      setOnCourt((prev) => prev.filter((x) => x !== id));
      return;
    }
    if (sentOffIds.has(id)) { showToast("Expulsado: no puede volver a jugar este partido"); return; }
    if (onCourt.length >= maxOnCourt) { showToast(`Ya hay ${maxOnCourt} en pista — saca a alguien primero`); return; }
    if (wouldDoubleGoalkeeper(id)) { showToast("Ya hay un portero en pista"); return; }
    openStint(id, halfRef.current);
    setOnCourt((prev) => [...prev, id]);
  };

  // Tapping a card: if we're mid-goal-registration waiting for the scorer, this tap picks
  // them; an armed quick action records on that player; an on-court player deselects
  // (always allowed); a bench player joins directly if there's room, or — if the pitch is
  // already full — opens the substitution picker to choose who comes off.
  const handlePlayerTap = (player) => {
    if (goalWizard && goalWizard.type === "for" && !goalWizard.authorId) {
      setGoalWizard({ ...goalWizard, authorId: player.id, authorName: player.name });
      return;
    }
    if (zonedActionWizard && !zonedActionWizard.playerId) {
      setZonedActionWizard({ ...zonedActionWizard, playerId: player.id, playerName: player.name });
      return;
    }
    if (pendingAction) { recordPendingAction(player.id, player.name); return; }
    if (onCourt.includes(player.id)) {
      // El portero (o quien esté jugando de portero) va anclado: un toque
      // normal no lo saca de pista como a cualquier otro — abre el selector
      // dedicado para elegir con quién se cambia, y precisamente ese
      // selector es el que marca al que entra como portero-jugador si hace
      // falta. Así no se puede sacar al portero por accidente.
      if (player.id === keeperOnCourtId) { setGoalkeeperSwapFor(player); return; }
      toggleCourt(player.id);
      return;
    }
    if (onCourt.length < maxOnCourt) { toggleCourt(player.id); return; }
    setSubPickerFor(player);
  };

  const doGoalkeeperSwap = (incomingId) => {
    if (!goalkeeperSwapFor) return;
    const outgoing = goalkeeperSwapFor;
    const incoming = players.find((p) => p.id === incomingId);
    if (!incoming) return;
    commitTime();
    closeStint(outgoing.id);
    openStint(incoming.id, halfRef.current);
    setOnCourt((prev) => prev.filter((id) => id !== outgoing.id).concat(incoming.id));
    // Siempre se guarda explícitamente a quién se acaba de elegir — aunque
    // sea portero de plantilla — para que mande sobre la detección
    // automática si hubiera más de un portero en pista.
    setChosenGoalkeeperId(incoming.id);
    showToast(incoming.isGK ? `${incoming.name} entra de portero` : `${incoming.name} entra de portero-jugador`);
    setGoalkeeperSwapFor(null);
    saveDraftNow();
  };

  // La sustitución normal también deja elegir sacar al portero — no hace
  // falta acordarse de tocar su tarjeta a propósito: si es a quien se saca,
  // esto se convierte en un cambio de portero (con la misma marca de
  // portero-jugador si quien entra no es portero de plantilla).
  const doSubstitution = (outgoingId) => {
    if (!subPickerFor) return;
    const incoming = subPickerFor;
    if (sentOffIds.has(incoming.id)) { showToast("Expulsado: no puede volver a jugar este partido"); setSubPickerFor(null); return; }
    if (outgoingId !== keeperOnCourtId && wouldDoubleGoalkeeper(incoming.id, [outgoingId])) {
      showToast("Ya hay un portero en pista");
      return;
    }
    commitTime();
    closeStint(outgoingId);
    openStint(incoming.id, halfRef.current);
    setOnCourt((prev) => prev.filter((id) => id !== outgoingId).concat(incoming.id));
    if (outgoingId === keeperOnCourtId) {
      setChosenGoalkeeperId(incoming.id);
      showToast(incoming.isGK ? `${incoming.name} entra de portero` : `${incoming.name} entra de portero-jugador`);
    } else {
      showToast(`${incoming.name} entra por sustitución`);
    }
    setSubPickerFor(null);
    saveDraftNow();
  };

  // `targetHalf` permite deshacer en la parte donde se anotó la acción, aunque
  // mientras tanto se haya empezado la siguiente.
  // `bump` deja registro con minuto exacto de las faltas y tarjetas, igual
  // que ya hacían los goles — de ahí sale la sección "Faltas y tarjetas" del
  // resumen y del historial. El resto de acciones (tiros, pérdidas...) solo
  // suman al contador, sin generar ese registro.
  const bump = (playerId, key, delta = 1, targetHalf = null, zone = null) => {
    const h = targetHalf || halfRef.current;
    setStatsByHalf((prev) => {
      const halfMap = { ...(prev[h] || {}) };
      const cur = halfMap[playerId] || emptyStats();
      halfMap[playerId] = { ...cur, [key]: Math.max(0, (cur[key] || 0) + delta) };
      return { ...prev, [h]: halfMap };
    });
    // Las faltas cometidas también suman (o restan, al deshacer) al marcador
    // de faltas acumuladas del equipo de esa parte, aparte de las que se
    // ajusten a mano desde la cabecera.
    if (key === "fouls") {
      setTeamFouls((prev) => ({ ...prev, [h]: Math.max(0, (prev[h] || 0) + delta) }));
    }
    // Una falta recibida es una falta que cometió el rival -- suma a su
    // marcador de faltas acumuladas, no al nuestro.
    if (key === "foulsReceived") {
      setRivalTeamFouls((prev) => ({ ...prev, [h]: Math.max(0, (prev[h] || 0) + delta) }));
    }
    if (delta <= 0) return;
    let discId = null;
    if (DISCIPLINE_KEYS.has(key)) {
      const player = players.find((p) => p.id === playerId);
      const remainingNow = Math.max(0, halfMinutesFor(h, halfLenRef.current, otLenRef.current) * 60 - secondsRef.current);
      const ev = {
        id: `disc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        playerId, playerName: player ? player.name : "?", playerNumber: player ? player.number : "?",
        type: key, half: h, remaining: remainingNow, zone,
      };
      discId = ev.id;
      setDisciplineEvents((prev) => [...prev, ev]);

      // Regla del fútbol sala: la segunda amarilla del mismo jugador en el
      // partido equivale a una roja -- se anota sola. Se dispara después de
      // que esta llamada termine (setLastEvent incluido) para que "Deshacer"
      // quite primero la roja automática y, si se pulsa otra vez, la amarilla.
      if (key === "yellow") {
        const priorYellows = Object.values(statsByHalf).reduce((s, hm) => s + ((hm[playerId] && hm[playerId].yellow) || 0), 0);
        if (priorYellows + 1 === 2) {
          showToast(`${player ? player.name : "Jugador"} — segunda amarilla = roja, expulsado`);
          setTimeout(() => bump(playerId, "red", 1, h), 0);
        }
      }

      // Roja (directa o por doble amarilla): el jugador queda expulsado el
      // resto del partido. Si estaba en pista, sale ya mismo y el equipo
      // juega con uno menos 2 minutos de juego o hasta que el rival marque
      // (lo que pase antes) -- pero si la roja es a alguien del banquillo,
      // no hay inferioridad: se sigue en 5 contra 5, ese jugador solo pierde
      // la opción de volver a jugar el resto del partido.
      if (key === "red") {
        if (onCourtRef.current.includes(playerId)) {
          // Si el expulsado era quien estaba de portero, la pista se queda sin
          // portero: se pregunta enseguida quién se pone (o se mete al suplente).
          if (playerId === keeperOnCourtId) setKeeperRedPrompt(true);
          closeStint(playerId);
          setOnCourt((prev) => prev.filter((x) => x !== playerId));
          setShortHandedRestrictions((prev) => [...prev, { id: ev.id, half: h, startRemaining: remainingNow }]);
        }
      }
    }
    setLastEvent({ playerId, key, half: h, discId });
    // Goles y asistencias entran en la pila por su propio flujo (el del gol).
    if (key !== "goals" && key !== "assists") pushUndo({ kind: "action", playerId, key, half: h, discId });
  };

  // Deshacer en varios pasos: cada pulsación quita el registro anterior (gol,
  // tarjeta, falta, tiro, pérdida, tiempo muerto...), del más reciente al más
  // antiguo. La pila vive en memoria: tras recargar la app empieza vacía.
  const pushUndo = (entry) => setUndoStack((prev) => [...prev.slice(-49), entry]);

  // El gol guarda su propio autor, así que deshacerlo resta el gol a quien
  // tocaba aunque por medio haya pasado cualquier otra cosa. Si el gol se
  // editó después, se usa el autor actual y no el de cuando se anotó.
  const undoLast = () => {
    const entry = undoStack[undoStack.length - 1];
    if (!entry) return;
    setUndoStack((prev) => prev.slice(0, -1));
    setLastEvent(null);
    setLastGoalEvent(null);
    if (entry.kind === "goal") {
      const ev = goalEvents.find((e) => e.id === entry.id) || entry;
      setGoalEvents((prev) => prev.filter((e) => e.id !== entry.id));
      if (ev.type === "for" && ev.authorId) {
        bump(ev.authorId, "goals", -1, ev.half);
        if (ev.assistId) bump(ev.assistId, "assists", -1, ev.half);
      } else if (ev.type === "against") setRivalScore((v) => Math.max(0, v - 1));
      showToast("Gol deshecho");
      return;
    }
    if (entry.kind === "timeout") {
      setTimeouts((prev) => prev.filter((t) => t.id !== entry.id));
      showToast("Tiempo muerto deshecho");
      return;
    }
    if (entry.discId) {
      setDisciplineEvents((prev) => prev.filter((e) => e.id !== entry.discId));
      // Una roja deshecha tambien deja de servirse: la inferioridad nace con el
      // mismo id que el evento de disciplina.
      setShortHandedRestrictions((prev) => prev.filter((r) => r.id !== entry.discId));
    }
    bump(entry.playerId, entry.key, -1, entry.half);
    showToast("Acción deshecha");
  };

  const savePlayerEdit = (id, patch) => {
    setPlayers((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      persistRoster(next);
      return next;
    });
  };

  const handleNewFile = async (id, file) => {
    if (!file) return;
    try { setCropTarget({ kind: "player", id, src: await fileToDataUrl(file) }); }
    catch (e) { showToast("No se pudo cargar la foto"); }
  };
  const handleReframe = (id, currentPhoto) => setCropTarget({ kind: "player", id, src: currentPhoto });

  const handleTeamCrestFile = async (teamId, file) => {
    if (!file) return;
    try { setCropTarget({ kind: "teamCrest", id: teamId, src: await fileToDataUrl(file) }); }
    catch (e) { showToast("No se pudo cargar el escudo"); }
  };
  const handleTeamCrestReframe = (teamId, crest) => { if (crest) setCropTarget({ kind: "teamCrest", id: teamId, src: crest }); };
  const handleTeamCrestRemove = (teamId) => {
    const next = teams.map((t) => (t.id === teamId ? { ...t, crest: null } : t));
    setTeams(next); persistTeams(next);
  };
  // Colores del club (solo para informes y PDF, nunca para la interfaz).
  // Campo nuevo y opcional del equipo: los equipos sin él siguen igual.
  // Reglas, posiciones y fases del equipo. Sin cambios respecto a lo de serie
  // no se guarda nada (el equipo queda igual que antes).
  const handleTeamConfig = (teamId, config) => {
    const clean = config && !isDefaultConfig(config) ? normalizeConfig(config) : null;
    const next = teams.map((t) => {
      if (t.id !== teamId) return t;
      const { config: _old, ...rest } = t;
      return clean ? { ...rest, config: clean } : rest;
    });
    setTeams(next); persistTeams(next);
  };
  const handleTeamColors = (teamId, colors) => {
    const clean = colors && (colors.primary || colors.secondary) ? { primary: colors.primary || null, secondary: colors.secondary || null } : null;
    const next = teams.map((t) => (t.id === teamId ? { ...t, colors: clean } : t));
    setTeams(next); persistTeams(next);
  };

  const handleRivalCrestFile = async (file) => {
    if (!file) return;
    try { setCropTarget({ kind: "rivalCrest", id: null, src: await fileToDataUrl(file) }); }
    catch (e) { showToast("No se pudo cargar el escudo"); }
  };
  const handleRivalCrestReframe = () => { if (rivalCrest) setCropTarget({ kind: "rivalCrest", id: null, src: rivalCrest }); };

  // Goal registration — GOL → AUTOR → FASE → ASISTENCIA (o "sin asistencia")
  // → ZONA de finalización → registro automático. GOL RIVAL → FASE
  // (obligatoria) → registro automático, sin asistencia ni zona (esa zona
  // solo tiene sentido para los tiros propios, y es la que luego se ve en
  // el campograma de "Tiros" del informe). En cualquier caso, los 5
  // jugadores en pista se capturan en el instante exacto del gol desde la
  // fuente única de verdad (`onCourt`) — nunca se recalculan después, así
  // el historial no se desincroniza con sustituciones posteriores.
  const armGoal = () => { setActionsPopoverOpen(false); setPendingAction(null); setGoalWizard({ type: "for", authorId: null, authorName: null }); };
  const armRivalGoal = () => { setPendingAction(null); setGoalWizard({ type: "against", authorId: null, authorName: null }); };
  // Autogol del rival: gol a favor que no es de ningún jugador nuestro. Se
  // registra directo (sin autor, asistencia ni zona de finalización).
  const registerRivalOwnGoal = () => finalizeGoalEvent({ type: "for", authorId: null, authorName: null, assistId: null, assistName: null, phase: "En propia", zone: null, ownGoal: true });
  const cancelGoalWizard = () => setGoalWizard(null);

  // El "−" del marcador rival quita el ultimo gol rival de verdad (su evento),
  // no solo el numero: si no, el marcador y el resumen/fases/informe se
  // contradicen. Sin eventos (borrador antiguo) solo baja el contador.
  const removeRivalGoal = () => {
    const lastIdx = goalEvents.map((e) => e.type).lastIndexOf("against");
    if (lastIdx === -1) { setRivalScore((v) => Math.max(0, v - 1)); return; }
    const removed = goalEvents[lastIdx];
    setGoalEvents((prev) => prev.filter((e) => e.id !== removed.id));
    setRivalScore((v) => Math.max(0, v - 1));
    if (lastGoalEvent && lastGoalEvent.id === removed.id) { setLastGoalEvent(null); setLastEvent(null); }
    setUndoStack((prev) => prev.filter((e) => e.id !== removed.id));
    showToast("Gol rival quitado");
    saveDraftNow();
  };

  const finalizeGoalEvent = (wizard) => {
    const onCourtSnapshot = players
      .filter((p) => onCourt.includes(p.id))
      .map((p) => ({ id: p.id, name: p.name, number: p.number }));
    const remainingAtGoal = Math.max(0, halfMinutesFor(half, halfLength, overtimeLength) * 60 - seconds); // exactamente lo que marca el reloj ahora
    const isFor = wizard.type === "for";
    const event = {
      id: `g${Date.now()}`,
      type: wizard.type,
      authorId: isFor ? wizard.authorId : null,
      authorName: isFor ? wizard.authorName : null,
      ownGoal: isFor && !!wizard.ownGoal, // autogol del rival: suma a favor sin autor nuestro
      assistId: isFor ? (wizard.assistId || null) : null,
      assistName: isFor ? (wizard.assistName || null) : null,
      phase: wizard.phase,
      zone: isFor ? (wizard.zone || null) : null,
      half,
      remaining: remainingAtGoal,
      onCourt: onCourtSnapshot,
    };
    setGoalEvents((prev) => [...prev, event]);
    setLastGoalEvent({ id: event.id, type: event.type, authorId: event.authorId, assistId: event.assistId });
    pushUndo({ kind: "goal", id: event.id, type: event.type, authorId: event.authorId, assistId: event.assistId, half: event.half });

    if (isFor) {
      if (wizard.authorId) bump(wizard.authorId, "goals", 1);
      if (wizard.assistId) bump(wizard.assistId, "assists", 1);
      showToast(wizard.ownGoal ? "Autogol del rival — a favor" : `Gol de ${wizard.authorName}${wizard.assistId ? ` — asist. ${wizard.assistName}` : ""} — ${wizard.phase}`);
      // Marcar nosotros resuelve la expulsión del rival más antigua que
      // siga sirviéndose -- la superioridad dura 2 minutos de juego o hasta
      // que marquemos, lo que pase antes.
      setRivalShortHandedRestrictions((prev) => {
        const idx = prev.findIndex((r) => r.half === half && (r.startRemaining - remaining) < 120);
        if (idx === -1) return prev;
        return prev.filter((_, i) => i !== idx);
      });
    } else {
      setRivalScore((v) => v + 1);
      showToast(`Gol rival — ${wizard.phase}`);
      // El gol del rival resuelve la roja más antigua que siga sirviéndose
      // -- es justo la otra condición (además de los 2 minutos) que
      // devuelve al equipo a jugar con los de siempre.
      setShortHandedRestrictions((prev) => {
        const idx = prev.findIndex((r) => r.half === half && (r.startRemaining - remaining) < 120);
        if (idx === -1) return prev;
        return prev.filter((_, i) => i !== idx);
      });
    }
    setGoalWizard(null);
    saveDraftNow();
  };

  // Fase elegida: si es gol rival ya está todo, se registra directamente.
  // Si es propio, todavía faltan la asistencia y la zona de finalización.
  const choosePhase = (phaseKey) => {
    if (!goalWizard) return;
    if (goalWizard.type === "against") { finalizeGoalEvent({ ...goalWizard, phase: phaseKey }); return; }
    setGoalWizard({ ...goalWizard, phase: phaseKey });
  };

  // assistId/assistName llegan null cuando se pulsa "Sin asistencia".
  const chooseAssist = (assistId, assistName) => {
    if (!goalWizard) return;
    setGoalWizard({ ...goalWizard, assistId: assistId || null, assistName: assistName || null, assistChosen: true });
  };

  const finalizeGoalZone = (zoneKey) => {
    if (!goalWizard) return;
    finalizeGoalEvent({ ...goalWizard, zone: zoneKey });
  };

  // Corrige un gol ya registrado: quién marcó y de qué fase. Si cambia el
  // autor, se le resta el gol a quien tenía antes y se le suma a quien
  // corresponde ahora, en la misma parte en la que se marcó — no en la parte
  // actual, que podría ser otra si el gol es de antes.
  const saveGoalEdit = (patch) => {
    if (!editingGoal) return;
    const ev = editingGoal;
    const newHalf = patch.half !== undefined ? patch.half : ev.half;
    const newAuthorId = patch.authorId !== undefined ? patch.authorId : ev.authorId;
    if (ev.type === "for" && (newAuthorId !== ev.authorId || newHalf !== ev.half)) {
      if (ev.authorId) bump(ev.authorId, "goals", -1, ev.half);
      if (newAuthorId) bump(newAuthorId, "goals", 1, newHalf);
    }
    setGoalEvents((prev) => prev.map((e) => (e.id === ev.id ? { ...e, ...patch } : e)));
    setEditingGoal(null);
    showToast("Gol editado");
    saveDraftNow();
  };

  // Lo mismo que saveGoalEdit, pero para un gol de un partido que ya está
  // guardado en el Historial: en vez de bump() sobre el estado en vivo,
  // ajusta directamente los goles del jugador en las filas guardadas (total
  // y la parte en que se marcó) y persiste el partido entero.
  const saveSavedGoalEdit = async (patch) => {
    if (!editingSavedGoal) return;
    const { match, event } = editingSavedGoal;
    const rosterMatch = (row, playerId) => {
      if (row.id) return row.id === playerId;
      const rp = players.find((p) => p.id === playerId);
      return rp ? row.name === rp.name && String(row.number) === String(rp.number) : false;
    };
    const adjustGoals = (rows, playerId, delta) => rows.map((p) => (rosterMatch(p, playerId) ? { ...p, goals: Math.max(0, (p.goals || 0) + delta) } : p));
    let matchPlayers = match.players;
    let halvesArr = Array.isArray(match.halves) ? match.halves : [];
    const newHalf = patch.half !== undefined ? patch.half : event.half;
    const newAuthorId = patch.authorId !== undefined ? patch.authorId : event.authorId;
    if (event.type === "for" && (newAuthorId !== event.authorId || newHalf !== event.half)) {
      if (event.authorId) {
        matchPlayers = adjustGoals(matchPlayers, event.authorId, -1);
        halvesArr = halvesArr.map((h) => (h.half === event.half ? { ...h, players: adjustGoals(h.players, event.authorId, -1) } : h));
      }
      if (newAuthorId) {
        matchPlayers = adjustGoals(matchPlayers, newAuthorId, 1);
        halvesArr = halvesArr.map((h) => (h.half === newHalf ? { ...h, players: adjustGoals(h.players, newAuthorId, 1) } : h));
      }
    }
    const goalEvents = (match.goalEvents || []).map((e) => (e.id === event.id ? { ...e, ...patch } : e));
    const updated = { ...match, players: matchPlayers, halves: halvesArr, goalEvents };
    try { await storage.set(`matches:${activeTeamId}:${updated.date}`, JSON.stringify(updated)); } catch (e) {}
    setEditingSavedGoal(null);
    showToast("Gol editado");
    loadHistoryFor(activeTeamId);
  };

  // Tiempo muerto (1 minuto): para el reloj y se anota con parte y minuto.
  // Reglamento de la competición: uno por equipo en cada parte. En la prórroga
  // (partes 3+) no se limita porque no hay una norma confirmada.
  const registerTimeout = (team) => {
    const h = halfRef.current;
    const limit = teamRules.timeoutsPerHalf; // 0 = sin límite
    if (h <= 2 && limit > 0 && timeouts.filter((t) => t.team === team && t.half === h).length >= limit) {
      showToast(limit === 1
        ? `${team === "for" ? "Nuestro" : "El rival"} ya usó el tiempo muerto de esta parte`
        : `${team === "for" ? "Ya usasteis" : "El rival ya usó"} los ${limit} tiempos muertos de esta parte`);
      return;
    }
    // A tiempo corrido el reloj no se para solo: se para a mano si hace falta.
    if (!teamRules.runningClock) setClockRunning(false);
    const remainingNow = Math.max(0, halfMinutesFor(h, halfLenRef.current, otLenRef.current) * 60 - secondsRef.current);
    const ev = { id: `to-${Date.now()}`, team, half: h, remaining: remainingNow };
    const usedNow = timeouts.filter((t) => t.team === team && t.half === h).length + 1;
    setTimeouts((prev) => [...prev, ev]);
    setLastGoalEvent(null);
    setLastEvent({ timeoutId: ev.id });
    pushUndo({ kind: "timeout", id: ev.id });
    showToast(`Tiempo muerto ${team === "for" ? "nuestro" : "del rival"} · ${usedNow}º en esta parte — ${teamRules.runningClock ? "tiempo corrido: el reloj sigue" : "reloj parado"}`);
    saveDraftNow();
  };

  const armStatAction = (key, label) => {
    setActionsPopoverOpen(false);
    if (key === "saves") {
      if (!keeperOnCourtId) { showToast("No hay portero en pista"); return; }
      const gk = players.find((p) => p.id === keeperOnCourtId);
      bump(keeperOnCourtId, "saves", 1);
      setLastGoalEvent(null);
      showToast(`Parada — ${gk ? gk.name : ""}`);
      return;
    }
    // Pérdidas, recuperaciones y tiros piden también jugador y zona, con un
    // asistente propio — el resto sigue el camino simple de siempre (tocar
    // un jugador y listo).
    if (ZONED_KEYS.has(key)) { setZonedActionWizard({ key, label, playerId: null, playerName: null }); return; }
    setPendingAction({ key, label });
  };
  const armCardAction = (key, label) => { setCardsPopoverOpen(false); setPendingAction({ key, label }); };

  // Expulsión de un jugador del RIVAL: no llevamos su plantilla, así que no
  // hay jugador que tocar -- se anota directa, igual que "gol rival", y nos
  // deja jugar con superioridad 2 minutos de juego o hasta que marquemos.
  const armRivalExpulsion = () => {
    const h = halfRef.current;
    const remainingNow = Math.max(0, halfMinutesFor(h, halfLenRef.current, otLenRef.current) * 60 - secondsRef.current);
    setRivalShortHandedRestrictions((prev) => [...prev, { id: `rexp-${Date.now()}`, half: h, startRemaining: remainingNow }]);
    showToast("Expulsión del rival — jugáis con superioridad 2 min o hasta marcar");
  };
  const cancelPendingAction = () => setPendingAction(null);
  const recordPendingAction = (playerId, playerName) => {
    if (!pendingAction) return;
    bump(playerId, pendingAction.key, 1);
    setLastGoalEvent(null);
    showToast(`${pendingAction.label} — ${playerName}`);
    setPendingAction(null);
  };
  const cancelZonedWizard = () => setZonedActionWizard(null);

  const finalizeZonedAction = (zoneKey) => {
    if (!zonedActionWizard || !zonedActionWizard.playerId) return;
    const { key, label, playerId, playerName } = zonedActionWizard;
    bump(playerId, key, 1, null, zoneKey);
    setLastGoalEvent(null);
    // Las faltas ya quedan registradas (con zona y minuto) en disciplineEvents
    // via bump -- no hace falta duplicarlas aquí también, o saldrían dos
    // veces en el resumen y en el Excel.
    if (!DISCIPLINE_KEYS.has(key)) {
      const player = players.find((p) => p.id === playerId);
      const remainingNow = Math.max(0, halfMinutesFor(half, halfLength, overtimeLength) * 60 - seconds);
      const ev = {
        id: `zone-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        playerId, playerName,
        playerNumber: player ? player.number : "?",
        key, zone: zoneKey, half, remaining: remainingNow,
      };
      setZonedEvents((prev) => [...prev, ev]);
    }
    showToast(`${label} — ${playerName} · ${PITCH_ZONE_LABEL[zoneKey]}`);
    setZonedActionWizard(null);
    saveDraftNow();
  };
  const handleRivalCrestRemove = () => setRivalCrest(null);

  const handleCropSave = (dataUrl) => {
    if (!cropTarget) return;
    if (cropTarget.kind === "teamCrest") {
      const next = teams.map((t) => (t.id === cropTarget.id ? { ...t, crest: dataUrl } : t));
      setTeams(next); persistTeams(next);
    } else if (cropTarget.kind === "rivalCrest") {
      setRivalCrest(dataUrl);
    } else {
      savePlayerEdit(cropTarget.id, { photo: dataUrl });
    }
    setCropTarget(null);
  };

  const addPlayer = () => {
    setPlayers((prev) => {
      const nextNum = prev.length ? Math.max(...prev.map((p) => p.number)) + 1 : 1;
      const np = { id: `p${Date.now()}`, name: "Nuevo jugador", number: nextNum, position: "ALA", isGK: false, photo: null };
      const next = [...prev, np];
      setTrainingStats((s) => ({ ...s, [np.id]: { seconds: 0 } }));
      persistRoster(next);
      return next;
    });
  };

  // Alta desde la convocatoria: nombre, dorsal y posicion, sin foto. Entra en la
  // plantilla (queda guardado para los proximos partidos) y devuelve el jugador
  // para que la convocatoria lo marque como convocado al momento.
  const addPlayerQuick = ({ name, number, position }) => {
    const np = { id: `p${Date.now()}`, name, number, position, isGK: position === "POR", photo: null };
    const next = [...players, np];
    setPlayers(next);
    setTrainingStats((s) => ({ ...s, [np.id]: { seconds: 0 } }));
    persistRoster(next);
    return np;
  };

  // Quitar a alguien de la plantilla pide confirmacion: en el partido en curso
  // sus estadisticas dejan de contar al guardar (los partidos ya guardados no
  // se tocan, llevan sus propios nombres y datos).
  const askRemovePlayer = (id) => setConfirmRemovePlayer(players.find((p) => p.id === id) || null);

  const removePlayer = (id) => {
    setConfirmRemovePlayer(null);
    stintsRef.current.delete(id);
    setPlayers((prev) => { const next = prev.filter((p) => p.id !== id); persistRoster(next); return next; });
    setOnCourt((prev) => prev.filter((x) => x !== id));
    setTrainingActive((prev) => prev.filter((x) => x !== id));
    setChosenGoalkeeperId((prev) => (prev === id ? null : prev));
  };

  // Goles de jugadores + autogoles del rival (suman a favor sin ser de nadie nuestro).
  const teamGoals = players.reduce((sum, p) => sum + ((stats[p.id] && stats[p.id].goals) || 0), 0)
    + goalEvents.filter((e) => e.type === "for" && e.ownGoal).length;

  const resetMatch = () => {
    setClockRunning(false);
    secondsRef.current = 0;
    setSeconds(0); setHalf(1); halfRef.current = 1; setRivalScore(0); setTeamFouls({}); setRivalTeamFouls({});
    setRivalName("Rival"); setRivalCrest(null); setVenue(""); setCompetition(""); setMatchStartTime(null);
    setHalfLength(teamRules.halfMinutes); halfLenRef.current = teamRules.halfMinutes;
    setOvertimeLength(teamRules.overtimeHalfMinutes); otLenRef.current = teamRules.overtimeHalfMinutes;
    setStatsByHalf({});
    rotationsRef.current = []; setRotations([]);
    setChosenGoalkeeperId(null);
    const startingFive = pickStartingFive(players.map((p) => p.id), players);
    setOnCourt(startingFive); onCourtRef.current = startingFive;
    openStintsForCourt(startingFive, 1);
    setLastEvent(null);
    setGoalWizard(null); setGoalEvents([]); setLastGoalEvent(null); setDisciplineEvents([]); setZonedEvents([]); setZonedActionWizard(null); setHalfUndo(null); setKeeperRedPrompt(false); setTimeouts([]); setUndoStack([]);
    setShortHandedRestrictions([]);
    setRivalShortHandedRestrictions([]);
    setConvocados(null);
    clearMatchDraft(activeTeamId);
  };

  // "Nuevo partido" opens the Convocatoria step first instead of jumping straight in.
  const startNewMatch = () => { setConvocatoriaMode("nuevo"); };

  // Dos caminos bien distintos, que antes eran uno solo y por eso editar la
  // convocatoria a mitad de partido borraba minutos, goles y tarjetas:
  //  · "nuevo"  → arranca de cero.
  //  · "editar" → solo cambia la lista de convocados; no toca nada de lo jugado.
  const confirmConvocatoria = (selectedIds, mode) => {
    if (mode === "editar") {
      commitTime();
      const removed = onCourt.filter((id) => !selectedIds.includes(id));
      removed.forEach((id) => closeStint(id));
      if (removed.includes(chosenGoalkeeperId)) setChosenGoalkeeperId(null);
      setConvocados(selectedIds);
      setOnCourt((prev) => {
        const kept = prev.filter((id) => selectedIds.includes(id));
        if (kept.length !== prev.length) showToast("Se quitó de la pista a quien ya no está convocado");
        return kept;
      });
      setConvocatoriaMode(null);
      saveDraftNow();
      return;
    }

    setClockRunning(false);
    secondsRef.current = 0;
    setSeconds(0); setHalf(1); halfRef.current = 1; setRivalScore(0); setTeamFouls({}); setRivalTeamFouls({});
    setRivalName("Rival"); setRivalCrest(null); setVenue(""); setCompetition(""); setMatchStartTime(null);
    setHalfLength(teamRules.halfMinutes); halfLenRef.current = teamRules.halfMinutes;
    setOvertimeLength(teamRules.overtimeHalfMinutes); otLenRef.current = teamRules.overtimeHalfMinutes;
    setStatsByHalf({});
    rotationsRef.current = []; setRotations([]);
    setChosenGoalkeeperId(null);
    setConvocados(selectedIds);
    const startingFive = pickStartingFive(selectedIds, players);
    setOnCourt(startingFive); onCourtRef.current = startingFive;
    openStintsForCourt(startingFive, 1);
    setLastEvent(null);
    setGoalWizard(null); setGoalEvents([]); setLastGoalEvent(null); setDisciplineEvents([]); setZonedEvents([]); setZonedActionWizard(null); setHalfUndo(null); setKeeperRedPrompt(false); setTimeouts([]); setUndoStack([]);
    setShortHandedRestrictions([]);
    setRivalShortHandedRestrictions([]);
    setConvocatoriaMode(null);
    setView("partido");
  };

  const finishMatch = async () => {
    commitTime();
    onCourtRef.current.forEach((id) => closeStint(id)); // cierra las rotaciones que seguían en pista
    autosaveSuspended.current = true;
    const convocadosList = convocados
      ? players.filter((p) => convocados.includes(p.id)).map((p) => ({ id: p.id, name: p.name, number: p.number }))
      : players.map((p) => ({ id: p.id, name: p.name, number: p.number }));
    // `id` se guarda desde ahora para poder cruzar con la plantilla actual y
    // sacarle la foto al informe — los partidos guardados antes de esto no
    // lo tienen, y el informe entonces cae en buscar por nombre y dorsal.
    const rowsFrom = (statsMap) => players.map((p) => ({
      id: p.id, name: p.name, number: p.number, position: p.position, isGK: p.isGK,
      ...emptyStats(), ...((statsMap || {})[p.id] || {}),
    }));
    const record = {
      date: new Date().toISOString(), rivalName, teamGoals, rivalScore, teamFouls, rivalTeamFouls, halfLength, venue, startTime: matchStartTime,
      // additive: solo si la prórroga no es la de siempre (3'), para no cambiar los partidos de antes
      ...(overtimeLength !== OT_HALF_MIN ? { overtimeLength } : {}),
      ...(competition.trim() ? { competition: competition.trim() } : {}), // additive: el informe ya la usaba
      // Igual que la hora de inicio, la de fin se anota sola al finalizar —
      // así, al pedir los datos del informe, ya sale rellena.
      endTime: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      players: rowsFrom(stats), // total del partido
      // Desglose por parte, en el orden en que se jugaron.
      halves: halvesPresent(statsByHalf, goalEvents).map((h) => ({ half: h, players: rowsFrom(statsByHalf[h]) })),
      goalEvents, // additive: full history of who scored, from what phase, with the exact 5 on court at that moment
      disciplineEvents, // additive: cada falta y tarjeta, con el minuto exacto en que se marcó
      zonedEvents, // additive: cada pérdida, recuperación y tiro, con jugador, zona y minuto
      convocados: convocadosList, // additive: who was called up for this match
      rotations: rotationsRef.current, // additive: cada entrada y salida de la pista de cada jugador
      timeouts, // additive: tiempos muertos pedidos (equipo, parte y minuto)
    };
    let saved = false;
    try {
      await storage.set(`matches:${activeTeamId}:${record.date}`, JSON.stringify(record));
      saved = true;
      showToast("Partido guardado — exportando Excel…");
    } catch (e) { showToast("No se pudo guardar el partido"); }
    // El borrador solo se borra si el partido quedó guardado de verdad; si el
    // guardado falla, la copia sigue ahí para poder recuperarlo.
    if (saved) await clearMatchDraft(activeTeamId);
    try { await exportSingleMatchToExcel(record, activeTeam.name); } catch (e) {}
    // El informe en PDF ya NO se abre solo: se genera a propósito con el
    // botón "Crear informe" del partido, aquí en el Historial adonde se
    // llega justo después de finalizar.
    setConfirmEnd(false);
    if (saved) resetMatch();
    loadHistoryFor(activeTeamId); setHistorySubTab("partidos"); setView("historial");
    autosaveSuspended.current = false;
  };

  const startNextHalf = () => {
    const prevRotations = rotationsRef.current;
    const prevStints = new Map(stintsRef.current);
    setClockRunning(false); // liquida el tiempo pendiente en la parte que acaba
    const prevSeconds = secondsRef.current; // ya liquidado arriba: es el minuto exacto en que estaba la parte
    onCourtRef.current.forEach((id) => closeStint(id)); // cierra la rotación de quien sigue en pista al cambiar de parte
    secondsRef.current = 0;
    setSeconds(0);
    const prevHalf = halfRef.current;
    const next = prevHalf + 1;
    halfRef.current = next; // a partir de aqui todo se anota en la parte nueva
    setHalf(next);
    onCourtRef.current.forEach((id) => openStint(id, next)); // y le abre una nueva, ya en la parte que empieza
    setHalfUndo({
      prevHalf, prevSeconds, prevRotations, prevStints,
      rotLenAfter: rotationsRef.current.length, onCourtAfter: [...onCourtRef.current],
      goalLen: goalEvents.length, discLen: disciplineEvents.length, zonedLen: zonedEvents.length,
    });
    saveDraftNow();
  };

  // Solo se puede deshacer mientras en la parte nueva no se haya anotado nada
  // (ni goles, faltas, acciones, cambios...): así volver atrás no borra nada
  // que alguien haya registrado a propósito. Los minutos que haya corrido el
  // reloj en la parte nueva sí se descartan: es justo lo que se quiere deshacer.
  const halfUndoValid = (() => {
    const u = halfUndo;
    if (!u || half !== u.prevHalf + 1) return false;
    if (goalEvents.length !== u.goalLen || disciplineEvents.length !== u.discLen || zonedEvents.length !== u.zonedLen) return false;
    if ((teamFouls[half] || 0) > 0 || (rivalTeamFouls[half] || 0) > 0) return false;
    if (rotations.length !== u.rotLenAfter) return false;
    if (onCourt.length !== u.onCourtAfter.length || onCourt.some((id) => !u.onCourtAfter.includes(id))) return false;
    const halfMap = statsByHalf[half] || {};
    return Object.values(halfMap).every((st) => STAT_KEYS.every((k) => k === "seconds" || !st[k]));
  })();

  const undoNextHalf = () => {
    const u = halfUndo;
    if (!u || !halfUndoValid) { showToast("Ya se anotó algo en esta parte: no se puede deshacer sin perderlo"); return; }
    setClockRunning(false); // el reloj queda parado: se reanuda a mano
    const dropHalf = halfRef.current;
    setStatsByHalf((prev) => { const n = { ...prev }; delete n[dropHalf]; return n; });
    rotationsRef.current = u.prevRotations; setRotations(u.prevRotations);
    stintsRef.current = new Map(u.prevStints); // los de la pista siguen con la misma tanda que llevaban
    secondsRef.current = u.prevSeconds; setSeconds(u.prevSeconds);
    halfRef.current = u.prevHalf; setHalf(u.prevHalf);
    setHalfUndo(null);
    showToast(`Vuelves a la ${halfLabel(u.prevHalf).toLowerCase()} · quedan ${fmtClock(Math.max(0, halfMinutesFor(u.prevHalf, halfLength, overtimeLength) * 60 - u.prevSeconds))}`);
    saveDraftNow();
  };

  /* ---- multi-team actions ---- */
  const switchTeam = async (id) => {
    if (id === activeTeamId) { setTeamManagerOpen(false); setView("inicio"); return; }
    commitTime(); commitTrainingTime();
    await saveDraftNow(); // el partido del equipo actual no se pierde al cambiar
    autosaveSuspended.current = true;
    setClockRunning(false);
    setTrainingClockRunning(false);
    secondsRef.current = 0;
    setSeconds(0); setHalf(1); halfRef.current = 1; setRivalScore(0); setTeamFouls({}); setRivalTeamFouls({});
    setRivalName("Rival"); setRivalCrest(null); setVenue(""); setCompetition(""); setMatchStartTime(null);
    setHalfLength(teamRules.halfMinutes); halfLenRef.current = teamRules.halfMinutes;
    setOvertimeLength(teamRules.overtimeHalfMinutes); otLenRef.current = teamRules.overtimeHalfMinutes;
    setLastEvent(null); setLastGoalEvent(null); setGoalEvents([]); setConvocados(null);
    setDisciplineEvents([]); setZonedEvents([]); setZonedActionWizard(null); setHalfUndo(null); setKeeperRedPrompt(false); setTimeouts([]); setUndoStack([]);
    setChosenGoalkeeperId(null);
    setShortHandedRestrictions([]);
    setRivalShortHandedRestrictions([]);
    setTrainingSeconds(0);
    setLoading(true);
    setActiveTeamId(id);
    try { await storage.set("activeTeamId", id); } catch (e) {}
    await loadRosterFor(id);
    await loadHistoryFor(id);
    await loadTrainingHistoryFor(id);
    await checkDraftsFor(id);
    setLoading(false);
    setTeamManagerOpen(false);
    setView("inicio");
    autosaveSuspended.current = false;
  };

  const createFirstTeam = async (name, subtitle) => {
    const t = { ...newTeam(name), subtitle: subtitle || "" };
    try { await storage.set(`roster:${t.id}`, JSON.stringify(defaultRoster())); } catch (e) {}
    await persistTeams([t]);
    setTeams([t]); setActiveTeamId(t.id);
    try { await storage.set("activeTeamId", t.id); } catch (e) {}
    await loadRosterFor(t.id); await loadHistoryFor(t.id); await loadTrainingHistoryFor(t.id); await checkDraftsFor(t.id);
  };

  const addTeamAction = async () => {
    const t = newTeam("Nuevo equipo");
    const next = [...teams, t];
    setTeams(next); persistTeams(next);
    try { await storage.set(`roster:${t.id}`, JSON.stringify(defaultRoster())); } catch (e) {}
  };

  const editTeamField = (id, patch) => setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const commitTeams = () => persistTeams(teams);

  const askRemoveTeam = (id) => {
    if (teams.length <= 1) { showToast("Debe quedar al menos un equipo"); return; }
    setConfirmRemoveTeam(teams.find((t) => t.id === id) || null);
  };

  // Borra TODO lo del equipo, no solo su entrada en la lista: si no, la
  // plantilla (con fotos), los partidos y los entrenos se quedaban en el
  // dispositivo y viajaban en cada copia de seguridad sin forma de quitarlos.
  const purgeTeamData = async (id) => {
    for (const prefix of [`matches:${id}:`, `trainings:${id}:`, `playernote:${id}:`]) {
      const found = await storage.list(prefix);
      for (const key of (found && found.keys) || []) await storage.del(key);
    }
    for (const key of [`roster:${id}`, `seasonnote:${id}`, matchDraftKey(id), trainingDraftKey(id)]) await storage.del(key);
  };

  const removeTeamAction = async (id) => {
    setConfirmRemoveTeam(null);
    if (teams.length <= 1) { showToast("Debe quedar al menos un equipo"); return; }
    const next = teams.filter((t) => t.id !== id);
    setTeams(next); persistTeams(next);
    // Primero se cambia de equipo (eso guarda el borrador del actual) y solo
    // despues se purga, para que ese guardado no recree lo que se acaba de borrar.
    if (id === activeTeamId) await switchTeam(next[0].id);
    await purgeTeamData(id);
    showToast("Equipo borrado");
  };

  const statP = statPlayer ? players.find((p) => p.id === statPlayer) : null;
  const totalHalfSeconds = Math.max(1, halfMinutesFor(half, halfLength, overtimeLength) * 60);
  const remaining = Math.max(0, totalHalfSeconds - seconds);
  const halfProgress = remaining / totalHalfSeconds;
  const durationLocked = running || seconds > 0 || half > 1;
  // Avisos de comprobación al pedir finalizar (solo informan; no impiden guardar).
  const endChecks = confirmEnd ? matchChecks({ goalEvents, teamGoals, rivalScore, players, convocados, stats, statsByHalf, teamFouls }) : [];
  const onCourtCount = onCourt.length;

  // Mientras haya una roja "sirviéndose", 1 en pista menos por cada una
  // activa (mínimo 3, para no bloquear con GK + 2). Se resuelve sola al
  // pasar los 2 minutos de juego o, antes, con doGoalConceded.
  const activeShortHanded = shortHandedRestrictions.filter((r) => r.half === half && (r.startRemaining - remaining) < 120);
  const maxOnCourt = Math.max(3, 5 - activeShortHanded.length);
  const sentOffIds = new Set(players.filter((p) => (stats[p.id] && stats[p.id].red) > 0).map((p) => p.id));
  // Igual que arriba pero al revés: expulsiones del rival, que nos dejan a
  // nosotros con superioridad -- no toca el máximo en pista (eso es cosa
  // suya), solo se enseña como aviso con su propio mini-crono.
  const activeRivalShortHanded = rivalShortHandedRestrictions.filter((r) => r.half === half && (r.startRemaining - remaining) < 120);
  const restrictionTimeLeft = (r) => Math.max(0, 120 - (r.startRemaining - remaining));
  const currentTeamFouls = accumulatedFouls(teamFouls, half);
  const currentRivalTeamFouls = accumulatedFouls(rivalTeamFouls, half);

  const sortedPlayers = [...players].sort((a, b) => {
    const aOn = onCourt.includes(a.id), bOn = onCourt.includes(b.id);
    if (aOn !== bOn) return aOn ? -1 : 1;
    // El portero va anclado el primero entre quienes están en pista.
    const aGK = a.id === keeperOnCourtId, bGK = b.id === keeperOnCourtId;
    if (aGK !== bGK) return aGK ? -1 : 1;
    return a.number - b.number;
  });

  // Navegación (DISENO-TRANSFORMACION.md §8.3). Los destinos son una vista
  // sobre el estado de siempre (view + pestaña del historial): no cambia nada
  // de cómo se guardan o calculan los datos.
  const focusMode = view === "partido" || view === "entrenamiento";
  const section = view === "inicio" ? "inicio"
    : view === "partido" ? "directo"
    : view === "plantilla" ? "equipo"
    : view === "entrenamiento" ? "entrenos"
    : historySubTab === "partidos" ? "partidos"
    : historySubTab === "jugadores" ? "jugadores"
    : historySubTab === "entrenamientos" ? "entrenos"
    : "analisis";
  const navigate = (id) => {
    if (id === "inicio") setView("inicio");
    else if (id === "directo") setView("partido");
    else if (id === "equipo") setView("plantilla");
    else if (id === "partidos") { setHistorySubTab("partidos"); setView("historial"); }
    else if (id === "jugadores") { setHistorySubTab("jugadores"); setView("historial"); }
    else if (id === "entrenos") { setHistorySubTab("entrenamientos"); setView("historial"); }
    else if (id === "analisis") { if (!["analisis", "estadisticas", "zonas"].includes(historySubTab)) setHistorySubTab("analisis"); setView("historial"); }
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") window.scrollTo(0, 0);
  };

  return {
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
  };
}
