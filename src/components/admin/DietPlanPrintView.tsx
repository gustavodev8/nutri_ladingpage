import { useState, useEffect } from "react";
import { X, Printer } from "lucide-react";
import type { MealPlan, Meal, Patient } from "@/lib/supabase";
import { fetchSmartSubstitutions } from "@/lib/supabase";
import { calculateSubstitutions, type FoodSubstitution } from "@/lib/smartSubstitutions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const n1 = (v: number | undefined) => (v != null && v > 0 ? v.toFixed(1) : "—");
const n0 = (v: number | undefined) => (v != null && v > 0 ? Math.round(v).toString() : "—");

function sumFoods(foods: Meal["foods"]) {
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

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  plan:    MealPlan;
  meals:   Meal[];
  patient: Patient | null;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DietPlanPrintView({ plan, meals, patient, onClose }: Props) {
  const [substitutions, setSubstitutions] = useState<FoodSubstitution[]>([]);

  useEffect(() => {
    fetchSmartSubstitutions().then((rules) => {
      const allFoods = meals.flatMap((m) => m.foods ?? []);
      setSubstitutions(calculateSubstitutions(allFoods, rules));
    });
  }, [meals]);

  const grand = meals.reduce(
    (a, m) => {
      const t = sumFoods(m.foods);
      return { cal: a.cal + t.cal, prot: a.prot + t.prot, carbs: a.carbs + t.carbs, fat: a.fat + t.fat };
    },
    { cal: 0, prot: 0, carbs: 0, fat: 0 }
  );

  const start = fmtDate(plan.start_date);
  const end   = fmtDate(plan.end_date);
  const dateRange = [start, end].filter(Boolean).join(" → ");

  const macros = [
    { label: "Energia Total", value: n0(grand.cal),   unit: "kcal", accent: "#059669" },
    { label: "Proteínas",     value: n1(grand.prot),  unit: "g",    accent: "#2563eb" },
    { label: "Carboidratos",  value: n1(grand.carbs), unit: "g",    accent: "#d97706" },
    { label: "Gorduras",      value: n1(grand.fat),   unit: "g",    accent: "#dc2626" },
  ];

  return (
    <>
      {/* Force background-color printing in all browsers */}
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0 !important; }
        }
      `}</style>

      {/* Full-screen overlay — becomes static/visible during print so all pages render */}
      <div className="fixed inset-0 z-50 bg-gray-100 overflow-y-auto print:static print:bg-white print:overflow-visible">

        {/* ── Floating action bar (hidden when printing) ──────────────────── */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="text-sm font-semibold text-gray-700">Pré-visualização do Plano Alimentar</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 h-8 px-3 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X size={13} /> Fechar
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 h-8 px-4 text-xs rounded-lg font-semibold text-white transition-colors"
              style={{ backgroundColor: "#065f46" }}
            >
              <Printer size={13} /> Imprimir / Salvar PDF
            </button>
          </div>
        </div>

        {/* ── A4 document area ────────────────────────────────────────────── */}
        <div className="max-w-[780px] mx-auto px-6 py-8 print:p-0 print:max-w-full">

          {/* 1. Header ─────────────────────────────────────────────────────── */}
          <header
            className="rounded-xl text-white px-8 py-7 mb-6 print:rounded-none print:mb-5"
            style={{ backgroundColor: "#065f46" }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
              style={{ color: "#6ee7b7" }}
            >
              Plano Alimentar Personalizado
            </p>
            <h1 className="text-2xl font-black tracking-tight leading-tight text-white">
              {patient?.name ?? "Paciente"}
            </h1>
            <div
              className="flex items-center flex-wrap gap-x-5 gap-y-1 mt-2.5 text-sm"
              style={{ color: "#a7f3d0" }}
            >
              {dateRange && (
                <span className="flex items-center gap-1.5">
                  <span className="opacity-60 text-xs">Período</span>
                  <span className="font-semibold text-white">{dateRange}</span>
                </span>
              )}
              {plan.daily_calories && (
                <span className="flex items-center gap-1.5">
                  <span className="opacity-60 text-xs">Meta</span>
                  <span className="font-semibold text-white">{plan.daily_calories} kcal/dia</span>
                </span>
              )}
              {plan.title && (
                <span className="flex items-center gap-1.5">
                  <span className="opacity-60 text-xs">Plano</span>
                  <span className="font-semibold text-white">{plan.title}</span>
                </span>
              )}
            </div>
          </header>

          {/* 2. Macro summary cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-3 mb-8 print:mb-6">
            {macros.map(({ label, value, unit, accent }) => (
              <div
                key={label}
                className="bg-white rounded-lg px-4 py-4 text-center"
                style={{
                  border: "1px solid #e5e7eb",
                  borderBottom: `3px solid ${accent}`,
                }}
              >
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                  {label}
                </p>
                <p className="text-2xl font-black leading-none" style={{ color: accent }}>
                  {value}
                </p>
                <p className="text-[10px] text-gray-400 mt-1 font-medium">{unit}</p>
              </div>
            ))}
          </div>

          {/* Plan notes */}
          {plan.notes?.trim() && (
            <div
              className="rounded-lg px-5 py-3 mb-6 print:mb-5 flex items-start gap-3"
              style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}
            >
              <span className="text-base mt-0.5">📌</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-0.5">
                  Observações Gerais
                </p>
                <p className="text-sm text-amber-900 leading-relaxed">{plan.notes}</p>
              </div>
            </div>
          )}

          {/* 3. Meal cards ──────────────────────────────────────────────────── */}
          <div className="space-y-4 print:space-y-3">
            {meals.map((meal, idx) => {
              const foods = meal.foods ?? [];
              const totals = sumFoods(foods);
              const mealNum = String(idx + 1).padStart(2, "0");
              const isSub = /substitui/i.test(meal.meal_name);

              return (
                <div
                  key={meal.id ?? idx}
                  className="bg-white rounded-lg overflow-hidden break-inside-avoid"
                  style={{
                    border: "1px solid #e5e7eb",
                    pageBreakInside: "avoid",
                  }}
                >
                  {/* Meal header */}
                  <div
                    className="flex items-center justify-between px-5 py-3 border-b"
                    style={{ backgroundColor: "#f9fafb", borderBottomColor: "#e5e7eb" }}
                  >
                    <span
                      className="text-sm font-bold"
                      style={{ color: isSub ? "#ea580c" : "#111827" }}
                    >
                      {mealNum} — {meal.meal_name}
                      {isSub && (
                        <span
                          className="ml-2 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }}
                        >
                          Substituição
                        </span>
                      )}
                    </span>
                    {meal.time_suggestion && (
                      <span className="text-xs font-semibold tabular-nums text-gray-400">
                        {meal.time_suggestion}
                      </span>
                    )}
                  </div>

                  {/* 4. Foods table ────────────────────────────────────────── */}
                  {foods.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-gray-400 italic">
                      Nenhum alimento adicionado.
                    </p>
                  ) : (
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                          {["Alimento", "Quantidade", "Kcal", "PTN g", "CHO g", "LIP g"].map((h, i) => (
                            <th
                              key={h}
                              className={`py-2 text-[9px] font-bold uppercase tracking-wider text-gray-400 ${i === 0 ? "px-5 text-left" : "px-3 text-right"}`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {foods.map((f, fi) => (
                          <tr
                            key={f.id ?? fi}
                            style={{
                              borderBottom: "1px solid #f9fafb",
                              backgroundColor: fi % 2 === 1 ? "#fafafa" : "white",
                            }}
                          >
                            <td className="px-5 py-2.5">
                              <span className="font-semibold text-gray-800">{f.food_name || "—"}</span>
                              {f.notes && (
                                <p className="text-[10px] text-gray-400 italic mt-0.5">{f.notes}</p>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right text-gray-500 tabular-nums text-xs">
                              {f.quantity ? (
                                <>
                                  <span className="font-medium text-gray-700">{f.quantity}</span>{" "}
                                  {f.unit ?? "g"}
                                  {f.household_measure && (
                                    <span className="block text-[10px] text-gray-400">
                                      ({f.measure_amount ?? 1} {f.household_measure})
                                    </span>
                                  )}
                                </>
                              ) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{n0(f.calories)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{n1(f.protein)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{n1(f.carbs)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{n1(f.fat)}</td>
                          </tr>
                        ))}

                        {/* Subtotal row */}
                        <tr style={{ backgroundColor: "#f0fdf4", borderTop: "2px solid #d1d5db" }}>
                          <td colSpan={2} className="px-5 py-2.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                              Total da Refeição
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-black tabular-nums text-gray-800">
                            {n0(totals.cal)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-black tabular-nums text-gray-800">
                            {n1(totals.prot)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-black tabular-nums text-gray-800">
                            {n1(totals.carbs)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-black tabular-nums text-gray-800">
                            {n1(totals.fat)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                  {/* Meal notes */}
                  {meal.notes?.trim() && (
                    <div
                      className="px-5 py-2.5 border-t"
                      style={{ backgroundColor: "#fffbeb", borderTopColor: "#fde68a" }}
                    >
                      <p className="text-[11px] text-amber-700 italic">📌 {meal.notes}</p>
                    </div>
                  )}

                  {/* Manual substitution items */}
                  {(meal.substitution_items ?? []).filter(s => s.food_name).length > 0 && (
                    <div
                      className="px-5 py-3 border-t"
                      style={{ backgroundColor: "#fffbf0", borderTopColor: "#fed7aa" }}
                    >
                      <p className="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-1.5">
                        🔄 Opções de substituição
                      </p>
                      <div className="space-y-0.5">
                        {(meal.substitution_items ?? []).filter(s => s.food_name).map((sub, si) => (
                          <p key={si} className="text-[11px] text-orange-800">
                            <span className="font-semibold">Opção {si + 1}:</span>{" "}
                            {sub.quantity ? `${sub.quantity}${sub.unit ?? "g"} de ` : ""}{sub.food_name}
                            {sub.notes ? <span className="text-orange-500 italic"> · {sub.notes}</span> : ""}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Tabela de Equivalências (referência auxiliar) ───────────── */}
          {substitutions.length > 0 && (
            <div className="mt-8 print:mt-6">
              <div
                className="rounded-lg px-5 py-3 mb-3"
                style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}
              >
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                  Referência auxiliar para o nutricionista
                </p>
                <h3 className="text-sm font-bold text-gray-700 mt-0.5">
                  🔄 Tabela de Equivalências Proporcionais
                </h3>
              </div>

              <div
                className="rounded-lg overflow-hidden"
                style={{ border: "1px solid #e2e8f0" }}
              >
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: "#f1f5f9" }}>
                      <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400 w-1/4">
                        Alimento Prescrito
                      </th>
                      <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Substituto
                      </th>
                      <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-wider text-gray-400 w-20">
                        Quantidade
                      </th>
                      <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400 w-1/4">
                        Critério
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {substitutions.flatMap((sub, si) =>
                      sub.options.map((opt, oi) => (
                        <tr
                          key={`${si}-${oi}`}
                          style={{
                            borderTop: oi === 0 && si > 0 ? "2px solid #e2e8f0" : "1px solid #f1f5f9",
                            backgroundColor: oi % 2 === 1 ? "#fafafa" : "white",
                          }}
                        >
                          <td className="px-3 py-1.5 text-gray-700 font-medium">
                            {oi === 0 ? `${sub.originalQty}${sub.unit} de ${sub.originalName}` : ""}
                          </td>
                          <td className="px-3 py-1.5 text-gray-800 font-semibold">
                            {opt.substituteName}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-bold" style={{ color: "#059669" }}>
                            {opt.substituteQty}{opt.unit}
                          </td>
                          <td className="px-3 py-1.5 text-gray-400 italic">
                            {opt.criteria}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-[9px] text-gray-300 mt-1.5 text-right italic">
                Quantidades calculadas por regra de três a partir das porções prescritas.
              </p>
            </div>
          )}

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <footer className="mt-10 pt-4 border-t border-gray-200 flex items-center justify-between print:mt-6">
            <p className="text-[10px] text-gray-400">
              Gerado em {new Date().toLocaleDateString("pt-BR")} · Documento clínico confidencial
            </p>
            <p className="text-[10px] text-gray-400">{plan.title}</p>
          </footer>
        </div>
      </div>
    </>
  );
}
