/* Importar sin archivo los datos de la app de origen (NPA Stats).
 *
 * Las dos apps se publican en el mismo dominio (usuario.github.io), y el
 * navegador guarda IndexedDB por dominio, no por ruta: en un dispositivo donde
 * ya se uso NPA Stats, su base de datos esta al alcance de Quinteto. Se
 * aprovecha para ofrecer «traer los datos» con un toque, con tres reglas:
 *
 *   1. Antes de abrirla se comprueba que EXISTE (indexedDB.databases()):
 *      abrir una base que no existe la crea vacia. Si el navegador no sabe
 *      listar sus bases, no se ofrece nada (queda la copia por archivo).
 *   2. Se abre sin numero de version y en solo lectura. Si aun asi el
 *      navegador pidiera crearla o actualizarla, se aborta: la base de la otra
 *      app no se modifica NUNCA, ni siquiera en su esquema.
 *   3. Lo leido entra por el mismo camino que una copia de seguridad en modo
 *      «añadir»: una sola transaccion, sin borrar nada de lo que ya hubiera.
 */
import { LEGACY_DB, LEGACY_BACKUP_FORMATS } from "./formats.js";
import { isTransientKey, summarizeBackup, applyBackup } from "../backup.js";

/* Contenido crudo de la base antigua -> copia de seguridad equivalente.
 * Funcion pura (se prueba sin navegador). Deja fuera lo que tampoco viaja en
 * una copia: borradores, equipo activo y fecha de ultima copia. */
export function legacyToBackup(all) {
  const datos = {};
  Object.entries(all || {}).forEach(([k, v]) => {
    if (!isTransientKey(k) && typeof v === "string") datos[k] = v;
  });
  return {
    formato: Object.keys(LEGACY_BACKUP_FORMATS)[0],
    version: 1,
    app: LEGACY_DB.label,
    creada: new Date().toISOString(),
    datos,
  };
}

async function legacyDbExists() {
  if (typeof indexedDB === "undefined" || typeof indexedDB.databases !== "function") return false;
  try {
    const list = await indexedDB.databases();
    return Array.isArray(list) && list.some((d) => d && d.name === LEGACY_DB.name);
  } catch (e) {
    return false;
  }
}

function readLegacyAll() {
  return new Promise((resolve, reject) => {
    let req;
    try { req = indexedDB.open(LEGACY_DB.name); } catch (e) { reject(e); return; }
    req.onupgradeneeded = () => {
      // No deberia pasar (ya se comprobo que existe), pero si pasa es que el
      // navegador iba a crear o cambiar la base: se cancela sin tocarla.
      try { req.transaction.abort(); } catch (e) {}
    };
    req.onerror = () => reject(req.error || new Error("No se pudo abrir la base antigua."));
    req.onblocked = () => reject(new Error("La base antigua está bloqueada: cierra la otra app y vuelve a intentarlo."));
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LEGACY_DB.store)) { db.close(); resolve({}); return; }
      const t = db.transaction(LEGACY_DB.store, "readonly");
      const s = t.objectStore(LEGACY_DB.store);
      const kq = s.getAllKeys();
      const vq = s.getAll();
      t.oncomplete = () => {
        const out = {};
        (kq.result || []).forEach((k, i) => { out[k] = (vq.result || [])[i]; });
        db.close();
        resolve(out);
      };
      t.onerror = () => { db.close(); reject(t.error); };
      t.onabort = () => { db.close(); reject(t.error || new Error("Lectura cancelada.")); };
    };
  });
}

/* ¿Hay datos de la app de origen en este dispositivo? Devuelve null si no
 * (o si no se puede saber), o { backup, summary } listo para mostrar e
 * importar. Nunca lanza: ante cualquier problema, simplemente no ofrece nada. */
export async function findLegacyData() {
  try {
    if (!(await legacyDbExists())) return null;
    const backup = legacyToBackup(await readLegacyAll());
    const summary = summarizeBackup(backup);
    if (!summary.equipos.length) return null;
    return { backup, summary, label: LEGACY_DB.label };
  } catch (e) {
    return null;
  }
}

/* Importa en modo «añadir»: los equipos que ya hubiera en Quinteto se quedan. */
export function importLegacyData(found) {
  return applyBackup(found.backup, "anadir");
}
