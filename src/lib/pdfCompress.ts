import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

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
  const srcDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const total = srcDoc.numPages;
  const outDoc = await PDFDocument.create();

  for (let n = 1; n <= total; n++) {
    onProgress?.(n - 1, total);

    const page = await srcDoc.getPage(n);
    const vp = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width  = Math.round(vp.width);
    canvas.height = Math.round(vp.height);

    await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;

    const jpegBlob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob(b => (b ? res(b) : rej(new Error("toBlob falhou"))), "image/jpeg", q),
    );

    const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
    const img = await outDoc.embedJpg(jpegBytes);
    const p = outDoc.addPage([canvas.width, canvas.height]);
    p.drawImage(img, { x: 0, y: 0, width: canvas.width, height: canvas.height });

    onProgress?.(n, total);
  }

  const bytes = await outDoc.save();
  return new Blob([bytes], { type: "application/pdf" });
}
