import jsPDF from "jspdf";
import type { Patient, PatientReport } from "@/lib/supabase";

const RGB = {
  green: [6, 95, 70] as const,
  greenSoft: [110, 231, 183] as const,
  text: [17, 24, 39] as const,
  muted: [107, 114, 128] as const,
  border: [229, 231, 235] as const,
  bg: [255, 255, 255] as const,
  note: [248, 250, 252] as const,
};

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

function formatBirthDate(iso?: string | null) {
  if (!iso) return null;
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function ageYears(birthDate?: string | null) {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDelta = now.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) years--;
  return years;
}

export function generatePatientReportPdf(patient: Patient, report: PatientReport): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const age = ageYears(patient.birth_date);
  const info = [
    patient.city ? patient.city : null,
    patient.birth_date ? `Nascimento: ${formatBirthDate(patient.birth_date)}` : null,
    age != null ? `${age} anos` : null,
  ].filter(Boolean) as string[];

  const text = report.report_text.trim();
  const lines = doc.splitTextToSize(text || "Relatório sem conteúdo.", contentWidth);
  const lineHeight = 5;
  const headerHeight = 34;
  const footerHeight = 12;
  let y = margin + headerHeight + 8;
  const maxY = pageHeight - margin - footerHeight;

  const ensureSpace = (needed: number) => {
    if (y + needed <= maxY) return;
    doc.addPage();
    y = margin + 10;
  };

  doc.setFillColor(...RGB.green);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  doc.setTextColor(...RGB.greenSoft);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("RELATÓRIO CLÍNICO PERSONALIZADO", margin, 9);

  doc.setTextColor(...RGB.bg);
  doc.setFontSize(18);
  doc.text(patient.name || "Paciente", margin, 19);

  doc.setTextColor(...RGB.greenSoft);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Gerado em ${formatDate(new Date())}`, margin, 27);

  const meta = [
    report.title || null,
    report.report_date ? `Data: ${formatIsoDate(report.report_date)}` : null,
  ].filter(Boolean) as string[];
  if (info.length > 0 || meta.length > 0) {
    doc.text([...meta, ...info].join("  ·  "), pageWidth - margin, 27, { align: "right" });
  }

  doc.setFillColor(...RGB.bg);
  doc.setDrawColor(...RGB.border);
  doc.roundedRect(margin, y - 2, contentWidth, 14, 3, 3, "FD");
  doc.setTextColor(...RGB.muted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Conteúdo do relatório", margin + 4, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...RGB.text);
  doc.text("Use este espaço para descrever a evolução, adesão, intercorrências e conduta.", margin + 4, y + 8);
  y += 18;

  if (text) {
    text.split(/\n+/).forEach((paragraph) => {
      const paragraphLines = doc.splitTextToSize(paragraph.trim(), contentWidth);
      const paragraphHeight = Math.max(1, paragraphLines.length) * lineHeight + 2;
      ensureSpace(paragraphHeight);
      doc.setTextColor(...RGB.text);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(paragraphLines, margin, y);
      y += paragraphHeight;
    });
  } else {
    ensureSpace(12);
    doc.setFillColor(...RGB.note);
    doc.setDrawColor(...RGB.border);
    doc.roundedRect(margin, y, contentWidth, 14, 3, 3, "FD");
    doc.setTextColor(...RGB.muted);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("O relatório ainda está em branco.", margin + 4, y + 9);
    y += 18;
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setTextColor(...RGB.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Documento clínico confidencial", margin, pageHeight - 4);
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - margin, pageHeight - 4, { align: "right" });
  }

  return doc;
}
