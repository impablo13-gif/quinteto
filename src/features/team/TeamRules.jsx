/* Reglas del partido, nombres de las posiciones y fases de gol del equipo
 * (DISENO-TRANSFORMACION.md §8.4). Lo de serie es lo de siempre: un equipo que
 * no toca nada aquí se comporta exactamente igual que antes.
 *
 * Las claves no cambian nunca (son las que llevan los partidos guardados): se
 * editan las etiquetas. Una fase con goles guardados no se puede borrar, solo
 * ocultar. */
import { useState } from "react";
import { Eye, EyeOff, Plus, RotateCcw, Trash2 } from "lucide-react";
import { T } from "../../theme/theme.js";
import { Button, Card, Eyebrow, Segmented } from "../../ui/kit.jsx";
import { POSITIONS } from "../../domain/match.js";
import { GOAL_PHASES, GOAL_PHASE_GROUPS } from "../../domain/catalog.js";
import { BASE_PHASE_KEYS, OTHER_PHASE_GROUP, RULE_LIMITS, RULE_TEMPLATES, isDefaultConfig, normalizeConfig, phasesInUse, templateOf } from "../../domain/config.js";

const BASE_POS = { POR: "Portero", CIE: "Cierre", ALA: "Ala", PIV: "Pívot" };
const input = { background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 9, color: T.text, padding: "8px 10px", fontSize: 13, minHeight: 36, width: "100%", boxSizing: "border-box" };
const small = { fontSize: 12, color: T.dim, lineHeight: 1.45 };

/* Texto que se guarda al salir del campo (no en cada tecla). */
function LabelInput({ value, placeholder, onCommit, ariaLabel, max = 30 }) {
  const [v, setV] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) { setPrev(value); setV(value); }
  return (
    <input
      value={v} placeholder={placeholder} aria-label={ariaLabel} maxLength={max} style={input}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v !== value) onCommit(v); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
    />
  );
}

function NumberRule({ label, hint, value, limits, onChange }) {
  const [min, max] = limits;
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
      <input
        type="number" inputMode="numeric" min={min} max={max} value={value} style={{ ...input, fontVariantNumeric: "tabular-nums" }}
        onChange={(e) => { if (e.target.value === "") return; onChange(Math.min(max, Math.max(min, Math.round(Number(e.target.value)) || min))); }}
      />
      {hint && <span style={{ fontSize: 11, color: T.dim }}>{hint}</span>}
    </label>
  );
}

