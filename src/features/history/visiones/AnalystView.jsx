/* Visión del analista: métricas partido a partido (exportables), secuencias,
 * efectividad en 18 zonas y portero. Los datos crudos de cada partido (CSV de
 * eventos, JSON) están en Informes. */
import { useState } from "react";
import { Download } from "lucide-react";
import { T } from "../../../theme/theme.js";
import { Button, Segmented } from "../../../ui/kit.jsx";
import { METRICS, fmtMetric, goalkeeperRows, matchMetrics, zoneEfficiency } from "../../../domain/insights.js";
import { downloadTextFile, sanitizeFileName } from "../../../lib/files.js";
import { Empty, Section, Table, matchLabel } from "./shared.jsx";

const q = (v) => `"${String(v === null || v === undefined ? "" : v).replace(/"/g, '""')}"`;

export function metricsCsv(matches) {
  const sorted = [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
  const head = ["fecha", "rival", "competicion", ...METRICS.map((d) => d.key)];
  const rows = sorted.map((m) => { const mm = matchMetrics(m); return [m.date.slice(0, 10), m.rivalName || "", m.competition || "", ...METRICS.map((d) => (mm[d.key] === null || mm[d.key] === undefined ? "" : String(Math.round(mm[d.key] * 1000) / 1000).replace(".", ",")))]; });
  return "﻿" + [head, ...rows].map((r) => r.map(q).join(";")).join("\r\n");
}

export function AnalystView({ matches, teamName }) {
  const [res, setRes] = useState("fine");
  const sorted = [...matches].sort((a, b) => new Date(b.date) - new Date(a.date));
  const cols = ["gf", "ga", "finishes", "efficiency", "turnoversOwnHalf", "recoveriesOppHalf", "recoveryToShot", "dangerousTurnovers", "savePct"];
  const zones = zoneEfficiency(matches, res).filter((z) => z.finishes);
  const gk = new Map();
  matches.forEach((m) => goalkeeperRows(m).forEach((g) => {
    const k = `${g.name}#${g.number}`;
    if (!gk.has(k)) gk.set(k, { name: g.name, number: g.number, seconds: 0, saves: 0, conceded: 0, oneVsOne: 0, interceptions: 0, distOk: 0, distBad: 0 });
    const e = gk.get(k);
    ["seconds", "saves", "conceded", "oneVsOne", "interceptions", "distOk", "distBad"].forEach((f) => { e[f] += g[f]; });
  }));
  return (
    <div className="fadein">
      <Section title="Métricas partido a partido" hint="Todas las métricas calculadas, una fila por partido. El CSV trae todas las columnas para llevarlas a otra herramienta."
        right={<Button size="sm" variant="ghost" icon={Download} onClick={() => downloadTextFile(metricsCsv(matches), `${sanitizeFileName(teamName) || "equipo"}_metricas_por_partido.csv`, "text/csv;charset=utf-8")}>CSV de métricas</Button>}>
        <Table minWidth={760} head={["Partido", ...cols.map((k) => METRICS.find((d) => d.key === k).label)]} rows={sorted.map((m) => { const mm = matchMetrics(m); return [matchLabel(m), ...cols.map((k) => fmtMetric(k, mm[k]))]; })} />
      </Section>

      <Section title="Finalizaciones por zona" right={<Segmented label="Resolución" value={res} onChange={setRes} options={[{ value: "fine", label: "18 zonas" }, { value: "coarse", label: "9 zonas" }]} />}
        hint="Goles, tiros a puerta, fuera y al palo por zona, con eficacia y porcentaje entre palos. Los partidos antiguos solo tienen 9 zonas.">
        {zones.length ? <Table head={["Zona", "Goles", "A puerta", "Fuera", "Palo", "Total", "Eficacia", "Entre palos"]} rows={zones.sort((a, b) => b.finishes - a.finishes).map((z) => [z.label, z.goals, z.shotsOn, z.shotsOff, z.shotsPost, z.finishes, z.pct === null ? "—" : `${Math.round(z.pct * 100)}%`, z.onTargetPct === null ? "—" : `${Math.round(z.onTargetPct * 100)}%`])} /> : <Empty>Sin finalizaciones con zona.</Empty>}
      </Section>

      <Section title="Portero" hint="% de paradas = paradas / (paradas + goles encajados con él en pista). Saques: buenos frente al total.">
        {gk.size ? <Table head={["Portero", "Minutos", "Paradas", "Encajados", "% paradas", "1x1", "Salidas", "Saques ✓", "Saques ✗", "% saques"]} rows={[...gk.values()].map((g) => [
          `${g.number} · ${g.name}`, Math.round(g.seconds / 60), g.saves, g.conceded, g.saves + g.conceded ? `${Math.round((g.saves / (g.saves + g.conceded)) * 100)}%` : "—",
          g.oneVsOne, g.interceptions, g.distOk, g.distBad, g.distOk + g.distBad ? `${Math.round((g.distOk / (g.distOk + g.distBad)) * 100)}%` : "—",
        ])} /> : <Empty>Sin datos de portero.</Empty>}
      </Section>
      <div style={{ fontSize: 11.5, color: T.dim, lineHeight: 1.5 }}>Para cortes de vídeo: en <b>Informes</b>, cada partido tiene su CSV de eventos (con el segundo de partido) y su JSON completo.</div>
    </div>
  );
}
