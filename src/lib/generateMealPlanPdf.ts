import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { MealPlan, Meal, Patient } from "@/lib/supabase";

// ─── Helpers ────────────────────────────────────────────────────────────────

const n1 = (v: number | undefined) => (v != null && v > 0 ? v.toFixed(1) : "—");
const n0 = (v: number | undefined) => (v != null && v > 0 ? Math.round(v).toString() : "—");

function sum(foods: Meal["foods"]) {
  return (foods ?? []).reduce(
    (a, f) => ({ cal: a.cal + (f.calories ?? 0), prot: a.prot + (f.protein ?? 0), carbs: a.carbs + (f.carbs ?? 0), fat: a.fat + (f.fat ?? 0) }),
    { cal: 0, prot: 0, carbs: 0, fat: 0 }
  );
}

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Color palette ───────────────────────────────────────────────────────────────

type RGB = [number, number, number];
const C = {
  headerBg:    [6,  95, 70]   as RGB,  // #065f46 — emerald-900
  headerText:  [255,255,255]  as RGB,
  headerSub:   [110,231,183]  as RGB,  // emerald-300
  accent:      [5, 150, 105]  as RGB,  // emerald-600
  blue:        [37, 99, 235]  as RGB,
  amber:       [217,119,6]    as RGB,
  red:         [220, 38, 38]  as RGB,
  cardBg:      [255,255,255]  as RGB,
  cardBorder:  [229,231,235]  as RGB,  // gray-200
  mealHead:    [249,250,251]  as RGB,  // gray-50
  subtotalBg:  [240,253,244]  as RGB,  // green-50
  noteBg:      [255,251,235]  as RGB,  // amber-50
  noteBorder:  [253,230,138]  as RGB,  // amber-200
  noteText:    [146, 64, 14]  as RGB,  // amber-800
  dark:        [17,  24, 39]  as RGB,  // gray-900
  mid:         [75,  85, 99]  as RGB,  // gray-600
  light:       [156,163,175]  as RGB,  // gray-400
  rowAlt:      [249,250,251]  as RGB,  // gray-50
  white:       [255,255,255]  as RGB,
};

// ─── Drawing primitives ───────────────────────────────────────────────────────────

function roundRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fill: RGB, stroke?: RGB) {
  doc.setFillColor(...fill);
  if (stroke) { doc.setDrawColor(...stroke); doc.roundedRect(x, y, w, h, r, r, "FD"); }
  else        { doc.roundedRect(x, y, w, h, r, r, "F"); }
}

function hline(doc: jsPDF, x1: number, x2: number, y: number, color: RGB, lw = 0.2) {
  doc.setDrawColor(...color);
  doc.setLineWidth(lw);
  doc.line(x1, y, x2, y);
}

// ─── Main ─────────────────────────────────────────────────────────────────────────────

