import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import jsPDF from "jspdf";

// Worker set up once at module load (module is lazy-loaded with the Ferramentas page)
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfQuality = "baixa" | "media" | "alta";

const PRESETS: Record<PdfQuality, { dpi: number; q: number }> = {
  baixa: { dpi: 72,  q: 0.60 },
  media: { dpi: 96,  q: 0.75 },
  alta:  { dpi: 150, q: 0.85 },
};

export async function compressPdf(
  file: File,
  quality: PdfQuality,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const { dpi, q } = PRESETS[quality];
  const scale = dpi / 72;

  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const total = srcDoc.numPages;

  let outPdf: jsPDF | null = null;

  for (let n = 1; n <= total; n++) {
    onProgress?.(n - 1, total);

    const page = await srcDoc.getPage(n);
    const vp = page.getViewport({ scale });
    const w = Math.round(vp.width);
    const h = Math.round(vp.height);

    const canvas = document.createElement("canvas");
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    const dataUrl = canvas.toDataURL("image/jpeg", q);

    if (!outPdf) {
      outPdf = new jsPDF({ unit: "px", format: [w, h], compress: true });
    } else {
      outPdf.addPage([w, h]);
    }
    outPdf.addImage(dataUrl, "JPEG", 0, 0, w, h, undefined, "FAST");

    // Free canvas memory immediately
    canvas.width = 0;
    canvas.height = 0;

    onProgress?.(n, total);
  }

  if (!outPdf) throw new Error("PDF sem páginas.");
  return outPdf.output("blob");
}
