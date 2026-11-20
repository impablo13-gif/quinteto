/* Visión del anotador: calidad del dato de cada partido, avisos, editor de
 * acciones después del partido (corregir jugador o zona, borrar, añadir la que
 * se olvidó) y cotejo con el acta oficial. Los goles se corrigen en Partidos. */
import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { T } from "../../../theme/theme.js";
import { Button } from "../../../ui/kit.jsx";
import { fmtClock, halfLabel, halfMinutesFor } from "../../../domain/match.js";
import { DISCIPLINE_LABEL, ZONED_LABEL, PITCH_ZONES_FINE, PITCH_ZONE_LABEL } from "../../../domain/catalog.js";
import { compareWithActa, dataHealth } from "../../../domain/insights.js";
import { addEvent, deleteEvent, editableEvents, updateEvent } from "../../../domain/eventEdit.js";
import { Empty, MatchPicker, Section, Table, labelStyle, matchLabel, pickMatch, selectStyle } from "./shared.jsx";

const LEVEL = { verde: ["Bien", T.positive], ambar: ["Revisar", T.warning], rojo: ["Incompleto", T.negative] };
const KEY_LABEL = { ...ZONED_LABEL, ...DISCIPLINE_LABEL };
const ADDABLE = ["turnovers", "recoveries", "shotsOn", "shotsOff", "shotsPost", "fouls", "foulsReceived", "yellow", "red"];
const pct = (v) => (v === null ? "—" : `${Math.round(v * 100)}%`);

function Badge({ level }) {
  const [txt, color] = LEVEL[level];
  return <span style={{ fontSize: 11, fontWeight: 800, color: T.ink, background: color, borderRadius: 6, padding: "2px 8px" }}>{txt}</span>;
}

