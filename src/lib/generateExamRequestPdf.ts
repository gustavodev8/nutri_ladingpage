import { jsPDF } from "jspdf";
import type { ExamCatalogItem } from "@/lib/supabase";

const RGB = {
  ink: [15, 23, 42] as const,
  muted: [71, 85, 105] as const,
  faint: [148, 163, 184] as const,
  line: [203, 213, 225] as const,
  soft: [248, 250, 252] as const,
  clinical: [4, 120, 87] as const,
  clinicalDark: [6, 78, 59] as const,
  white: [255, 255, 255] as const,
};

export interface ExamRequestPdfItem {
  exam: ExamCatalogItem;
  notes?: string;
}

export interface ExamRequestPdfData {
  patientName: string;
  patientEmail?: string | null;
  patientPhone?: string | null;
  patientCpf?: string | null;
  patientBirthDate?: string | null;
  patientGender?: "M" | "F" | "outro" | string | null;
  patientCity?: string | null;
  protocolName?: string | null;
  globalNotes?: string | null;
  items: ExamRequestPdfItem[];
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatIsoDate(iso?: string | null) {
  if (!iso) return null;
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return null;
  return `${day}/${month}/${year}`;
}

function ageYears(birthDate?: string | null) {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function genderLabel(gender?: string | null) {
  if (gender === "M") return "Masculino";
  if (gender === "F") return "Feminino";
  if (gender === "outro") return "Outro";
  return null;
}

function normalizeFilePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function examRequestPdfFilename(patientName: string) {
  return `solicitacao-exames-${normalizeFilePart(patientName) || "paciente"}.pdf`;
}

async function loadImageDataUrl(src: string): Promise<string> {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Falha ao carregar imagem: ${src}`);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Falha ao ler imagem: ${src}`));
    reader.readAsDataURL(blob);
  });
}

function groupedItems(items: ExamRequestPdfItem[]) {
  return items.reduce<Record<string, ExamRequestPdfItem[]>>((acc, item) => {
    const category = item.exam.group_category || "Geral";
    (acc[category] ??= []).push(item);
    return acc;
  }, {});
}

const spacedTextFixes: Array<[RegExp, string]> = [
  [/^insulina\s*de\s*jejum$/i, "Insulina de Jejum"],
  [/^glicemia\s*de\s*jejum$/i, "Glicemia de Jejum"],
  [/^ferro\s*s[eé]rico$/i, "Ferro Sérico"],
  [/^hemograma\s*completo$/i, "Hemograma Completo"],
  [/^satura[cç][aã]o\s*de\s*transferrina$/i, "Saturação de Transferrina"],
  [/^hba1c$/i, "HbA1c"],
];

function compactSpacedLetters(value: string) {
  const compacted = value
    .normalize("NFC")
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, " ")
    .replace(/\b((?:[\p{L}\p{N}¼µμ]\s+){1,}[\p{L}\p{N}¼µμ])\b/gu, (match) =>
      match.replace(/\s+/g, ""),
    )
    .replace(/([a-záàâãéêíóôõúç])((?:de|da|do|dos|das))([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ])/g, "$1 $2 $3")
    .replace(/([a-záàâãéêíóôõúç]{3,})([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç])/g, "$1 $2")
    .replace(/[¼µμ]\s*U\s*I\b/gi, "mcUI")
    .replace(/[¼µμ]\s*g\b/gi, "mcg")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+\/\s+/g, "/")
    .replace(/\s{2,}/g, " ")
    .trim();

  const normalizedKey = compacted
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();

  for (const [pattern, fixed] of spacedTextFixes) {
    if (pattern.test(normalizedKey)) return fixed;
  }

  return compacted;
}

