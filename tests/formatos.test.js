import test from "node:test";
import assert from "node:assert/strict";
import { validateBackup, BACKUP_FORMAT, MATCH_FORMAT, LEGACY_DB } from "../src/data/formats.js";
import { legacyToBackup } from "../src/data/migrate.js";
import { BRAND } from "../src/brand/brand.js";

const datos = { teams: JSON.stringify([{ id: "t1", name: "Club Demo" }]), "roster:t1": "[]" };

test("la app escribe sus propios formatos y su propia base de datos", () => {
  assert.equal(BACKUP_FORMAT, "quinteto-copia");
  assert.equal(MATCH_FORMAT, "quinteto-partido");
  // Nunca la misma base que la app de origen: en el mismo dominio se pisarian.
  assert.notEqual(BRAND.dbName, LEGACY_DB.name);
});

test("acepta copias propias y copias de NPA Stats v1", () => {
  assert.deepEqual(validateBackup({ formato: "quinteto-copia", version: 1, datos }), { ok: true, legacy: false });
  assert.deepEqual(validateBackup({ formato: "npa-stats-copia", version: 1, datos }), { ok: true, legacy: true });
});

test("rechaza lo que no es una copia, copias sin equipos y versiones futuras", () => {
  for (const bad of [null, {}, { formato: "otra-cosa", version: 1, datos }, "texto"]) {
    const r = validateBackup(bad);
    assert.equal(r.ok, false);
    assert.match(r.error, /no es una copia de Quinteto/);
  }
  assert.match(validateBackup({ formato: "quinteto-copia", version: 1, datos: {} }).error, /incompleta/);
  assert.match(validateBackup({ formato: "npa-stats-copia", version: 2, datos }).error, /más nueva/);
  assert.match(validateBackup({ formato: "quinteto-copia", version: 99, datos }).error, /más nueva/);
});

test("la base antigua se convierte en una copia sin borradores ni marcas locales", () => {
  const b = legacyToBackup({
    ...datos,
    "matches:t1:2026-10-01": "{}",
    "draft:match:t1": "{}", "draft:training:t1": "{}", activeTeamId: "t1", lastBackupAt: "2026-01-01",
    raro: 42, // no es texto: no se copia
  });
  assert.equal(b.formato, "npa-stats-copia");
  assert.deepEqual(Object.keys(b.datos).sort(), ["matches:t1:2026-10-01", "roster:t1", "teams"]);
  assert.equal(validateBackup(b).ok, true);
});
