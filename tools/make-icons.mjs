/* Genera los iconos de la PWA sin depender de ninguna libreria de imagen:
 * dibuja los pixeles a mano y los empaqueta en PNG con el zlib de Node.
 *
 * Simbolo de Quinteto: cinco puntos, un portero (anillo) y cuatro jugadores en
 * rombo 1-2-1, con el pivot en el color de marca (paleta B, «Volt»). Ver
 * DISENO-TRANSFORMACION.md §6.2.
 *
 *   npm run icons
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(OUT, { recursive: true });

const BG = [0x0e, 0x11, 0x10];     // grafito
const DOT = [0xee, 0xf2, 0xec];    // texto claro
const ACCENT = [0xc6, 0xf4, 0x32]; // volt

/* ---- geometria del simbolo, en coordenadas 0..100 (igual que el SVG) ---- */
const DOTS = [
  { x: 50, y: 24, r: 8.5, c: ACCENT }, // pivot
  { x: 28, y: 45, r: 8.5, c: DOT },    // ala
  { x: 72, y: 45, r: 8.5, c: DOT },    // ala
  { x: 50, y: 62, r: 8.5, c: DOT },    // cierre
];
const GK = { x: 50, y: 81, r: 6.5, w: 3.5 }; // portero: anillo

function shapeAt(px, py) {
  for (const d of DOTS) if ((px - d.x) ** 2 + (py - d.y) ** 2 <= d.r ** 2) return d.c;
  const dist = Math.hypot(px - GK.x, py - GK.y);
  if (Math.abs(dist - GK.r) <= GK.w / 2) return DOT;
  return BG;
}

/* `scale` < 1 encoge el dibujo: los iconos "maskable" de Android se recortan
   en circulo, y todo lo importante debe caber en el 80% central. */
function colorAt(u, v, scale) {
  const su = 0.5 + (u - 0.5) / scale;
  const sv = 0.5 + (v - 0.5) / scale;
  return shapeAt(su * 100, sv * 100);
}

function renderRGBA(size, scale) {
  const SS = 3; // supermuestreo: 3x3 por pixel, para que los bordes no salgan dentados
  const data = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          const c = colorAt(u, v, scale);
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = SS * SS, i = (y * size + x) * 4;
      data[i] = Math.round(r / n);
      data[i + 1] = Math.round(g / n);
      data[i + 2] = Math.round(b / n);
      data[i + 3] = 255;
    }
  }
  return data;
}

/* ---- PNG minimo (RGBA, sin filtros) ---- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function toPng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;    // bits por canal
  ihdr[9] = 6;    // color RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // sin filtro
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const targets = [
  { file: "icon-192.png", size: 192, scale: 1 },
  { file: "icon-512.png", size: 512, scale: 1 },
  { file: "icon-512-maskable.png", size: 512, scale: 0.72 },
  { file: "apple-touch-icon-180.png", size: 180, scale: 1 },
];

for (const t of targets) {
  writeFileSync(join(OUT, t.file), toPng(t.size, renderRGBA(t.size, t.scale)));
  console.log("escrito", t.file);
}

const hex = (c) => "#" + c.map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${hex(BG)}"/>
${DOTS.map((d) => `  <circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${hex(d.c)}"/>`).join("\n")}
  <circle cx="${GK.x}" cy="${GK.y}" r="${GK.r}" fill="none" stroke="${hex(DOT)}" stroke-width="${GK.w}"/>
</svg>
`;
writeFileSync(join(OUT, "favicon.svg"), favicon);
console.log("escrito favicon.svg");
