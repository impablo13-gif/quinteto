/* Partidos de referencia para las pruebas de no-regresion (golden).
 *
 * Se construyen a partir de un guion compacto y las estadisticas por jugador
 * se DERIVAN de los eventos (rotaciones, goles, acciones, faltas), igual que
 * las acumula la app en directo. Asi los totales, las partes y los eventos
 * cuadran entre si y el partido es realista sin depender de datos de nadie.
 *
 * Nombres neutros a proposito: ninguno corresponde a un club ni a una persona.
 */

const STAT_ZERO = () => ({
  seconds: 0, goals: 0, assists: 0, fouls: 0, foulsReceived: 0, yellow: 0, red: 0,
  saves: 0, turnovers: 0, recoveries: 0, shotsOn: 0, shotsOff: 0, shotsPost: 0,
});

const halfSeconds = (half, halfLength) => (half <= 2 ? halfLength * 60 : 3 * 60);

function buildRoster(list) {
  return list.map(([n, name, position]) => ({
    id: `p${n}`, name, number: n, position, isGK: position === "POR", photo: null,
  }));
}

/* script:
 *   roster, convocados (dorsales), halfLength, halves,
 *   stints: [[dorsal, parte, desdeSegundo, hastaSegundo]]   (segundos jugados en la parte)
 *   goals:  [[tipo, parte, segundo, autor|null, asistente|null, fase, zona|null, {ownGoal}]]
 *   disc:   [[dorsal, tipo, parte, segundo, zona|null]]
 *   zoned:  [[dorsal, tipo, parte, segundo, zona]]
 *   saves:  [[dorsal, parte]]
 *   timeouts: [[equipo, parte, segundo]]
 */
function buildMatch(s) {
  const roster = buildRoster(s.roster);
  const byNum = (n) => roster.find((p) => p.number === n);
  const rem = (half, sec) => halfSeconds(half, s.halfLength) - sec;
  const stats = {};
  const st = (half, id) => {
    stats[half] = stats[half] || {};
    stats[half][id] = stats[half][id] || STAT_ZERO();
    return stats[half][id];
  };

  const rotations = s.stints.map(([n, half, from, to], i) => {
    const p = byNum(n);
    st(half, p.id).seconds += to - from;
    return {
      id: `rot-${p.id}-${i}`, playerId: p.id, playerName: p.name, playerNumber: p.number,
      half, startRemaining: rem(half, from), endRemaining: rem(half, to), durationSeconds: to - from,
    };
  });

  const onCourtAt = (half, sec) => s.stints
    .filter(([, h, from, to]) => h === half && from <= sec && sec <= to)
    .map(([n]) => byNum(n))
    .filter((p, i, a) => a.indexOf(p) === i)
    .map(({ id, name, number }) => ({ id, name, number }));

  const goalEvents = s.goals.map(([type, half, sec, author, assist, phase, zone, extra = {}], i) => {
    const a = author ? byNum(author) : null;
    const as = assist ? byNum(assist) : null;
    if (a) st(half, a.id).goals += 1;
    if (as) st(half, as.id).assists += 1;
    const isFor = type === "for";
    return {
      id: `g${i + 1}`, type,
      authorId: isFor && a ? a.id : null, authorName: isFor && a ? a.name : null,
      ownGoal: isFor && !!extra.ownGoal,
      assistId: as ? as.id : null, assistName: as ? as.name : null,
      phase, zone: isFor ? zone : null, half, remaining: rem(half, sec), onCourt: onCourtAt(half, sec),
    };
  });

  const disciplineEvents = s.disc.map(([n, type, half, sec, zone], i) => {
    const p = byNum(n);
    st(half, p.id)[type] += 1;
    return { id: `disc-${i + 1}`, playerId: p.id, playerName: p.name, playerNumber: p.number, type, half, remaining: rem(half, sec), zone: zone || null };
  });

  const zonedEvents = s.zoned.map(([n, key, half, sec, zone], i) => {
    const p = byNum(n);
    st(half, p.id)[key] += 1;
    return { id: `zone-${i + 1}`, playerId: p.id, playerName: p.name, playerNumber: p.number, key, zone, half, remaining: rem(half, sec) };
  });

  (s.saves || []).forEach(([n, half]) => { st(half, byNum(n).id).saves += 1; });

  const timeouts = (s.timeouts || []).map(([team, half, sec], i) => ({ id: `to-${i + 1}`, team, half, remaining: rem(half, sec) }));

  const rowsFrom = (map) => roster.map((p) => ({
    id: p.id, name: p.name, number: p.number, position: p.position, isGK: p.isGK,
    ...STAT_ZERO(), ...((map || {})[p.id] || {}),
  }));
  const total = {};
  Object.values(stats).forEach((m) => Object.entries(m).forEach(([id, v]) => {
    total[id] = total[id] || STAT_ZERO();
    Object.keys(v).forEach((k) => { total[id][k] += v[k]; });
  }));

  const teamGoals = goalEvents.filter((g) => g.type === "for").length;
  const rivalScore = goalEvents.filter((g) => g.type === "against").length;
  const conv = s.convocados.map(byNum).map(({ id, name, number }) => ({ id, name, number }));

  const match = {
    date: s.date, rivalName: s.rivalName, teamGoals, rivalScore,
    teamFouls: s.teamFouls, rivalTeamFouls: s.rivalTeamFouls,
    halfLength: s.halfLength, venue: s.venue || "", startTime: s.startTime || "", endTime: s.endTime || "",
    players: rowsFrom(total),
    halves: s.halves.map((h) => ({ half: h, players: rowsFrom(stats[h]) })),
    goalEvents, disciplineEvents, zonedEvents, convocados: conv, rotations, timeouts,
    ...(s.meta || {}),
  };
  return { match, roster };
}

