import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { MealPlan, Meal } from "@/lib/supabase";
import type { Patient } from "@/lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const n1 = (v: number | undefined) => (v && v > 0 ? v.toFixed(1) : "—");
const n0 = (v: number | undefined) => (v && v > 0 ? Math.round(v).toString() : "—");

function sum(foods: Meal["foods"]) {
  return (foods ?? []).reduce(
    (a, f) => ({
      cal:   a.cal   + (f.calories ?? 0),
      prot:  a.prot  + (f.protein  ?? 0),
      carbs: a.carbs + (f.carbs    ?? 0),
      fat:   a.fat   + (f.fat      ?? 0),
    }),
    { cal: 0, prot: 0, carbs: 0, fat: 0 }
  );
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function generateMealPlanPdf(
  plan: MealPlan,
  meals: Meal[],
  patient: Patient | null
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;

  // ── Cores ────────────────────────────────────────────────────────────────
  const GREEN: [number, number, number]  = [22, 101, 52];   // #166534
  const LIGHT: [number, number, number]  = [240, 249, 244]; // background leve
  const GRAY:  [number, number, number]  = [100, 116, 139];
  const DARK:  [number, number, number]  = [30, 41, 59];
  const WHITE: [number, number, number]  = [255, 255, 255];
  const BORDER: [number, number, number] = [203, 213, 225];

  let y = margin;

  // ── Cabeçalho ────────────────────────────────────────────────────────────
  // Barra verde superior
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageW, 18, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("PLANO ALIMENTAR PERSONALIZADO", pageW / 2, 11, { align: "center" });

  y = 26;

  // ── Dados do paciente + plano ─────────────────────────────────────────────
  doc.setFillColor(...LIGHT);
  doc.roundedRect(margin, y, contentW, 28, 2, 2, "F");
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, y, contentW, 28, 2, 2, "S");

  const col1 = margin + 5;
  const col2 = margin + contentW / 2 + 5;

  const label = (text: string, x: number, yy: number) => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(text.toUpperCase(), x, yy);
  };
  const value = (text: string, x: number, yy: number) => {
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(text, x, yy);
  };

  label("Paciente",         col1,  y + 7);  value(patient?.name ?? "—",    col1,  y + 12);
  label("Plano",            col2,  y + 7);  value(plan.title,               col2,  y + 12);
  label("Período",          col1,  y + 19); value(`${formatDate(plan.start_date)} → ${formatDate(plan.end_date)}`, col1, y + 24);
  label("Meta calórica",    col2,  y + 19); value(plan.daily_calories ? `${plan.daily_calories} kcal/dia` : "Não definida", col2, y + 24);

  y += 35;

  // ── Resumo nutricional ────────────────────────────────────────────────────
  const grand = meals.reduce(
    (a, m) => { const t = sum(m.foods ?? []); return { cal: a.cal + t.cal, prot: a.prot + t.prot, carbs: a.carbs + t.carbs, fat: a.fat + t.fat }; },
    { cal: 0, prot: 0, carbs: 0, fat: 0 }
  );

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN);
  doc.text("RESUMO NUTRICIONAL DO DIA", margin, y);
  y += 4;

  const boxW = contentW / 4 - 2;
  const summaryItems = [
    { label: "Energia Total", value: `${n0(grand.cal)} kcal` },
    { label: "Proteínas",     value: `${n1(grand.prot)} g`   },
    { label: "Carboidratos",  value: `${n1(grand.carbs)} g`  },
    { label: "Gorduras",      value: `${n1(grand.fat)} g`    },
  ];

  summaryItems.forEach(({ label: lbl, value: val }, i) => {
    const bx = margin + i * (boxW + 2.5);
    doc.setFillColor(...WHITE);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(bx, y, boxW, 16, 1.5, 1.5, "FD");

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(lbl.toUpperCase(), bx + boxW / 2, y + 5.5, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(val, bx + boxW / 2, y + 12.5, { align: "center" });
  });

  y += 22;

  // Observações
  if (plan.notes?.trim()) {
    doc.setFillColor(255, 251, 235); // amarelo bem suave
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(margin, y, contentW, 12, 1.5, 1.5, "FD");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(146, 64, 14);
    doc.text("OBSERVAÇÕES:", margin + 4, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    const noteText = doc.splitTextToSize(plan.notes.trim(), contentW - 35);
    doc.text(noteText[0] ?? "", margin + 30, y + 5);
    y += 16;
  }

  // ── Refeições ─────────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN);
  doc.text("REFEIÇÕES", margin, y);
  y += 2;

  meals.forEach((meal, idx) => {
    const foods = meal.foods ?? [];
    const totals = sum(foods);
    const mealNum = String(idx + 1).padStart(2, "0");

    // Header da refeição
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [[
        { content: `${mealNum}  ${meal.meal_name}`, colSpan: 5, styles: { halign: "left" } },
        { content: meal.time_suggestion ?? "", styles: { halign: "right" } },
      ]],
      body: foods.length === 0
        ? [[ { content: "Nenhum alimento adicionado", colSpan: 6, styles: { halign: "center", textColor: GRAY, fontStyle: "italic", fontSize: 8 } } ]]
        : [
            ...foods.map((f) => [
              f.food_name || "—",
              f.quantity ? `${f.quantity}` : "—",
              f.unit ?? "g",
              n0(f.calories),
              n1(f.protein),
              n1(f.carbs),
            ]),
            // Subtotal
            [
              { content: "SUBTOTAL", styles: { fontStyle: "bold", textColor: DARK } },
              "", "",
              { content: n0(totals.cal), styles: { fontStyle: "bold", textColor: DARK } },
              { content: n1(totals.prot), styles: { fontStyle: "bold", textColor: DARK } },
              { content: n1(totals.carbs), styles: { fontStyle: "bold", textColor: DARK } },
            ],
          ],
      columns: foods.length === 0 ? undefined : [
        { header: "Alimento",    dataKey: "name"   },
        { header: "Qtd",         dataKey: "qty"    },
        { header: "Un.",         dataKey: "unit"   },
        { header: "kcal",        dataKey: "cal"    },
        { header: "Prot. g",     dataKey: "prot"   },
        { header: "Carb. g",     dataKey: "carb"   },
      ],
      headStyles: {
        fillColor: GREEN,
        textColor: WHITE,
        fontSize: 8.5,
        fontStyle: "bold",
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 16, halign: "right" },
        2: { cellWidth: 14 },
        3: { cellWidth: 18, halign: "right" },
        4: { cellWidth: 18, halign: "right" },
        5: { cellWidth: 18, halign: "right" },
      },
      bodyStyles: {
        fontSize: 8,
        textColor: DARK,
        cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell(data) {
        // Linha de subtotal — fundo levemente distinto
        if (foods.length > 0 && data.row.index === foods.length) {
          data.cell.styles.fillColor = [236, 253, 245];
        }
      },
      tableLineColor: BORDER,
      tableLineWidth: 0.2,
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

    // Nova página se necessário (deixa 25mm de margem inferior)
    if (y > doc.internal.pageSize.getHeight() - 25) {
      doc.addPage();
      y = margin;
    }
  });

  // ── Rodapé ────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...BORDER);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(
      `Gerado em ${new Date().toLocaleDateString("pt-BR")} · Documento clínico confidencial`,
      margin, pageH - 7
    );
    doc.text(`Página ${p} de ${pageCount}`, pageW - margin, pageH - 7, { align: "right" });
  }

  return doc;
}
