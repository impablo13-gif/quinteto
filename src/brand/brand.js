/* Identidad del producto en UN solo sitio.
 *
 * Todo lo que dice como se llama la app (titulo, manifiesto de la PWA,
 * nombre de la base de datos, eventos internos, nombres de archivo) sale de
 * aqui. Cambiar de nombre es cambiar este fichero y regenerar los iconos.
 *
 * La identidad del CLUB que usa la app (nombre, escudo) no va aqui: es un
 * dato del usuario y vive en sus equipos. Lo que se llame el producto no
 * debe depender de quien lo use.
 */
export const BRAND = Object.freeze({
  name: "Quinteto",
  // Lo que se ve bajo el icono en la pantalla de inicio de la tablet.
  shortName: "Quinteto",
  tagline: "Cada minuto, cada quinteto.",
  description: "Minutos y estadisticas de futbol sala en directo. Funciona sin conexion.",
  // Prefijo de archivos descargados (copias de seguridad).
  fileSlug: "quinteto",
  // Base de datos local del navegador. NO reutilizar el nombre de otra app
  // publicada en el mismo dominio: IndexedDB es por dominio, no por ruta, y
  // dos apps con la misma base se pisarian los datos.
  dbName: "quinteto",
  // Prefijo de los eventos internos entre main.jsx y App.jsx.
  eventPrefix: "app",
  // Ruta por defecto al publicar en GitHub Pages (el despliegue la toma del
  // nombre del repositorio; esta es la de desarrollo y vista previa).
  basePath: "/quinteto/",
});

export const appEvent = (name) => `${BRAND.eventPrefix}:${name}`;
