// ─── Motor de Gasto Energético ────────────────────────────────────────────────
// Referências:
//   Harris & Benedict (1918) — revisado por Roza & Shizgal (1984)
//   Mifflin, St Jeor et al. (1990)
//   FAO/WHO/UNU (2001) — fatores de nível de atividade física (NAF)

export type EnergyFormula = "harris_benedict" | "mifflin";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export interface ActivityOption {
  key: ActivityLevel;
  label: string;
  description: string;
  factor: number;
}

export const ACTIVITY_OPTIONS: ActivityOption[] = [
  { key: "sedentary",    label: "Sedentário",    description: "Sem exercício ou trabalho sentado",        factor: 1.2   },
  { key: "light",        label: "Leve",          description: "1–3 dias/semana de exercício leve",        factor: 1.375 },
  { key: "moderate",     label: "Moderado",      description: "3–5 dias/semana de exercício moderado",    factor: 1.55  },
  { key: "active",       label: "Ativo",         description: "6–7 dias/semana de exercício intenso",     factor: 1.725 },
  { key: "very_active",  label: "Muito ativo",   description: "Atleta ou trabalho físico pesado diário",  factor: 1.9   },
];

export interface EnergyInput {
  weight: number;   // kg
  height: number;   // cm
  age: number;      // anos
  gender: "M" | "F";
}

export interface EnergyResult {
  tmb: number;   // Taxa Metabólica Basal (kcal/dia)
  get: number;   // Gasto Energético Total (kcal/dia)
  formula: EnergyFormula;
  activity: ActivityLevel;
}

// ─── Harris-Benedict (Roza & Shizgal, 1984) ──────────────────────────────────
export function calcHarrisBenedict(input: EnergyInput): number {
  const { weight, height, age, gender } = input;
  if (gender === "M") {
    return 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
  }
  return 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age;
}

// ─── Mifflin-St Jeor (1990) ──────────────────────────────────────────────────
export function calcMifflin(input: EnergyInput): number {
  const { weight, height, age, gender } = input;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === "M" ? base + 5 : base - 161;
}

// ─── Dispatcher: TMB → GET ───────────────────────────────────────────────────
export function calcEnergy(
  input: EnergyInput,
  formula: EnergyFormula,
  activity: ActivityLevel
): EnergyResult {
  const tmb = formula === "harris_benedict"
    ? calcHarrisBenedict(input)
    : calcMifflin(input);
  const factor = ACTIVITY_OPTIONS.find(a => a.key === activity)?.factor ?? 1.2;
  return {
    tmb: Math.round(tmb),
    get: Math.round(tmb * factor),
    formula,
    activity,
  };
}

// ─── Aplica déficit ou superávit ─────────────────────────────────────────────
// adjustment: valor entre -50 e +50 (percentual)
export function applyAdjustment(get: number, adjustmentPct: number): number {
  return Math.round(get * (1 + adjustmentPct / 100));
}

// ─── Auditoria da dieta montada ───────────────────────────────────────────────

export interface DietAudit {
  proteinExcess: boolean;       // proteína > 2.5 g/kg peso corporal
  proteinGPerKg: number;        // g/kg calculado
  calorieOverage: boolean;      // kcal total > meta + 5% tolerância
  caloriePct: number;           // % da meta atingida
  calorieDeficit: boolean;      // kcal total < meta - 10% tolerância
}

export function auditDiet(params: {
  totalKcal: number;
  totalProtein: number;
  goalKcal?: number;
  weightKg?: number;
}): DietAudit {
  const { totalKcal, totalProtein, goalKcal, weightKg } = params;

  const proteinGPerKg = weightKg && weightKg > 0
    ? parseFloat((totalProtein / weightKg).toFixed(2))
    : 0;

  const caloriePct = goalKcal && goalKcal > 0
    ? parseFloat(((totalKcal / goalKcal) * 100).toFixed(1))
    : 0;

  return {
    proteinExcess:  proteinGPerKg > 2.5,
    proteinGPerKg,
    calorieOverage: !!goalKcal && totalKcal > goalKcal * 1.05,
    caloriePct,
    calorieDeficit: !!goalKcal && totalKcal < goalKcal * 0.90,
  };
}
