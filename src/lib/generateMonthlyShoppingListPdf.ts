import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { MonthlyShoppingListResult } from "@/lib/monthlyShoppingList";

type RGB = [number, number, number];

const C = {
  ink: [17, 24, 39] as RGB,
  muted: [100, 116, 139] as RGB,
  line: [226, 232, 240] as RGB,
  soft: [248, 250, 252] as RGB,
  soft2: [241, 245, 249] as RGB,
  accent: [13, 148, 136] as RGB,
  accentDark: [15, 118, 110] as RGB,
  warn: [180, 83, 9] as RGB,
  warnBg: [255, 251, 235] as RGB,
  white: [255, 255, 255] as RGB,
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatToday() {
  return new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fitText(doc: jsPDF, text: string, maxWidth: number) {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  const ellipsis = "...";
  let current = text.trim();
  while (current.length > 0 && doc.getTextWidth(`${current}${ellipsis}`) > maxWidth) {
    current = current.slice(0, -1);
  }
  return `${current}${ellipsis}`;
}

function wrapLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [""];

  const lines: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current) lines.push(current);
    current = "";
  };

  for (const word of normalized.split(" ")) {
    const candidate = current ? `${current} ${word}` : word;
    if (doc.getTextWidth(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      pushCurrent();
    }

    if (doc.getTextWidth(word) <= maxWidth) {
      current = word;
      continue;
    }

    let chunk = "";
    for (const char of word) {
      const next = chunk + char;
      if (doc.getTextWidth(next) <= maxWidth) {
        chunk = next;
      } else {
        if (chunk) lines.push(chunk);
        chunk = char;
      }
    }
    current = chunk;
  }

  pushCurrent();
  return lines;
}

function drawHeader(doc: jsPDF, planTitle: string, patientName: string | undefined, days: number, pageWidth: number) {
  const headerHeight = 33;
  doc.setFillColor(...C.accentDark);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("Lista de compras do mês", 14, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const subtitle = [
    `Plano: ${planTitle || "Plano alimentar"}`,
    patientName ? `Paciente: ${patientName}` : null,
    `${days} dias de referência`,
  ].filter(Boolean).join("  ·  ");
  doc.text(subtitle, 14, 23);

  doc.setFontSize(8);
  doc.setTextColor(212, 255, 247);
  doc.text(`Gerado em ${formatToday()}`, pageWidth - 14, 13, { align: "right" });

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.line(14, 28, pageWidth - 14, 28);
}

function drawIntro(doc: jsPDF, y: number, pageWidth: number) {
  const boxX = 14;
  const boxW = pageWidth - 28;
  const boxH = 24;
  doc.setFillColor(...C.soft);
  doc.setDrawColor(...C.line);
  doc.roundedRect(boxX, y, boxW, boxH, 3, 3, "FD");

  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Como usar", boxX + 4, y + 7);

  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const lines = wrapLines(
    doc,
    "A lista foi organizada para orientar a compra com mais clareza. Sempre confira a quantidade cadastrada no plano e ajuste os itens sem medida definida antes de ir ao mercado.",
    boxW - 8,
  );
  doc.text(lines.slice(0, 2), boxX + 4, y + 13);

  return y + boxH + 6;
}

function drawSummaryCards(doc: jsPDF, y: number, pageWidth: number, result: MonthlyShoppingListResult) {
  const gap = 4;
  const cardW = (pageWidth - 28 - gap * 2) / 3;
  const cards = [
    { label: "Itens consolidados", value: String(result.totalItems) },
    { label: "Grupos de compra", value: String(result.totalGroups) },
    { label: "Itens sem quantidade", value: String(result.totalMissingOccurrences) },
  ];

  cards.forEach((card, index) => {
    const x = 14 + index * (cardW + gap);
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.line);
    doc.roundedRect(x, y, cardW, 18, 3, 3, "FD");
    doc.setFillColor(...C.soft2);
    doc.rect(x, y, cardW, 2, "F");
    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.text(card.label.toUpperCase(), x + 4, y + 6);
    doc.setTextColor(...C.ink);
    doc.setFontSize(11.5);
    doc.text(card.value, x + 4, y + 13.5);
  });

  return y + 24;
}

