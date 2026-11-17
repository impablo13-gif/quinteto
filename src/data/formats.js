/* Identificadores de los archivos que la app escribe y lee.
 *
 * La app escribe siempre los formatos propios. Al LEER acepta ademas los de
 * NPA Stats, la aplicacion de la que procede Quinteto: asi una copia o un
 * partido exportado con ella se puede seguir importando. Es la unica capa
 * donde deben aparecer esos nombres antiguos (lo comprueba
 * tests/despersonalizacion.test.js).
 */
import { BRAND } from "../brand/brand.js";

export const BACKUP_FORMAT = "quinteto-copia";
export const BACKUP_VERSION = 1;
export const MATCH_FORMAT = "quinteto-partido";
export const MATCH_VERSION = 1;

// Formatos heredados que se siguen aceptando al importar, con la version
// maxima que se entiende de cada uno.
export const LEGACY_BACKUP_FORMATS = Object.freeze({ "npa-stats-copia": 1 });
export const LEGACY_MATCH_FORMATS = Object.freeze({ "npa-stats-partido": 1 });
// Base de datos local de la app de origen, para importar sin archivo cuando
// las dos se han usado en el mismo dispositivo y dominio.
export const LEGACY_DB = Object.freeze({ name: "npa-stats", store: "kv", label: "NPA Stats" });

const SUPPORTED_BACKUPS = { [BACKUP_FORMAT]: BACKUP_VERSION, ...LEGACY_BACKUP_FORMATS };

/* Comprueba un objeto ya leido de un archivo de copia. Devuelve
 * { ok: true, legacy } o { ok: false, error } con un mensaje para el usuario.
 * Funcion pura: se prueba sin navegador. */
export function validateBackup(parsed) {
  if (!parsed || typeof parsed !== "object" || !(parsed.formato in SUPPORTED_BACKUPS)) {
    return { ok: false, error: `Ese archivo no es una copia de ${BRAND.name}.` };
  }
  if (!parsed.datos || typeof parsed.datos !== "object" || !parsed.datos.teams) {
    return { ok: false, error: "La copia está incompleta: no contiene ningún equipo." };
  }
  if (Number(parsed.version) > SUPPORTED_BACKUPS[parsed.formato]) {
    return { ok: false, error: "La copia viene de una versión más nueva de la app. Actualiza la app antes de importarla." };
  }
  return { ok: true, legacy: parsed.formato !== BACKUP_FORMAT };
}
