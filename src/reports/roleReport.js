/* Informe de un partido según quién lo va a leer (Informes › PDF por perfil):
 * entrenador, analista, dirección deportiva, preparación física y anotador.
 * Mismos datos que el informe completo, ordenados para cada mirada. Todo sale
 * de domain/insights.js; aquí solo hay HTML (sin colores escritos a mano). */
import { REPORT as R, reportTheme } from "../brand/tokens.js";
import { BRAND } from "../brand/brand.js";
import { fmtClock, fmtMin, halfLabel } from "../domain/match.js";
import {
  keyFacts, matchMetrics, averageMetrics, METRICS, fmtMetric, evaluateObjectives, concededBreakdown, dangerousTurnovers,
  recoveryToShot, zoneEfficiency, stintProfile, goalkeeperRows, minutesShare, disciplineTable, loadWindows, dataHealth, compareWithActa, metricDef,
} from "../domain/insights.js";
import { matchEventsRows } from "./csv.js";
import { GOAL_PHASES } from "../domain/catalog.js";
import { competitionOf } from "../domain/filters.js";

export const ROLES = [
  { key: "entrenador", label: "Entrenador", hint: "Claves, objetivos, goles y qué nos marcan" },
  { key: "analista", label: "Analista", hint: "Línea de tiempo, zonas y secuencias" },
  { key: "direccion", label: "Dirección deportiva", hint: "Minutos de cada convocado, disciplina y comparación" },
  { key: "fisico", label: "Preparación física", hint: "Tandas, descansos, portero y carga de la semana" },
  { key: "anotador", label: "Anotador", hint: "Calidad del dato, avisos y cotejo con el acta" },
];