const ROSTER = [
  [1, "Portero Uno", "POR"], [13, "Portero Dos", "POR"],
  [4, "Cierre Cuatro", "CIE"], [5, "Cierre Cinco", "CIE"],
  [7, "Ala Siete", "ALA"], [8, "Ala Ocho", "ALA"], [10, "Ala Diez", "ALA"], [11, "Ala Once", "ALA"],
  [9, "Pivot Nueve", "PIV"], [14, "Pivot Catorce", "PIV"], [6, "Ala Seis", "ALA"], [3, "Cierre Tres", "CIE"],
];

/* 1 · Partido completo de liga, 2 x 20'. Lo tiene todo: rotaciones en las dos
 * partes, goles con fase/asistencia/zona (18 y una antigua de 9), autogol
 * rival, gol en propia, doble amarilla con su roja, faltas de las dos
 * clases, tiros de los tres tipos, perdidas, recuperaciones, paradas,
 * tiempos muertos, dos convocados que no juegan y metadatos de informe. */
export const completo = buildMatch({
  date: "2026-10-18T16:00:00.000Z", rivalName: "Atletico Ejemplo", halfLength: 20, halves: [1, 2],
  venue: "Pabellon Municipal", startTime: "18:00", endTime: "19:32",
  roster: ROSTER,
  convocados: [1, 13, 4, 5, 7, 8, 10, 11, 9, 14, 6, 3],
  teamFouls: { 1: 3, 2: 5 }, rivalTeamFouls: { 1: 2, 2: 4 },
  stints: [
    [1, 1, 0, 1200], [4, 1, 0, 420], [7, 1, 0, 420], [10, 1, 0, 600], [9, 1, 0, 300],
    [14, 1, 300, 840], [5, 1, 420, 1200], [8, 1, 420, 900], [11, 1, 600, 1200], [9, 1, 840, 1200], [7, 1, 900, 1200],
    [1, 2, 0, 1200], [4, 2, 0, 600], [7, 2, 0, 480], [8, 2, 0, 600], [9, 2, 0, 360],
    [14, 2, 360, 780], [10, 2, 480, 1200], [5, 2, 600, 1200], [11, 2, 600, 1020], [9, 2, 780, 1200], [6, 2, 1151, 1200],
  ],
  goals: [
    ["for", 1, 185, 9, 7, "Ataque Posicional", "f5-centro"],
    ["against", 1, 512, null, null, "Transición", null],
    ["for", 1, 701, 14, 5, "Recuperación", "f4-izq"],
    ["for", 1, 1130, null, null, "En propia", null, { ownGoal: true }],
    ["for", 2, 95, 8, null, "ABP", "f6-centro"],
    ["against", 2, 640, null, null, "5x4", null],
    ["for", 2, 902, 10, 11, "Incorporación", "def-centro"],
    ["against", 2, 1150, null, null, "10M (Doble penalti)", null],
  ],
  disc: [
    [4, "fouls", 1, 140, "f2-izq"], [8, "foulsReceived", 1, 260, "f4-der"], [5, "fouls", 1, 610, "f3-centro"],
    [11, "yellow", 1, 700, null], [11, "fouls", 1, 1010, "f2-der"],
    [4, "fouls", 2, 200, "f1-centro"], [11, "yellow", 2, 1020, null], [11, "red", 2, 1020, null],
    [5, "fouls", 2, 700, "f3-izq"], [10, "foulsReceived", 2, 820, "f5-der"], [11, "fouls", 2, 990, "f2-centro"], [5, "fouls", 2, 1100, "f1-izq"],
  ],
  zoned: [
    [9, "shotsOn", 1, 120, "f6-centro"], [7, "shotsOff", 1, 230, "f5-der"], [10, "turnovers", 1, 300, "f3-izq"],
    [4, "recoveries", 1, 390, "f2-centro"], [14, "shotsPost", 1, 650, "f6-izq"], [8, "recoveries", 1, 690, "f4-der"],
    [11, "turnovers", 1, 980, "f4-centro"], [5, "shotsOn", 1, 1100, "f5-centro"],
    [8, "shotsOn", 2, 60, "f6-der"], [9, "turnovers", 2, 300, "f5-izq"], [14, "recoveries", 2, 500, "f3-der"],
    [10, "shotsOff", 2, 760, "f5-izq"], [11, "recoveries", 2, 880, "f2-izq"], [6, "shotsOn", 2, 1170, "f6-centro"],
    [7, "turnovers", 1, 1150, "medio-der"],
  ],
  saves: [[1, 1], [1, 1], [1, 1], [1, 2], [1, 2]],
  timeouts: [["for", 1, 900], ["against", 2, 1000]],
  meta: {
    city: "Ciudad Ejemplo", pitchMaterial: "Parquet", competition: "Liga regular",
    observations: "Partido de referencia para pruebas.", reportGeneratedAt: "2026-10-18T18:00:00.000Z",
  },
});