function drawField(
  doc: jsPDF,
  label: string,
  value: string | null | undefined,
  x: number,
  y: number,
  width: number,
) {
  doc.setTextColor(...RGB.faint);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(label.toUpperCase(), x, y);

  doc.setTextColor(...RGB.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const text = value?.trim() || "—";
  const lines = doc.splitTextToSize(text, width) as string[];
  doc.text(lines.slice(0, 2), x, y + 5);
}

export async function generateExamRequestPdf(data: ExamRequestPdfData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const footerReserve = 24;
  const signatureReserve = 38;
  const contentMaxY = pageHeight - margin - footerReserve;
  let y = 16;

  let signatureImage: string | null = null;
  try {
    signatureImage = await loadImageDataUrl("/assinatura.png");
  } catch (error) {
    console.warn("[generateExamRequestPdf] Assinatura não carregou:", error);
  }

  const ensureSpace = (needed: number) => {
    if (y + needed <= contentMaxY) return;
    doc.addPage();
    y = 16;
  };

  const drawHeader = () => {
    doc.setDrawColor(...RGB.clinicalDark);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);

    doc.setTextColor(...RGB.clinicalDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Solicitação de Exames Laboratoriais", margin, y + 9);

    doc.setTextColor(...RGB.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Documento clínico para apresentação em laboratório", margin, y + 15);

    doc.setTextColor(...RGB.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Dr. Fillipe David", pageWidth - margin, y + 7, { align: "right" });
    doc.setTextColor(...RGB.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Nutricionista Clínico e Esportivo · CRN-5", pageWidth - margin, y + 12, { align: "right" });
    doc.text("Alagoinhas / BA", pageWidth - margin, y + 17, { align: "right" });

    y += 28;
  };

  const drawPatientBox = () => {
    const birth = formatIsoDate(data.patientBirthDate);
    const age = ageYears(data.patientBirthDate);
    const birthInfo = [birth, age != null ? `${age} anos` : null].filter(Boolean).join(" · ");
    const meta = [
      data.protocolName ? `Protocolo: ${data.protocolName}` : null,
      `Emitido em ${formatDate(new Date())}`,
    ].filter(Boolean).join(" · ");

    doc.setFillColor(...RGB.soft);
    doc.setDrawColor(...RGB.line);
    doc.roundedRect(margin, y, contentWidth, 42, 3, 3, "FD");

    doc.setTextColor(...RGB.clinicalDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("DADOS DO PACIENTE", margin + 4, y + 6);

    doc.setTextColor(...RGB.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(meta, pageWidth - margin - 4, y + 6, { align: "right" });

    drawField(doc, "Paciente", data.patientName, margin + 4, y + 15, 72);
    drawField(doc, "Nascimento / idade", birthInfo || null, margin + 82, y + 15, 34);
    drawField(doc, "Sexo", genderLabel(data.patientGender), margin + 122, y + 15, 24);
    drawField(doc, "CPF", data.patientCpf, margin + 152, y + 15, 32);

    drawField(doc, "Telefone", data.patientPhone, margin + 4, y + 30, 48);
    drawField(doc, "E-mail", data.patientEmail, margin + 58, y + 30, 76);
    drawField(doc, "Cidade", data.patientCity, margin + 140, y + 30, 44);

    y += 52;
  };

  const drawSectionTitle = () => {
    doc.setTextColor(...RGB.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Exames solicitados (${data.items.length})`, margin, y);
    doc.setDrawColor(...RGB.line);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 3, pageWidth - margin, y + 3);
    y += 9;
  };

  drawHeader();
  drawPatientBox();
  drawSectionTitle();

  const groups = groupedItems(data.items);
  for (const [category, items] of Object.entries(groups)) {
    ensureSpace(12);
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, "FD");
    doc.setTextColor(...RGB.clinicalDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(compactSpacedLetters(category).toUpperCase(), margin + 3, y + 5.4);
    y += 11;

    for (const item of items) {
      const note = item.notes?.trim();
      const examName = compactSpacedLetters(item.exam.name);
      const examUnit = item.exam.unit ? compactSpacedLetters(item.exam.unit) : "";
      const name = examUnit ? `${examName} (${examUnit})` : examName;
      const lines = doc.splitTextToSize(name, contentWidth - 13) as string[];
      const noteLines = note ? doc.splitTextToSize(`Obs: ${note}`, contentWidth - 18) as string[] : [];
      const height = Math.max(7, lines.length * 4.3 + noteLines.length * 3.8 + 3);
      ensureSpace(height);

      doc.setDrawColor(...RGB.line);
      doc.setLineWidth(0.1);
      doc.line(margin, y + height - 1, pageWidth - margin, y + height - 1);
      doc.setDrawColor(...RGB.clinical);
      doc.setLineWidth(0.25);
      doc.rect(margin + 1, y + 1.2, 2.1, 2.1);

      doc.setTextColor(...RGB.ink);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.3);
      doc.text(lines, margin + 7, y + 3.4);

      if (noteLines.length > 0) {
        doc.setTextColor(...RGB.muted);
        doc.setFontSize(7.8);
        doc.text(noteLines, margin + 9, y + 3.4 + lines.length * 4.3);
      }

      y += height;
    }
  }

  if (data.globalNotes?.trim()) {
    const lines = doc.splitTextToSize(data.globalNotes.trim(), contentWidth - 8) as string[];
    ensureSpace(lines.length * 4.2 + 13);
    y += 3;
    doc.setFillColor(...RGB.soft);
    doc.setDrawColor(...RGB.line);
    doc.roundedRect(margin, y, contentWidth, lines.length * 4.2 + 10, 2, 2, "FD");
    doc.setTextColor(...RGB.clinicalDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("OBSERVAÇÕES GERAIS", margin + 4, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...RGB.muted);
    doc.text(lines, margin + 4, y + 10);
  }

  if (y + signatureReserve > contentMaxY) {
    doc.addPage();
    y = 16;
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setTextColor(...RGB.faint);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Documento clínico confidencial", margin, pageHeight - 5);
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: "right" });
  }

  doc.setPage(totalPages);
  const signatureLineY = pageHeight - margin - 18;
  if (signatureImage) {
    const signatureWidth = 42;
    const signatureHeight = 16;
    const signatureX = (pageWidth - signatureWidth) / 2;
    const signatureY = signatureLineY - signatureHeight - 1;
    doc.addImage(signatureImage, "PNG", signatureX, signatureY, signatureWidth, signatureHeight);
  }

  doc.setDrawColor(...RGB.ink);
  doc.setLineWidth(0.2);
  doc.line(pageWidth / 2 - 31, signatureLineY, pageWidth / 2 + 31, signatureLineY);
  doc.setTextColor(...RGB.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Dr. Fillipe David", pageWidth / 2, signatureLineY + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...RGB.muted);
  doc.text("Nutricionista Clínico e Esportivo · CRN-5", pageWidth / 2, signatureLineY + 10, { align: "center" });

  return doc;
}
