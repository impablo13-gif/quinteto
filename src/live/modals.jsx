/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { useRef, useState } from "react";
import { Check, CheckCheck, Plus, X } from "lucide-react";
import { T, bigBtn, ghostBtn, iconBtnSm, modalCard, overlayStyle, alpha } from "../theme/theme.js";
import { POSITIONS, POS_LABEL, fmtMin, halfLabel, halfMinutesFor } from "../domain/match.js";
import { PITCH_ZONES_FINE, PITCH_ZONE_LABEL } from "../domain/catalog.js";
import { selectablePhases } from "../domain/config.js";
import { CARD_ACTIONS, QUICK_STAT_ACTIONS } from "../ui/catalog.jsx";
import { Avatar } from "../ui/common.jsx";
import { Overlay } from "../ui/kit.jsx";
export function ActionsPopover({ onPick, onClose }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ ...modalCard, maxWidth: 360 }} onClick={(e) => e.stopPropagation()} className="fadein">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="display" style={{ fontSize: 17, fontWeight: 600 }}>¿Qué acción?</div>
          <button onClick={onClose} style={iconBtnSm} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {QUICK_STAT_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button key={a.key} onClick={() => onPick(a.key, a.label)} style={{ display: "flex", alignItems: "center", gap: 8, background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer", color: T.text }}>
                <Icon size={16} color={a.color || T.accent} /><span style={{ fontSize: 13 }}>{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Overlay>
  );
}

export function CardsPopover({ onPick, onClose }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ ...modalCard, maxWidth: 320 }} onClick={(e) => e.stopPropagation()} className="fadein">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="display" style={{ fontSize: 17, fontWeight: 600 }}>¿Qué tarjeta?</div>
          <button onClick={onClose} style={iconBtnSm} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {CARD_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button key={a.key} onClick={() => onPick(a.key, a.label)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: T.surface2, border: `1.5px solid ${a.color}`, borderRadius: 12, padding: "18px 12px", cursor: "pointer", color: T.text }}>
                <Icon size={28} color={a.color} /><span style={{ fontSize: 13, fontWeight: 600 }}>{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Overlay>
  );
}

export function GoalPhasePopover({ goalWizard, onPick, onClose }) {
  const isFor = goalWizard.type === "for";
  return (
    <Overlay onClose={onClose}>
      <div style={{ ...modalCard, maxWidth: 460 }} onClick={(e) => e.stopPropagation()} className="fadein">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 11, color: T.dim }}>{isFor ? `Gol de ${goalWizard.authorName}` : "Gol rival"}</div>
            <div className="display" style={{ fontSize: 17, fontWeight: 600 }}>¿De qué fase viene el gol?</div>
          </div>
          <button onClick={onClose} style={iconBtnSm} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div style={{ fontSize: 11, color: T.dim, margin: "8px 0 12px" }}>Obligatorio elegir una para completar el registro.</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {selectablePhases().map((ph) => (
            <button key={ph.key} onClick={() => onPick(ph.key)} style={{ background: "transparent", border: `1.5px solid ${ph.color}`, color: ph.color, borderRadius: 10, padding: "12px 10px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {ph.label}
            </button>
          ))}
        </div>
      </div>
    </Overlay>
  );
}

