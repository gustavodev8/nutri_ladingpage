import type { ClinicalAlert } from "@/lib/clinicalAlertsUtils";
import type { MealPlan } from "@/lib/supabase";

export type MacroMode = "g_per_kg" | "percent";

export interface MacroTarget {
  mode: MacroMode;
  protein_g_per_kg: number;
  fat_g_per_kg: number;
  carbs_g_per_kg: number;
  carbs_residual: boolean;
  protein_pct: number;
  fat_pct: number;
  carbs_pct: number;
}

export interface MacroGoals {
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  protein_kcal: number;
  fat_kcal: number;
  carbs_kcal: number;
  protein_pct: number;
  fat_pct: number;
  carbs_pct: number;
  protein_g_per_kg: number;
  fat_g_per_kg: number;
  carbs_g_per_kg: number;
}

export interface MealNutritionTarget {
  meal_name: string;
  share: number;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

export interface MealCalorieTarget {
  targetCalories: number;
  share: number;
}

export interface MacroProgress {
  actual: number;
  goal: number;
  pct: number;
  capped: number;
  status: "on_target" | "below" | "above";
  diff: number;
}

export const DEFAULT_MACRO_TARGET: MacroTarget = {
  mode: "g_per_kg",
  protein_g_per_kg: 2.0,
  fat_g_per_kg: 1.0,
  carbs_g_per_kg: 3.0,
  carbs_residual: true,
  protein_pct: 30,
  fat_pct: 25,
  carbs_pct: 45,
};

export function calcMacroGoals(
  target: MacroTarget,
  totalKcal: number,
  weightKg: number
): MacroGoals | null {
  if (totalKcal <= 0 || weightKg <= 0) return null;

  let protein_g: number;
  let fat_g: number;
  let carbs_g: number;

  if (target.mode === "g_per_kg") {
    protein_g = target.protein_g_per_kg * weightKg;
    fat_g = target.fat_g_per_kg * weightKg;

    if (target.carbs_residual) {
      const residualKcal = Math.max(0, totalKcal - protein_g * 4 - fat_g * 9);
      carbs_g = residualKcal / 4;
    } else {
      carbs_g = target.carbs_g_per_kg * weightKg;
    }
  } else {
    const carbsPct = target.carbs_residual
      ? Math.max(0, 100 - target.protein_pct - target.fat_pct)
      : target.carbs_pct;

    protein_g = (totalKcal * target.protein_pct / 100) / 4;
    fat_g = (totalKcal * target.fat_pct / 100) / 9;
    carbs_g = (totalKcal * carbsPct / 100) / 4;
  }

  const protein_kcal = protein_g * 4;
  const fat_kcal = fat_g * 9;
  const carbs_kcal = carbs_g * 4;

  const round1 = (n: number) => parseFloat(n.toFixed(1));
  const round2 = (n: number) => parseFloat(n.toFixed(2));

  return {
    calories: totalKcal,
    protein_g: round1(protein_g),
    fat_g: round1(fat_g),
    carbs_g: round1(carbs_g),
    protein_kcal: round1(protein_kcal),
    fat_kcal: round1(fat_kcal),
    carbs_kcal: round1(carbs_kcal),
    protein_pct: round1((protein_kcal / totalKcal) * 100),
    fat_pct: round1((fat_kcal / totalKcal) * 100),
    carbs_pct: round1((carbs_kcal / totalKcal) * 100),
    protein_g_per_kg: round2(protein_g / weightKg),
    fat_g_per_kg: round2(fat_g / weightKg),
    carbs_g_per_kg: round2(carbs_g / weightKg),
  };
}

export function auditMacro(actual: number, goal: number): MacroProgress {
  if (goal <= 0) {
    return { actual, goal, pct: 0, capped: 0, status: "on_target", diff: 0 };
  }

  const pct = (actual / goal) * 100;
  const capped = Math.min(pct, 100);
  const diff = parseFloat((actual - goal).toFixed(1));

  const status: MacroProgress["status"] =
    pct >= 92 && pct <= 108 ? "on_target"
    : pct > 108 ? "above"
    : "below";

  return { actual, goal, pct: parseFloat(pct.toFixed(1)), capped, status, diff };
}

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

function normalizeText(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function parseHour(text?: string): number | null {
  if (!text) return null;
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour + minute / 60;
}

type MealBias = {
  weight: number;
  protein: number;
  carbs: number;
  fat: number;
};

function resolveMealBias(mealName: string, timeSuggestion?: string): MealBias {
  const name = normalizeText(mealName);
  const time = parseHour(timeSuggestion);
  const isBreakfast = /cafe|desjejum|breakfast/.test(name);
  const isLunch = /almoco|lunch/.test(name);
  const isDinner = /jantar|dinner/.test(name);
  const isSnack = /lanche/.test(name);
  const isMorningSnack = isSnack && /manha/.test(name);
  const isAfternoonSnack = isSnack && /tarde/.test(name);
  const isBedSnack = /ceia|supper/.test(name);
  const isPreWorkout = /pre[- ]?treino/.test(name);
  const isPostWorkout = /pos[- ]?treino/.test(name);
  const lateMeal = time != null && time >= 20;

  if (isPreWorkout || isPostWorkout) {
    return { weight: 1.3, protein: 1.15, carbs: 1.4, fat: 0.7 };
  }
  if (isLunch) {
    return { weight: 3.1, protein: 1.1, carbs: 1.05, fat: 1.0 };
  }
  if (isDinner) {
    return { weight: lateMeal ? 1.9 : 2.2, protein: 1.05, carbs: lateMeal ? 0.9 : 1.0, fat: 1.05 };
  }
  if (isBedSnack) {
    return { weight: 0.75, protein: 1.2, carbs: 0.65, fat: 0.95 };
  }
  if (isBreakfast) {
    return { weight: 2.4, protein: 0.95, carbs: 1.18, fat: 0.85 };
  }
  if (isMorningSnack || isAfternoonSnack) {
    return { weight: 1.0, protein: 1.0, carbs: 1.0, fat: 1.0 };
  }
  if (isSnack) {
    return { weight: 0.95, protein: 1.0, carbs: 1.0, fat: 1.0 };
  }
  if (lateMeal) {
    return { weight: 1.2, protein: 1.05, carbs: 0.95, fat: 1.0 };
  }
  return { weight: 1.0, protein: 1.0, carbs: 1.0, fat: 1.0 };
}

export function getMealCalorieTargets(
  meals: { meal_name: string; time_suggestion?: string }[],
  dailyCalories?: number,
): MealCalorieTarget[] {
  if (!dailyCalories || dailyCalories <= 0 || meals.length === 0) return [];

  const weights = meals.map((meal) => resolveMealBias(meal.meal_name, meal.time_suggestion));
  const totalWeight = weights.reduce((sum, value) => sum + value.weight, 0) || meals.length;

  return weights.map((bias) => {
    const share = bias.weight / totalWeight;
    return {
      share,
      targetCalories: dailyCalories * share,
    };
  });
}

export function getMealNutritionTargets(
  meals: { meal_name: string; time_suggestion?: string }[],
  macroGoals: MacroGoals,
): MealNutritionTarget[] {
  if (meals.length === 0) return [];

  const biases = meals.map((meal) => resolveMealBias(meal.meal_name, meal.time_suggestion));
  const weightSum = biases.reduce((sum, bias) => sum + bias.weight, 0) || meals.length;
  const proteinDen = biases.reduce((sum, bias) => sum + bias.weight * bias.protein, 0) || weightSum;
  const carbDen = biases.reduce((sum, bias) => sum + bias.weight * bias.carbs, 0) || weightSum;
  const fatDen = biases.reduce((sum, bias) => sum + bias.weight * bias.fat, 0) || weightSum;

  return meals.map((meal, idx) => {
    const bias = biases[idx];
    const share = bias.weight / weightSum;
    const proteinShare = (bias.weight * bias.protein) / proteinDen;
    const carbShare = (bias.weight * bias.carbs) / carbDen;
    const fatShare = (bias.weight * bias.fat) / fatDen;

    return {
      meal_name: meal.meal_name,
      share,
      calories: macroGoals.calories * share,
      protein_g: macroGoals.protein_g * proteinShare,
      carbs_g: macroGoals.carbs_g * carbShare,
      fat_g: macroGoals.fat_g * fatShare,
    };
  });
}

export interface MealLikeFood {
  food_name: string;
  quantity?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface MealLike {
  meal_name: string;
  time_suggestion?: string;
  foods?: MealLikeFood[];
}

export interface MealPlanConsistencyInput {
  plan: MealPlan;
  meals: MealLike[];
  mealTargets?: MealCalorieTarget[];
  macroGoals?: MacroGoals | null;
}

function sumMealFoods(foods: MealLikeFood[] | undefined) {
  return (foods ?? []).reduce(
    (acc, food) => ({
      cal: acc.cal + (food.calories ?? 0),
      prot: acc.prot + (food.protein ?? 0),
      carbs: acc.carbs + (food.carbs ?? 0),
      fat: acc.fat + (food.fat ?? 0),
    }),
    { cal: 0, prot: 0, carbs: 0, fat: 0 }
  );
}

function formatMealList(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names[0]}, ${names[1]} e +${names.length - 2}`;
}

export function generateMealPlanConsistencyAlerts({
  plan,
  meals,
  mealTargets,
  macroGoals,
}: MealPlanConsistencyInput): ClinicalAlert[] {
  const alerts: ClinicalAlert[] = [];
  const totalMeals = meals.length;
  const grand = meals.reduce(
    (acc, meal) => {
      const totals = sumMealFoods(meal.foods);
      return {
        cal: acc.cal + totals.cal,
        prot: acc.prot + totals.prot,
        carbs: acc.carbs + totals.carbs,
        fat: acc.fat + totals.fat,
      };
    },
    { cal: 0, prot: 0, carbs: 0, fat: 0 }
  );

  const filledMeals = meals.filter((meal) => (meal.foods ?? []).some((food) => food.food_name.trim() !== ""));
  const emptyMeals = meals.filter((meal) => !(meal.foods ?? []).some((food) => food.food_name.trim() !== ""));

  if (totalMeals === 0) {
    alerts.push({
      id: "plan-empty",
      type: "danger",
      category: "Plano vazio",
      message: "Nenhuma refeição foi adicionada ao plano. Crie ao menos uma refeição antes de salvar.",
    });
    return alerts;
  }

  if (filledMeals.length === 0) {
    alerts.push({
      id: "plan-empty-foods",
      type: "danger",
      category: "Plano sem alimentos",
      message: "As refeições existem, mas nenhuma possui alimentos cadastrados. O plano ficará sem valor prático.",
    });
  }

  if (emptyMeals.length > 0 && filledMeals.length > 0) {
    alerts.push({
      id: "empty-meals",
      type: "warning",
      category: "Refeições vazias",
      message: `As refeições ${formatMealList(emptyMeals.slice(0, 3).map((meal) => meal.meal_name || "sem nome"))} estão sem alimentos.`,
    });
  }

  const nameCounts = new Map<string, number>();
  for (const meal of meals) {
    const key = normalizeText(meal.meal_name);
    if (!key) continue;
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }
  const duplicatedNames = Array.from(nameCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name);
  if (duplicatedNames.length > 0) {
    alerts.push({
      id: "duplicate-meal-names",
      type: "warning",
      category: "Nomes repetidos",
      message: `Há refeições com o mesmo nome ou muito parecidas: ${formatMealList(duplicatedNames.slice(0, 3))}.`,
    });
  }

  if (plan.daily_calories && grand.cal === 0) {
    alerts.push({
      id: "goal-without-food",
      type: "danger",
      category: "Meta sem execução",
      message: "A meta calórica foi definida, mas o plano ainda está sem alimentos. Revise antes de salvar.",
    });
  }

  if (!plan.daily_calories && grand.cal > 0) {
    alerts.push({
      id: "missing-daily-calories",
      type: "info",
      category: "Meta calórica ausente",
      message: "O plano possui alimentos, mas a meta calórica diária não foi definida. Isso reduz a precisão da auditoria.",
    });
  }

  if (plan.daily_calories && grand.cal > 0) {
    const pct = (grand.cal / plan.daily_calories) * 100;
    if (pct < 90 || pct > 110) {
      alerts.push({
        id: "calorie-mismatch",
        type: pct > 120 || pct < 80 ? "warning" : "info",
        category: "Desvio calórico",
        message: `O total atual está em ${Math.round(pct)}% da meta diária (${Math.round(grand.cal)} de ${Math.round(plan.daily_calories)} kcal).`,
      });
    }
  }

  if (macroGoals) {
    const macroChecks: Array<{ id: string; label: string; actual: number; goal: number }> = [
      { id: "protein-mismatch", label: "Proteína", actual: grand.prot, goal: macroGoals.protein_g },
      { id: "carb-mismatch", label: "Carboidrato", actual: grand.carbs, goal: macroGoals.carbs_g },
      { id: "fat-mismatch", label: "Gordura", actual: grand.fat, goal: macroGoals.fat_g },
    ];

    for (const check of macroChecks) {
      if (check.goal <= 0 || check.actual <= 0) continue;
      const pct = (check.actual / check.goal) * 100;
      if (pct < 80 || pct > 120) {
        alerts.push({
          id: check.id,
          type: "warning",
          category: `Desvio de ${check.label}`,
          message: `Atual: ${check.actual.toFixed(1)} g. Meta: ${check.goal.toFixed(1)} g (${Math.round(pct)}%).`,
        });
      }
    }
  }

  if (mealTargets?.length) {
    mealTargets.forEach((target, idx) => {
      const meal = meals[idx];
      if (!meal || target.targetCalories <= 0) return;
      const actual = sumMealFoods(meal.foods).cal;
      if (actual <= 0) return;
      const pct = (actual / target.targetCalories) * 100;
      if (pct < 75 || pct > 125) {
        alerts.push({
          id: `meal-target-${idx}`,
          type: pct > 140 || pct < 60 ? "warning" : "info",
          category: `Refeição ${idx + 1} fora da faixa`,
          message: `${meal.meal_name}: ${Math.round(actual)} kcal vs meta de ${Math.round(target.targetCalories)} kcal (${Math.round(pct)}%).`,
        });
      }
    });
  }

  return alerts;
}
