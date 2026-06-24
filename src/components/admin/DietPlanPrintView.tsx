import { useEffect, useRef } from "react";
import type { MealPlan, Meal, Patient } from "@/lib/supabase";

interface Props {
  plan: MealPlan;
  meals: Meal[];
  patient: Patient | null;
  onClose: () => void;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatQty(meal: Meal["foods"][number]) {
  if (!meal.quantity) return "";
  return `${meal.quantity}${meal.unit ?? "g"}`;
}

function buildDocument(plan: MealPlan, meals: Meal[], patient: Patient | null) {
  const period = [formatDate(plan.start_date), formatDate(plan.end_date)].filter(Boolean).join(" - ");
  const mealLines = meals
    .map((meal, index) => {
      const foods = (meal.foods ?? [])
        .map((food) => `${escapeHtml(food.food_name)}${formatQty(food) ? ` - ${escapeHtml(formatQty(food))}` : ""}`)
        .join("<br>");

      return `
        <section class="meal">
          <div class="meal-head">
            <div>
              <div class="meal-index">REFEIÇÃO ${String(index + 1).padStart(2, "0")}</div>
              <h2>${escapeHtml(meal.meal_name || "Refeição")}</h2>
            </div>
            ${meal.time_suggestion ? `<div class="time">${escapeHtml(meal.time_suggestion)}</div>` : ""}
          </div>
          <div class="meal-foods">${foods || "Sem alimentos cadastrados"}</div>
        </section>
      `;
    })
    .join("");

  return `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Plano alimentar - ${escapeHtml(patient?.name ?? "Paciente")}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #fff; color: #0f172a; font-family: Arial, Helvetica, sans-serif; }
    body { font-size: 12px; line-height: 1.35; }
    .page { width: 100%; max-width: 100%; }
    .header {
      border: 1px solid #d1d5db;
      border-left: 5px solid #0f766e;
      padding: 16px 18px;
      margin-bottom: 12px;
    }
    .eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #0f766e; }
    h1 { margin: 4px 0 6px; font-size: 22px; line-height: 1.15; }
    .meta { display: flex; flex-wrap: wrap; gap: 10px 18px; color: #475569; font-size: 11px; }
    .meta strong { color: #0f172a; }
    .meal {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .meal-head { display: flex; justify-content: space-between; gap: 12px; align-items: start; margin-bottom: 8px; }
    .meal-index { font-size: 9px; font-weight: 800; letter-spacing: .18em; color: #0f766e; text-transform: uppercase; }
    .meal h2 { margin: 2px 0 0; font-size: 15px; line-height: 1.2; }
    .time {
      white-space: nowrap;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      padding: 4px 8px;
      border-radius: 999px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .meal-foods {
      font-size: 12px;
      color: #111827;
      column-gap: 18px;
    }
    .meal-foods br { line-height: 1.2; }
    .footer {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      font-size: 10px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .toolbar {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-bottom: 10px;
    }
    .btn {
      border: 1px solid #d1d5db;
      background: #fff;
      color: #0f172a;
      border-radius: 10px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn.primary {
      background: #0f766e;
      color: #fff;
      border-color: #0f766e;
    }
    @media print {
      .toolbar { display: none; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="toolbar">
      <button class="btn" onclick="window.close()">Fechar</button>
      <button class="btn primary" onclick="window.print()">Imprimir / Salvar PDF</button>
    </div>

    <div class="header">
      <div class="eyebrow">Plano alimentar personalizado</div>
      <h1>${escapeHtml(patient?.name ?? "Paciente")}</h1>
      <div class="meta">
        <span><strong>Plano:</strong> ${escapeHtml(plan.title || "Plano alimentar")}</span>
        ${period ? `<span><strong>Período:</strong> ${escapeHtml(period)}</span>` : ""}
        ${plan.daily_calories ? `<span><strong>Meta diária:</strong> ${plan.daily_calories} kcal</span>` : ""}
        ${patient?.city ? `<span><strong>Cidade:</strong> ${escapeHtml(patient.city)}</span>` : ""}
      </div>
    </div>

    ${mealLines}

    <div class="footer">
      <span>Documento clínico confidencial</span>
      <span>${new Date().toLocaleDateString("pt-BR")}</span>
    </div>
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 300);
    });
  </script>
</body>
</html>`;
}

export function DietPlanPrintView({ plan, meals, patient, onClose }: Props) {
  const openedRef = useRef(false);

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;

    const html = buildDocument(plan, meals, patient);
    const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");

    if (!popup) {
      onClose();
      return;
    }

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();

    const cleanup = () => {
      try {
        popup.close();
      } catch {
        // ignore
      }
      onClose();
    };

    popup.addEventListener("afterprint", cleanup, { once: true });
    const timer = window.setTimeout(() => {
      if (!popup.closed) {
        cleanup();
      }
    }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [meals, onClose, patient, plan]);

  return null;
}
