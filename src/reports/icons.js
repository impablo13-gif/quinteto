/* Iconos de los informes en SVG en línea (sustituyen a los emojis: los emojis
 * cambian según el dispositivo y no se rasterizan igual en el PDF).
 * Trazos copiados de Lucide (licencia ISC, https://lucide.dev), los mismos que
 * usa la app. Para añadir uno se copia su __iconNode de
 * node_modules/lucide-react/dist/esm/icons/<nombre>.mjs. */

const NODES = {
  clock: [["circle",{"cx":"12","cy":"12","r":"10"}],["path",{"d":"M12 6v6l4 2"}]],
  medal: [["path",{"d":"M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"}],["path",{"d":"M11 12 5.12 2.2"}],["path",{"d":"m13 12 5.88-9.8"}],["path",{"d":"M8 7h8"}],["circle",{"cx":"12","cy":"17","r":"5"}],["path",{"d":"M12 18v-2h-.5"}]],
  users: [["path",{"d":"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["path",{"d":"M16 3.128a4 4 0 0 1 0 7.744"}],["path",{"d":"M22 21v-2a4 4 0 0 0-3-3.87"}],["circle",{"cx":"9","cy":"7","r":"4"}]],
  plusMinus: [["path",{"d":"M12 3v14"}],["path",{"d":"M5 10h14"}],["path",{"d":"M5 21h14"}]],
  target: [["circle",{"cx":"12","cy":"12","r":"10"}],["circle",{"cx":"12","cy":"12","r":"6"}],["circle",{"cx":"12","cy":"12","r":"2"}]],
  repeat: [["path",{"d":"m2 9 3-3 3 3"}],["path",{"d":"M13 18H7a2 2 0 0 1-2-2V6"}],["path",{"d":"m22 15-3 3-3-3"}],["path",{"d":"M11 6h6a2 2 0 0 1 2 2v10"}]],
  user: [["path",{"d":"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"}],["circle",{"cx":"12","cy":"7","r":"4"}]],
  calendar: [["path",{"d":"M8 2v3"}],["path",{"d":"M16 2v3"}],["rect",{"x":"3","y":"3","width":"18","height":"18","rx":"2"}],["path",{"d":"M3 9h18"}]],
  time: [["circle",{"cx":"12","cy":"12","r":"10"}],["path",{"d":"M12 6v6h4"}]],
  pin: [["path",{"d":"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"}],["circle",{"cx":"12","cy":"10","r":"3"}]],
  venue: [["path",{"d":"M10 12h4"}],["path",{"d":"M10 8h4"}],["path",{"d":"M14 21v-3a2 2 0 0 0-4 0v3"}],["path",{"d":"M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"}],["path",{"d":"M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"}]],
  layers: [["path",{"d":"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"}],["path",{"d":"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"}],["path",{"d":"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"}]],
  shield: [["path",{"d":"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}]],
  hand: [["path",{"d":"M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"}],["path",{"d":"M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"}],["path",{"d":"M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"}],["path",{"d":"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"}]],
  list: [["path",{"d":"M3 5h.01"}],["path",{"d":"M3 12h.01"}],["path",{"d":"M3 19h.01"}],["path",{"d":"M8 5h13"}],["path",{"d":"M8 12h13"}],["path",{"d":"M8 19h13"}]],
  wing: [["path",{"d":"M8 3 4 7l4 4"}],["path",{"d":"M4 7h16"}],["path",{"d":"m16 21 4-4-4-4"}],["path",{"d":"M20 17H4"}]],
  alert: [["path",{"d":"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"}],["path",{"d":"M12 9v4"}],["path",{"d":"M12 17h.01"}]],
  foulIn: [["path",{"d":"M20 4v7a4 4 0 0 1-4 4H4"}],["path",{"d":"m9 10-5 5 5 5"}]],
  foulOut: [["path",{"d":"m15 10 5 5-5 5"}],["path",{"d":"M4 4v7a4 4 0 0 0 4 4h12"}]],
};

const attrs = (o) => Object.entries(o).map(([k, v]) => `${k}="${v}"`).join(" ");
const SVG_STYLE = "display:inline-block; vertical-align:-2px; flex-shrink:0;";

/* icon("clock", { size: 15, color }) -> "<svg …>" (por defecto, el color del texto) */
export function icon(name, { size = 14, color = "currentColor", stroke = 2 } = {}) {
  const nodes = NODES[name];
  if (!nodes) return "";
  const body = nodes.map(([tag, a]) => `<${tag} ${attrs(a)} />`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" style="${SVG_STYLE}" aria-hidden="true">${body}</svg>`;
}

/* Balón propio (el mismo dibujo que BallIcon en src/ui/icons.jsx). */
export function ballIcon({ size = 12, color = "currentColor" } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="${SVG_STYLE}" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5l3.8 2.8-1.5 4.4H9.7L8.2 10.3z" fill="${color}" stroke="none" /><path d="M12 3v4.5M20.6 9.4l-4.8 0.9M17.3 19.4l-3-4.7M6.7 19.4l3-4.7M3.4 9.4l4.8 0.9" /></svg>`;
}

/* Tarjeta (amarilla o roja): rectángulo vertical relleno. */
export function cardIcon(fill, { size = 11 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(size * 0.75)}" height="${size}" viewBox="0 0 9 12" style="${SVG_STYLE}" aria-hidden="true"><rect x="0.5" y="0.5" width="8" height="11" rx="1.5" fill="${fill}" /></svg>`;
}

/* Icono de cada grupo de posición (antes 🧤🛡🪽🎯). */
export const POSITION_ICON = { POR: "hand", CIE: "shield", ALA: "wing", PIV: "target" };
