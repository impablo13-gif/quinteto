/* Visión de preparación física: carga acumulada (partidos + entrenos), tandas
 * de cada partido y esfuerzo percibido (RPE) anotado después del partido.
 * Solo tiempo de juego: sin GPS ni pulsómetro, y así se dice. */
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { T } from "../../../theme/theme.js";
import { Button } from "../../../ui/kit.jsx";
import { fmtMin } from "../../../domain/match.js";
import { goalkeeperRows, loadWindows, stintProfile } from "../../../domain/insights.js";
import { Empty, MatchPicker, Section, Table, pickMatch, selectStyle } from "./shared.jsx";

export function PhysicalView({ matches, trainings, onUpdateMatch }) {
  const [date, setDate] = useState(null);
  const m = pickMatch(matches, date);
  const load = loadWindows(matches, trainings, new Date()).filter((p) => p.m28 > 0);
  const sp = m ? stintProfile(m) : [];
  const gk = m ? goalkeeperRows(m) : [];
  const played = m ? (m.players || []).filter((p) => (p.seconds || 0) > 0) : [];
  const [rpe, setRpe] = useState({});
  useEffect(() => { setRpe(m && m.rpe ? { ...m.rpe } : {}); }, [m && m.date]);
  const dirty = m && JSON.stringify(rpe) !== JSON.stringify(m.rpe || {});
  const rpeKey = (p) => p.id || `${String(p.name).trim().toLowerCase()}#${p.number}`;

  return (
    <div className="fadein">
      <Section title="Carga acumulada" hint="Minutos de partido y de entreno en los últimos 7, 14 y 28 días (hasta hoy). ▲ = la última semana supera en un 30% la media semanal del mes. Con RPE anotado, también la carga (RPE × minutos).">
        {load.length ? <Table head={["Jugador", "7 días", "14 días", "28 días", "Media semanal", "Semana / media", "RPE × min (7 d)"]} rows={load.map((p) => [
          `${p.number ?? ""} · ${p.name}`, p.m7, p.m14, p.m28, p.weeklyAvg,
          p.ratio === null ? "—" : <b key="r" style={{ color: p.alert ? T.negative : T.text }}>{String(p.ratio).replace(".", ",")}{p.alert ? " ▲" : ""}</b>,
          p.s7 ? Math.round(p.s7) : "—",
        ])} /> : <Empty>Sin partidos ni entrenos en las últimas 4 semanas.</Empty>}
      </Section>

      <Section title="Tandas del partido" hint="Una tanda es cada entrada y salida de pista. El descanso es el tiempo en el banquillo entre dos tandas de la misma parte. En ámbar, tandas de 6' o más.">
        <MatchPicker matches={matches} value={m && m.date} onChange={setDate} />
        {sp.length ? <Table head={["Jugador", "Minutos", "Tandas", "Media", "Más larga", "Descanso medio", "Tandas ≥4'"]} rows={sp.map((p) => [
          `${p.number} · ${p.name}`, fmtMin(p.total), p.count, fmtMin(Math.round(p.mean)),
          <b key="x" style={{ color: p.max >= 360 ? T.warning : T.text }}>{fmtMin(p.max)}</b>, p.restMean === null ? "—" : fmtMin(Math.round(p.restMean)), p.longStints,
        ])} /> : <Empty>Este partido no tiene rotaciones guardadas.</Empty>}
        {gk.length > 0 && <div style={{ marginTop: 10 }}><Table head={["Portero", "Minutos", "Paradas", "Encajados", "% paradas"]} rows={gk.map((g) => [`${g.number} · ${g.name}`, fmtMin(g.seconds), g.saves, g.conceded, g.savePct === null ? "—" : `${Math.round(g.savePct * 100)}%`])} /></div>}
      </Section>

      <Section title="Esfuerzo percibido (RPE)" hint="Escala 0-10 que cada jugador da al acabar el partido («¿cómo de duro ha sido?»). Se anota aquí, fuera del directo, y se guarda en el partido."
        right={m && <Button size="sm" variant="primary" icon={Save} disabled={!dirty} onClick={() => onUpdateMatch({ ...m, rpe })}>Guardar RPE</Button>}>
        {!m ? <Empty>Sin partidos.</Empty> : !played.length ? <Empty>Nadie jugó minutos en este partido.</Empty> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 8 }}>
            {played.map((p) => {
              const k = rpeKey(p);
              return (
                <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", border: `1px solid ${T.line}`, borderRadius: 10, padding: "6px 10px" }}>
                  <span style={{ fontSize: 12.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.number} · {p.name} <span style={{ color: T.dim }}>{fmtMin(p.seconds)}</span></span>
                  <select aria-label={`RPE de ${p.name}`} value={rpe[k] ?? ""} onChange={(e) => { const v = e.target.value; setRpe((r) => { const nx = { ...r }; if (v === "") delete nx[k]; else nx[k] = Number(v); return nx; }); }} style={{ ...selectStyle, minHeight: 36, padding: "4px 6px" }}>
                    <option value="">—</option>
                    {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </label>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
