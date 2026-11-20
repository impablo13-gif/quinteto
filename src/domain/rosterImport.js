/* Importar jugadores desde un archivo .json (Equipo › Plantilla).
 *
 * Acepta, sin pedir un formato concreto:
 *   · una copia de seguridad de Quinteto o de NPA Stats (plantillas «roster:<equipo>»)
 *   · una copia del planificador (jugadores con nombre, dorsal, posición y equipo)
 *   · una lista de jugadores, o un objeto con «jugadores», «players», «plantilla» o «roster»
 * Campos reconocidos (en español o en inglés): name/nombre (+ apellidos),
 * number/dorsal/numero, position/posicion, photo/foto (solo imágenes data:),
 * isGK/portero.
 *
 * Funciones puras: leen el archivo y proponen; quien llama decide y guarda.
 */
const POS_WORDS = [
  [/^(por|portero|portera|gk|goalkeeper|guardameta)/i, "POR"],
  [/^(cie|cierre|defensa|def)/i, "CIE"],
  [/^(piv|p[ií]vot|boya|pivote)/i, "PIV"],
  [/^(ala|universal|winger|extremo)/i, "ALA"],
];

export function normalizePosition(v, isGK) {
  if (isGK === true) return "POR";
  const s = String(v == null ? "" : v).trim();
  for (const [re, key] of POS_WORDS) if (re.test(s)) return key;
  return "ALA";
}

const clean = (s, max = 40) => String(s == null ? "" : s).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
const safePhoto = (v) => (typeof v === "string" && /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v) ? v : null);

/* Un objeto cualquiera -> jugador, o null si no parece un jugador. */
export function toPlayer(o) {
  if (!o || typeof o !== "object") return null;
  const first = o.name ?? o.nombre ?? o.nombreCompleto ?? o.fullName ?? o.jugador;
  const name = clean([first, o.apellidos ?? o.apellido ?? o.lastName].filter((x) => x != null && String(x).trim()).join(" "));
  if (!name) return null;
  const rawNum = o.number ?? o.dorsal ?? o.numero ?? o["número"];
  const n = parseInt(rawNum, 10);
  // Sin posición en el archivo: null (al unir se conserva la que ya tuviera).
  const rawPos = o.position ?? o.posicion ?? o["posición"];
  const gk = o.isGK === true || o.portero === true;
  const position = gk || (rawPos != null && String(rawPos).trim()) ? normalizePosition(rawPos, gk) : null;
  return { name, number: Number.isFinite(n) && n >= 0 && n < 1000 ? n : null, position, photo: safePhoto(o.photo ?? o.foto) };
}

const listOf = (arr) => (Array.isArray(arr) ? arr.map(toPlayer).filter(Boolean) : []);
const tryParse = (v) => { if (typeof v !== "string") return v; try { return JSON.parse(v); } catch (e) { return null; } };

/* -> { groups: [{ label, players }] } ; groups vacío si no se reconoce nada. */
export function parseRosterFile(data) {
  const groups = [];
  if (!data) return { groups };

  // Copia de Quinteto / NPA Stats: datos["roster:<id>"], nombres en datos.teams.
  if (data.datos && typeof data.datos === "object") {
    const teams = tryParse(data.datos.teams);
    Object.entries(data.datos).forEach(([k, v]) => {
      if (!k.startsWith("roster:")) return;
      const id = k.slice("roster:".length);
      const t = Array.isArray(teams) ? teams.find((x) => x.id === id) : null;
      const players = listOf(tryParse(v));
      if (players.length) groups.push({ label: (t && t.name) || "Equipo sin nombre", players });
    });
    return { groups };
  }

  // Copia del planificador: localStorage con una lista de jugadores (nombre, dorsal, equipo).
  if (data.localStorage && typeof data.localStorage === "object") {
    Object.values(data.localStorage).forEach((v) => {
      const arr = tryParse(v);
      if (!Array.isArray(arr) || !arr.some((x) => x && typeof x === "object" && ("nombre" in x || "name" in x) && ("dorsal" in x || "number" in x))) return;
      const byTeam = new Map();
      arr.forEach((o) => {
        const p = toPlayer(o);
        if (!p) return;
        const team = clean(o.equipo || o.team || "", 40) || "Sin equipo";
        if (!byTeam.has(team)) byTeam.set(team, []);
        byTeam.get(team).push(p);
      });
      byTeam.forEach((players, label) => groups.push({ label, players }));
    });
    return { groups };
  }

  const arr = Array.isArray(data) ? data : (data.jugadores || data.players || data.plantilla || data.roster);
  const players = listOf(arr);
  if (players.length) groups.push({ label: clean(data.equipo || data.team || data.nombre || "", 40) || "Jugadores del archivo", players });
  return { groups };
}

const key = (name) => String(name || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

/* Plantilla de ejemplo de un equipo nuevo («Jugador 1…22», sin fotos). */
export const isPlaceholderRoster = (roster) => (roster || []).length > 0 && roster.every((p) => /^Jugador \d+$/.test(p.name) && !p.photo);

/* Une los jugadores importados con la plantilla actual.
 *  mode "merge": se actualiza a quien ya está (mismo nombre: dorsal, posición y
 *    foto si el archivo la trae) y se añade a los nuevos. Nadie se borra, así
 *    que los partidos guardados siguen encontrando a cada jugador.
 *  mode "replace": la plantilla pasa a ser la del archivo (conservando el id de
 *    quien ya estaba, para que sus fotos y partidos sigan enlazados).
 * -> { roster, added, updated, removed } */
export function mergeRoster(current, incoming, mode = "merge", newId = () => `p${Date.now()}-${Math.floor(Math.random() * 1e6)}`) {
  const cur = current || [];
  const byName = new Map(cur.map((p) => [key(p.name), p]));
  const usedNumbers = new Set(cur.map((p) => p.number));
  let added = 0, updated = 0;
  const seen = new Set();
  const fromFile = [];
  (incoming || []).forEach((inc) => {
    const k = key(inc.name);
    if (!k || seen.has(k)) return;
    seen.add(k);
    const old = byName.get(k);
    if (old) {
      const next = { ...old };
      if (inc.position) { next.position = inc.position; next.isGK = inc.position === "POR"; }
      if (inc.number != null) next.number = inc.number;
      if (inc.photo) next.photo = inc.photo;
      if (JSON.stringify(next) !== JSON.stringify(old)) updated += 1;
      fromFile.push(next);
    } else {
      let number = inc.number;
      if (number == null) { number = 1; while (usedNumbers.has(number)) number += 1; }
      usedNumbers.add(number);
      const position = inc.position || "ALA";
      fromFile.push({ id: newId(), name: inc.name, number, position, isGK: position === "POR", photo: inc.photo || null });
      added += 1;
    }
  });
  if (mode === "replace") {
    return { roster: fromFile, added, updated, removed: cur.filter((p) => !seen.has(key(p.name))).length };
  }
  const updatedById = new Map(fromFile.filter((p) => cur.some((c) => c.id === p.id)).map((p) => [p.id, p]));
  const roster = [...cur.map((p) => updatedById.get(p.id) || p), ...fromFile.filter((p) => !updatedById.has(p.id))];
  return { roster, added, updated, removed: 0 };
}
