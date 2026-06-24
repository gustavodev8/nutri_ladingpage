import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { MealPlan, Meal, Patient } from "@/lib/supabase";

type RGB = [number, number, number];

const C = {
  brand: [8, 95, 70] as RGB,
  brandSoft: [204, 251, 241] as RGB,
  brandDark: [4, 47, 46] as RGB,
  ink: [15, 23, 42] as RGB,
  muted: [100, 116, 139] as RGB,
  line: [226, 232, 240] as RGB,
  card: [255, 255, 255] as RGB,
  soft: [248, 250, 252] as RGB,
  soft2: [236, 253, 245] as RGB,
  accentBlue: [37, 99, 235] as RGB,
  accentAmber: [217, 119, 6] as RGB,
  accentRose: [225, 29, 72] as RGB,
  accentEmerald: [5, 150, 105] as RGB,
  white: [255, 255, 255] as RGB,
};

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return null;
  return `${d}/${m}/${y}`;
}

function formatToday() {
  return new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

function sum(foods: Meal["foods"]) {
  return (foods ?? []).reduce(
    (acc, food) => ({
      cal: acc.cal + (food.calories ?? 0),
      prot: acc.prot + (food.protein ?? 0),
      carbs: acc.carbs + (food.carbs ?? 0),
      fat: acc.fat + (food.fat ?? 0),
    }),
    { cal: 0, prot: 0, carbs: 0, fat: 0 },
  );
}

function roundRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fill: RGB, stroke?: RGB) {
  doc.setFillColor(...fill);
  if (stroke) doc.setDrawColor(...stroke);
  doc.roundedRect(x, y, w, h, r, r, stroke ? "FD" : "F");
}

