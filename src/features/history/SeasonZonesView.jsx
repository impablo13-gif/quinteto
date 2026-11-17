/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { useMemo, useState } from "react";
import { FileSpreadsheet, MapPin } from "lucide-react";
import { FINE_ROW_NAMES, ZONE_ACTIONS, collectZoneEvents, countByZone, eventsToCsv, filterEvents, isFineKey, playersOf } from "../../zonas.js";
import { T, ghostBtn, alpha } from "../../theme/theme.js";
import { FONTS } from "../../brand/tokens.js";
import { DISCIPLINE_LABEL, PITCH_ZONES, PITCH_ZONES_FINE, PITCH_ZONE_LABEL, ZONED_LABEL, ZONE_ACTION_RGB, ZONE_LOW_DATA } from "../../domain/catalog.js";
import { sanitizeFileName } from "../../lib/files.js";
import { SubTabBtn } from "../../ui/common.jsx";
export function SeasonZonesView({ matches, teamName }) {
  const [action, setAction] = useState("finish");
  const [playerKey, setPlayerKey] = useState("all");
  const [half, setHalf] = useState("all");
  const [matchDate, setMatchDate] = useState("all");
  const [resolutionPref, setResolutionPref] = useState(null); // "fine" (18) | "coarse" (9) | null = la mejor disponible

  const { events: allEvents, withoutZone } = useMemo(() => collectZoneEvents(matches), [matches]);
  const players = useMemo(() => playersOf(allEvents), [allEvents]);
  const filtered = useMemo(() => filterEvents(allEvents, { action, playerKey, half, matchDate }), [allEvents, action, playerKey, half, matchDate]);

  // Sin elegir nada, 18 zonas si ya hay algo registrado en 18; si todo es de
  // antes (3x3), 9, que es lo unico que se puede mostrar sin inventar.
  const hasFine = useMemo(() => allEvents.some((e) => isFineKey(e.zone)), [allEvents]);
  const resolution = resolutionPref || (hasFine ? "fine" : "coarse");
  const fine = resolution === "fine";
  const zones = fine ? PITCH_ZONES_FINE : PITCH_ZONES;
  const ROWS = fine ? 6 : 3;
  const { counts, share, total, max, excluded } = useMemo(() => countByZone(filtered, resolution), [filtered, resolution]);

  const actionDef = ZONE_ACTIONS.find((a) => a.key === action) || ZONE_ACTIONS[0];
  const rgb = ZONE_ACTION_RGB[action] || ZONE_ACTION_RGB.finish;
  const sortedMatches = [...matches].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Por franjas (de ataque a defensa) y por carriles: la lectura tactica rapida.
  const rowNames = fine ? FINE_ROW_NAMES : ["Defensa", "Medio", "Ataque"];
  const lineTotals = rowNames
    .map((name, row) => ({ label: name, n: zones.filter((z) => z.row === row).reduce((s, z) => s + counts[z.key], 0) }))
    .reverse(); // de la zona rival (arriba) a la propia
  const laneTotals = ["Izquierda", "Centro", "Derecha"].map((label, col) => ({ label, n: zones.filter((z) => z.col === col).reduce((s, z) => s + counts[z.key], 0) }));

  const exportCsv = () => {
    const csv = eventsToCsv(filtered, {
      zoneLabel: (k) => PITCH_ZONE_LABEL[k] || k,
      actionLabel: (k) => (k === "goal" ? "Gol" : ZONED_LABEL[k] || DISCIPLINE_LABEL[k] || k),
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFileName(teamName) || "equipo"}_zonas_${action}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  if (!matches.length) {
    return <div style={{ padding: 20, textAlign: "center", color: T.dim, fontSize: 13, border: `1px dashed ${T.line}`, borderRadius: 12 }}>Todavía no hay partidos guardados para calcular el mapa de zonas.</div>;
  }

  const W = 300, H = 420, pad = 20;
  const courtW = W - pad * 2, courtH = H - pad * 2;
  const colW = courtW / 3, rowH = courtH / ROWS;
  const selectStyle = { background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, color: T.text, padding: "8px 10px", width: "100%" };
  const labelStyle = { fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };

  return (
    <div className="fadein">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: T.text, textTransform: "uppercase" }}>
          <MapPin size={14} /> Mapa de zonas de la temporada
        </div>
        <button onClick={exportCsv} disabled={!filtered.length} title="Exporta todos los registros del filtro, con su zona y la resolución con la que se anotaron" style={{ ...ghostBtn, borderColor: filtered.length ? T.accent : T.line, color: filtered.length ? T.accent : T.dim, opacity: filtered.length ? 1 : 0.5, cursor: filtered.length ? "pointer" : "default" }}>
          <FileSpreadsheet size={14} /> Exportar CSV
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 12 }}>
        <label><span style={labelStyle}>Acción</span>
          <select value={action} onChange={(e) => setAction(e.target.value)} style={selectStyle}>
            {ZONE_ACTIONS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </label>
        <label><span style={labelStyle}>Jugador</span>
          <select value={playerKey} onChange={(e) => setPlayerKey(e.target.value)} style={selectStyle}>
            <option value="all">Todo el equipo</option>
            {players.map((p) => <option key={p.key} value={p.key}>#{p.number} {p.name}</option>)}
          </select>
        </label>
        <label><span style={labelStyle}>Parte</span>
          <select value={half} onChange={(e) => setHalf(e.target.value)} style={selectStyle}>
            <option value="all">Todo el partido</option>
            <option value="1">1ª parte</option>
            <option value="2">2ª parte</option>
            <option value="ot">Prórroga</option>
          </select>
        </label>
        <label><span style={labelStyle}>Partido</span>
          <select value={matchDate} onChange={(e) => setMatchDate(e.target.value)} style={selectStyle}>
            <option value="all">Toda la temporada ({matches.length})</option>
            {sortedMatches.map((m) => <option key={m.date} value={m.date}>{new Date(m.date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })} vs {m.rivalName || "Rival"}</option>)}
          </select>
        </label>
      </div>

      <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.5, marginBottom: 12 }}>
        Cada zona cuenta cuántas veces se anotó <strong style={{ color: T.text }}>{actionDef.label.toLowerCase()}</strong> en ella. La zona se marca a mano al anotar la acción:
        es una <strong style={{ color: T.text }}>distribución por zonas</strong>, no la posición exacta ni la ocupación de la pista.
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: 0.4 }}>Resolución</span>
        <SubTabBtn active={fine} onClick={() => setResolutionPref("fine")} label="18 zonas" />
        <SubTabBtn active={!fine} onClick={() => setResolutionPref("coarse")} label="9 zonas" />
      </div>

      {fine && excluded > 0 && (
        <div style={{ background: alpha(T.info, 0.12), border: `1px solid ${T.info}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
          {excluded} registro{excluded === 1 ? "" : "s"} de antes del cambio a 18 zonas (se anotaba en 9) no se puede{excluded === 1 ? "" : "n"} repartir en las 18 y no sale{excluded === 1 ? "" : "n"} aquí.
          Con <strong>9 zonas</strong> se ve todo junto.
        </div>
      )}
      {!fine && hasFine && (
        <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.5, marginBottom: 12 }}>
          En 9 zonas, lo registrado en 18 se junta en la zona de 9 que lo contiene (filas 1-2 → defensa, 3-4 → medio, 5-6 → ataque).
        </div>
      )}

      {total > 0 && total < ZONE_LOW_DATA && (
        <div style={{ background: alpha(T.warning, 0.12), border: `1px solid ${T.warning}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, marginBottom: 12 }}>
          Solo hay {total} registro{total === 1 ? "" : "s"} con este filtro: tómalo como orientación, no como tendencia.
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 300px", maxWidth: 380, margin: "0 auto" }}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Mapa de zonas: ${total} registros de ${actionDef.label.toLowerCase()}`} style={{ width: "100%", height: "auto", display: "block", background: T.surface, borderRadius: 12, border: `1px solid ${T.line}` }}>
            <rect x={pad} y={pad} width={courtW} height={courtH} fill="none" stroke={T.line} strokeWidth="2" rx="4" />
            <line x1={pad} y1={H / 2} x2={W - pad} y2={H / 2} stroke={T.line} strokeWidth="2" />
            <circle cx={W / 2} cy={H / 2} r="26" fill="none" stroke={T.line} strokeWidth="2" />
            <path d={`M ${pad + 50} ${H - pad} A 40 40 0 0 1 ${W - pad - 50} ${H - pad}`} fill="none" stroke={T.line} strokeWidth="2" />
            <path d={`M ${pad + 50} ${pad} A 40 40 0 0 0 ${W - pad - 50} ${pad}`} fill="none" stroke={T.line} strokeWidth="2" />
            <rect x={W / 2 - 16} y={H - pad - 3} width="32" height="6" fill={T.dim} />
            <rect x={W / 2 - 16} y={pad - 3} width="32" height="6" fill={T.dim} />
            {zones.map((z) => {
              const n = counts[z.key];
              const x = pad + z.col * colW, y = pad + (ROWS - 1 - z.row) * rowH;
              const fillAlpha = n > 0 && max > 0 ? 0.14 + 0.76 * (n / max) : 0.04;
              const inset = fine ? 2 : 3;
              return (
                <g key={z.key}>
                  <title>{`${PITCH_ZONE_LABEL[z.key]}: ${n} (${Math.round(share[z.key] * 100)} %)`}</title>
                  <rect x={x + inset} y={y + inset} width={colW - inset * 2} height={rowH - inset * 2} rx={fine ? 8 : 10} fill={`rgba(${rgb},${fillAlpha})`} stroke={`rgba(${rgb},${n > 0 ? 0.9 : 0.25})`} strokeWidth="1.5" />
                  <text x={x + colW / 2} y={y + rowH / 2 - (fine ? 5 : 2)} textAnchor="middle" dominantBaseline="middle" fill={n > 0 ? (fillAlpha > 0.55 ? T.ink : T.text) : T.dim} fontSize={fine ? 20 : 26} fontWeight="800" style={{ fontFamily: FONTS.display }}>{n}</text>
                  <text x={x + colW / 2} y={y + rowH / 2 + (fine ? 14 : 22)} textAnchor="middle" fill={n > 0 ? (fillAlpha > 0.55 ? T.ink : T.text) : T.dim} fontSize={fine ? 10 : 11} fontWeight="600">{total ? `${Math.round(share[z.key] * 100)} %` : "—"}</text>
                </g>
              );
            })}
            <text x={W / 2} y={12} textAnchor="middle" fill={T.dim} fontSize="9" fontWeight="700" letterSpacing="1">PORTERÍA RIVAL</text>
            <text x={W / 2} y={H - 4} textAnchor="middle" fill={T.dim} fontSize="9" fontWeight="700" letterSpacing="1">VUESTRA PORTERÍA</text>
          </svg>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 11, color: T.dim }}>
            <span>0</span>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: `linear-gradient(90deg, rgba(${rgb},0.08), rgba(${rgb},0.9))` }} />
            <span>{max}</span>
            <span style={{ marginLeft: 6 }}>n = <strong style={{ color: T.text }}>{total}</strong></span>
          </div>
        </div>

        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          {[{ title: fine ? "Por franja (de la portería rival a la vuestra)" : "Por línea (de ataque a defensa)", rows: lineTotals }, { title: "Por carril", rows: laneTotals }].map((blk) => (
            <div key={blk.title} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.dim, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>{blk.title}</div>
              {blk.rows.map((r) => {
                const pct = total ? Math.round((r.n / total) * 100) : 0;
                return (
                  <div key={r.label} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span>{r.label}</span><span><strong>{r.n}</strong> <span style={{ color: T.dim }}>· {pct} %</span></span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: T.surface3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: `rgb(${rgb})` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {!total && (
            <div style={{ fontSize: 12, color: T.dim, lineHeight: 1.5, border: `1px dashed ${T.line}`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
              No hay registros con zona para este filtro. Las acciones se mapean cuando, al anotarlas en el partido, se toca la zona del campo.
            </div>
          )}

          {withoutZone > 0 && (
            <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.5 }}>
              {withoutZone} acción{withoutZone === 1 ? "" : "es"} de la temporada {withoutZone === 1 ? "se anotó" : "se anotaron"} sin zona (por ejemplo, de partidos antiguos) y no {withoutZone === 1 ? "sale" : "salen"} en el mapa.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