export function generateMealPlanPdf(plan: MealPlan, meals: Meal[], patient: Patient | null): jsPDF {
  const doc  = new jsPDF({ unit: "mm", format: "a4" });
  const pw   = doc.internal.pageSize.getWidth();
  const ph   = doc.internal.pageSize.getHeight();
  const ml   = 14;  // margin left
  const mr   = 14;  // margin right
  const cw   = pw - ml - mr;

  const grand = meals.reduce(
    (a, m) => { const t = sum(m.foods); return { cal: a.cal + t.cal, prot: a.prot + t.prot, carbs: a.carbs + t.carbs, fat: a.fat + t.fat }; },
    { cal: 0, prot: 0, carbs: 0, fat: 0 }
  );

  let y = 0;

  // ── 1. Header block ────────────────────────────────────────────────────────────
  const headerH = 32;
  doc.setFillColor(...C.headerBg);
  doc.rect(0, 0, pw, headerH, "F");

  // Label
  doc.setTextColor(...C.headerSub);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("PLANO ALIMENTAR PERSONALIZADO", ml, 9);

  // Patient name
  doc.setTextColor(...C.headerText);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(patient?.name ?? "Paciente", ml, 18);

  // Meta line
  const start = fmtDate(plan.start_date);
  const end   = fmtDate(plan.end_date);
  const metaParts: string[] = [];
  if (start && end) metaParts.push(`${start} → ${end}`);
  else if (start)   metaParts.push(`A partir de ${start}`);
  if (plan.daily_calories) metaParts.push(`Meta: ${plan.daily_calories} kcal/dia`);
  if (plan.title)           metaParts.push(plan.title);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.headerSub);
  doc.text(metaParts.join("   ·   "), ml, 27);

  y = headerH + 6;

  // ── 2. Macro cards ──────────────────────────────────────────────────────────
  const cardW  = (cw - 9) / 4;
  const cardH  = 20;
  const macros = [
    { label: "ENERGIA TOTAL", value: n0(grand.cal),   unit: "kcal", accent: C.accent },
    { label: "PROTEÍNAS",     value: n1(grand.prot),  unit: "g",    accent: C.blue   },
    { label: "CARBOIDRATOS",  value: n1(grand.carbs), unit: "g",    accent: C.amber  },
    { label: "GORDURAS",      value: n1(grand.fat),   unit: "g",    accent: C.red    },
  ];

  macros.forEach(({ label, value, unit, accent }, i) => {
    const cx = ml + i * (cardW + 3);
    roundRect(doc, cx, y, cardW, cardH, 2, C.cardBg, C.cardBorder);
    // Accent bottom border
    doc.setFillColor(...accent);
    doc.rect(cx, y + cardH - 1.5, cardW, 1.5, "F");
    // Label
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.light);
    doc.text(label, cx + cardW / 2, y + 5.5, { align: "center" });
    // Value
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...accent);
    doc.text(value, cx + cardW / 2, y + 13, { align: "center" });
    // Unit
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.light);
    doc.text(unit, cx + cardW / 2, y + 17.5, { align: "center" });
  });

  y += cardH + 5;

  // ── 3. Plan notes ───────────────────────────────────────────────────────────
  if (plan.notes?.trim()) {
    const noteLines = doc.splitTextToSize(plan.notes.trim(), cw - 16);
    const noteH = noteLines.length * 4 + 8;
    roundRect(doc, ml, y, cw, noteH, 2, C.noteBg, C.noteBorder);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.noteText);
    doc.text("OBSERVAÇÕES", ml + 4, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(noteLines, ml + 28, y + 5);
    y += noteH + 4;
  }

  // ── 4. Meals ──────────────────────────────────────────────────────────────────
  meals.forEach((meal, idx) => {
    const foods  = meal.foods ?? [];
    const totals = sum(foods);
    const label  = `${String(idx + 1).padStart(2, "0")} — ${meal.meal_name}`;

    // Estimate height needed: meal header 7 + thead 6 + each row ~5.5 + subtotal 6 + note ~6
    const rowH       = 5.5;
    const estHeight  = 7 + 6 + foods.length * rowH + 6 + (meal.notes?.trim() ? 8 : 0) + 4;
    if (y + estHeight > ph - 18) { doc.addPage(); y = 12; }

    // Meal card background
    const tableRows = foods.length === 0 ? 1 : foods.length + 1; // +1 for subtotal
    const tableH    = 6 + tableRows * rowH + (meal.notes?.trim() ? 8 : 0);
    const totalCardH = 7 + tableH + 2;

    roundRect(doc, ml, y, cw, totalCardH, 2, C.cardBg, C.cardBorder);

    // Meal header strip
    roundRect(doc, ml, y, cw, 7, 2, C.mealHead);
    // re-draw bottom corners straight (top is rounded)
    doc.setFillColor(...C.mealHead);
    doc.rect(ml, y + 4, cw, 3, "F");

    hline(doc, ml, ml + cw, y + 7, C.cardBorder, 0.3);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const isSub = /substitui/i.test(meal.meal_name);
    doc.setTextColor(...(isSub ? C.amber : C.dark));
    doc.text(label, ml + 4, y + 5);

    if (meal.time_suggestion) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.light);
      doc.text(meal.time_suggestion, ml + cw - 4, y + 5, { align: "right" });
    }

    y += 7;

    // Foods table
    if (foods.length === 0) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...C.light);
      doc.text("Nenhum alimento adicionado.", ml + cw / 2, y + 5, { align: "center" });
      y += 8;
    } else {
      autoTable(doc, {
        startY: y,
        margin: { left: ml, right: mr },
        head: [[
          { content: "Alimento",    styles: { halign: "left"  } },
          { content: "Quantidade",  styles: { halign: "right" } },
          { content: "Kcal",        styles: { halign: "right" } },
          { content: "PTN g",       styles: { halign: "right" } },
          { content: "CHO g",       styles: { halign: "right" } },
          { content: "LIP g",       styles: { halign: "right" } },
        ]],
        body: [
          ...foods.map((f) => {
            const qty = f.quantity
              ? `${f.quantity} ${f.unit ?? "g"}${f.household_measure ? `\n(${f.measure_amount ?? 1} ${f.household_measure})` : ""}`
              : "—";
            return [
              { content: f.food_name || "—" },
              { content: qty,            styles: { halign: "right" as const } },
              { content: n0(f.calories), styles: { halign: "right" as const } },
              { content: n1(f.protein),  styles: { halign: "right" as const } },
              { content: n1(f.carbs),    styles: { halign: "right" as const } },
              { content: n1(f.fat),      styles: { halign: "right" as const } },
            ];
          }),
          // Subtotal row
          [
            { content: "TOTAL DA REFEIÇÃO", colSpan: 2, styles: { fontStyle: "bold" as const, textColor: C.mid, fontSize: 7, halign: "left" as const } },
            { content: n0(totals.cal),  styles: { fontStyle: "bold" as const, textColor: C.dark, halign: "right" as const } },
            { content: n1(totals.prot), styles: { fontStyle: "bold" as const, textColor: C.dark, halign: "right" as const } },
            { content: n1(totals.carbs),styles: { fontStyle: "bold" as const, textColor: C.dark, halign: "right" as const } },
            { content: n1(totals.fat),  styles: { fontStyle: "bold" as const, textColor: C.dark, halign: "right" as const } },
          ],
        ],
        headStyles: {
          fillColor:   [248, 250, 252] as RGB,
          textColor:   C.light,
          fontSize:    6.5,
          fontStyle:   "bold",
          lineColor:   C.cardBorder,
          lineWidth:   0.2,
          cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
        },
        bodyStyles: {
          fontSize:    8,
          textColor:   C.dark,
          lineColor:   [243, 244, 246] as RGB,
          lineWidth:   0.15,
          cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
        },
        columnStyles: {
          0: { cellWidth: "auto",  fontStyle: "bold" },
          1: { cellWidth: 28, halign: "right" },
          2: { cellWidth: 15, halign: "right" },
          3: { cellWidth: 15, halign: "right" },
          4: { cellWidth: 15, halign: "right" },
          5: { cellWidth: 15, halign: "right" },
        },
        alternateRowStyles: { fillColor: C.rowAlt },
        tableLineColor:  C.cardBorder,
        tableLineWidth:  0,
        didParseCell(data) {
          const lastBody = foods.length;
          if (data.section === "body" && data.row.index === lastBody) {
            data.cell.styles.fillColor = C.subtotalBg;
            if (data.column.index === 0) {
              data.cell.styles.lineWidth = { top: 0.5, bottom: 0, left: 0, right: 0 };
              data.cell.styles.lineColor = C.cardBorder;
            }
          }
        },
      });

      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    }

    // Meal notes strip
    if (meal.notes?.trim()) {
      const lines  = doc.splitTextToSize(`${meal.notes.trim()}`, cw - 16);
      const noteH  = lines.length * 4 + 5;
      doc.setFillColor(...C.noteBg);
      doc.rect(ml, y, cw, noteH, "F");
      hline(doc, ml, ml + cw, y, C.noteBorder, 0.3);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...C.noteText);
      doc.text(`${lines.join(" ")}`, ml + 4, y + 4);
      y += noteH;
    }

    // Substitution items strip
    const subs = (meal.substitution_items ?? []).filter(s => s.food_name?.trim());
    if (subs.length > 0) {
      const subBg:     RGB = [255, 251, 240];
      const subBorder: RGB = [253, 186, 116];
      const subText:   RGB = [154,  52,  18];

      const subLines = subs.map((s, i) => {
        const qty    = s.quantity ? `${s.quantity}${s.unit ?? "g"} de ` : "";
        const note   = s.notes ? ` · ${s.notes}` : "";
        const prefix = s.replaces_food
          ? `No lugar de ${s.replaces_food}: `
          : `Opção ${i + 1}: `;
        return `${prefix}${qty}${s.food_name}${note}`;
      });

      const subH = subLines.length * 4.2 + 7;
      if (y + subH > ph - 18) { doc.addPage(); y = 12; }

      doc.setFillColor(...subBg);
      doc.rect(ml, y, cw, subH, "F");
      hline(doc, ml, ml + cw, y, subBorder, 0.3);

      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...subText);
      doc.text("🔄 OPÇÕES DE SUBSTITUIÇÃO", ml + 4, y + 4);

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      subLines.forEach((line, li) => {
        doc.text(line, ml + 4, y + 8.5 + li * 4.2);
      });

      y += subH;
    }

    y += 5; // gap between cards
  });

  // ── 5. Footer on every page ───────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pageH = doc.internal.pageSize.getHeight();

    // Green accent line
    doc.setFillColor(...C.accent);
    doc.rect(0, pageH - 8, pw, 8, "F");

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.white);
    doc.text(
      `Gerado em ${new Date().toLocaleDateString("pt-BR")}  ·  Documento clínico confidencial`,
      ml, pageH - 3
    );
    doc.text(`Página ${p} de ${totalPages}`, pw - mr, pageH - 3, { align: "right" });
  }

  return doc;
}