export function ScorerView({ matches, onUpdateMatch }) {
  const [date, setDate] = useState(null);
  const m = pickMatch(matches, date);
  const sorted = [...matches].sort((a, b) => new Date(b.date) - new Date(a.date));
  const [draft, setDraft] = useState(null); // copia del partido con cambios sin guardar
  useEffect(() => { setDraft(null); }, [m && m.date]);
  const work = draft || m;
  const events = work ? editableEvents(work) : [];
  const players = work ? (work.players || []) : [];
  const [add, setAdd] = useState({ key: "turnovers", playerIdx: 0, half: 1, mm: "", ss: "", zone: "" });
  const [acta, setActa] = useState({});
  useEffect(() => { setActa((m && m.acta) || {}); }, [m && m.date]);
  const health = work ? dataHealth(work) : null;
  const zoneOptions = [{ key: "", label: "Sin zona" }, ...PITCH_ZONES_FINE.map((z) => ({ key: z.key, label: z.label.replace("\n", " ") }))];
  const playerIdxOf = (ev) => players.findIndex((p) => (p.id && ev.playerId ? p.id === ev.playerId : p.name === ev.playerName && String(p.number) === String(ev.playerNumber)));
  const actaCmp = work ? compareWithActa(work, acta) : [];

  return (
    <div className="fadein">
      <Section title="Calidad del dato por partido" hint="Acciones con zona, goles con fase y zona, eventos con minuto y rotaciones. «Revisar» o «Incompleto» indican qué partidos repasar.">
        <Table minWidth={560} head={["Partido", "Estado", "Acciones con zona", "Goles con fase", "Goles con zona", "Rotaciones", "Avisos"]} rows={sorted.map((mm) => {
          const h = dataHealth(mm);
          return [matchLabel(mm), <Badge key="b" level={h.level} />, pct(h.zonedWithZone), pct(h.goalsWithPhase), pct(h.goalsForWithZone), h.hasRotations ? "Sí" : "No", h.checks.length];
        })} />
      </Section>

      <Section title="Repaso de un partido">
        <MatchPicker matches={matches} value={m && m.date} onChange={setDate} />
        {!work ? <Empty>Sin partidos.</Empty> : <>
          {health.checks.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {health.checks.map((c, i) => <div key={i} style={{ fontSize: 12.5, marginBottom: 4, color: c.level === "warn" ? T.warning : T.dim }}>{c.level === "warn" ? "Aviso: " : "Nota: "}{c.text}</div>)}
            </div>
          )}
          <div style={{ fontSize: 11.5, color: T.dim, marginBottom: 8 }}>Al cambiar de jugador o borrar, se ajustan solos sus contadores, los de su parte y las faltas acumuladas. Los goles se corrigen desde Partidos.</div>
          {!events.length ? <Empty>Sin acciones anotadas.</Empty> : (
            <div style={{ maxHeight: 360, overflowY: "auto", border: `1px solid ${T.line}`, borderRadius: 10 }}>
              {events.map((ev) => (
                <div key={`${ev.list}-${ev.index}`} style={{ display: "grid", gridTemplateColumns: "88px minmax(110px, 1fr) minmax(130px, 1.3fr) minmax(120px, 1.2fr) 40px", gap: 6, alignItems: "center", padding: "6px 8px", borderTop: `1px solid ${T.line}`, fontSize: 12 }}>
                  <span style={{ color: T.dim, fontVariantNumeric: "tabular-nums" }}>{halfLabel(Number(ev.half) || 1).replace(" parte", "")} · {typeof ev.remaining === "number" ? fmtClock(ev.remaining) : "—"}</span>
                  <span style={{ fontWeight: 600 }}>{KEY_LABEL[ev.key] || ev.key}</span>
                  <select aria-label="Jugador" value={playerIdxOf(ev)} onChange={(e) => setDraft(updateEvent(work, ev.list, ev.index, { player: players[Number(e.target.value)] }))} style={{ ...selectStyle, minHeight: 34, padding: "4px 6px" }}>
                    {playerIdxOf(ev) < 0 && <option value={-1}>{ev.playerName || "?"}</option>}
                    {players.map((p, i) => <option key={i} value={i}>{p.number} · {p.name}</option>)}
                  </select>
                  <select aria-label="Zona" value={ev.zone || ""} onChange={(e) => setDraft(updateEvent(work, ev.list, ev.index, { zone: e.target.value }))} style={{ ...selectStyle, minHeight: 34, padding: "4px 6px" }}>
                    {ev.zone && !zoneOptions.some((z) => z.key === ev.zone) && <option value={ev.zone}>{PITCH_ZONE_LABEL[ev.zone] || ev.zone}</option>}
                    {zoneOptions.map((z) => <option key={z.key} value={z.key}>{z.label}</option>)}
                  </select>
                  <button type="button" onClick={() => setDraft(deleteEvent(work, ev.list, ev.index))} aria-label="Borrar esta acción" style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.line}`, background: "transparent", color: T.negative, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}>
            <label><span style={labelStyle}>Añadir acción</span>
              <select value={add.key} onChange={(e) => setAdd({ ...add, key: e.target.value })} style={selectStyle}>{ADDABLE.map((k) => <option key={k} value={k}>{KEY_LABEL[k]}</option>)}</select></label>
            <label><span style={labelStyle}>Jugador</span>
              <select value={add.playerIdx} onChange={(e) => setAdd({ ...add, playerIdx: Number(e.target.value) })} style={selectStyle}>{players.map((p, i) => <option key={i} value={i}>{p.number} · {p.name}</option>)}</select></label>
            <label><span style={labelStyle}>Parte</span>
              <select value={add.half} onChange={(e) => setAdd({ ...add, half: Number(e.target.value) })} style={selectStyle}>{[1, 2, 3, 4].map((h) => <option key={h} value={h}>{halfLabel(h)}</option>)}</select></label>
            <label><span style={labelStyle}>Reloj (mm:ss)</span>
              <span style={{ display: "flex", gap: 4 }}>
                <input aria-label="Minutos" inputMode="numeric" value={add.mm} onChange={(e) => setAdd({ ...add, mm: e.target.value.replace(/\D/g, "").slice(0, 2) })} placeholder="mm" style={{ ...selectStyle, width: 48 }} />
                <input aria-label="Segundos" inputMode="numeric" value={add.ss} onChange={(e) => setAdd({ ...add, ss: e.target.value.replace(/\D/g, "").slice(0, 2) })} placeholder="ss" style={{ ...selectStyle, width: 48 }} />
              </span></label>
            <label><span style={labelStyle}>Zona</span>
              <select value={add.zone} onChange={(e) => setAdd({ ...add, zone: e.target.value })} style={selectStyle}>{zoneOptions.map((z) => <option key={z.key} value={z.key}>{z.label}</option>)}</select></label>
            <Button size="sm" variant="secondary" icon={Plus} disabled={!players.length} onClick={() => {
              const max = halfMinutesFor(add.half, Number(work.halfLength) || 20, work.overtimeLength) * 60;
              const remaining = Math.min(max, (Number(add.mm) || 0) * 60 + (Number(add.ss) || 0));
              setDraft(addEvent(work, { key: add.key, player: players[add.playerIdx], half: add.half, remaining, zone: add.zone || null }));
            }}>Añadir</Button>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <Button size="sm" variant="primary" icon={Save} disabled={!draft} onClick={() => { onUpdateMatch(draft); setDraft(null); }}>Guardar cambios</Button>
            {draft && <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Descartar cambios</Button>}
          </div>
        </>}
      </Section>

      {work && (
        <Section title="Cotejo con el acta" hint="Escribe lo que pone el acta oficial y compáralo con lo anotado. Se guarda con el partido."
          right={<Button size="sm" variant="ghost" icon={Save} disabled={JSON.stringify(acta) === JSON.stringify(m.acta || {})} onClick={() => onUpdateMatch({ ...(draft || m), acta })}>Guardar acta</Button>}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {[["gf", "Goles a favor"], ["ga", "Goles en contra"], ["fouls1", "Faltas 1ª parte"], ["fouls2", "Faltas 2ª parte"], ["yellow", "Amarillas"], ["red", "Rojas"]].map(([k, l]) => (
              <label key={k} style={{ width: 110 }}><span style={labelStyle}>{l}</span>
                <input inputMode="numeric" value={acta[k] ?? ""} onChange={(e) => setActa({ ...acta, [k]: e.target.value.replace(/\D/g, "").slice(0, 3) })} style={{ ...selectStyle, width: "100%", boxSizing: "border-box" }} /></label>
            ))}
          </div>
          {actaCmp.length ? <Table head={["Dato", "Anotado", "Acta", ""]} rows={actaCmp.map((r) => [r.label, r.ours, r.acta, <b key="c" style={{ color: r.ok ? T.positive : T.negative }}>{r.ok ? "Cuadra" : "No cuadra"}</b>])} /> : <Empty>Escribe algún dato del acta para comparar.</Empty>}
        </Section>
      )}
    </div>
  );
}
