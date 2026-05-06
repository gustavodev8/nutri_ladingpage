// ─── Motor de Estratégias Dietéticas ─────────────────────────────────────────
// Referências:
//   Déficit: -500 kcal/dia ≈ ~0,5 kg/semana (Sacks et al., NEJM 2009)
//   Proteína emagrecimento: 2.2 g/kg (Phillips & Van Loon, 2011)
//   Proteína manutenção/hipertrofia: 2.0 g/kg (Morton et al., 2018)
//   Gordura: mínimo 1.0 g/kg para função hormonal (ISSN, 2018)
//   Carboidrato: restante calórico após proteína e gordura

export type StrategyType = "deficit" | "maintenance" | "surplus";

export interface StrategyConfig {
  key: StrategyType;
  label: string;
  subtitle: string;
  kcalDelta: number;      // kcal adicionadas/removidas do GET
  proteinPerKg: number;   // g/kg de peso corporal
  fatPerKg: number;       // g/kg de peso corporal
  colorClass: string;     // Tailwind color classes
  badgeBg: string;
}

export const STRATEGY_CONFIG: Record<StrategyType, StrategyConfig> = {
  deficit: {
    key: "deficit",
    label: "Déficit",
    subtitle: "Emagrecimento",
    kcalDelta: -500,
    proteinPerKg: 2.2,
    fatPerKg: 1.0,
    colorClass: "text-blue-600",
    badgeBg: "bg-blue-50 border-blue-200 text-blue-700",
  },
  maintenance: {
    key: "maintenance",
    label: "Manutenção",
    subtitle: "Peso estável",
    kcalDelta: 0,
    proteinPerKg: 2.0,
    fatPerKg: 1.0,
    colorClass: "text-emerald-600",
    badgeBg: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  surplus: {
    key: "surplus",
    label: "Superávit",
    subtitle: "Hipertrofia",
    kcalDelta: 500,
    proteinPerKg: 2.0,
    fatPerKg: 1.0,
    colorClass: "text-orange-600",
    badgeBg: "bg-orange-50 border-orange-200 text-orange-700",
  },
};

export interface MacroResult {
  strategy: StrategyType;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  proteinKcal: number;
  fatKcal: number;
  carbsKcal: number;
  proteinPct: number;
  fatPct: number;
  carbsPct: number;
}

export function calcMacros(
  get: number,
  weightKg: number,
  strategy: StrategyType
): MacroResult {
  const cfg = STRATEGY_CONFIG[strategy];
  const calories = Math.max(1200, Math.round(get + cfg.kcalDelta));

  const protein_g = Math.round(weightKg * cfg.proteinPerKg);
  const fat_g = Math.round(weightKg * cfg.fatPerKg);

  const proteinKcal = protein_g * 4;
  const fatKcal = fat_g * 9;
  const carbsKcal = Math.max(0, calories - proteinKcal - fatKcal);
  const carbs_g = Math.round(carbsKcal / 4);

  const total = proteinKcal + fatKcal + carbsKcal;

  return {
    strategy,
    calories,
    protein_g,
    fat_g,
    carbs_g,
    proteinKcal,
    fatKcal,
    carbsKcal,
    proteinPct: total > 0 ? Math.round((proteinKcal / total) * 100) : 0,
    fatPct:     total > 0 ? Math.round((fatKcal     / total) * 100) : 0,
    carbsPct:   total > 0 ? Math.round((carbsKcal   / total) * 100) : 0,
  };
}