/* 2 · Eliminatoria con prorroga (partes 3 y 4), expulsion del rival en la
 * prorroga y un gol en superioridad. 2 x 25' para probar otra duracion. */
export const prorroga = buildMatch({
  date: "2026-11-08T11:00:00.000Z", rivalName: "Club Deportivo Muestra", halfLength: 25, halves: [1, 2, 3, 4],
  roster: ROSTER,
  convocados: [1, 13, 4, 5, 7, 8, 10, 11, 9, 14],
  teamFouls: { 1: 4, 2: 5, 3: 0, 4: 1 }, rivalTeamFouls: { 1: 3, 2: 2 },
  stints: [
    [1, 1, 0, 1500], [4, 1, 0, 750], [7, 1, 0, 750], [10, 1, 0, 750], [9, 1, 0, 1500],
    [5, 1, 750, 1500], [8, 1, 750, 1500], [11, 1, 750, 1500],
    [13, 2, 0, 1500], [4, 2, 0, 1500], [7, 2, 0, 900], [10, 2, 0, 900], [14, 2, 0, 1500], [8, 2, 900, 1500], [11, 2, 900, 1500],
    [1, 3, 0, 180], [4, 3, 0, 180], [7, 3, 0, 180], [10, 3, 0, 180], [9, 3, 0, 180],
    [1, 4, 0, 180], [5, 4, 0, 180], [8, 4, 0, 180], [11, 4, 0, 180], [14, 4, 0, 180],
  ],
  goals: [
    ["against", 1, 400, null, null, "ABP", null],
    ["for", 2, 1200, 14, 8, "Ataque Posicional", "f6-izq"],
    ["for", 4, 120, 11, 14, "4x3", "f5-centro"],
  ],
  disc: [[4, "fouls", 1, 100, "f2-centro"], [7, "yellow", 2, 300, null], [8, "foulsReceived", 4, 90, "f4-izq"]],
  zoned: [[9, "shotsOn", 1, 500, "f6-centro"], [14, "shotsOff", 2, 800, "f5-der"], [5, "recoveries", 4, 100, "f3-izq"]],
  saves: [[1, 1], [13, 2], [13, 2]],
  timeouts: [["for", 1, 1300], ["for", 3, 60], ["for", 4, 30]],
  meta: { reportGeneratedAt: "2026-11-08T13:30:00.000Z" },
});