const esc = (v) => String(v === undefined || v === null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TONE = { positive: R.positive, negative: R.negative, warning: R.warning, neutral: R.inkSoft };
const phaseLabel = (k) => (GOAL_PHASES.find((p) => p.key === k) || { label: k || "Sin fase" }).label;

export function buildRoleReportHtml({ role, match: m, season = [], teamName, teamColors, objectives = [], trainings = [] }) {
  const theme = reportTheme(teamColors);
  const others = season.filter((x) => x.date !== m.date);
  const avg = averageMetrics(others);
  const mm = matchMetrics(m);
  const roleDef = ROLES.find((r) => r.key === role) || ROLES[0];
  const dateStr = new Date(m.date).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

  const H = (t) => `<div data-pdf-block="true" style="font-size:12.5px; font-weight:800; color:${theme.title}; text-transform:uppercase; letter-spacing:0.5px; margin:18px 0 8px; border-bottom:2px solid ${R.line}; padding-bottom:4px;">${esc(t)}</div>`;
  const TH = `padding:5px 7px; font-size:9.5px; font-weight:800; color:${R.muted}; text-transform:uppercase; text-align:right; white-space:nowrap;`;
  const TD = `padding:5px 7px; font-size:10.5px; text-align:right; border-top:1px solid ${R.lineSoft}; font-variant-numeric:tabular-nums;`;
  const table = (head, rows, firstLeft = true) => `<table data-pdf-block="true" style="width:100%; border-collapse:collapse; margin-bottom:6px;"><tr>${head.map((h, i) => `<th style="${TH}${i === 0 && firstLeft ? " text-align:left;" : ""}">${esc(h)}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((c, i) => `<td style="${TD}${i === 0 && firstLeft ? " text-align:left;" : ""}">${c}</td>`).join("")}</tr>`).join("")}</table>`;
  const empty = (t) => `<div data-pdf-block="true" style="font-size:10.5px; color:${R.muted}; margin-bottom:6px;">${esc(t)}</div>`;
  const note = (t) => `<div data-pdf-block="true" style="font-size:9.5px; color:${R.muted}; line-height:1.5; margin:4px 0 8px;">${t}</div>`;
  const bar = (share, color = theme.bar) => `<div style="display:flex; align-items:center; gap:6px; justify-content:flex-end;"><div style="width:90px; height:7px; border-radius:4px; background:${R.track}; overflow:hidden;"><div style="width:${Math.round(Math.min(1, share) * 100)}%; height:100%; background:${color};"></div></div><span>${Math.round(share * 100)}%</span></div>`;

  const header = `<div data-pdf-block="true" style="background:${theme.header}; color:${theme.onHeader}; border-radius:14px; padding:16px 20px; margin-bottom:${theme.stripe ? 0 : 12}px;">
      <div style="font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; opacity:0.8;">Informe · ${esc(roleDef.label)}${competitionOf(m) ? ` · ${esc(competitionOf(m))}` : ""} · ${esc(dateStr)}</div>
      <div style="display:flex; align-items:center; gap:12px; margin-top:6px; flex-wrap:wrap;">
        <span style="font-size:18px; font-weight:800;">${esc(teamName || "Equipo")}</span>
        <span style="background:${R.bg}; color:${R.ink}; border-radius:9px; padding:4px 12px; font-size:18px; font-weight:800;">${esc(m.teamGoals ?? 0)} - ${esc(m.rivalScore ?? 0)}</span>
        <span style="font-size:18px; font-weight:800;">${esc(m.rivalName || "Rival")}</span>
      </div>
      <div style="font-size:10px; opacity:0.85; margin-top:4px;">${esc(roleDef.hint)}</div>
    </div>${theme.stripe ? `<div style="height:4px; background:${theme.stripe}; border-radius:0 0 4px 4px; margin-bottom:12px;"></div>` : ""}`;

  const vsAvgRows = (keys) => keys.map((k) => {
    const d = metricDef(k);
    const v = mm[k], a = avg[k];
    let cmp = "—";
    if (v !== null && v !== undefined && a !== null && a !== undefined && others.length >= 2) {
      const delta = v - a;
      const good = delta === 0 ? null : (delta > 0) === (d.better === "high");
      cmp = `<b style="color:${good === null ? R.inkSoft : good ? R.positive : R.negative};">${delta > 0 ? "▲" : delta < 0 ? "▼" : "="} ${d.pct ? `${Math.round(Math.abs(delta) * 100)} pts` : String(Math.round(Math.abs(delta) * 10) / 10).replace(".", ",")}</b>`;
    }
    return [esc(d.label), fmtMetric(k, v), fmtMetric(k, a), cmp];
  });
  const vsAvg = (keys) => (others.length >= 2 ? table(["Dato", "Este partido", "Media", "Diferencia"], vsAvgRows(keys)) : empty("Hacen falta al menos 2 partidos más para comparar con la media."));

  const goalsList = () => {
    const gl = [...(m.goalEvents || [])].sort((a, b) => (Number(a.half) || 1) - (Number(b.half) || 1) || (b.remaining ?? 0) - (a.remaining ?? 0));
    if (!gl.length) return empty("Sin goles.");
    return table(["Parte", "Reloj", "Gol", "Fase", "Autor / asistencia", "En pista"], gl.map((g) => [
      esc(halfLabel(Number(g.half) || 1)), typeof g.remaining === "number" ? fmtClock(g.remaining) : "—",
      `<b style="color:${g.type === "for" ? R.positive : R.negative};">${g.type === "for" ? "A favor" : "En contra"}</b>`, esc(phaseLabel(g.phase)),
      esc(g.type === "for" ? (g.ownGoal ? "Autogol del rival" : [g.authorName, g.assistName ? `asist. ${g.assistName}` : ""].filter(Boolean).join(" · ")) : ""),
      esc((g.onCourt || []).map((p) => p.number).join("-")),
    ]));
  };

  const sections = [];
  if (role === "entrenador") {
    const facts = keyFacts(m, season);
    sections.push(H("Claves del partido"), facts.length
      ? `<div data-pdf-block="true">${facts.map((f) => `<div style="display:flex; gap:8px; align-items:flex-start; font-size:12px; line-height:1.45; margin-bottom:6px;"><span style="flex-shrink:0; width:8px; height:8px; border-radius:50%; margin-top:5px; background:${TONE[f.tone] || R.inkSoft};"></span><span>${esc(f.text)}</span></div>`).join("")}</div>`
      : empty("No hay nada que destaque claramente frente a la media."));
    if (String(m.conclusions || "").trim()) sections.push(H("Conclusiones"), `<div data-pdf-block="true" style="font-size:11px; line-height:1.55; white-space:pre-wrap; border-left:4px solid ${theme.bar}; padding:6px 10px;">${esc(String(m.conclusions).trim())}</div>`);
    const obj = evaluateObjectives(objectives, m);
    if (obj.length) sections.push(H("Objetivos"), table(["Objetivo", "Resultado", "Cumplido"], obj.map((o) => [esc(`${metricDef(o.metric) ? metricDef(o.metric).label : o.metric} ${o.op === "<=" ? "≤" : "≥"} ${o.value}`), fmtMetric(o.metric, o.actual), o.ok === null ? "—" : `<b style="color:${o.ok ? R.positive : R.negative};">${o.ok ? "Sí" : "No"}</b>`])));
    sections.push(H("Goles"), goalsList());
    const c = concededBreakdown([m]);
    if (c.total) sections.push(H("Qué nos marcan"), table(["Fase", "Goles en contra", "%"], c.phases.map((p) => [esc(p.label), p.count, `${Math.round(p.share * 100)}%`])));
    const dt = dangerousTurnovers(m), rs = recoveryToShot(m);
    sections.push(H("Pérdidas y recuperaciones decisivas"), note(`Pérdidas en campo propio que acabaron en gol rival en ≤20": <b>${dt.length}</b>. Recuperaciones que acabaron en tiro o gol en ≤10": <b>${rs.length}</b>.`),
      dt.length || rs.length ? table(["Parte", "Reloj", "Qué", "Jugador", "Zona", "Segundos hasta"], [
        ...dt.map((e) => [esc(halfLabel(e.half)), fmtClock(e.remaining), `<b style="color:${R.negative};">Pérdida → gol rival</b>`, esc(e.playerName || ""), esc(e.zone || ""), e.gap]),
        ...rs.map((e) => [esc(halfLabel(e.half)), fmtClock(e.remaining), `<b style="color:${R.positive};">Recuperación → ${e.shot.kind === "goalFor" ? "gol" : "tiro"}</b>`, esc(e.playerName || ""), esc(e.zone || ""), e.gap]),
      ]) : "");
    sections.push(H("Comparado con la media"), vsAvg(["finishes", "efficiency", "turnovers", "turnoversOwnHalf", "recoveries", "fouls"]));
  }
  if (role === "analista") {
    const rows = matchEventsRows(m);
    sections.push(H("Línea de tiempo"), note("«Segundo» es el tiempo de juego desde el inicio del partido (sumando partes): sirve para buscar cada acción en el vídeo."),
      rows.length ? table(["Parte", "Reloj", "Segundo", "Evento", "Jugador", "Zona", "Fase / detalle"], rows.map((r) => [esc(halfLabel(r.half)), typeof r.remaining === "number" ? fmtClock(r.remaining) : "—", r.t ?? "—", esc(r.tipo), esc([r.dorsal, r.jugador].filter((x) => x !== "" && x != null).join(" · ")), esc(r.zona), esc([r.fase, r.detalle].filter(Boolean).join(" · "))])) : empty("Sin eventos con minuto."));
    const z = zoneEfficiency([m]).filter((r) => r.finishes);
    sections.push(H("Finalizaciones por zona"), z.length ? table(["Zona", "Goles", "A puerta", "Fuera", "Palo", "Eficacia"], z.map((r) => [esc(r.label), r.goals, r.shotsOn, r.shotsOff, r.shotsPost, r.pct === null ? "—" : `${Math.round(r.pct * 100)}%`])) : empty("Sin finalizaciones con zona."));
    sections.push(H("Secuencias"), note(`Recuperación → tiro o gol en ≤10": <b>${recoveryToShot(m).length}</b> · Pérdida en campo propio → gol rival en ≤20": <b>${dangerousTurnovers(m).length}</b>.`));
    sections.push(H("Comparado con la media"), vsAvg(METRICS.map((d) => d.key)));
  }
  if (role === "direccion") {
    const ms = minutesShare([m]);
    sections.push(H("Minutos de cada convocado"), ms.length ? table(["Jugador", "Minutos", "% del partido"], ms.map((p) => [esc(`${p.number} · ${p.name}`), p.minutes, bar(p.share)])) : empty("Sin convocatoria guardada."));
    const nojuega = ms.filter((p) => p.played === 0);
    if (nojuega.length) sections.push(note(`Convocados sin minutos: <b>${esc(nojuega.map((p) => p.name).join(", "))}</b>.`));
    const season2 = minutesShare(season);
    if (season.length > 1) sections.push(H("Reparto de minutos en la temporada"), table(["Jugador", "Convocatorias", "Partidos jugados", "% de minutos posibles"], season2.map((p) => [esc(`${p.number} · ${p.name}`), p.called, p.played, bar(p.share)])));
    const d = disciplineTable([m]);
    sections.push(H("Disciplina"), d.length ? table(["Jugador", "Faltas", "Amarillas", "Rojas"], d.map((x) => [esc(`${x.number} · ${x.name}`), x.fouls, x.yellow, x.red])) : empty("Sin faltas ni tarjetas anotadas."));
    sections.push(H("Comparado con la media"), vsAvg(["gf", "ga", "finishes", "turnovers", "recoveries", "fouls"]));
  }
  if (role === "fisico") {
    const sp = stintProfile(m);
    sections.push(H("Tandas en pista"), note("Una tanda es cada vez que un jugador entra y sale de pista. El descanso es el tiempo en el banquillo entre dos tandas de la misma parte. Solo tiempo de juego: sin GPS ni pulsómetro."),
      sp.length ? table(["Jugador", "Minutos", "Tandas", "Media", "Más larga", "Descanso medio", "Tandas ≥4'"], sp.map((p) => [esc(`${p.number} · ${p.name}`), fmtMin(p.total), p.count, fmtMin(Math.round(p.mean)), `<b style="color:${p.max >= 360 ? R.warning : R.ink};">${fmtMin(p.max)}</b>`, p.restMean === null ? "—" : fmtMin(Math.round(p.restMean)), p.longStints])) : empty("Este partido no tiene rotaciones guardadas."));
    const gk = goalkeeperRows(m);
    if (gk.length) sections.push(H("Portero"), table(["Portero", "Minutos", "Paradas", "Encajados", "% paradas", "1x1", "Salidas", "Saques ✓/✗"], gk.map((g) => [esc(`${g.number} · ${g.name}`), fmtMin(g.seconds), g.saves, g.conceded, g.savePct === null ? "—" : `${Math.round(g.savePct * 100)}%`, g.oneVsOne, g.interceptions, `${g.distOk}/${g.distBad}`])));
    const ref = new Date(new Date(m.date).getTime() + 86400000);
    const lw = loadWindows(season.length ? season : [m], trainings, ref).filter((p) => p.m28 > 0);
    sections.push(H("Carga acumulada (minutos)"), note("Minutos de partido y entreno en los 7, 14 y 28 días hasta este partido. Aviso cuando la última semana supera en un 30% la media semanal del último mes. Con RPE anotado, también la carga (RPE × minutos)."),
      lw.length ? table(["Jugador", "7 días", "14 días", "28 días", "Media semanal", "Semana / media", "RPE × min (7 d)"], lw.map((p) => [esc(`${p.number ?? ""} · ${p.name}`), p.m7, p.m14, p.m28, p.weeklyAvg, p.ratio === null ? "—" : `<b style="color:${p.alert ? R.negative : R.ink};">${String(p.ratio).replace(".", ",")}${p.alert ? " ▲" : ""}</b>`, p.s7 ? Math.round(p.s7) : "—"])) : empty("Sin minutos en las últimas 4 semanas."));
    if (m.rpe && Object.keys(m.rpe).length) {
      const rows = (m.players || []).filter((p) => m.rpe[p.id] != null).map((p) => [esc(`${p.number} · ${p.name}`), m.rpe[p.id], fmtMin(p.seconds || 0), Math.round((m.rpe[p.id] * (p.seconds || 0)) / 60)]);
      if (rows.length) sections.push(H("Esfuerzo percibido (RPE)"), table(["Jugador", "RPE", "Minutos", "Carga"], rows));
    }
  }
  if (role === "anotador") {
    const h = dataHealth(m);
    const pct = (v) => (v === null ? "—" : `${Math.round(v * 100)}%`);
    const color = { verde: R.positive, ambar: R.warning, rojo: R.negative }[h.level];
    sections.push(H("Calidad del dato"), `<div data-pdf-block="true" style="display:inline-block; font-size:11px; font-weight:800; color:${R.onDark}; background:${color}; border-radius:6px; padding:3px 10px; margin-bottom:8px;">${h.level === "verde" ? "Bien" : h.level === "ambar" ? "Revisar" : "Incompleto"}</div>`,
      table(["Comprobación", "Resultado"], [["Acciones con zona", pct(h.zonedWithZone)], ["Goles con fase", pct(h.goalsWithPhase)], ["Goles a favor con zona", pct(h.goalsForWithZone)], ["Eventos con minuto", pct(h.eventsWithTime)], ["Rotaciones guardadas", h.hasRotations ? "Sí" : "No"]]));
    sections.push(H("Avisos"), h.checks.length ? `<div data-pdf-block="true">${h.checks.map((c) => `<div style="font-size:10.5px; margin-bottom:4px; color:${c.level === "warn" ? R.warning : R.inkSoft};">${c.level === "warn" ? "Aviso" : "Nota"}: ${esc(c.text)}</div>`).join("")}</div>` : empty("Ningún aviso."));
    if (m.acta) {
      const a = compareWithActa(m, m.acta);
      if (a.length) sections.push(H("Cotejo con el acta"), table(["Dato", "Anotado", "Acta", ""], a.map((r) => [esc(r.label), r.ours, r.acta, `<b style="color:${r.ok ? R.positive : R.negative};">${r.ok ? "Cuadra" : "No cuadra"}</b>`])));
    }
    const counts = {};
    matchEventsRows(m).forEach((r) => { counts[r.tipo] = (counts[r.tipo] || 0) + 1; });
    sections.push(H("Eventos anotados"), table(["Tipo", "Cantidad"], Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => [esc(k), v])));
  }

  const footer = `<div style="display:flex; justify-content:space-between; gap:8px; margin-top:24px; padding-top:8px; border-top:1px solid ${R.line}; font-size:9px; color:${R.subtle};"><span>${esc(teamName || "Equipo")} · ${esc(m.rivalName || "Rival")} · ${esc(dateStr)} · ${esc(roleDef.label)}</span><span style="font-weight:700; color:${R.muted};">${esc(BRAND.name)}</span></div>`;
  return `<div style="font-family: Arial, Helvetica, sans-serif; color:${R.ink}; padding:24px; max-width:900px; margin:0 auto; background:${R.bg};">${header}${sections.join("")}${footer}</div>`;
}