// Tras la fase, se pregunta quién dio la asistencia — con un botón dedicado
// para "Sin asistencia" porque muchos goles no la llevan, y no debe hacer
// falta un jugador de relleno para poder seguir.
export function AssistPopover({ goalWizard, players, onPick, onClose }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ ...modalCard, maxWidth: 460 }} onClick={(e) => e.stopPropagation()} className="fadein">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 11, color: T.dim }}>Gol de {goalWizard.authorName}</div>
            <div className="display" style={{ fontSize: 17, fontWeight: 600 }}>¿Quién dio la asistencia?</div>
          </div>
          <button onClick={onClose} style={iconBtnSm} aria-label="Cerrar"><X size={16} /></button>
        </div>

        <div style={{ display: "flex", gap: 8, margin: "10px 0 12px" }}>
          {/* Una asistencia es el pase de OTRO compañero: si el autor generó la
              jugada él solo (robo, rebote propio...), es "Sin asistencia". Antes
              había un botón "Autoasistencia" que le sumaba una asistencia al
              propio goleador. */}
          <button onClick={() => onPick(null, null)} style={{ ...ghostBtn, flex: 1, justifyContent: "center" }}>Sin asistencia</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
          {players.map((p) => (
            <button key={p.id} onClick={() => onPick(p.id, p.name)} style={{ display: "flex", alignItems: "center", gap: 10, background: T.surface2, border: `1.5px solid ${T.line}`, borderRadius: 10, padding: "7px 10px", cursor: "pointer", textAlign: "left" }}>
              <Avatar player={p} size={30} />
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: T.text }}>{p.name}</span>
              <span className="display" style={{ fontSize: 16, fontWeight: 700, color: T.dim }}>{p.number}</span>
            </button>
          ))}
          {!players.length && <div style={{ fontSize: 12, color: T.dim, textAlign: "center", padding: "8px 0" }}>No hay más compañeros en pista.</div>}
        </div>
      </div>
    </Overlay>
  );
}

/* Campo visual para marcar la zona de una pérdida, recuperación o tiro:
   la portería propia siempre abajo, la rival arriba — como se ve el campo
   de pie en la banda. Dieciocho zonas (6 filas x 3 carriles, ~6,7 m de lado):
   más fino que las 9 de antes, y cada celda sigue siendo de unos 87x63 px en el
   móvil, suficiente para tocar con el dedo sin apuntar en mitad de un partido. */
