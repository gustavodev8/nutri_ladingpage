import type { MealFood } from "./supabase";

export interface SubstitutionRule {
  id:                  number;
  reference_food_name: string;
  ref_amount:          number;
  substitute_food_name:string;
  sub_amount:          number;
  category:            string;
  criteria?:           string | null;
}

export interface SubstitutionOption {
  substituteName: string;
  substituteQty:  number;
  unit:           string;
  category:       string;
  criteria:       string;
}

export interface FoodSubstitution {
  originalName: string;
  originalQty:  number;
  unit:         string;
  options:      SubstitutionOption[];
}

/**
 * Calcula substituições proporcionais para cada alimento do plano.
 *
 * Regra de três: (qty_prescrita × sub_amount) / ref_amount
 *
 * Exemplo: plano tem 100g de Arroz Branco.
 * Regra diz: 100g Arroz Branco ≡ 120g Batata Doce.
 * Resultado: 120g de Batata Doce.
 */
export function calculateSubstitutions(
  foods:  MealFood[],
  rules:  SubstitutionRule[],
): FoodSubstitution[] {
  // Build lookup: lowercase name → rules
  const ruleMap = new Map<string, SubstitutionRule[]>();
  for (const rule of rules) {
    const key = rule.reference_food_name.toLowerCase().trim();
    const existing = ruleMap.get(key) ?? [];
    existing.push(rule);
    ruleMap.set(key, existing);
  }

  const result: FoodSubstitution[] = [];
  const seen = new Set<string>();

  for (const food of foods) {
    if (!food.food_name || !food.quantity) continue;

    const key = food.food_name.toLowerCase().trim();
    const matchedRules = ruleMap.get(key) ?? [];

    // Also try partial match (food name starts with or contains the rule name)
    const partialRules: SubstitutionRule[] = [];
    if (matchedRules.length === 0) {
      for (const [ruleKey, rList] of ruleMap) {
        if (key.includes(ruleKey) || ruleKey.includes(key)) {
          partialRules.push(...rList);
        }
      }
    }

    const applicableRules = matchedRules.length > 0 ? matchedRules : partialRules;
    if (applicableRules.length === 0) continue;

    const dedupeKey = `${food.food_name}::${food.quantity}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const qty = food.quantity;
    const unit = food.unit ?? "g";

    const options: SubstitutionOption[] = applicableRules.map((rule) => {
      const substituteQty = (qty * rule.sub_amount) / rule.ref_amount;
      return {
        substituteName: rule.substitute_food_name,
        substituteQty:  Math.round(substituteQty * 10) / 10,
        unit,
        category:       rule.category,
        criteria:       rule.criteria ?? "Troca equivalente",
      };
    });

    result.push({
      originalName: food.food_name,
      originalQty:  qty,
      unit,
      options,
    });
  }

  return result;
}
