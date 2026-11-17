/* Pruebas de no-regresion («golden») para la transformacion a Quinteto.
 *
 * Fijan lo que la app CALCULA y ESCRIBE hoy (cifras y textos), no como se ve:
 *   · el informe de partido (texto + valores de los donuts)
 *   · el JSON del partido para el planificador
 *   · las filas de cada hoja de Excel
 *   · la ficha de jugador, la memoria de temporada y las tablas de temporada
 *   · el contenido de una copia de seguridad
 * sobre los tres partidos de tests/fixtures/partidos.js.
 *
 * Si un cambio altera alguna cifra, esta prueba falla y enseña la diferencia.
 * Si el cambio es intencionado (un texto renombrado, una seccion nueva), se
 * regeneran las referencias a proposito y se revisa el diff en git:
 *     UPDATE_GOLDEN=1 npm test
 *
 * El informe y el Excel viven en src/reports/ y dependen de modulos con JSX y
 * de dependencias de navegador, asi que se cargan con Vite en modo SSR (igual
 * que los compila la app). Los emojis y los estilos se quitan antes de comparar: cambiar iconos o
 * colores no debe romper esta prueba; cambiar un numero, si.
 */
process.env.TZ = "Europe/Madrid";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createServer } from "vite";
import { ALL, TEAM } from "./fixtures/partidos.js";
import { buildPlayerReportHtml } from "../src/fichaHtml.js";
import { buildSeasonReportHtml } from "../src/memoriaHtml.js";
import { seasonTable, playerReport } from "../src/jugadores.js";
import { seasonSummary, goalsByMinute, quintetBalance, goalsByPhase } from "../src/analisis.js";
import { collectZoneEvents, countByZone } from "../src/zonas.js";
import { storage } from "../src/storage.js";
import { buildBackup, summarizeBackup } from "../src/backup.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = join(HERE, "golden");
const UPDATE = process.env.UPDATE_GOLDEN === "1";

/* ---- Entorno minimo de navegador para el informe ----
 * El informe dibuja los donuts en un <canvas>. Aqui el canvas apunta los
 * arcos que se le piden y los guarda: asi se comparan los VALORES del donut
 * (que porcion ocupa cada segmento) sin depender de un motor grafico. */
let canvasLog = [];
function installDomShim() {
  globalThis.document = {
    createElement(tag) {
      if (tag !== "canvas") return {};
      const arcs = [];
      canvasLog.push(arcs);
      return {
        width: 0, height: 0,
        getContext: () => ({
          beginPath() {}, stroke() {}, fill() {}, moveTo() {}, lineTo() {}, closePath() {}, fillText() {}, save() {}, restore() {},
          arc(cx, cy, r, a0, a1) { arcs.push(Math.round(((a1 - a0) / (2 * Math.PI)) * 10000) / 10000); },
          set lineWidth(v) {}, set strokeStyle(v) {}, set fillStyle(v) {}, set font(v) {}, set textAlign(v) {}, set textBaseline(v) {},
        }),
        toDataURL: () => "data:image/png;base64,AAAA",
      };
    },
  };
}

