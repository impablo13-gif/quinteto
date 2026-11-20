/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { REPORT, contrastRatio } from "../brand/tokens.js";
import { fmtClock, fmtMin, groupRotations, halfLabel, halfScore, halvesOf, hasActivity, matchHalvesPresent } from "../domain/match.js";
import { DISCIPLINE_LABEL, GOAL_PHASES, GOAL_PHASE_GROUPS, PITCH_ZONE_LABEL, ZONED_LABEL } from "../domain/catalog.js";
import { dateLabelOf, sanitizeFileName } from "../lib/files.js";
/* Excel export ------------------------------------------------------ */

// Excel rechaza los nombres de hoja con : \ / ? * [ ] y los de mas de 31
// caracteres. El nombre del rival entra tal cual en el nombre de la hoja, asi
// que un rival como "C.D. Pepe/Juan" tumbaba la exportacion entera.
export function sanitizeSheetName(name) {
  return String(name || "").replace(/[:\\/?*[\]]/g, "-").replace(/\s+/g, " ").trim().slice(0, 31);
}

// Dos partidos el mismo dia (torneos, por ejemplo) generaban dos hojas con el
// mismo nombre y XLSX aborta al encontrar la repetida.
export function uniqueSheetName(wb, desired, fallback) {
  const base = sanitizeSheetName(desired) || sanitizeSheetName(fallback) || "Hoja";
  if (!wb.SheetNames.includes(base)) return base;
  for (let i = 2; i < 100; i++) {
    const suffix = ` (${i})`;
    const candidate = base.slice(0, 31 - suffix.length) + suffix;
    if (!wb.SheetNames.includes(candidate)) return candidate;
  }
  return base.slice(0, 27) + Math.floor(Math.random() * 1000);
}

export function addSheet(XLSX, wb, rows, desiredName, fallback) {
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), uniqueSheetName(wb, desiredName, fallback));
}

export const playerRow = (p) => ({
  Dorsal: p.number, Jugador: p.name, Posición: p.position,
  Minutos: fmtMin(p.seconds), "Segundos jugados": p.seconds,
  Goles: p.goals || 0, Asistencias: p.assists || 0,
  "Tiros a puerta": p.shotsOn || 0, "Tiros fuera": p.shotsOff || 0, "Tiros al palo": p.shotsPost || 0,
  "Faltas cometidas": p.fouls || 0, "Faltas recibidas": p.foulsReceived || 0,
  Amarillas: p.yellow || 0, Rojas: p.red || 0, Paradas: p.saves || 0,
  "1x1 ganados": p.gkOneVsOne || 0, "Salidas / cortes": p.gkInterceptions || 0, "Saques buenos": p.gkDistOk || 0, "Saques fallados": p.gkDistBad || 0,
  Recuperaciones: p.recoveries || 0, Pérdidas: p.turnovers || 0,
});

export const goalRowsOf = (match) => (match.goalEvents || []).map((ev) => ({
  Parte: ev.half,
  "Tiempo restante": fmtClock(ev.remaining !== undefined ? ev.remaining : ev.seconds),
  Tipo: ev.type === "for" ? "A favor" : "En contra",
  Autor: ev.authorName || (ev.ownGoal ? "Autogol del rival" : ""),
  Fase: ev.phase,
  "Jugadores en pista": (ev.onCourt || []).map((p) => `#${p.number} ${p.name}`).join(", "),
}));

// Una fila por partido con el recuento de goles por fase, a favor y en
// contra -- la base del marcador de temporada por fases de gol, con la
// diferencia de que aquí cada fila es un partido propio y no un equipo rival
// de liga, que es la unidad que tiene sentido cuando solo se seguimos a un
// equipo. Partidos sin ningún gol registrado con fase quedan todos a 0, no
// se descartan, para que el partido siga contando en el marcador.
export function seasonGoalStatsRows(matches) {
  return [...matches]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((m) => {
      const forCounts = {}, againstCounts = {};
      GOAL_PHASES.forEach((p) => { forCounts[p.key] = 0; againstCounts[p.key] = 0; });
      (m.goalEvents || []).forEach((ev) => {
        const bucket = ev.type === "for" ? forCounts : againstCounts;
        if (bucket[ev.phase] === undefined) bucket[ev.phase] = 0;
        bucket[ev.phase] += 1;
      });
      return { date: m.date, rivalName: m.rivalName, teamGoals: m.teamGoals, rivalScore: m.rivalScore, forCounts, againstCounts };
    });
}