function pill(doc: jsPDF, x: number, y: number, label: string, fill: RGB, text: RGB = C.ink) {
  const w = Math.max(16, doc.getTextWidth(label) + 8);
  roundRect(doc, x, y, w, 6.5, 3, fill, fill);
  doc.setTextColor(...text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text(label, x + w / 2, y + 4.5, { align: "center" });
  return w;
}

function sectionText(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  title: string,
  text: string,
  fill: RGB,
  textColor: RGB,
  pageHeight: number,
) {
  const lines = doc.splitTextToSize(text, w - 10);
  const h = 12 + lines.length * 4;
  if (y + h > pageHeight - 18) return null;

  roundRect(doc, x, y, w, h, 2.5, fill, C.line);
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(title.toUpperCase(), x + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(lines, x + 4, y + 10);
  return h;
}

function header(doc: jsPDF, plan: MealPlan, patient: Patient | null, pageWidth: number, margin: number) {
  const headerHeight = 38;
  doc.setFillColor(...C.brandDark);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  doc.setTextColor(...C.brandSoft);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("PLANO ALIMENTAR PERSONALIZADO", margin, 9);

  doc.setTextColor(...C.white);
  doc.setFontSize(18);
  doc.text(patient?.name || "Paciente", margin, 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.brandSoft);
  doc.text(`Gerado em ${formatToday()}`, margin, 28);

  const right = [plan.title || "Plano alimentar", fmtDate(plan.start_date), fmtDate(plan.end_date)]
    .filter(Boolean)
    .join("  ·  ");
  doc.text(right, pageWidth - margin, 28, { align: "right" });
}

function summaryCards(
  doc: jsPDF,
  pageWidth: number,
  margin: number,
  startY: number,
  grand: { cal: number; prot: number; carbs: number; fat: number },
) {
  const w = (pageWidth - margin * 2 - 9) / 4;
  const cards = [
    { label: "Energia total", value: grand.cal > 0 ? `${Math.round(grand.cal)} kcal` : "0 kcal", color: C.accentEmerald },
    { label: "Proteínas", value: grand.prot > 0 ? `${grand.prot.toFixed(1)} g` : "0 g", color: C.accentBlue },
    { label: "Carboidratos", value: grand.carbs > 0 ? `${grand.carbs.toFixed(1)} g` : "0 g", color: C.accentAmber },
    { label: "Gorduras", value: grand.fat > 0 ? `${grand.fat.toFixed(1)} g` : "0 g", color: C.accentRose },
  ] as const;

  cards.forEach((card, idx) => {
    const x = margin + idx * (w + 3);
    roundRect(doc, x, startY, w, 20, 2.5, C.card, C.line);
    doc.setFillColor(...card.color);
    doc.rect(x, startY + 18.5, w, 1.5, "F");
    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.text(card.label.toUpperCase(), x + w / 2, startY + 5.3, { align: "center" });
    doc.setTextColor(...card.color);
    doc.setFontSize(13);
    doc.text(card.value, x + w / 2, startY + 13, { align: "center" });
  });
}

function mealHeight(meal: Meal) {
  const foods = meal.foods ?? [];
  const notesLines = meal.notes?.trim() ? Math.max(1, meal.notes.trim().split(/\n+/).length) : 0;
  const subs = (meal.substitution_items ?? []).filter((item) => item.food_name.trim()).length;
  return 28 + foods.length * 5.2 + (notesLines ? 10 + notesLines * 4 : 0) + (subs ? 10 + subs * 4.2 : 0);
}

function drawMealCard(
  doc: jsPDF,
  meal: Meal,
  idx: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  currentY: number,
) {
  const contentW = pageWidth - margin * 2;
  const estH = mealHeight(meal);
  if (currentY + estH > pageHeight - 18) {
    doc.addPage();
    currentY = 14;
  }

  const foods = meal.foods ?? [];
  const totals = sum(foods);
  const isSubstitution = /substitui/i.test(meal.meal_name);

  roundRect(doc, margin, currentY, contentW, estH, 3, C.card, C.line);
  doc.setFillColor(...C.soft);
  doc.rect(margin, currentY, contentW, 11, "F");
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.25);
  doc.line(margin, currentY + 11, margin + contentW, currentY + 11);

  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(`${String(idx + 1).padStart(2, "0")} · ${meal.meal_name || "Refeição"}`, margin + 4, currentY + 7.1);

  if (isSubstitution) {
    pill(doc, margin + 72, currentY + 2.4, "Substituição", [255, 247, 237] as RGB, [194, 65, 12] as RGB);
  }
  if (meal.time_suggestion) {
    const w = doc.getTextWidth(meal.time_suggestion) + 8;
    pill(doc, pageWidth - margin - w, currentY + 2.4, meal.time_suggestion, C.white, C.muted);
  }

  const kcalText = `${Math.round(totals.cal)} kcal`;
  pill(doc, pageWidth - margin - 4 - Math.min(44, doc.getTextWidth(kcalText) + 8), currentY + 2.4, kcalText, C.brandSoft, C.brandDark);

  let y = currentY + 13.5;

  if (foods.length === 0) {
    roundRect(doc, margin + 4, y + 1, contentW - 8, 10, 2, C.soft2, C.line);
    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.text("Nenhum alimento adicionado.", pageWidth / 2, y + 7.6, { align: "center" });
    y += 14;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: margin + 4, right: margin + 4 },
      theme: "grid",
      head: [["Alimento", "Qtd", "kcal", "P", "C", "G"]],
      body: foods.map((food) => [
        food.food_name || "-",
        food.quantity ? `${food.quantity}${food.unit ?? "g"}` : "-",
        food.calories ? food.calories.toFixed(0) : "-",
        food.protein ? food.protein.toFixed(1) : "-",
        food.carbs ? food.carbs.toFixed(1) : "-",
        food.fat ? food.fat.toFixed(1) : "-",
      ]),
      styles: {
        font: "helvetica",
        fontSize: 8,
        textColor: C.ink,
        lineColor: C.line,
        lineWidth: 0.15,
        cellPadding: 2.2,
      },
      headStyles: {
        fillColor: C.soft2,
        textColor: C.muted,
        fontStyle: "bold",
        fontSize: 6.8,
      },
      alternateRowStyles: { fillColor: C.soft },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 26, halign: "right" },
        2: { cellWidth: 16, halign: "right" },
        3: { cellWidth: 16, halign: "right" },
        4: { cellWidth: 16, halign: "right" },
        5: { cellWidth: 16, halign: "right" },
      },
      didParseCell(data) {
        if (data.section === "body" && data.row.index === foods.length - 1) {
          data.cell.styles.fillColor = [236, 253, 245];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2.5;
  }

  if (meal.notes?.trim()) {
    const block = sectionText(doc, margin + 4, y, contentW - 8, "Observações", meal.notes.trim(), [255, 251, 235], [124, 45, 18], pageHeight);
    if (block) y += block + 2;
  }

  const subs = (meal.substitution_items ?? []).filter((s) => s.food_name.trim());
  if (subs.length > 0) {
    const text = subs
      .map((sub, i) => {
        const qty = sub.quantity ? `${sub.quantity}${sub.unit ?? "g"} de ` : "";
        const prefix = sub.replaces_food ? `No lugar de ${sub.replaces_food}: ` : `Opção ${i + 1}: `;
        const note = sub.notes ? ` - ${sub.notes}` : "";
        return `${prefix}${qty}${sub.food_name}${note}`;
      })
      .join("\n");
    const block = sectionText(doc, margin + 4, y, contentW - 8, "Substituições", text, [255, 247, 237], [154, 52, 18], pageHeight);
    if (block) y += block + 2;
  }

  return y + 4;
}

