// ─── Lógica de Distribuição de Macronutrientes ───────────────────────────────
// Suporta dois modos: g/kg (gramas por quilo de peso) e % (percentual do VET).
// O carboidrato pode ser definido manualmente ou calculado como residual.

export type MacroMode = "g_per_kg" | "percent";

export interface MacroTarget {
  mode:               MacroMode;
  // g/kg mode
  protein_g_per_kg:   number;   // default 2.0
  fat_g_per_kg:       number;   // default 1.0
  carbs_g_per_kg:     number;   // usado quando carbs_residual=false
  carbs_residual:     boolean;  // se true, carbs = (kcal - ptn - lip) / 4
  // % mode
  protein_pct:        number;   // default 30
  fat_pct:            number;   // default 25
  carbs_pct:          number;   // default 45 (ignorado se carbs_residual=true)
}

export interface MacroGoals {
  calories:       number;  // totalKcal passado como base
  protein_g:      number;
  fat_g:          number;
  carbs_g:        number;
  protein_kcal:   number;
  fat_kcal:       number;
  carbs_kcal:     number;
  protein_pct:    number;
  fat_pct:        number;
  carbs_pct:      number;
  protein_g_per_kg: number;
  fat_g_per_kg:     number;
  carbs_g_per_kg:   number;
}

export interface MacroProgress {
  actual:   number;
  goal:     number;
  pct:      number;   // actual / goal * 100
  capped:   number;   // min(pct, 100) — para largura da barra
  status:   "on_target" | "below" | "above";
  diff:     number;   // actual - goal
}

// ─── DEFAULT TARGET ───────────────────────────────────────────────────────────

export const DEFAULT_MACRO_TARGET: MacroTarget = {
  mode:             "g_per_kg",
  protein_g_per_kg: 2.0,
  fat_g_per_kg:     1.0,
  carbs_g_per_kg:   3.0,
  carbs_residual:   true,
  protein_pct:      30,
  fat_pct:          25,
  carbs_pct:        45,
};

// ─── calcMacroGoals ───────────────────────────────────────────────────────────
// Retorna null se faltar informação obrigatória (peso ou kcal).

export function calcMacroGoals(
  target: MacroTarget,
  totalKcal: number,
  weightKg: number
): MacroGoals | null {
  if (totalKcal <= 0 || weightKg <= 0) return null;

  let protein_g: number;
  let fat_g:     number;
  let carbs_g:   number;

  if (target.mode === "g_per_kg") {
    protein_g = target.protein_g_per_kg * weightKg;
    fat_g     = target.fat_g_per_kg     * weightKg;

    if (target.carbs_residual) {
      const residual_kcal = Math.max(0, totalKcal - protein_g * 4 - fat_g * 9);
      carbs_g = residual_kcal / 4;
    } else {
      carbs_g = target.carbs_g_per_kg * weightKg;
    }
  } else {
    // Modo percentual
    const carbs_pct = target.carbs_residual
      ? Math.max(0, 100 - target.protein_pct - target.fat_pct)
      : target.carbs_pct;

    protein_g = (totalKcal * target.protein_pct / 100) / 4;
    fat_g     = (totalKcal * target.fat_pct     / 100) / 9;
    carbs_g   = (totalKcal * carbs_pct           / 100) / 4;
  }

  const protein_kcal = protein_g * 4;
  const fat_kcal     = fat_g     * 9;
  const carbs_kcal   = carbs_g   * 4;

  const round1 = (n: number) => parseFloat(n.toFixed(1));
  const round2 = (n: number) => parseFloat(n.toFixed(2));

  return {
    calories: totalKcal,
    protein_g:      round1(protein_g),
    fat_g:          round1(fat_g),
    carbs_g:        round1(carbs_g),
    protein_kcal:   round1(protein_kcal),
    fat_kcal:       round1(fat_kcal),
    carbs_kcal:     round1(carbs_kcal),
    protein_pct:    round1((protein_kcal / totalKcal) * 100),
    fat_pct:        round1((fat_kcal     / totalKcal) * 100),
    carbs_pct:      round1((carbs_kcal   / totalKcal) * 100),
    protein_g_per_kg: round2(protein_g / weightKg),
    fat_g_per_kg:     round2(fat_g     / weightKg),
    carbs_g_per_kg:   round2(carbs_g   / weightKg),
  };
}

// ─── auditMacro ───────────────────────────────────────────────────────────────
// 92–108% = on_target (verde); >108% = above (vermelho); <92% = below (amarelo)

export function auditMacro(actual: number, goal: number): MacroProgress {
  if (goal <= 0) {
    return { actual, goal, pct: 0, capped: 0, status: "on_target", diff: 0 };
  }
  const pct    = (actual / goal) * 100;
  const capped = Math.min(pct, 100);
  const diff   = parseFloat((actual - goal).toFixed(1));

  const status: MacroProgress["status"] =
    pct >= 92 && pct <= 108 ? "on_target"
    : pct > 108             ? "above"
                            : "below";

  return { actual, goal, pct: parseFloat(pct.toFixed(1)), capped, status, diff };
}

// ─── statusColor ──────────────────────────────────────────────────────────────
// Retorna classes Tailwind para a cor da barra conforme status.

export function statusColor(status: MacroProgress["status"]): {
  bar: string;
  text: string;
  badge: string;
} {
  switch (status) {
    case "on_target":
      return { bar: "bg-emerald-500", text: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "above":
      return { bar: "bg-red-500", text: "text-red-600", badge: "bg-red-50 text-red-700 border-red-200" };
    case "below":
      return { bar: "bg-amber-400", text: "text-amber-600", badge: "bg-amber-50 text-amber-700 border-amber-200" };
  }
}