export const sumSeasonGoalCounts = (rows, side) => {
  const totals = {};
  GOAL_PHASES.forEach((p) => { totals[p.key] = 0; });
  rows.forEach((r) => GOAL_PHASES.forEach((p) => { totals[p.key] += r[side][p.key] || 0; }));
  return totals;
};

export const disciplineRowsOf = (match) => (match.disciplineEvents || []).map((ev) => ({
  Parte: ev.half,
  "Tiempo restante": fmtClock(ev.remaining),
  Tipo: DISCIPLINE_LABEL[ev.type] || ev.type,
  Dorsal: ev.playerNumber, Jugador: ev.playerName,
  Zona: ev.zone ? PITCH_ZONE_LABEL[ev.zone] || ev.zone : "",
}));

export const zonedRowsOf = (match) => (match.zonedEvents || []).map((ev) => ({
  Parte: ev.half,
  "Tiempo restante": fmtClock(ev.remaining),
  Tipo: ZONED_LABEL[ev.key] || ev.key,
  Dorsal: ev.playerNumber, Jugador: ev.playerName,
  Zona: PITCH_ZONE_LABEL[ev.zone] || ev.zone,
}));

// Filas para la hoja de Excel de rotaciones: jugador por jugador, cada
// entrada/salida de la parte que le corresponde, y el acumulado de esa parte
// y el total al cierre de cada bloque. Los partidos guardados antes de que
// existiera este seguimiento no traen `rotations`, y entonces no hay filas.
export function rotationRowsOf(match) {
  const grouped = groupRotations(match.rotations || []);
  const rows = [];
  grouped.forEach((g) => {
    [...g.halves.entries()].sort((a, b) => a[0] - b[0]).forEach(([half, h]) => {
      h.list.forEach((r, i) => {
        rows.push({
          Dorsal: g.number, Jugador: g.name, Parte: half, "Nº rotación": i + 1,
          Entra: fmtClock(r.startRemaining), Sale: fmtClock(r.endRemaining),
          Duración: fmtMin(r.durationSeconds), "Duración (seg)": r.durationSeconds,
        });
      });
      rows.push({
        Dorsal: g.number, Jugador: g.name, Parte: half, "Nº rotación": `Acumulado ${halfLabel(Number(half))}`,
        Entra: "", Sale: "", Duración: fmtMin(h.total), "Duración (seg)": h.total,
      });
    });
    rows.push({
      Dorsal: g.number, Jugador: g.name, Parte: "", "Nº rotación": "Acumulado total",
      Entra: "", Sale: "", Duración: fmtMin(g.total), "Duración (seg)": g.total,
    });
  });
  return rows;
}