export function generateMealPlanPdf(plan: MealPlan, meals: Meal[], patient: Patient | null): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const grand = meals.reduce(
    (acc, meal) => {
      const totals = sum(meal.foods);
      return {
        cal: acc.cal + totals.cal,
        prot: acc.prot + totals.prot,
        carbs: acc.carbs + totals.carbs,
        fat: acc.fat + totals.fat,
      };
    },
    { cal: 0, prot: 0, carbs: 0, fat: 0 },
  );

  header(doc, plan, patient, pageWidth, margin);

  let y = 42;
  summaryCards(doc, pageWidth, margin, y, grand);
  y += 26;

  const start = fmtDate(plan.start_date);
  const end = fmtDate(plan.end_date);
  const age = ageYears(patient?.birth_date);

  const infoText = [
    plan.title || "Plano alimentar",
    start && end ? `Período: ${start} - ${end}` : start ? `Início: ${start}` : null,
    patient?.city ? patient.city : null,
    age != null ? `${age} anos` : null,
  ].filter(Boolean).join("  ·  ");

  const infoHeight = sectionText(
    doc,
    margin,
    y,
    pageWidth - margin * 2,
    "Resumo clínico",
    infoText,
    C.card,
    C.ink,
    pageHeight,
  );
  y += (infoHeight ?? 0) + 4;

  if (plan.notes?.trim()) {
    const notesHeight = sectionText(
      doc,
      margin,
      y,
      pageWidth - margin * 2,
      "Orientações gerais",
      plan.notes.trim(),
      [247, 252, 250],
      [6, 95, 70],
      pageHeight,
    );
    y += (notesHeight ?? 0) + 4;
  }

  meals.forEach((meal, idx) => {
    y = drawMealCard(doc, meal, idx, pageWidth, pageHeight, margin, y);
  });

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const footerY = pageHeight - 9;
    doc.setFillColor(...C.brand);
    doc.rect(0, footerY, pageWidth, 9, "F");
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.7);
    doc.text(`Gerado em ${formatToday()}  ·  Documento clínico confidencial`, margin, footerY + 5.3);
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, footerY + 5.3, { align: "right" });
  }

  return doc;
}
