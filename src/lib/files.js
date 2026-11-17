/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */

// Some browsers rotate the <img> preview to respect a photo's EXIF orientation tag but
// ignore that same tag when the pixels are later drawn onto a <canvas> — which is exactly
// what made the saved crop not match what was seen while framing it. Normalizing every
// picked photo through createImageBitmap's orientation-aware decoder once, up front, means
// the crop editor and the final save always work from the same, already-corrected pixels.
export async function fileToDataUrl(file) {
  try {
    if (window.createImageBitmap) {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.92);
    }
  } catch (e) { /* fall through to the raw read below */ }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

// Los nombres de archivo tampoco admiten \ / : * ? " < > |
export function sanitizeFileName(name) {
  return String(name || "").replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "_").replace(/_+/g, "_").replace(/^[_.-]+|[_.-]+$/g, "").slice(0, 60);
}

export const dateLabelOf = (iso) => new Date(iso).toLocaleDateString("es-ES").replace(/\//g, "-");

export const isStandaloneApp = () => {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  } catch (e) { return false; }
};

export function downloadTextFile(content, fileName, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
