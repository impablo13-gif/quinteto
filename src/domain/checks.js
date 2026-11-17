/* Comprobacion de datos antes de finalizar un partido (DISENO §10).
 *
 * Solo AVISA: no corrige nada ni impide guardar. Cada aviso dice que revisar y
 * donde; el entrenador decide. Trabaja sobre lo que ya se anota, sin pedir
 * ningun dato nuevo.
 *
 * Entrada: el estado del partido tal y como lo guarda la app.
 *   goalEvents, teamGoals, rivalScore, players (plantilla), convocados (ids o
 *   null = todos), stats (totales por jugador), statsByHalf, teamFouls ({parte: n})
 */
const nameOf = (players, id) => {
  const p = (players || []).find((x) => x.id === id);
  return p ? `${p.number != null ? `${p.number} · ` : ""}${p.name}` : "un jugador";
};
const halfName = (h) => (h <= 2 ? `la ${h}ª parte` : `la prórroga ${h - 2}`);

export function matchChecks({ goalEvents = [], teamGoals = 0, rivalScore = 0, players = [], convocados = null, stats = {}, statsByHalf = {}, teamFouls = {} } = {}) {
  const out = [];
  const add = (level, text) => out.push({ level, text });

  // Marcador frente a goles anotados uno a uno.
  const forEvents = goalEvents.filter((g) => g.type === "for").length;
  const againstEvents = goalEvents.filter((g) => g.type === "against").length;
  if (forEvents !== teamGoals) add("warn", `El marcador dice ${teamGoals} a favor, pero hay ${forEvents} gol${forEvents === 1 ? "" : "es"} a favor anotado${forEvents === 1 ? "" : "s"} con su fase.`);
  if (againstEvents !== rivalScore) add("warn", `El marcador dice ${rivalScore} en contra, pero hay ${againstEvents} gol${againstEvents === 1 ? "" : "es"} en contra anotado${againstEvents === 1 ? "" : "s"} con su fase.`);

  // Goles sin fase.
  const noPhase = goalEvents.filter((g) => !g.phase).length;
  if (noPhase) add("warn", `${noPhase} gol${noPhase === 1 ? "" : "es"} sin fase de gol.`);

  // Autor o asistente que no estaba en pista en ese momento (p. ej. tras corregir un gol).
  goalEvents.forEach((g) => {
    if (g.type !== "for" || !Array.isArray(g.onCourt) || !g.onCourt.length) return;
    const ids = new Set(g.onCourt.map((p) => p.id));
    if (g.authorId && !g.ownGoal && !ids.has(g.authorId)) add("warn", `El gol de ${g.authorName || nameOf(players, g.authorId)} está anotado a alguien que no estaba en pista en ese momento.`);
    if (g.assistId && !ids.has(g.assistId)) add("warn", `La asistencia de ${g.assistName || nameOf(players, g.assistId)} es de alguien que no estaba en pista en ese momento.`);
  });

  // Convocados sin minutos.
  const called = Array.isArray(convocados) ? convocados : null;
  if (called) {
    const zero = called.filter((id) => !((stats[id] && stats[id].seconds) > 0));
    if (zero.length) add("info", `${zero.length === 1 ? "Un convocado no ha jugado" : `${zero.length} convocados no han jugado`}: ${zero.map((id) => nameOf(players, id)).join(", ")}.`);
  }

  // Faltas acumuladas del equipo frente a las faltas anotadas a jugadores, parte a parte.
  const halves = new Set([...Object.keys(teamFouls || {}), ...Object.keys(statsByHalf || {})].map(Number).filter((h) => h > 0));
  [...halves].sort((a, b) => a - b).forEach((h) => {
    const acc = (teamFouls || {})[h] || 0;
    const byPlayers = Object.values((statsByHalf || {})[h] || {}).reduce((s, st) => s + ((st && st.fouls) || 0), 0);
    if (acc !== byPlayers) add("info", `En ${halfName(h)} hay ${acc} falta${acc === 1 ? "" : "s"} acumulada${acc === 1 ? "" : "s"} y ${byPlayers} anotada${byPlayers === 1 ? "" : "s"} a jugadores. Si se sumaron a mano, puede estar bien.`);
  });

  return out;
}