/* HTML -> lista de trozos de texto, sin estilos, scripts ni emojis. */
function htmlToText(html) {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .split(/<[^>]+>/)
    .map((t) => t
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
      .replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function checkGolden(name, actual) {
  const file = join(GOLDEN_DIR, `${name}.json`);
  const json = JSON.stringify(actual, null, 2) + "\n";
  if (UPDATE || !existsSync(file)) {
    mkdirSync(GOLDEN_DIR, { recursive: true });
    writeFileSync(file, json);
    if (!UPDATE) console.log(`golden creado: ${name}.json`);
    return;
  }
  const expected = JSON.parse(readFileSync(file, "utf8"));
  assert.deepEqual(JSON.parse(json), expected, `${name}: no coincide con tests/golden/${name}.json (UPDATE_GOLDEN=1 si el cambio es intencionado)`);
}

let vite, App;
test.before(async () => {
  installDomShim();
  vite = await createServer({ configFile: false, logLevel: "silent", server: { middlewareMode: true, hmr: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  App = {
    ...(await vite.ssrLoadModule("/src/domain/match.js")),
    ...(await vite.ssrLoadModule("/src/reports/excel.js")),
    ...(await vite.ssrLoadModule("/src/reports/matchReport.js")),
  };
  // La app entera debe seguir cargando (detecta imports rotos tras trocear App.jsx).
  await vite.ssrLoadModule("/src/App.jsx");
});
test.after(async () => { if (vite) await vite.close(); });

for (const [name, fx] of Object.entries(ALL)) {
  test(`golden · informe de partido · ${name}`, () => {
    canvasLog = [];
    const html = App.buildMatchReportHtml(fx.match, TEAM, fx.roster, null);
    checkGolden(`informe-${name}`, {
      titulo: App.matchReportTitle(fx.match, TEAM),
      donuts: canvasLog.filter((a) => a.length),
      texto: htmlToText(html),
    });
  });

  test(`informe · ${name} · sin emojis y con colores del club sin cambiar el texto`, () => {
    const plain = App.buildMatchReportHtml(fx.match, TEAM, fx.roster, null);
    assert.equal(/\p{Extended_Pictographic}/u.test(plain), false, "el informe no debe llevar emojis");
    const club = App.buildMatchReportHtml(fx.match, TEAM, fx.roster, null, { primary: "#C0202E", secondary: "#FFD200" });
    assert.deepEqual(htmlToText(club), htmlToText(plain), "los colores del club no cambian ni una cifra ni un texto");
    assert.ok(club.includes("#C0202E") && club.includes("#FFD200"), "los colores del club llegan a la cabecera");
    const bad = App.buildMatchReportHtml(fx.match, TEAM, fx.roster, null, { primary: "red;background:url(evil)", secondary: "<script>evil" });
    assert.equal(bad.includes("url(evil)") || bad.includes("<script>evil"), false, "un color mal escrito no llega al HTML");
  });

  test(`informe · ${name} · resumido y conclusiones`, () => {
    const full = htmlToText(App.buildMatchReportHtml(fx.match, TEAM, fx.roster, null));
    const withNotes = { ...fx.match, conclusions: "Buena presión <b>alta</b>.\nMejorar la salida." };
    const fullNotes = htmlToText(App.buildMatchReportHtml(withNotes, TEAM, fx.roster, null));
    assert.ok(fullNotes.includes("Conclusiones") && fullNotes.includes("Buena presión <b>alta</b>. Mejorar la salida."), "las conclusiones salen escapadas");
    assert.equal(full.includes("Conclusiones"), false, "sin texto no hay sección");
    const short = htmlToText(App.buildMatchReportHtml(withNotes, TEAM, fx.roster, null, null, { summary: true }));
    assert.ok(short.includes("Informe resumido") && short.includes("Conclusiones") && short.includes("Balance más/menos"));
    assert.equal(short.includes("Fichas de jugadores") || short.includes("Minutos y rotaciones"), false, "el resumido no lleva fichas ni rotaciones");
    assert.ok(short.length < full.length, "el resumido es más corto");
  });

  test(`golden · JSON para el planificador · ${name}`, () => {
    const payload = App.buildMatchJsonPayload(fx.match, TEAM);
    // Un partido sin informe generado (los antiguos) recibe la hora actual:
    // se comprueba que es una fecha valida y se fija para poder comparar.
    if (!fx.match.reportGeneratedAt) {
      assert.ok(!Number.isNaN(Date.parse(payload.partido.reportGeneratedAt)), "reportGeneratedAt debe ser una fecha");
      payload.partido.reportGeneratedAt = "<hora de exportacion>";
    }
    checkGolden(`json-${name}`, payload);
  });

  test(`golden · filas de Excel · ${name}`, () => {
    const m = fx.match;
    checkGolden(`excel-${name}`, {
      parciales: [1, 2, 3, 4].map((h) => App.halfScore(m, h)),
      total: m.players.filter(App.hasActivity).map(App.playerRow),
      partes: App.halvesOf(m).map((h) => ({ hoja: App.halfLabel(h.half), filas: h.players.filter(App.hasActivity).map(App.playerRow) })),
      goles: App.goalRowsOf(m),
      faltasYTarjetas: App.disciplineRowsOf(m),
      zonas: App.zonedRowsOf(m),
      rotaciones: App.rotationRowsOf(m),
    });
  });
}

const season = Object.values(ALL).map((fx) => fx.match).sort((a, b) => a.date.localeCompare(b.date));
const roster = ALL.completo.roster;

test("golden · temporada: tablas, analisis y Excel de fases", () => {
  const zones = collectZoneEvents(season);
  checkGolden("temporada", {
    resumen: seasonSummary(season),
    porMinuto5: goalsByMinute(season, 5),
    porMinuto10: goalsByMinute(season, 10),
    quintetos: quintetBalance(season),
    fases: goalsByPhase(season),
    tablaJugadores: seasonTable(season),
    tablaUltimos2: seasonTable(season, { mode: "last", count: 2 }),
    zonasSinZona: zones.withoutZone, zonas9: countByZone(zones.events), zonas18: countByZone(zones.events, "fine"),
    excelFases: App.seasonGoalStatsRows(season),
  });
});

// Fecha fija: sin ella la referencia caducaba cada día («generada el …»).
const GENERATED_AT = "2026-11-16T10:00:00.000Z";
test("golden · ficha de jugador y memoria (texto)", () => {
  const ficha = (key) => htmlToText(buildPlayerReportHtml({ report: playerReport(season, key), teamName: TEAM, periodLabel: "Toda la temporada", generatedAt: GENERATED_AT }));
  const ms = season;
  const memoria = htmlToText(buildSeasonReportHtml({
    teamName: TEAM, periodLabel: "Toda la temporada", summary: seasonSummary(ms), minutes: goalsByMinute(ms), quintets: quintetBalance(ms),
    phases: goalsByPhase(ms), phaseOrder: [...new Set(ms.flatMap((m) => m.goalEvents.map((g) => g.phase)))].sort().map((k) => ({ key: k, label: k })),
    playersTable: seasonTable(ms), notes: "Conclusiones de prueba.", generatedAt: GENERATED_AT,
  }));
  const keys = seasonTable(season).slice(0, 3).map((r) => r.key);
  checkGolden("ficha-memoria", { fichas: Object.fromEntries(keys.map((k) => [k, ficha(k)])), memoria, rosterSize: roster.length });
});

test("golden · copia de seguridad: que entra y que no", async () => {
  // Sin IndexedDB (Node), storage usa su plan B en memoria: suficiente para
  // comprobar que claves viajan en la copia.
  const teamId = "team-demo";
  await storage.set("teams", JSON.stringify([{ id: teamId, name: TEAM, subtitle: "Senior", crest: null }]));
  await storage.set(`roster:${teamId}`, JSON.stringify(roster));
  for (const m of season) await storage.set(`matches:${teamId}:${m.date}`, JSON.stringify(m));
  await storage.set(`seasonnote:${teamId}`, "Nota de temporada");
  await storage.set(`draft:match:${teamId}`, "{}");
  await storage.set("activeTeamId", teamId);
  await storage.set("lastBackupAt", "2026-11-01T00:00:00.000Z");
  const b = await buildBackup();
  const s = summarizeBackup(b);
  checkGolden("copia", {
    formato: b.formato, version: b.version, app: b.app,
    claves: Object.keys(b.datos).sort(),
    resumen: { equipos: s.equipos.map((t) => t.name), partidos: s.partidos, entrenos: s.entrenos, jugadores: s.jugadores },
  });
});