// SheetJS solo se carga al pulsar exportar (no en el arranque de la app):
// es una libreria pesada que la mayoria de sesiones en el pabellon nunca usa.
export async function exportClubDataToExcel(matches, trainings, teamName) {
  if (!matches.length && !trainings.length) return;
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  if (matches.length) {
    const summaryRows = matches.map((m) => {
      const h1 = halfScore(m, 1), h2 = halfScore(m, 2);
      const otHalves = matchHalvesPresent(m).filter((h) => h > 2);
      return {
        Fecha: new Date(m.date).toLocaleDateString("es-ES"),
        Hora: m.startTime || "",
        Pabellón: m.venue || "",
        Rival: m.rivalName,
        [teamName || "Equipo"]: m.teamGoals,
        "Goles rival": m.rivalScore,
        "1ª parte": `${h1.favor}-${h1.contra}`,
        "2ª parte": `${h2.favor}-${h2.contra}`,
        ...(otHalves.length ? { "Prórroga": otHalves.map((h) => { const sc = halfScore(m, h); return `${sc.favor}-${sc.contra}`; }).join(" / ") } : {}),
        "Duración parte (min)": m.halfLength,
      };
    });
    addSheet(XLSX, wb, summaryRows, "Resumen partidos");

    matches.forEach((m, idx) => {
      const dateLabel = dateLabelOf(m.date);
      const rows = m.players.filter(hasActivity).map(playerRow);
      addSheet(XLSX, wb, rows, `P ${dateLabel}${m.rivalName ? " vs " + m.rivalName : ""}`, `Partido ${idx + 1}`);

      // Una sola hoja por partido con las partes apiladas: separarlas en varias
      // hojas dispararia el numero de pestañas de una temporada entera.
      const byHalfRows = [];
      halvesOf(m).forEach((h) => {
        h.players.filter(hasActivity).forEach((p) => byHalfRows.push({ Parte: h.half, ...playerRow(p) }));
      });
      if (byHalfRows.length) addSheet(XLSX, wb, byHalfRows, `Partes ${dateLabel}`, `Partes ${idx + 1}`);

      const goalRows = goalRowsOf(m);
      if (goalRows.length) addSheet(XLSX, wb, goalRows, `G ${dateLabel}`, `Goles ${idx + 1}`);

      const discRows = disciplineRowsOf(m);
      if (discRows.length) addSheet(XLSX, wb, discRows, `F ${dateLabel}`, `Faltas ${idx + 1}`);

      const zoneRows = zonedRowsOf(m);
      if (zoneRows.length) addSheet(XLSX, wb, zoneRows, `Z ${dateLabel}`, `Zonas ${idx + 1}`);

      const rotRows = rotationRowsOf(m);
      if (rotRows.length) addSheet(XLSX, wb, rotRows, `R ${dateLabel}`, `Rotaciones ${idx + 1}`);
    });
  }

  if (trainings.length) {
    const trainingSummaryRows = trainings.map((t) => ({
      Fecha: new Date(t.date).toLocaleDateString("es-ES"),
      "Duración sesión": fmtMin(t.durationSeconds),
      "Jugadores con actividad": t.players.filter((p) => p.seconds > 0).length,
    }));
    addSheet(XLSX, wb, trainingSummaryRows, "Resumen entrenos");

    trainings.forEach((t, idx) => {
      const rows = t.players
        .filter((p) => p.seconds > 0)
        .map((p) => ({
          Dorsal: p.number, Jugador: p.name, Posición: p.position,
          "Tiempo activo": fmtMin(p.seconds), "Segundos activo": p.seconds,
        }));
      addSheet(XLSX, wb, rows, `E ${dateLabelOf(t.date)}`, `Entreno ${idx + 1}`);
    });
  }

  XLSX.writeFile(wb, `${sanitizeFileName(teamName) || "equipo"}_estadisticas_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportSingleMatchToExcel(match, teamName) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const h1 = halfScore(match, 1), h2 = halfScore(match, 2);
  const otHalves = matchHalvesPresent(match).filter((h) => h > 2);
  const summary = [{
    Fecha: new Date(match.date).toLocaleDateString("es-ES"),
    Hora: match.startTime || "",
    Pabellón: match.venue || "",
    Rival: match.rivalName,
    [teamName || "Equipo"]: match.teamGoals,
    "Goles rival": match.rivalScore,
    "1ª parte": `${h1.favor}-${h1.contra}`,
    "2ª parte": `${h2.favor}-${h2.contra}`,
    ...(otHalves.length ? { "Prórroga": otHalves.map((h) => { const sc = halfScore(match, h); return `${sc.favor}-${sc.contra}`; }).join(" / ") } : {}),
    "Duración parte (min)": match.halfLength,
  }];
  addSheet(XLSX, wb, summary, "Resumen");

  addSheet(XLSX, wb, match.players.filter(hasActivity).map(playerRow), "Total partido");

  // Una hoja por parte, que es como se analiza despues: que paso en la primera
  // y que paso en la segunda.
  halvesOf(match).forEach((h) => {
    const rows = h.players.filter(hasActivity).map(playerRow);
    if (rows.length) addSheet(XLSX, wb, rows, halfLabel(h.half), `Parte ${h.half}`);
  });

  const goalRows = goalRowsOf(match);
  if (goalRows.length) addSheet(XLSX, wb, goalRows, "Goles");

  const discRows = disciplineRowsOf(match);
  if (discRows.length) addSheet(XLSX, wb, discRows, "Faltas y tarjetas");

  const zoneRows = zonedRowsOf(match);
  if (zoneRows.length) addSheet(XLSX, wb, zoneRows, "Zonas");

  const rotRows = rotationRowsOf(match);
  if (rotRows.length) addSheet(XLSX, wb, rotRows, "Rotaciones");

  if ((match.convocados || []).length) {
    addSheet(XLSX, wb, match.convocados.map((p) => ({ Dorsal: p.number, Jugador: p.name })), "Convocatoria");
  }

  const dateLabel = dateLabelOf(match.date);
  const rivalLabel = sanitizeFileName(match.rivalName) || "rival";
  XLSX.writeFile(wb, `${sanitizeFileName(teamName) || "equipo"}_${dateLabel}_vs_${rivalLabel}.xlsx`);
}

/* ---- Excel del marcador de goles por fase: tabla coloreada por categoría con GOLES A FAVOR y EN CONTRA en
   bloques espejados, fila de TOTALES y una fila por partido. Usa
   "xlsx-js-style" (no el "xlsx" de arriba) porque la edición community de
   SheetJS descarta los colores de celda al escribir el archivo. ---- */
export const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
// Aclara un color mezclándolo hacia blanco, para las sub-columnas de cada
// categoría: mismo tono que la cabecera de su grupo, pero legible con texto oscuro.
export const tintHex = (hex, amount) => {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c) => Math.round(c + (255 - c) * amount).toString(16).padStart(2, "0");
  return `${mix(r)}${mix(g)}${mix(b)}`.toUpperCase();
};
export const rgbNoHash = (hex) => hex.replace("#", "").toUpperCase();
export const XLSX_THIN_BORDER = { top: { style: "thin", color: { rgb: rgbNoHash(REPORT.sheetBorder) } }, bottom: { style: "thin", color: { rgb: rgbNoHash(REPORT.sheetBorder) } }, left: { style: "thin", color: { rgb: rgbNoHash(REPORT.sheetBorder) } }, right: { style: "thin", color: { rgb: rgbNoHash(REPORT.sheetBorder) } } };
export const xlsxFill = (hex) => ({ patternType: "solid", fgColor: { rgb: rgbNoHash(hex) } });
export const xlsxCenter = { horizontal: "center", vertical: "center", wrapText: true };

export function buildSeasonGoalStatsSheet(XLSXStyle, rows, teamName) {
  const groups = GOAL_PHASE_GROUPS;
  const blocks = [
    { key: "forCounts", label: "GOLES A FAVOR" },
    { key: "againstCounts", label: "GOLES EN CONTRA" },
  ];
  const FIXED = ["Fecha", "Rival", "Resultado"];
  const phasesPerBlock = groups.reduce((n, g) => n + g.phases.length, 0);
  const totalCols = FIXED.length + blocks.length * (phasesPerBlock + 1); // +1 = columna "Total" de cada bloque
  const dataStartRow = 3; // filas 0-2 son las tres cabeceras
  const totalRows = dataStartRow + 1 + rows.length; // +1 = fila TOTALES

  const aoa = Array.from({ length: totalRows }, () => Array(totalCols).fill(""));
  const merges = [];
  const styles = {};
  const setStyle = (r, c, s) => { styles[`${r}-${c}`] = s; };

  FIXED.forEach((label, i) => {
    aoa[0][i] = label;
    merges.push({ s: { r: 0, c: i }, e: { r: 2, c: i } });
    setStyle(0, i, { font: { bold: true, color: { rgb: rgbNoHash(REPORT.onDark) } }, fill: xlsxFill(REPORT.sheetHead), alignment: xlsxCenter, border: XLSX_THIN_BORDER });
  });

  let col = FIXED.length;
  const colMeta = [];
  blocks.forEach((block) => {
    const blockStart = col;
    groups.forEach((g) => {
      const groupStart = col;
      g.phases.forEach((p) => {
        aoa[2][col] = p.label;
        setStyle(2, col, { font: { bold: true, sz: 9 }, fill: xlsxFill(`#${tintHex(g.color, 0.72)}`), alignment: xlsxCenter, border: XLSX_THIN_BORDER });
        colMeta[col] = { block: block.key, phaseKey: p.key };
        col++;
      });
      aoa[1][groupStart] = g.label;
      setStyle(1, groupStart, { font: { bold: true, color: { rgb: rgbNoHash(contrastRatio(REPORT.onDark, g.color) >= 3 ? REPORT.onDark : REPORT.ink) } }, fill: xlsxFill(g.color), alignment: xlsxCenter, border: XLSX_THIN_BORDER });
      if (col - 1 > groupStart) merges.push({ s: { r: 1, c: groupStart }, e: { r: 1, c: col - 1 } });
    });
    aoa[0][blockStart] = block.label;
    setStyle(0, blockStart, { font: { bold: true, color: { rgb: rgbNoHash(REPORT.onDark) } }, fill: xlsxFill(REPORT.sheetHeadAlt), alignment: xlsxCenter, border: XLSX_THIN_BORDER });
    merges.push({ s: { r: 0, c: blockStart }, e: { r: 0, c: col - 1 } });

    aoa[0][col] = "Total";
    merges.push({ s: { r: 0, c: col }, e: { r: 2, c: col } });
    setStyle(0, col, { font: { bold: true, color: { rgb: rgbNoHash(REPORT.onDark) } }, fill: xlsxFill(REPORT.sheetHeadAlt), alignment: xlsxCenter, border: XLSX_THIN_BORDER });
    colMeta[col] = { block: block.key, isTotal: true };
    col++;
  });

  aoa[dataStartRow][0] = "TOTALES";
  merges.push({ s: { r: dataStartRow, c: 0 }, e: { r: dataStartRow, c: 2 } });
  setStyle(dataStartRow, 0, { font: { bold: true }, fill: xlsxFill(REPORT.sheetTotal), border: XLSX_THIN_BORDER });

  const totalsByBlock = { forCounts: sumSeasonGoalCounts(rows, "forCounts"), againstCounts: sumSeasonGoalCounts(rows, "againstCounts") };
  for (let c = FIXED.length; c < totalCols; c++) {
    const meta = colMeta[c];
    const value = meta.isTotal
      ? Object.values(totalsByBlock[meta.block]).reduce((a, b) => a + b, 0)
      : (totalsByBlock[meta.block][meta.phaseKey] || 0);
    aoa[dataStartRow][c] = value;
    setStyle(dataStartRow, c, { font: { bold: true }, fill: xlsxFill(REPORT.sheetTotal), alignment: xlsxCenter, border: XLSX_THIN_BORDER });
  }

  rows.forEach((row, i) => {
    const r = dataStartRow + 1 + i;
    aoa[r][0] = new Date(row.date).toLocaleDateString("es-ES");
    aoa[r][1] = row.rivalName || "";
    aoa[r][2] = `${row.teamGoals ?? ""}-${row.rivalScore ?? ""}`;
    setStyle(r, 0, { border: XLSX_THIN_BORDER });
    setStyle(r, 1, { border: XLSX_THIN_BORDER });
    setStyle(r, 2, { alignment: xlsxCenter, border: XLSX_THIN_BORDER });
    for (let c = FIXED.length; c < totalCols; c++) {
      const meta = colMeta[c];
      const value = meta.isTotal
        ? Object.values(row[meta.block]).reduce((a, b) => a + b, 0)
        : (row[meta.block][meta.phaseKey] || 0);
      aoa[r][c] = value;
      setStyle(r, c, { alignment: xlsxCenter, border: XLSX_THIN_BORDER, font: meta.isTotal ? { bold: true } : undefined });
    }
  });

  const ws = XLSXStyle.utils.aoa_to_sheet(aoa);
  ws["!merges"] = merges;
  Object.entries(styles).forEach(([key, s]) => {
    const [r, c] = key.split("-").map(Number);
    const addr = XLSXStyle.utils.encode_cell({ r, c });
    if (ws[addr]) ws[addr].s = s;
  });
  ws["!cols"] = Array.from({ length: totalCols }, (_, c) => ({ wch: c < FIXED.length ? 14 : 9 }));
  ws["!rows"] = [{ hpt: 20 }, { hpt: 20 }, { hpt: 26 }];
  return ws;
}

export async function exportSeasonGoalStatsToExcel(matches, teamName) {
  const rows = seasonGoalStatsRows(matches);
  if (!rows.length) return;
  // "xlsx-js-style" (no el "xlsx" de arriba) porque la edicion community de
  // SheetJS descarta los colores de celda al escribir el archivo -- las dos
  // son pesadas, asi que las dos se cargan solo al pulsar exportar.
  const XLSXStyle = await import("xlsx-js-style");
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, buildSeasonGoalStatsSheet(XLSXStyle, rows, teamName), "Fases de gol");
  XLSXStyle.writeFile(wb, `${sanitizeFileName(teamName) || "equipo"}_fases_de_gol_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