/* 3 · Partido «antiguo»: copia la ESTRUCTURA exacta de un registro real de
 * agosto de 2026 (campos occFor/occAgainst que ya no se usan, filas de
 * jugador sin id ni foulsReceived/shotsPost, sin faltas acumuladas, sin
 * rotaciones, sin acciones con zona, sin tiempos muertos), con nombres y
 * cifras inventados. Prueba que se sigue leyendo lo guardado antes de que
 * existieran esos campos. */
const antiguoRoster = buildRoster(ROSTER.slice(0, 10));
const LEG = { seconds: [2400, 0, 1700, 1500, 1300, 1250, 1200, 1100, 900, 650], goals: [0, 0, 0, 0, 1, 0, 0, 0, 1, 0], assists: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0], fouls: [0, 0, 1, 1, 0, 0, 0, 1, 0, 0], yellow: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0], saves: [4, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
const legacyRow = (p, i, f = (k) => LEG[k][i]) => ({
  name: p.name, number: p.number, position: p.position, isGK: p.isGK,
  seconds: f("seconds"), goals: f("goals"), assists: f("assists"), fouls: f("fouls"), yellow: f("yellow"), red: 0,
  saves: f("saves"), turnovers: 0, recoveries: 0, shotsOn: 0, shotsOff: 0,
});
const five = (...nums) => nums.map((n) => antiguoRoster.find((p) => p.number === n)).map(({ id, name, number }) => ({ id, name, number }));
export const antiguo = {
  roster: antiguoRoster,
  match: {
    date: "2026-08-14T07:43:12.637Z", rivalName: "Rival Antiguo", teamGoals: 2, rivalScore: 1,
    occFor: 0, occAgainst: 0, halfLength: 20, venue: "", startTime: "09:40",
    players: antiguoRoster.map((p, i) => legacyRow(p, i)),
    halves: [
      { half: 1, players: antiguoRoster.map((p, i) => legacyRow(p, i, (k) => (k === "seconds" ? Math.floor(LEG.seconds[i] / 2) : k === "goals" ? (p.number === 7 ? 1 : 0) : k === "assists" ? (p.number === 4 ? 1 : 0) : k === "saves" ? (i === 0 ? 3 : 0) : LEG[k][i]))) },
      { half: 2, players: antiguoRoster.map((p, i) => legacyRow(p, i, (k) => (k === "seconds" ? Math.ceil(LEG.seconds[i] / 2) : k === "goals" ? (p.number === 9 ? 1 : 0) : k === "assists" ? 0 : k === "saves" ? (i === 0 ? 1 : 0) : k === "fouls" || k === "yellow" ? 0 : LEG[k][i]))) },
    ],
    goalEvents: [
      { id: "g1786693302348", type: "for", authorId: "p7", authorName: "Ala Siete", phase: "Transición", half: 1, remaining: 700, onCourt: five(1, 4, 7, 8, 9) },
      { id: "g1786693307648", type: "against", authorId: null, authorName: null, phase: "5x4", half: 2, remaining: 900, onCourt: five(1, 5, 10, 11, 9) },
      { id: "g1786693308200", type: "for", authorId: "p9", authorName: "Pivot Nueve", phase: "Ataque Posicional", half: 2, remaining: 300, onCourt: five(1, 4, 7, 8, 9) },
    ],
    convocados: antiguoRoster.map(({ id, name, number }) => ({ id, name, number })),
  },
};

export const TEAM = "Club Demo";
export const ALL = { completo, prorroga, antiguo };