function drawMissingSection(doc: jsPDF, y: number, pageWidth: number, missingItems: MonthlyShoppingListResult["missingItems"]) {
  if (missingItems.length === 0) return y;

  const contentW = pageWidth - 28;
  const text = "Itens sem quantidade precisam ser ajustados no plano para que a lista mensal fique fiel à dieta.";
  const lines = wrapLines(doc, text, contentW - 8);
  const height = 12 + lines.length * 4 + Math.min(10, missingItems.length) * 5;
  doc.setFillColor(...C.warnBg);
  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(14, y, contentW, height, 3, 3, "FD");

  doc.setTextColor(...C.warn);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Atenção clínica", 18, y + 7);

  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(lines, 18, y + 12);

  let chipX = 18;
  let chipY = y + 18;
  missingItems.slice(0, 10).forEach((item) => {
    const label = fitText(doc, `${item.foodName} (${item.occurrences})`, pageWidth - chipX - 18);
    const chipW = Math.min(66, doc.getTextWidth(label) + 8);
    if (chipX + chipW > pageWidth - 18) {
      chipX = 18;
      chipY += 6.5;
    }
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(chipX, chipY - 4.5, chipW, 5.5, 2, 2, "FD");
    doc.setTextColor(...C.warn);
    doc.setFontSize(7);
    doc.text(label, chipX + 4, chipY);
    chipX += chipW + 2.5;
  });

  return y + height + 6;
}

function drawGroupTitle(doc: jsPDF, y: number, pageWidth: number, title: string, total: number) {
  doc.setFillColor(...C.soft2);
  doc.setDrawColor(...C.line);
  doc.roundedRect(14, y, pageWidth - 28, 12, 3, 3, "FD");

  doc.setTextColor(...C.accentDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(title, 18, y + 7.5);

  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`${total} item${total === 1 ? "" : "s"}`, pageWidth - 18, y + 7.5, { align: "right" });

  return y + 14;
}

function buildRows(groupItems: MonthlyShoppingListResult["groups"][number]["items"], doc: jsPDF) {
  return groupItems.map((item) => ({
    item: item.foodName,
    qty: `${item.displayQuantity.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${item.displayUnit}`,
    meal: item.sourceMeals.join(" · "),
    note:
      item.missingOccurrences > 0
        ? `Falta quantidade em ${item.missingOccurrences} ocorrência${item.missingOccurrences === 1 ? "" : "s"}`
        : item.quantifiedOccurrences > 1
        ? "Somado de várias refeições"
        : "Item único",
    widthHint: doc.getTextWidth(item.foodName),
  }));
}

export function generateMonthlyShoppingListPdf(
  result: MonthlyShoppingListResult,
  options: {
    planTitle: string;
    patientName?: string;
    days: number;
  },
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 10;
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed <= footerY) return;
    doc.addPage();
    y = 14;
  };

  drawHeader(doc, options.planTitle, options.patientName, options.days, pageWidth);
  y = 36;
  y = drawIntro(doc, y, pageWidth);
  y = drawSummaryCards(doc, y, pageWidth, result);
  y = drawMissingSection(doc, y, pageWidth, result.missingItems);

  result.groups.forEach((group) => {
    const rows = buildRows(group.items, doc);
    const estimatedHeight = 16 + rows.length * 8.4;
    ensureSpace(estimatedHeight + 10);

    y = drawGroupTitle(doc, y, pageWidth, group.foodGroup, group.items.length);

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      tableWidth: pageWidth - 28,
      head: [["Alimento", "Quantidade mensal", "Origem", "Orientação"]],
      body: rows.map((row) => [row.item, row.qty, fitText(doc, row.meal, 56), row.note]),
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 8.4,
        cellPadding: 2.2,
        textColor: C.ink,
        lineColor: C.line,
        lineWidth: 0.15,
        valign: "middle",
      },
      headStyles: {
        fillColor: C.accentDark,
        textColor: C.white,
        fontStyle: "bold",
        halign: "left",
      },
      alternateRowStyles: {
        fillColor: C.soft,
      },
      columnStyles: {
        0: { cellWidth: 61 },
        1: { cellWidth: 31, halign: "right" },
        2: { cellWidth: 54 },
        3: { cellWidth: "auto" },
      },
    });

    y = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 20;
    y += 6;
  });

  const finalFooterY = pageHeight - 10;
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.2);
  doc.line(14, finalFooterY - 3, pageWidth - 14, finalFooterY - 3);
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text("Orientação clínica: a lista é uma base de compra, não substitui a conferência das porções e medidas caseiras.", 14, finalFooterY);
  doc.text(`Página 1`, pageWidth - 14, finalFooterY, { align: "right" });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.2);
    doc.line(14, finalFooterY - 3, pageWidth - 14, finalFooterY - 3);
    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.text("Orientação clínica: a lista é uma base de compra, não substitui a conferência das porções e medidas caseiras.", 14, finalFooterY);
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - 14, finalFooterY, { align: "right" });
  }

  return doc;
}

export function buildMonthlyShoppingListFileName(planTitle: string, patientName?: string) {
  const safePlan = normalizeText(planTitle) || "lista-de-compras";
  const safePatient = normalizeText(patientName ?? "") || "paciente";
  return `${safePlan}-${safePatient}.pdf`;
}