export function PitchZonePicker({ wizard, onPick, onClose }) {
  const W = 300, H = 420, pad = 20;
  const ROWS = 6;
  const courtW = W - pad * 2, courtH = H - pad * 2;
  const colW = courtW / 3, rowH = courtH / ROWS;
  const xFor = (col) => pad + col * colW;
  const yFor = (courtRow) => pad + courtRow * rowH;

  return (
    <Overlay onClose={onClose}>
      <div style={{ ...modalCard, maxWidth: 360, maxHeight: "94vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()} className="fadein">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 11, color: T.dim }}>{wizard.label} de {wizard.playerName}</div>
            <div className="display" style={{ fontSize: 17, fontWeight: 600 }}>¿En qué zona del campo?</div>
          </div>
          <button onClick={onClose} style={iconBtnSm} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div style={{ fontSize: 11, color: T.dim, margin: "6px 0 12px" }}>Vuestra portería abajo, la rival arriba.</div>

        {/* maxHeight: en una pantalla baja el campo se escala (manteniendo la
            proporción) en vez de obligar a hacer scroll para llegar a las filas de abajo. */}
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", maxHeight: "calc(94vh - 130px)", display: "block", touchAction: "manipulation" }}>
          <rect x={pad} y={pad} width={courtW} height={courtH} fill="none" stroke={T.line} strokeWidth="2" rx="4" />
          <line x1={pad} y1={H / 2} x2={W - pad} y2={H / 2} stroke={T.line} strokeWidth="2" />
          <circle cx={W / 2} cy={H / 2} r="26" fill="none" stroke={T.line} strokeWidth="2" />
          <path d={`M ${pad + 50} ${H - pad} A 40 40 0 0 1 ${W - pad - 50} ${H - pad}`} fill="none" stroke={T.line} strokeWidth="2" />
          <path d={`M ${pad + 50} ${pad} A 40 40 0 0 0 ${W - pad - 50} ${pad}`} fill="none" stroke={T.line} strokeWidth="2" />
          <rect x={W / 2 - 16} y={H - pad - 3} width="32" height="6" fill={T.dim} />
          <rect x={W / 2 - 16} y={pad - 3} width="32" height="6" fill={T.dim} />

          {PITCH_ZONES_FINE.map((z) => {
            const courtRow = ROWS - 1 - z.row; // fila 0 (junto a vuestra portería) se dibuja abajo, fila 5 arriba
            const x = xFor(z.col), y = yFor(courtRow);
            const lines = z.label.split("\n");
            return (
              <g key={z.key} className="tap-target" onClick={() => onPick(z.key)} style={{ cursor: "pointer" }}>
                <title>{PITCH_ZONE_LABEL[z.key]}</title>
                <rect x={x + 2} y={y + 2} width={colW - 4} height={rowH - 4} rx="8" fill={alpha(T.accent, 0.05)} stroke={T.accent} strokeWidth="1.2" strokeDasharray="3 3" />
                <text x={x + colW / 2} y={y + rowH / 2} textAnchor="middle" dominantBaseline="middle" fill={T.text} fontSize="9" fontWeight="700" style={{ pointerEvents: "none" }}>
                  {lines.map((line, i) => (
                    <tspan key={i} x={x + colW / 2} dy={i === 0 ? -6 : 12}>{line}</tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </Overlay>
  );
}

export function ConvocatoriaModal({ players, initialSelected, mode, onConfirm, onClose, onAddPlayer }) {
  const [selected, setSelected] = useState(() => new Set(initialSelected || players.map((p) => p.id)));
  // Alta rápida: un jugador que falta en la plantilla (fichaje de última hora,
  // alguien de otro equipo que completa la convocatoria...) se crea aquí mismo,
  // solo con nombre y dorsal; la foto, si se quiere, se pone luego en Plantilla.
  const nextNumber = () => players.reduce((m, p) => Math.max(m, Number(p.number) || 0), 0) + 1;
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newPos, setNewPos] = useState("ALA");
  const [addError, setAddError] = useState(null);
  const nameRef = useRef(null);
  const listRef = useRef(null);
  const addNew = () => {
    const number = newNumber === "" ? nextNumber() : Math.round(Number(newNumber));
    if (!Number.isFinite(number) || number < 0 || number > 99) { setAddError("El dorsal debe ser un número entre 0 y 99."); return; }
    if (players.some((p) => Number(p.number) === number)) { setAddError(`El dorsal ${number} ya lo lleva otro jugador.`); return; }
    const created = onAddPlayer({ name: newName.trim() || `Jugador ${number}`, number, position: newPos });
    setSelected((prev) => new Set(prev).add(created.id));
    setNewName(""); setNewNumber(""); setAddError(null);
    if (nameRef.current) nameRef.current.focus();
    setTimeout(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, 0);
  };
  const toggle = (id) => setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const selectAll = () => setSelected(new Set(players.map((p) => p.id)));
  const selectNone = () => setSelected(new Set());
  const editing = mode === "editar";

  return (
    <Overlay onClose={onClose}>
      <div style={{ ...modalCard, maxWidth: 480, maxHeight: "82vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()} className="fadein">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div className="display" style={{ fontSize: 18, fontWeight: 600 }}>{editing ? "Editar convocatoria" : "Convocatoria"}</div>
          <button onClick={onClose} style={iconBtnSm} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div style={{ fontSize: 12, color: T.dim, margin: "6px 0 10px" }}>
          {editing
            ? "Cambia quién está convocado. Los minutos, goles y tarjetas del partido no se tocan."
            : "Elige qué jugadores de la plantilla están convocados para este partido."}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button onClick={selectAll} style={{ ...ghostBtn, fontSize: 11, padding: "6px 10px" }}><CheckCheck size={12} /> Todos</button>
          <button onClick={selectNone} style={{ ...ghostBtn, fontSize: 11, padding: "6px 10px" }}>Ninguno</button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: T.dim, alignSelf: "center" }}>{selected.size} convocados</span>
        </div>

        {onAddPlayer && (
          <div style={{ background: T.surface2, border: `1px dashed ${T.line}`, borderRadius: 10, padding: 8, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                ref={nameRef} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre del jugador"
                onKeyDown={(e) => { if (e.key === "Enter") addNew(); }}
                style={{ flex: 1, minWidth: 0, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 8, color: T.text, padding: "8px 10px" }}
              />
              <input
                type="number" inputMode="numeric" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} placeholder={String(nextNumber())}
                onKeyDown={(e) => { if (e.key === "Enter") addNew(); }}
                style={{ width: 58, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 8, color: T.accent, padding: "8px 4px", textAlign: "center", fontWeight: 700 }}
              />
              <select value={newPos} onChange={(e) => setNewPos(e.target.value)} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 8, color: T.text, padding: "8px 4px" }}>
                {POSITIONS.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
              </select>
              <button onClick={addNew} style={{ ...bigBtn, background: T.accent, color: T.ink, padding: "9px 12px", flexShrink: 0 }}><Plus size={15} /> Añadir</button>
            </div>
            {addError && <div style={{ fontSize: 11, color: T.negative, marginTop: 6 }}>{addError}</div>}
          </div>
        )}

        <div ref={listRef} style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          {players.map((p) => {
            const isIn = selected.has(p.id);
            return (
              <button key={p.id} onClick={() => toggle(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, background: isIn ? alpha(T.accent, 0.075) : T.surface2, border: `1.5px solid ${isIn ? T.accent : T.line}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer", textAlign: "left" }}>
                <Avatar player={p} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: T.dim }}>{p.position}</div>
                </div>
                <div className="display" style={{ fontSize: 24, fontWeight: 700, color: isIn ? T.accent : T.dim, flexShrink: 0 }}>{p.number}</div>
                <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isIn ? T.accent : T.line}`, background: isIn ? T.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {isIn && <Check size={14} color={T.ink} />}
                </div>
              </button>
            );
          })}
        </div>

        <button onClick={() => onConfirm(Array.from(selected))} disabled={!selected.size} style={{ ...bigBtn, justifyContent: "center", background: selected.size ? T.accent : T.surface3, color: selected.size ? T.ink : T.dim, marginTop: 14, opacity: selected.size ? 1 : 0.6, cursor: selected.size ? "pointer" : "default" }}>
          {editing ? "Guardar convocatoria" : "Confirmar convocatoria y empezar"}
        </button>
      </div>
    </Overlay>
  );
}

export function SubstitutionPicker({ incoming, onCourtPlayers, keeperOnCourtId, stats, onPick, onClose }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ ...modalCard, maxWidth: 420 }} onClick={(e) => e.stopPropagation()} className="fadein">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar player={incoming} size={40} />
            <div>
              <div style={{ fontSize: 11, color: T.dim }}>Entra</div>
              <div className="display" style={{ fontSize: 18, fontWeight: 600 }}>{incoming.name}</div>
            </div>
            <div className="display" style={{ fontSize: 28, fontWeight: 700, color: T.accent }}>{incoming.number}</div>
          </div>
          <button onClick={onClose} style={iconBtnSm} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div style={{ fontSize: 12, color: T.dim, margin: "10px 0 12px" }}>La pista está completa. Elige a quién sustituye:</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {onCourtPlayers.map((p) => {
            const isKeeper = p.id === keeperOnCourtId;
            return (
              <button key={p.id} onClick={() => onPick(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, background: isKeeper ? alpha(T.gk, 0.18) : T.surface2, border: `1px solid ${isKeeper ? T.gk : T.line}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer", textAlign: "left" }}>
                <Avatar player={p} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: isKeeper ? T.gk : T.dim, fontWeight: isKeeper ? 700 : 400 }}>{isKeeper ? "PORTERO" : p.position}</div>
                </div>
                <div className="display" style={{ fontSize: 22, fontWeight: 700, color: isKeeper ? T.gk : T.accent, flexShrink: 0 }}>{p.number}</div>
                <div className="display" style={{ fontSize: 14, fontWeight: 600, color: T.dim, flexShrink: 0 }}>{fmtMin((stats[p.id] && stats[p.id].seconds) || 0)}</div>
              </button>
            );
          })}
        </div>
      </div>
    </Overlay>
  );
}

/* El portero va anclado: para cambiarlo se toca su propia tarjeta en pista,
   que abre este selector — a diferencia de una sustitución normal, aquí se
   elige a quién ENTRA de entre el banquillo (a quién saca ya se sabe: al
   portero que se ha tocado). Si quien entra no es portero de plantilla,
   queda marcado como portero-jugador en cuanto se confirma. */
export function GoalkeeperSwapModal({ outgoing, benchPlayers, stats, onPick, onClose }) {
  const keepers = benchPlayers.filter((p) => p.isGK);
  const outfield = benchPlayers.filter((p) => !p.isGK);
  const Row = ({ p }) => (
    <button key={p.id} onClick={() => onPick(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer", textAlign: "left", width: "100%" }}>
      <Avatar player={p} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
        <div style={{ fontSize: 10, color: T.dim }}>{p.isGK ? POS_LABEL.POR : POS_LABEL[p.position] || p.position}</div>
      </div>
      <div className="display" style={{ fontSize: 22, fontWeight: 700, color: T.gk, flexShrink: 0 }}>{p.number}</div>
      <div className="display" style={{ fontSize: 14, fontWeight: 600, color: T.dim, flexShrink: 0 }}>{fmtMin((stats[p.id] && stats[p.id].seconds) || 0)}</div>
    </button>
  );
  return (
    <Overlay onClose={onClose}>
      <div style={{ ...modalCard, maxWidth: 420 }} onClick={(e) => e.stopPropagation()} className="fadein">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar player={outgoing} size={40} />
            <div>
              <div style={{ fontSize: 11, color: T.dim }}>Sale</div>
              <div className="display" style={{ fontSize: 18, fontWeight: 600 }}>{outgoing.name}</div>
            </div>
            <div className="display" style={{ fontSize: 28, fontWeight: 700, color: T.gk }}>{outgoing.number}</div>
          </div>
          <button onClick={onClose} style={iconBtnSm} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div style={{ fontSize: 12, color: T.dim, margin: "10px 0 12px" }}>¿Quién entra de portero? Si eliges a un jugador de campo, queda marcado como portero-jugador.</div>

        {!benchPlayers.length && (
          <div style={{ padding: "10px 4px", color: T.dim, fontSize: 12 }}>No queda nadie libre en el banquillo.</div>
        )}

        {keepers.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 600, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5, margin: "4px 0 6px" }}>Porteros</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: outfield.length ? 14 : 0 }}>
              {keepers.map((p) => <Row key={p.id} p={p} />)}
            </div>
          </>
        )}

        {outfield.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 600, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5, margin: "4px 0 6px" }}>Jugadores de campo</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {outfield.map((p) => <Row key={p.id} p={p} />)}
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
}

/* Editar un gol ya registrado: quién marcó (solo goles a favor), de qué
   fase vino y, ahora, también el minuto exacto (parte + tiempo restante) --
   el quinteto en pista queda tal y como se vio en su momento, eso no se
   toca, solo el autor, la fase y cuándo pasó. */
export function GoalEditModal({ event, players, presentHalves, halfLength, overtimeLength, onSave, onClose }) {
  const [authorId, setAuthorId] = useState(event.ownGoal ? "OWN" : (event.authorId || null)); // "OWN" = autogol del rival
  const [phase, setPhase] = useState(event.phase || null);
  const [half, setHalf] = useState(event.half || 1);
  const initialRemaining = event.remaining !== undefined ? event.remaining : (event.seconds || 0);
  const [mm, setMm] = useState(String(Math.floor(initialRemaining / 60)));
  const [ss, setSs] = useState(String(initialRemaining % 60).padStart(2, "0"));
  const isFor = event.type === "for";
  const halves = presentHalves && presentHalves.length ? presentHalves : [1, 2];
  const maxRemaining = halfMinutesFor(half, halfLength || 20, overtimeLength) * 60;
  const remaining = Math.max(0, Math.min(maxRemaining, (Number(mm) || 0) * 60 + (Number(ss) || 0)));
  return (
    <Overlay onClose={onClose}>
      <div style={{ ...modalCard, maxWidth: 460 }} onClick={(e) => e.stopPropagation()} className="fadein">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div className="display" style={{ fontSize: 17, fontWeight: 600 }}>Editar gol</div>
          <button onClick={onClose} style={iconBtnSm} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div style={{ fontSize: 11, color: T.dim, margin: "6px 0 12px" }}>Se puede corregir quién marcó, de qué fase vino y el minuto exacto.</div>

        <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>¿Cuándo?</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {halves.map((h) => (
            <button key={h} onClick={() => setHalf(h)} style={{ background: half === h ? T.accent : "transparent", border: `1.5px solid ${T.accent}`, color: half === h ? T.ink : T.accent, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {halfLabel(h)}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          <input type="number" value={mm} onChange={(e) => setMm(e.target.value)} min={0} style={{ width: 54, background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 6, color: T.text, padding: "6px 5px", fontSize: 15, textAlign: "center" }} />
          <span style={{ color: T.dim }}>:</span>
          <input type="number" value={ss} onChange={(e) => setSs(e.target.value)} min={0} max={59} style={{ width: 54, background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 6, color: T.text, padding: "6px 5px", fontSize: 15, textAlign: "center" }} />
          <span style={{ fontSize: 11, color: T.dim }}>tiempo restante de esa parte</span>
        </div>

        {isFor && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>¿Quién marcó?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto", marginBottom: 14 }}>
              <button onClick={() => setAuthorId("OWN")} style={{ display: "flex", alignItems: "center", gap: 10, background: authorId === "OWN" ? alpha(T.accent, 0.09) : T.surface2, border: `1.5px solid ${authorId === "OWN" ? T.accent : T.line}`, borderRadius: 10, padding: "7px 10px", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: T.text }}>Autogol del rival (no es de nadie nuestro)</span>
                {authorId === "OWN" && <Check size={14} color={T.accent} />}
              </button>
              {players.map((p) => (
                <button key={p.id} onClick={() => setAuthorId(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, background: authorId === p.id ? alpha(T.accent, 0.09) : T.surface2, border: `1.5px solid ${authorId === p.id ? T.accent : T.line}`, borderRadius: 10, padding: "7px 10px", cursor: "pointer", textAlign: "left" }}>
                  <Avatar player={p} size={30} />
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: T.text }}>{p.name}</span>
                  <span className="display" style={{ fontSize: 16, fontWeight: 700, color: authorId === p.id ? T.accent : T.dim }}>{p.number}</span>
                  {authorId === p.id && <Check size={14} color={T.accent} />}
                </button>
              ))}
            </div>
          </>
        )}

        <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>¿De qué fase?</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {selectablePhases(event.phase).map((ph) => (
            <button key={ph.key} onClick={() => setPhase(ph.key)} style={{ background: phase === ph.key ? ph.color : "transparent", border: `1.5px solid ${ph.color}`, color: phase === ph.key ? T.ink : ph.color, borderRadius: 10, padding: "10px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {ph.label}
            </button>
          ))}
        </div>

        <button
          disabled={(isFor && !authorId) || !phase}
          onClick={() => {
            const own = isFor && authorId === "OWN";
            const author = isFor && !own ? players.find((p) => p.id === authorId) : null;
            onSave({ authorId: isFor && !own ? authorId : null, authorName: isFor ? (own ? null : (author ? author.name : "")) : null, ownGoal: own, phase, half, remaining });
          }}
          style={{ ...bigBtn, justifyContent: "center", width: "100%", background: (isFor && !authorId) || !phase ? T.surface3 : T.accent, color: (isFor && !authorId) || !phase ? T.dim : T.ink, cursor: (isFor && !authorId) || !phase ? "default" : "pointer" }}
        >
          Guardar cambios
        </button>
      </div>
    </Overlay>
  );
}
