import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { MealPlan, Meal, Patient } from "@/lib/supabase";

type RGB = [number, number, number];

const C = {
  ink: [17, 24, 39] as RGB,
  muted: [100, 116, 139] as RGB,
  line: [229, 231, 235] as RGB,
  lineStrong: [209, 213, 219] as RGB,
  soft: [249, 250, 251] as RGB,
  soft2: [243, 244, 246] as RGB,
  accent: [15, 118, 110] as RGB,
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

function roundRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fill: RGB, stroke?: RGB) {
  doc.setFillColor(...fill);
  if (stroke) doc.setDrawColor(...stroke);
  doc.roundedRect(x, y, w, h, r, r, stroke ? "FD" : "F");
}

function labelValue(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  label: string,
  value: string,
) {
  roundRect(doc, x, y, w, 18, 2.2, C.white, C.lineStrong);
  doc.setFillColor(...C.soft2);
  doc.rect(x, y, w, 2, "F");
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.text(label.toUpperCase(), x + 4, y + 6);
  doc.setTextColor(...C.ink);
  doc.setFontSize(10.5);
  doc.text(value, x + 4, y + 13);
}

function fitText(doc: jsPDF, text: string, maxWidth: number) {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  const ellipsis = "...";
  let trimmed = text.trim();
  while (trimmed.length > 0 && doc.getTextWidth(`${trimmed}${ellipsis}`) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}${ellipsis}`;
}

function mealHeight(meal: Meal, substitutionLayout: "stacked" | "columns" = "stacked") {
  const foods = meal.foods ?? [];
  const notesLines = meal.notes?.trim() ? Math.max(1, meal.notes.trim().split(/\n+/).length) : 0;
  const subs = (meal.substitution_items ?? []).filter((item) => item.food_name.trim()).length;
  const substitutionHeight =
    subs === 0
      ? 0
      : substitutionLayout === "columns" && subs > 1
        ? 12 + Math.ceil(subs / 2) * 20
        : 10 + subs * 4;
  return 30 + foods.length * 7.2 + (notesLines ? 10 + notesLines * 4.4 : 0) + substitutionHeight;
}

function mealQty(food: NonNullable<Meal["foods"]>[number]) {
  if (!food.quantity) return "â€”";
  return `${food.quantity}${food.unit ?? "g"}`;
}

export interface MealPlanPdfOptions {
  selectedAlternatives?: Record<number, number[]>;
  substitutionLayout?: "stacked" | "columns";
}

function formatSubstitutionText(sub: NonNullable<Meal["substitution_items"]>[number], index: number) {
  const qty = sub.quantity ? `${sub.quantity}${sub.unit ?? "g"} de ` : "";
  const prefix = sub.replaces_food ? `No lugar de ${sub.replaces_food}: ` : `OpÃ§Ã£o ${index + 1}: `;
  const note = sub.notes ? ` - ${sub.notes}` : "";
  return `${prefix}${qty}${sub.food_name}${note}`;
}

function drawStackedSubstitutions(
  doc: jsPDF,
  subs: NonNullable<Meal["substitution_items"]>,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  cursorY: number,
) {
  const contentW = pageWidth - margin * 2;
  const text = subs
    .map((sub, index) => formatSubstitutionText(sub, index))
    .join("\n");
  const lines = doc.splitTextToSize(text, contentW - 10);
  const h = 8 + lines.length * 3.8;
  if (cursorY + h > pageHeight - 16) {
    doc.addPage();
    cursorY = 14;
  }
  roundRect(doc, margin + 4, cursorY, contentW - 8, h, 2, [251, 251, 251], C.line);
  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("SubstituiÃ§Ãµes", margin + 8, cursorY + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.7);
  doc.text(lines, margin + 8, cursorY + 9);
  return cursorY + h + 2;
}

function drawColumnsSubstitutions(
  doc: jsPDF,
  subs: NonNullable<Meal["substitution_items"]>,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  cursorY: number,
) {
  const contentW = pageWidth - margin * 2;
  const gap = 4;
  const cardW = (contentW - 8 - gap) / 2;
  let y = cursorY;

  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("SubstituiÃ§Ãµes", margin + 4, y + 5);
  y += 8;

  for (let i = 0; i < subs.length; i += 2) {
    const left = subs[i];
    const right = subs[i + 1];

    const leftLines = doc.splitTextToSize(formatSubstitutionText(left, i), cardW - 8);
    const rightLines = right ? doc.splitTextToSize(formatSubstitutionText(right, i + 1), cardW - 8) : [];
    const leftH = 8 + leftLines.length * 3.5;
    const rightH = right ? 8 + rightLines.length * 3.5 : 0;
    const rowH = Math.max(leftH, rightH || leftH);

    if (y + rowH > pageHeight - 16) {
      doc.addPage();
      y = 14;
      doc.setTextColor(...C.ink);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("SubstituiÃ§Ãµes", margin + 4, y + 5);
      y += 8;
    }

    const drawCard = (x: number, lines: string[], index: number) => {
      roundRect(doc, x, y, cardW, rowH, 2, [251, 251, 251], C.line);
      doc.setTextColor(...C.accent);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.text(`OpÃ§Ã£o ${index + 1}`, x + 4, y + 5);
      doc.setTextColor(...C.ink);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(lines, x + 4, y + 9);
    };

    drawCard(margin + 4, leftLines, i);
    if (right) {
      drawCard(margin + 4 + cardW + gap, rightLines, i + 1);
    }

    y += rowH + 2;
  }

  return y;
}

function alternativeMealHeight(doc: jsPDF, meal: Meal, cardW: number) {
  const pad = 3.5;
  const innerW = cardW - pad * 2;
  const title = meal.meal_name || "Refeição";
  const titleLines = Math.min(2, Math.max(1, doc.splitTextToSize(title, innerW * 0.76).length));
  const foods = (meal.foods ?? []).filter((food) => food.food_name.trim()).slice(0, 4);
  const foodLines = foods.length > 0 ? foods.length : 1;
  return 28 + titleLines * 4.3 + 8.6 + foodLines * 4.9;
}

function drawAlternativeMealColumns(
  doc: jsPDF,
  meals: Meal[],
  pageWidth: number,
  pageHeight: number,
  margin: number,
  cursorY: number,
) {
  const contentW = pageWidth - margin * 2;
  const columns = pageWidth > pageHeight ? 3 : 2;
  const gap = 3.5;
  const cardW = (contentW - gap * (columns - 1)) / columns;
  let y = cursorY;

  for (let i = 0; i < meals.length; i += columns) {
    const left = meals[i];
    const middle = meals[i + 1];
    const right = meals[i + 2];
    const cards = [left, middle, right].filter(Boolean) as Meal[];
    const rowH = Math.max(...cards.map((meal) => alternativeMealHeight(doc, meal, cardW)));

    if (y + rowH > pageHeight - 16) {
      doc.addPage();
      y = 14;
    }

    const drawCard = (x: number, w: number, meal: Meal, index: number, showAccentBar: boolean) => {
      const pad = 3.5;
      const innerX = x + pad;
      const innerW = w - pad * 2;
      roundRect(doc, x, y, w, rowH, 2.2, C.white, C.lineStrong);

      doc.setFillColor(...C.soft2);
      doc.rect(x, y, w, 8, 'F');
      if (showAccentBar) {
        doc.setFillColor(...C.accent);
        doc.rect(x, y, 2.6, rowH, 'F');
      }

      doc.setTextColor(...C.accent);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.text(`Substituição ${index + 1}:`, innerX, y + 5.4);

      const title = meal.meal_name || `Opção ${index + 1}`;
      const titleText = fitText(doc, title, innerW - 2);
      doc.setTextColor(...C.ink);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.7);
      doc.text(titleText, innerX, y + 12.2);

      const pill = (label: string, value: string, px: number, py: number, fill: RGB, text: RGB) => {
        const width = Math.max(20, doc.getTextWidth(`${label}${value}`) + 8);
        doc.setFillColor(...fill);
        doc.roundedRect(px, py, width, 7, 3.5, 3.5, 'F');
        doc.setTextColor(...text);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text(`${label}${value}`, px + 4, py + 4.6);
        return width;
      };

      const totals = sum(meal.foods);
      let pillX = x + w - pad - 1;
      if (meal.time_suggestion) {
        const timeWidth = doc.getTextWidth(meal.time_suggestion) + 10;
        pillX -= timeWidth;
        doc.roundedRect(pillX, y + 11, timeWidth, 7, 3.5, 3.5, 'F');
        doc.setTextColor(...C.muted);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text(meal.time_suggestion, pillX + 4, y + 15.5);
        pillX -= 3;
      }
      pill('kcal ', `${Math.round(totals.cal)}`, pillX, y + 11, C.accent, C.white);

      const foods = (meal.foods ?? []).filter((food) => food.food_name.trim()).slice(0, 3);
      if (foods.length > 0) {
        const foodsH = Math.max(12, foods.length * 4.9 + 2.2);
        const foodsY = y + 20;
        doc.setFillColor(252, 253, 254);
        doc.setDrawColor(...C.line);
        doc.roundedRect(innerX, foodsY, innerW, foodsH, 2, 2, 'FD');
        doc.setTextColor(...C.ink);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.1);
        foods.forEach((food, foodIndex) => {
          const qty = food.quantity ? ` ${mealQty(food)}` : '';
          const line = fitText(doc, `• ${food.food_name}${qty}`, innerW - 6);
          doc.text(line, innerX + 3, foodsY + 4.4 + foodIndex * 4.9);
        });
      }
    };

    cards.forEach((meal, indexInRow) => {
      const x = margin + indexInRow * (cardW + gap);
      drawCard(x, cardW, meal, i + indexInRow, indexInRow === 0);
    });

    y += rowH + 2;
  }

  return y;
}

function drawMeal(
  doc: jsPDF,
  meal: Meal,
  label: string,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  y: number,
  substitutionLayout: "stacked" | "columns" = "stacked",
  variant: "main" | "substitution" = "main",
) {
  const contentW = pageWidth - margin * 2;
  const estH = mealHeight(meal, substitutionLayout);
  if (y + estH > pageHeight - 16) {
    doc.addPage();
    y = 14;
  }

  const foods = meal.foods ?? [];
  const totals = sum(foods);
  const notes = (meal.notes ?? "").trim();
  const subs = (meal.substitution_items ?? []).filter((item) => item.food_name.trim());

  const borderColor = variant === "substitution" ? C.accent : C.lineStrong;
  const headerFill = variant === "substitution" ? C.soft2 : C.soft;
  const headerText = variant === "substitution" ? "SUBSTITUIÃ‡ÃƒO" : label;

  roundRect(doc, margin, y, contentW, estH, 2.4, C.white, borderColor);
  doc.setFillColor(...headerFill);
  doc.rect(margin, y, contentW, 9, "F");
  if (variant === "substitution") {
    doc.setFillColor(...C.accent);
    doc.rect(margin, y, 2.5, 9, "F");
  }
  doc.setDrawColor(...C.lineStrong);
  doc.setLineWidth(0.2);
  doc.line(margin, y + 9, margin + contentW, y + 9);

  doc.setTextColor(...(variant === "substitution" ? C.accent : C.ink));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.2);
  doc.text(`${headerText} Â· ${meal.meal_name || "RefeiÃ§Ã£o"}`, margin + 4, y + 6.3);
  if (meal.time_suggestion) {
    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const timeW = doc.getTextWidth(meal.time_suggestion) + 6;
    roundRect(doc, pageWidth - margin - timeW - 1, y + 2, timeW, 5.2, 2.4, C.soft2, C.line);
    doc.text(meal.time_suggestion, pageWidth - margin - timeW / 2 - 1, y + 5.8, { align: "center" });
  }

  let cursorY = y + 11;

  if (foods.length === 0) {
    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.text("Nenhum alimento cadastrado.", margin + 4, cursorY + 4.5);
    cursorY += 9;
  } else {
    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin + 4, right: margin + 4 },
      theme: "grid",
      head: [["Alimento", "Qtd", "kcal", "P", "C", "G"]],
      body: foods.map((food) => [
        food.food_name || "-",
        mealQty(food),
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
        cellPadding: 2.1,
      },
      headStyles: {
        fillColor: C.soft2,
        textColor: C.muted,
        fontStyle: "bold",
        fontSize: 6.6,
      },
      alternateRowStyles: {
        fillColor: [253, 253, 253],
      },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 24, halign: "right" },
        2: { cellWidth: 15, halign: "right" },
        3: { cellWidth: 15, halign: "right" },
        4: { cellWidth: 15, halign: "right" },
        5: { cellWidth: 15, halign: "right" },
      },
      didParseCell(data) {
        if (data.section === "body" && data.row.index === foods.length - 1) {
          data.cell.styles.fillColor = [248, 250, 252];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    cursorY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2.6;
  }

  if (notes) {
    const lines = doc.splitTextToSize(notes, contentW - 10);
    const h = 8 + lines.length * 3.8;
    if (cursorY + h > pageHeight - 16) {
      doc.addPage();
      cursorY = 14;
    }
    roundRect(doc, margin + 4, cursorY, contentW - 8, h, 2, C.soft, C.line);
    doc.setTextColor(...C.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("ObservaÃ§Ãµes", margin + 8, cursorY + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.7);
    doc.text(lines, margin + 8, cursorY + 9);
    cursorY += h + 2;
  }

  if (subs.length > 0) {
    cursorY =
      substitutionLayout === "columns" && subs.length > 1
        ? drawColumnsSubstitutions(doc, subs, pageWidth, pageHeight, margin, cursorY)
        : drawStackedSubstitutions(doc, subs, pageWidth, pageHeight, margin, cursorY);
  }

  const totalY = cursorY + 1.2;
  if (totalY + 6 > pageHeight - 16) {
    doc.addPage();
    cursorY = 14;
  }
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text(`Total da refeiÃ§Ã£o: ${Math.round(totals.cal)} kcal`, margin + 4, totalY);

  return totalY + 8;
}

export function generateMealPlanPdf(
  plan: MealPlan,
  meals: Meal[],
  patient: Patient | null,
  options?: MealPlanPdfOptions,
): jsPDF {
  const substitutionLayout = options?.substitutionLayout ?? "stacked";
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: substitutionLayout === "columns" ? "landscape" : "portrait",
  });
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

  const period = [fmtDate(plan.start_date), fmtDate(plan.end_date)].filter(Boolean).join(" - ");
  const age = ageYears(patient?.birth_date);

  // Header
  doc.setFillColor(...C.white);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(1.3);
  doc.line(0, 0, pageWidth, 0);

  doc.setTextColor(...C.accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("PLANO ALIMENTAR PERSONALIZADO", margin, 10);

  doc.setTextColor(...C.ink);
  doc.setFontSize(18);
  doc.text(patient?.name || "Paciente", margin, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(...C.muted);
  doc.text(`Gerado em ${formatToday()}`, margin, 24.5);
  if (plan.title) doc.text(plan.title, pageWidth - margin, 24.5, { align: "right" });

  // Summary
  const boxY = 30;
  const boxW = (pageWidth - margin * 2 - 6) / 4;
  const summary = [
    { label: "Energia", value: `${Math.round(grand.cal)} kcal` },
    { label: "ProteÃ­nas", value: `${grand.prot.toFixed(1)} g` },
    { label: "Carboidratos", value: `${grand.carbs.toFixed(1)} g` },
    { label: "Gorduras", value: `${grand.fat.toFixed(1)} g` },
  ];
  summary.forEach((item, idx) => {
    labelValue(doc, margin + idx * (boxW + 2), boxY, boxW, item.label, item.value);
  });

  let y = 53;
  labelValue(doc, margin, y, (pageWidth - margin * 2 - 4) / 3, "PerÃ­odo", period || "Sem perÃ­odo");
  labelValue(
    doc,
    margin + ((pageWidth - margin * 2 - 4) / 3) + 2,
    y,
    (pageWidth - margin * 2 - 4) / 3,
    "Meta diÃ¡ria",
    plan.daily_calories ? `${plan.daily_calories} kcal/dia` : "NÃ£o informada",
  );
  labelValue(
    doc,
    margin + 2 * (((pageWidth - margin * 2 - 4) / 3) + 2),
    y,
    (pageWidth - margin * 2 - 4) / 3,
    "Paciente",
    age != null ? `${age} anos` : "NÃ£o informado",
  );

  y += 23;

  if (plan.notes?.trim()) {
    const lines = doc.splitTextToSize(plan.notes.trim(), pageWidth - margin * 2 - 10);
    const h = 10 + lines.length * 3.7;
    roundRect(doc, margin, y, pageWidth - margin * 2, h, 2.2, C.soft, C.line);
    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("OrientaÃ§Ãµes gerais", margin + 4, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.7);
    doc.setTextColor(...C.ink);
    doc.text(lines, margin + 4, y + 9);
    y += h + 4;
  }

  meals.forEach((meal, index) => {
    const label = String(index + 1).padStart(2, "0");
    y = drawMeal(doc, meal, label, pageWidth, pageHeight, margin, y, substitutionLayout, "main");

    if (meal.alternative_meals && meal.alternative_meals.length > 0) {
      const hasSelection = options?.selectedAlternatives
        ? Object.prototype.hasOwnProperty.call(options.selectedAlternatives, index)
        : false;
      const selected = options?.selectedAlternatives?.[index] ?? [];
      const altIndexes = hasSelection
        ? selected
        : meal.alternative_meals.map((_, altIdx) => altIdx);

      const selectedAlternatives = altIndexes
        .map((altIdx) => ({
          altIdx,
          alt: meal.alternative_meals?.[altIdx],
        }))
        .filter((item): item is { altIdx: number; alt: NonNullable<Meal["alternative_meals"]>[number] } => Boolean(item.alt))
        .map(({ altIdx, alt }) => ({
          plan_id: meal.plan_id,
          meal_name: alt.meal_name || `${meal.meal_name} â€” OpÃ§Ã£o ${altIdx + 1}`,
          time_suggestion: alt.time_suggestion,
          notes: alt.notes,
          foods: alt.foods,
          substitution_items: alt.substitution_items ?? [],
        }));

      if (substitutionLayout === "columns" && selectedAlternatives.length > 1) {
        y = drawAlternativeMealColumns(doc, selectedAlternatives, pageWidth, pageHeight, margin, y);
      } else {
        selectedAlternatives.forEach((altMeal, altIdx) => {
          const subLabel = `${label}.${String.fromCharCode(97 + altIdx)}`;
          y = drawMeal(doc, altMeal, subLabel, pageWidth, pageHeight, margin, y, substitutionLayout, "substitution");
        });
      }
    }
  });

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const footerY = pageHeight - 8;
    doc.setDrawColor(...C.lineStrong);
    doc.setLineWidth(0.2);
    doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);
    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.text("Documento clÃ­nico confidencial", margin, footerY);
    doc.text(`PÃ¡gina ${p} de ${totalPages}`, pageWidth - margin, footerY, { align: "right" });
  }

  return doc;
}

