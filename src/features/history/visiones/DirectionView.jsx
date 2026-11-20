/* Visión de la dirección deportiva: reparto de minutos, disciplina, evolución
 * de cada jugador por temporada y el club entero (todos los equipos). */
import { useEffect, useState } from "react";
import { T } from "../../../theme/theme.js";
import { storage } from "../../../storage.js";
import { seasonSummary } from "../../../analisis.js";
import { disciplineTable, minutesShare, playerSeasons } from "../../../domain/insights.js";
import { Empty, Section, ShareBar, Table, labelStyle, selectStyle } from "./shared.jsx";

function useClubMatches(teams) {
  const [data, setData] = useState(null);
  const ids = (teams || []).map((t) => t.id).join(",");
  useEffect(() => {
    let alive = true;
    (async () => {
      const out = [];
      for (const t of teams || []) {
        const list = [];
        try {
          const r = await storage.list(`matches:${t.id}:`);
          for (const k of (r && r.keys) || []) { try { const v = await storage.get(k); if (v && v.value) list.push(JSON.parse(v.value)); } catch (e) {} }
        } catch (e) {}
        out.push({ team: t, matches: list });
      }
      if (alive) setData(out);
    })();
    return () => { alive = false; };
  }, [ids]);
  return data;
}

export function DirectionView({ matches, teams }) {
  const [threshold, setThreshold] = useState(0.25);
  const share = minutesShare(matches);
  const disc = disciplineTable(matches);
  const people = share.map((p) => ({ key: p.key, label: `${p.number} · ${p.name}`, name: p.name, number: p.number }));
  const [who, setWho] = useState("");
  const sel = people.find((p) => p.key === who) || people[0];
  const evo = sel ? playerSeasons(matches, sel.name, sel.number) : [];
  const club = useClubMatches(teams);
  const below = share.filter((p) => p.share < threshold);

  return (
    <div className="fadein">
      <Section title="Reparto de minutos" hint="De los minutos posibles en los partidos en que fue convocado, cuántos jugó. En formación, clave para ver si todos tienen su sitio."
        right={<label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.dim }}>Aviso por debajo de
          <select value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} style={selectStyle}>{[0.1, 0.15, 0.2, 0.25, 0.3, 0.4].map((v) => <option key={v} value={v}>{Math.round(v * 100)}%</option>)}</select></label>}>
        {!share.length ? <Empty>Sin convocatorias guardadas.</Empty> : <>
          {below.length > 0 && <div style={{ fontSize: 12.5, marginBottom: 8, color: T.warning }}>{below.length} jugador{below.length === 1 ? "" : "es"} por debajo del {Math.round(threshold * 100)}%: {below.map((p) => p.name).join(", ")}.</div>}
          <Table head={["Jugador", "Convocatorias", "Jugados", "Minutos", "% de los posibles"]} rows={share.map((p) => [`${p.number} · ${p.name}`, p.called, p.played, p.minutes, <ShareBar key="s" value={p.share} warn={p.share < threshold} />])} />
        </>}
      </Section>

      <Section title="Disciplina" hint="Faltas y tarjetas por jugador en el periodo.">
        {disc.length ? <Table head={["Jugador", "Partidos con faltas o tarjetas", "Faltas", "Amarillas", "Rojas"]} rows={disc.map((d) => [`${d.number} · ${d.name}`, d.matches, d.fouls, d.yellow, d.red])} /> : <Empty>Sin faltas ni tarjetas.</Empty>}
      </Section>

      <Section title="Evolución por temporada" hint="El mismo jugador (por nombre y dorsal) temporada a temporada. Usa el filtro de arriba en «Todas» para ver todas las temporadas.">
        {!people.length ? <Empty>Sin jugadores.</Empty> : <>
          <label style={{ display: "block", maxWidth: 360, marginBottom: 10 }}><span style={labelStyle}>Jugador</span>
            <select value={sel ? sel.key : ""} onChange={(e) => setWho(e.target.value)} style={{ ...selectStyle, width: "100%" }}>{people.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
          </label>
          <Table head={["Temporada", "Partidos", "Minutos", "Goles", "Goles / 40'", "Asist.", "Recup.", "Pérd.", "TA", "TR"]} rows={evo.map((e) => [e.season, e.matches, e.minutes, e.goals, e.goalsPer40 === null ? "—" : String(e.goalsPer40).replace(".", ","), e.assists, e.recoveries, e.turnovers, e.yellow, e.red])} />
        </>}
      </Section>

      <Section title="El club" hint="Todos los equipos de este dispositivo, con todos sus partidos (sin filtros).">
        {!club ? <Empty>Cargando…</Empty> : <Table head={["Equipo", "Partidos", "V-E-D", "Goles", "Jugadores con minutos", "Menos del 25% de minutos"]} rows={club.map(({ team, matches: ms }) => {
          const s = seasonSummary(ms);
          const sh = minutesShare(ms);
          return [team.name, s.played, `${s.wins}-${s.draws}-${s.losses}`, `${s.gf}-${s.ga}`, sh.filter((p) => p.played > 0).length, sh.filter((p) => p.share < 0.25).length];
        })} />}
      </Section>
    </div>
  );
}
