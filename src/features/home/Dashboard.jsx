/* Inicio como panel del equipo (DISENO-TRANSFORMACION.md §9.2).
 * Todas las cifras salen de datos que la app ya guarda y de funciones ya
 * probadas (seasonSummary, seasonTable, selectMatches): no hay cálculos nuevos. */
import { useMemo, useState } from "react";
import { ArrowRight, DatabaseBackup, Download, Dumbbell, Play, RefreshCw, Settings, Trophy } from "lucide-react";
import { T } from "../../theme/theme.js";
import { seasonSummary } from "../../analisis.js";
import { seasonTable, selectMatches } from "../../jugadores.js";
import { CrestAvatar } from "../../ui/common.jsx";
import { Button, Card, EmptyState, Eyebrow, Notice, Segmented, StatCard } from "../../ui/kit.jsx";

const fmt1 = (n) => (Math.round(n * 10) / 10).toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const OUTCOME = { V: { label: "Victoria", color: T.positive }, E: { label: "Empate", color: T.dim }, D: { label: "Derrota", color: T.negative } };

function OutcomeChip({ outcome, size = 26 }) {
  const o = OUTCOME[outcome];
  return (
    <span title={o.label} aria-label={o.label} style={{ width: size, height: size, borderRadius: 7, background: o.color, color: T.ink, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
      {outcome}
    </span>
  );
}

/* Diferencia de goles de cada partido, en barras desde el cero. */
function GoalDiffChart({ results }) {
  const W = 640, H = 180, L = 30, R = 8, TOP = 12, B = 28;
  const max = Math.max(1, ...results.map((r) => Math.abs(r.gf - r.ga)));
  const y = (v) => TOP + ((max - v) / (2 * max)) * (H - TOP - B);
  const bw = (W - L - R) / Math.max(results.length, 1);
  const ticks = max <= 2 ? [-max, 0, max] : [-max, -Math.round(max / 2), 0, Math.round(max / 2), max];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Diferencia de goles en cada partido del periodo" style={{ width: "100%", height: "auto", display: "block" }}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={v === 0 ? T.surface3 : T.line} strokeWidth="1" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill={T.dim}>{v > 0 ? `+${v}` : v}</text>
        </g>
      ))}
      {results.map((r, i) => {
        const d = r.gf - r.ga;
        const w = Math.min(bw * 0.6, 40), x = L + i * bw + (bw - w) / 2;
        const top = d >= 0 ? y(d) : y(0);
        const h = Math.max(2, Math.abs(y(d) - y(0)));
        const day = new Date(r.date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
        return (
          <g key={r.date}>
            <title>{`${day} · ${r.rival}: ${r.gf}-${r.ga}`}</title>
            <rect x={x} y={top} width={w} height={h} rx="3" fill={d > 0 ? T.positive : d < 0 ? T.negative : T.dim} />
            {results.length <= 14 && <text x={x + w / 2} y={H - 9} textAnchor="middle" fontSize="10" fill={T.dim}>{day}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function RankList({ title, rows, valueOf, empty }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Eyebrow>{title}</Eyebrow>
      {!rows.length ? <div style={{ fontSize: 13, color: T.dim }}>{empty}</div> : rows.map((p, i) => (
        <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span className="display" style={{ width: 18, fontSize: 16, color: i === 0 ? T.accent : T.dim, fontWeight: 700 }}>{i + 1}</span>
          <span className="display" style={{ width: 28, fontSize: 18, fontWeight: 700, color: T.dim }}>{p.number}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
          <span className="display" style={{ fontSize: 20, fontWeight: 700 }}>{valueOf(p)}</span>
        </div>
      ))}
    </Card>
  );
}

export function Dashboard({
  team, onPickCrest, onReframeCrest, onRemoveCrest, onOpenTeams, teamCount,
  matches, trainings, onNewMatch, onNewTraining, onGoMatches,
  matchInProgress, onResumeMatch, updateReady, onApplyUpdate,
  lastBackupAt, onOpenBackup, standalone, canInstall, onInstall, onGoTeam,
}) {
  const [period, setPeriod] = useState("all");
  const chosen = useMemo(() => (period === "all" ? selectMatches(matches) : selectMatches(matches, { mode: "last", count: 5 })), [matches, period]);
  const s = useMemo(() => seasonSummary(chosen), [chosen]);
  const table = useMemo(() => seasonTable(chosen), [chosen]);
  const scorers = table.filter((p) => p.total.goals > 0).sort((a, b) => b.total.goals - a.total.goals || b.total.seconds - a.total.seconds).slice(0, 3);
  const minutes = [...table].filter((p) => p.total.seconds > 0).sort((a, b) => b.total.seconds - a.total.seconds).slice(0, 3);
  const last = s.results[s.results.length - 1];
  const lastAll = seasonSummary(matches).results.slice(-1)[0];
  const diff = s.gf - s.ga;

  // Aviso de copia de seguridad: los datos solo viven en este dispositivo.
  const backupDays = lastBackupAt ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / 86400000) : null;
  const backupStale = backupDays === null || backupDays >= 7;

  return (
    <div className="fadein" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Equipo activo */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <CrestAvatar crest={team.crest} size={64} onPick={onPickCrest} onReframe={onReframeCrest} onRemove={onRemoveCrest} shape="circle" />
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <h1 className="display" style={{ margin: 0, fontSize: 32, fontWeight: 700, lineHeight: 1.05 }}>{team.name}</h1>
          <div style={{ fontSize: 13, color: T.dim, marginTop: 4 }}>
            {[team.subtitle, `${matches.length} partido${matches.length === 1 ? "" : "s"}`, `${trainings.length} entreno${trainings.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
          </div>
        </div>
        <Button variant="ghost" size="sm" icon={Settings} onClick={onOpenTeams}>{teamCount > 1 ? `Cambiar equipo (${teamCount})` : "Gestionar equipos"}</Button>
      </div>

      {/* Avisos */}
      {(matchInProgress || updateReady || (matches.length > 0 && backupStale) || !standalone) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {matchInProgress && (
            <Notice tone="accent" icon={Play} onClick={onResumeMatch} action={<Button size="sm" variant="primary" icon={ArrowRight} onClick={(e) => { e.stopPropagation(); onResumeMatch(); }}>Continuar</Button>}>
              <strong>Tienes un partido a medias.</strong> Sigue donde lo dejaste.
            </Notice>
          )}
          {updateReady && (
            <Notice tone="info" icon={RefreshCw} action={<Button size="sm" variant="secondary" onClick={onApplyUpdate}>Actualizar ahora</Button>}>
              Hay una versión nueva. Se aplica al pulsar, nunca con el reloj en marcha.
            </Notice>
          )}
          {matches.length > 0 && backupStale && (
            <Notice tone="warning" icon={DatabaseBackup} action={<Button size="sm" variant="secondary" icon={DatabaseBackup} onClick={onOpenBackup}>Hacer copia ahora</Button>}>
              {backupDays === null ? "Todavía no hay copia de seguridad de estos datos." : `Última copia de seguridad: hace ${backupDays} día${backupDays === 1 ? "" : "s"}.`} Los datos solo viven en este dispositivo.
            </Notice>
          )}
          {!standalone && (
            <Notice tone="info" icon={Download} action={canInstall ? <Button size="sm" variant="secondary" icon={Download} onClick={onInstall}>Instalar app</Button> : <Button size="sm" variant="ghost" onClick={onGoTeam}>Cómo instalarla</Button>}>
              Instálala en este dispositivo para usarla sin conexión en el pabellón.
            </Notice>
          )}
        </div>
      )}

      {/* Acciones principales */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Button variant="primary" size="lg" icon={Play} onClick={onNewMatch} style={{ flex: "1 1 220px" }}>Nuevo partido</Button>
        <Button variant="secondary" size="lg" icon={Dumbbell} onClick={onNewTraining} style={{ flex: "1 1 220px" }}>Nuevo entrenamiento</Button>
      </div>

      {!matches.length ? (
        <EmptyState icon={Trophy} title="Aún no hay partidos">
          Cuando finalices el primer partido, aquí verás el balance, los goles, la racha y quién lleva más minutos.
        </EmptyState>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <Eyebrow>Resumen · {s.played} partido{s.played === 1 ? "" : "s"}</Eyebrow>
            <Segmented label="Periodo" value={period} onChange={setPeriod} options={[{ value: "all", label: "Temporada" }, { value: "last5", label: "Últimos 5" }]} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <StatCard label="Balance" value={`${s.wins}-${s.draws}-${s.losses}`} detail={`${s.points} puntos de ${s.played * 3}`} />
            <StatCard label="Goles" value={`${s.gf} · ${s.ga}`} detail={`${diff > 0 ? "+" : ""}${diff} de diferencia`} detailColor={diff > 0 ? T.positive : diff < 0 ? T.negative : T.dim} />
            <StatCard label="Goles por partido" value={fmt1(s.gf / s.played)} detail={`${fmt1(s.ga / s.played)} en contra`} />
            <StatCard label="Racha" value={null} detail="más reciente a la derecha">
              <div style={{ display: "flex", gap: 5, minHeight: 34, alignItems: "center" }}>
                {s.results.slice(-5).map((r) => <OutcomeChip key={r.date} outcome={r.outcome} size={30} />)}
              </div>
            </StatCard>
          </div>

          <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Eyebrow>Diferencia de goles por partido</Eyebrow>
            <GoalDiffChart results={s.results} />
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {(last || lastAll) && (() => {
              const r = last || lastAll;
              return (
                <Card onClick={onGoMatches} aria-label="Ver el último partido en Partidos" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Eyebrow>Último partido</Eyebrow>
                  <div style={{ fontSize: 12, color: T.dim }}>{new Date(r.date).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "long" })}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <OutcomeChip outcome={r.outcome} />
                    <span className="display" style={{ fontSize: 30, fontWeight: 700 }}>{r.gf} – {r.ga}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>vs {r.rival}</div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: T.accent, fontWeight: 600 }}>Ver partido e informe <ArrowRight size={14} aria-hidden="true" /></span>
                </Card>
              );
            })()}
            <RankList title="Goleadores" rows={scorers} valueOf={(p) => p.total.goals} empty="Sin goles con autor en este periodo." />
            <RankList title="Más minutos" rows={minutes} valueOf={(p) => `${Math.round(p.total.seconds / 60)}'`} empty="Sin minutos registrados." />
          </div>
        </>
      )}
    </div>
  );
}
