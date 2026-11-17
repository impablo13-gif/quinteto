/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { REPORT } from "../brand/tokens.js";

// Descarga el informe como .pdf de verdad, sin pasar por el diálogo de
// impresión del navegador -- en muchas tablets ese diálogo no tiene forma
// directa de "guardar como PDF" (o solo lo tiene tras varios pasos
// escondidos), así que esto es un botón aparte. Se renderiza el mismo HTML
// del informe fuera de la vista, se rasteriza con html2canvas -- así los
// campogramas y el resto del diseño salen pixel a pixel iguales -- y esa
// captura se trocea en páginas A4 dentro del PDF.
export async function exportReportToPdf(html, fileName) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);

  const RENDER_WIDTH = 900; // px — el mismo max-width que ya usaba el informe en pantalla
  const container = document.createElement("div");
  container.style.cssText = `position:fixed; left:-10000px; top:0; width:${RENDER_WIDTH}px; background:${REPORT.bg};`;
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const imgs = Array.from(container.querySelectorAll("img"));
    await Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((res) => { img.onload = res; img.onerror = res; }))));

    const scale = 2;
    const fullCanvas = await html2canvas(container, { scale, backgroundColor: REPORT.bg, useCORS: true, width: RENDER_WIDTH, windowWidth: RENDER_WIDTH });

    // Puntos de corte seguros: el borde superior de cada bloque marcado con
    // data-pdf-block (secciones, tarjetas, campogramas, fichas...). Cortar
    // solo ahí, en vez de a una altura fija, evita que una página parta una
    // tarjeta o un campograma por la mitad -- el informe sale encuadrado,
    // aunque quede algo de margen en blanco al final de alguna página.
    const containerTop = container.getBoundingClientRect().top;
    const blockTops = Array.from(container.querySelectorAll("[data-pdf-block]"))
      .map((el) => (el.getBoundingClientRect().top - containerTop) * scale)
      .filter((y) => y > 0)
      .sort((a, b) => a - b);

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const scaleFactor = pageWidth / fullCanvas.width;
    const idealSliceHeightPx = Math.max(1, Math.floor(pageHeight / scaleFactor));

    let renderedPx = 0;
    let firstPage = true;
    while (renderedPx < fullCanvas.height) {
      const idealEnd = Math.min(renderedPx + idealSliceHeightPx, fullCanvas.height);
      let cut = idealEnd;
      if (cut < fullCanvas.height) {
        // El mejor corte seguro que quepa en esta página: el último bloque
        // que arranca pasado el 40% de la página, para no desperdiciar
        // demasiado espacio en blanco. Si ninguno cae en esa franja (una
        // sección corta seguida de un bloque grande que no entra), se
        // relaja a "cualquier bloque que quepa", aunque deje más margen en
        // blanco -- la alternativa es el corte "ideal" a ciegas, que puede
        // caer en mitad de un título o de una fila. Solo si ni eso hay
        // (un único bloque más alto que la página entera) se cae a él.
        const preferred = blockTops.filter((y) => y > renderedPx + idealSliceHeightPx * 0.4 && y <= idealEnd);
        const candidates = preferred.length ? preferred : blockTops.filter((y) => y > renderedPx && y <= idealEnd);
        if (candidates.length) cut = candidates[candidates.length - 1];
      }
      const sliceHeight = Math.max(1, cut - renderedPx);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = fullCanvas.width;
      sliceCanvas.height = sliceHeight;
      const ctx = sliceCanvas.getContext("2d");
      ctx.fillStyle = REPORT.bg;
      ctx.fillRect(0, 0, sliceCanvas.width, sliceHeight);
      ctx.drawImage(fullCanvas, 0, renderedPx, fullCanvas.width, sliceHeight, 0, 0, fullCanvas.width, sliceHeight);
      const imgData = sliceCanvas.toDataURL("image/jpeg", 0.92);
      if (!firstPage) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, sliceHeight * scaleFactor);
      renderedPx += sliceHeight;
      firstPage = false;
    }

    pdf.save(fileName);
  } finally {
    document.body.removeChild(container);
  }
}