export function TeamRules({ team, matches, onChange }) {
  const config = normalizeConfig(team.config);
  const { rules } = config;
  const used = phasesInUse(matches);
  const [newPhase, setNewPhase] = useState("");
  const [newGroup, setNewGroup] = useState(OTHER_PHASE_GROUP);
  const save = (patch) => onChange({ ...config, ...patch });
  const setRule = (k, v) => save({ rules: { ...rules, [k]: v } });
  const tpl = templateOf(rules);

  const setPhase = (key, patch) => {
    const cur = { ...(config.phases[key] || {}), ...patch };
    if (!cur.label || cur.label === key) delete cur.label;
    if (!cur.hidden) delete cur.hidden;
    const phases = { ...config.phases };
    if (Object.keys(cur).length) phases[key] = cur; else delete phases[key];
    save({ phases });
  };
  const allKeys = new Set(GOAL_PHASES.map((p) => p.key));
  const cleanNew = newPhase.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
  const newPhaseError = !cleanNew ? null : allKeys.has(cleanNew) || GOAL_PHASES.some((p) => p.label.toLowerCase() === cleanNew.toLowerCase()) ? "Ya hay una fase con ese nombre" : null;
  const addPhase = () => {
    if (!cleanNew || newPhaseError) return;
    save({ customPhases: [...config.customPhases, { key: cleanNew.slice(0, 30), group: Number(newGroup) }] });
    setNewPhase("");
  };
  const removePhase = (key) => {
    const phases = { ...config.phases }; delete phases[key];
    save({ customPhases: config.customPhases.filter((p) => p.key !== key), phases });
  };

  const groupOptions = [
    ...GOAL_PHASE_GROUPS.filter((g) => g.id !== OTHER_PHASE_GROUP).map((g) => ({ id: g.id, label: g.phases.filter((p) => !p.custom).map((p) => p.label).join(" / ") || g.label })),
    { id: OTHER_PHASE_GROUP, label: "Otras" },
  ];

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Eyebrow>Reglas, posiciones y fases</Eyebrow>
        {!isDefaultConfig(team.config) && <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => onChange(null)}>Volver a lo de serie</Button>}
      </div>

      {/* ---- Reglas ---- */}
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="rules-h">
        <div id="rules-h" style={{ fontSize: 14, fontWeight: 700 }}>Reglas del partido</div>
        <div style={small}>Se aplican a los partidos que empieces a partir de ahora. Los partidos guardados conservan su duración.</div>
        <Segmented
          label="Plantilla de reglas"
          value={tpl}
          onChange={(id) => { const t = RULE_TEMPLATES.find((x) => x.id === id); if (t) save({ rules: { ...t.rules } }); }}
          options={[...RULE_TEMPLATES.map((t) => ({ value: t.id, label: t.label })), ...(tpl === "personalizada" ? [{ value: "personalizada", label: "Personalizada" }] : [])]}
        />
        <div style={{ fontSize: 12, color: T.dim, marginTop: -4 }}>{RULE_TEMPLATES.map((t) => `${t.label}: ${t.hint}`).join(" · ")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <NumberRule label="Minutos por parte" value={rules.halfMinutes} limits={RULE_LIMITS.halfMinutes} onChange={(v) => setRule("halfMinutes", v)} hint="Se puede cambiar en cada partido" />
          <NumberRule label="Minutos por parte de prórroga" value={rules.overtimeHalfMinutes} limits={RULE_LIMITS.overtimeHalfMinutes} onChange={(v) => setRule("overtimeHalfMinutes", v)} />
          <NumberRule label="Tiempos muertos por parte" value={rules.timeoutsPerHalf} limits={RULE_LIMITS.timeoutsPerHalf} onChange={(v) => setRule("timeoutsPerHalf", v)} hint={rules.timeoutsPerHalf === 0 ? "Sin límite" : "Por equipo; 0 = sin límite"} />
          <NumberRule label="Falta que ya es doble penalti" value={rules.foulsForDoublePenalty} limits={RULE_LIMITS.foulsForDoublePenalty} onChange={(v) => setRule("foulsForDoublePenalty", v)} hint={`Desde la ${rules.foulsForDoublePenalty}ª acumulada se tira desde 10 m`} />
        </div>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={rules.runningClock} onChange={(e) => setRule("runningClock", e.target.checked)} style={{ width: 20, height: 20, marginTop: 1, accentColor: T.accent }} />
          <span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Tiempo corrido</span>
            <span style={{ ...small, display: "block" }}>El reloj no se para solo al pedir un tiempo muerto; se para y se reanuda a mano, como siempre.</span>
          </span>
        </label>
      </section>

      {/* ---- Posiciones ---- */}
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="pos-h">
        <div id="pos-h" style={{ fontSize: 14, fontWeight: 700 }}>Nombres de las posiciones</div>
        <div style={small}>Cambia cómo se llaman en la plantilla, el directo y los informes. La posición de cada jugador no cambia.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {POSITIONS.map((k) => (
            <label key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: T.dim }}>{BASE_POS[k]}</span>
              <LabelInput value={config.positions[k] || BASE_POS[k]} placeholder={BASE_POS[k]} ariaLabel={`Nombre para ${BASE_POS[k]}`} max={20}
                onCommit={(v) => { const positions = { ...config.positions }; const l = v.trim(); if (!l || l === BASE_POS[k]) delete positions[k]; else positions[k] = l; save({ positions }); }} />
            </label>
          ))}
        </div>
      </section>

      {/* ---- Fases de gol ---- */}
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="ph-h">
        <div id="ph-h" style={{ fontSize: 14, fontWeight: 700 }}>Fases de gol</div>
        <div style={small}>Las ocultas dejan de ofrecerse al anotar un gol, pero los goles ya guardados las siguen contando. Una fase con goles guardados no se puede borrar.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {GOAL_PHASES.map((p) => {
            const n = used.get(p.key) || 0;
            const base = BASE_PHASE_KEYS.has(p.key);
            return (
              <div key={p.key} style={{ display: "grid", gridTemplateColumns: "6px minmax(0, 1fr) auto auto", gap: 8, alignItems: "center", opacity: p.hidden ? 0.6 : 1 }}>
                <span aria-hidden="true" style={{ width: 6, height: 28, borderRadius: 3, background: p.color }} />
                <div style={{ minWidth: 0 }}>
                  <LabelInput value={p.label} placeholder={p.key} ariaLabel={`Nombre de la fase ${p.key}`} onCommit={(v) => setPhase(p.key, { label: v.replace(/[<>]/g, "").trim() })} />
                  <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>
                    {[p.label !== p.key ? `Original: ${p.key}` : null, n ? `${n} gol${n === 1 ? "" : "es"} guardado${n === 1 ? "" : "s"}` : "Sin goles guardados", p.hidden ? "Oculta" : null].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <button type="button" onClick={() => setPhase(p.key, { hidden: !p.hidden })} aria-label={p.hidden ? `Mostrar la fase ${p.label}` : `Ocultar la fase ${p.label}`} title={p.hidden ? "Mostrar" : "Ocultar"}
                  style={{ width: 40, height: 40, borderRadius: 9, border: `1px solid ${T.line}`, background: "transparent", color: p.hidden ? T.dim : T.text, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  {p.hidden ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
                {!base && n === 0 ? (
                  <button type="button" onClick={() => removePhase(p.key)} aria-label={`Borrar la fase ${p.label}`} title="Borrar"
                    style={{ width: 40, height: 40, borderRadius: 9, border: `1px solid ${T.line}`, background: "transparent", color: T.negative, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                ) : <span style={{ width: 40 }} aria-hidden="true" />}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
          <div style={{ flex: "2 1 200px", minWidth: 0 }}>
            <input value={newPhase} onChange={(e) => setNewPhase(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addPhase(); }} placeholder="Nueva fase (p. ej. Saque de banda)" aria-label="Nombre de la nueva fase" maxLength={30} style={input} />
            {newPhaseError && <div role="alert" style={{ fontSize: 11, color: T.negative, marginTop: 4 }}>{newPhaseError}</div>}
          </div>
          <select value={newGroup} onChange={(e) => setNewGroup(Number(e.target.value))} aria-label="Grupo de la nueva fase" style={{ ...input, flex: "1 1 140px", width: "auto", minWidth: 0 }}>
            {groupOptions.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
          <Button size="sm" variant="secondary" icon={Plus} onClick={addPhase} disabled={!cleanNew || !!newPhaseError}>Añadir</Button>
        </div>
      </section>
    </Card>
  );
}
