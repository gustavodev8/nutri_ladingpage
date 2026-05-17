import type { MealFood } from "./supabase";

// Regras embutidas — usadas quando a tabela smart_substitutions não existe ou retorna vazio.
// Formato: [reference_food_name, ref_amount, substitute_food_name, sub_amount, category, criteria]
const BUILTIN_RULES: [string, number, string, number, string, string][] = [
  // Carboidratos
  ["Arroz Branco",        100, "Batata Doce",          120, "Carboidrato", "Troca por densidade calórica"],
  ["Arroz Branco",        100, "Mandioquinha",          130, "Carboidrato", "Troca por índice glicêmico"],
  ["Arroz Branco",        100, "Quinoa",                 80, "Carboidrato", "Troca por perfil proteico"],
  ["Arroz Branco",        100, "Arroz Integral",        100, "Carboidrato", "Troca por fibras"],
  ["Arroz Branco",        100, "Macarrão Integral",      80, "Carboidrato", "Troca por fibras"],
  ["Arroz Integral",      100, "Quinoa",                 80, "Carboidrato", "Troca por perfil proteico"],
  ["Arroz Integral",      100, "Batata Doce",           120, "Carboidrato", "Troca por densidade calórica"],
  ["Batata Doce",         100, "Mandioquinha",           110, "Carboidrato", "Troca por índice glicêmico"],
  ["Batata Doce",         100, "Inhame",                100, "Carboidrato", "Troca equivalente"],
  ["Batata Doce",         100, "Arroz Integral",         80, "Carboidrato", "Troca por fibras"],
  ["Batata Inglesa",      100, "Batata Doce",            90, "Carboidrato", "Troca por índice glicêmico"],
  ["Mandioca",            100, "Batata Doce",            90, "Carboidrato", "Troca por densidade calórica"],
  ["Macarrão",            100, "Macarrão Integral",     100, "Carboidrato", "Troca por fibras"],
  ["Macarrão",            100, "Quinoa",                 80, "Carboidrato", "Troca por perfil proteico"],
  ["Tapioca",              50, "Pão Integral",            40, "Carboidrato", "Troca por fibras"],
  ["Pão Branco",           50, "Pão Integral",            50, "Carboidrato", "Troca por fibras"],
  ["Pão Branco",           50, "Tapioca",                60, "Carboidrato", "Troca sem glúten"],
  ["Aveia",                40, "Granola sem Açúcar",      40, "Carboidrato", "Troca equivalente"],
  // Proteínas
  ["Frango (peito)",      100, "Tilápia",               120, "Proteína", "Troca por perfil lipídico"],
  ["Frango (peito)",      100, "Atum em água",            80, "Proteína", "Troca por praticidade"],
  ["Frango (peito)",      100, "Carne Bovina Magra",    100, "Proteína", "Troca equivalente"],
  ["Frango (peito)",      100, "Ovos",                  150, "Proteína", "Troca por ovos (≈3 unid)"],
  ["Frango (peito)",      100, "Tofu",                  160, "Proteína", "Troca vegana"],
  ["Carne Bovina Magra",  100, "Frango (peito)",        100, "Proteína", "Troca por perfil lipídico"],
  ["Carne Bovina Magra",  100, "Atum em água",            80, "Proteína", "Troca por ômega-3"],
  ["Tilápia",             100, "Frango (peito)",          90, "Proteína", "Troca equivalente"],
  ["Tilápia",             100, "Salmão",                  90, "Proteína", "Troca por ômega-3"],
  ["Salmão",              100, "Atum em água",            80, "Proteína", "Troca por praticidade"],
  ["Atum em água",        100, "Frango (peito)",         110, "Proteína", "Troca equivalente"],
  ["Ovos",                100, "Claras de Ovo",          180, "Proteína", "Troca low-fat"],
  ["Ovos",                100, "Frango (peito)",           70, "Proteína", "Troca equivalente"],
  ["Whey Protein",         30, "Frango (peito)",          100, "Proteína", "Equivalente proteico"],
  // Gorduras
  ["Azeite de Oliva",      10, "Óleo de Coco",            10, "Gordura", "Troca equivalente"],
  ["Abacate",             100, "Azeite de Oliva",          15, "Gordura", "Troca por praticidade"],
  ["Castanha do Pará",     20, "Castanha de Caju",         25, "Gordura", "Troca equivalente"],
  ["Castanha do Pará",     20, "Amendoim",                 30, "Gordura", "Troca por custo"],
  ["Pasta de Amendoim",    30, "Castanha do Pará",         20, "Gordura", "Troca por micronutrientes"],
  // Laticínios
  ["Leite Integral",      200, "Leite Desnatado",         200, "Laticínio", "Troca low-fat"],
  ["Leite Integral",      200, "Bebida Vegetal",           200, "Laticínio", "Troca vegana"],
  ["Iogurte Integral",    150, "Iogurte Grego",           120, "Laticínio", "Troca por proteína"],
  ["Iogurte Grego",       150, "Cottage",                 150, "Laticínio", "Troca por proteína"],
  ["Queijo Minas",         50, "Ricota",                   60, "Laticínio", "Troca low-fat"],
  ["Requeijão",            30, "Queijo Cottage",            60, "Laticínio", "Troca low-fat"],
  // Frutas
  ["Banana",              100, "Maçã",                    120, "Fruta", "Troca por índice glicêmico"],
  ["Banana",              100, "Pera",                    130, "Fruta", "Troca por índice glicêmico"],
  ["Banana",              100, "Manga",                    90, "Fruta", "Troca equivalente"],
  ["Maçã",               100, "Pera",                    110, "Fruta", "Troca equivalente"],
  ["Mamão",              100, "Melão",                   120, "Fruta", "Troca por densidade calórica"],
  // Leguminosas
  ["Feijão Carioca",      100, "Lentilha",                 90, "Leguminosa", "Troca por índice glicêmico"],
  ["Feijão Carioca",      100, "Grão de Bico",             90, "Leguminosa", "Troca equivalente"],
  ["Feijão Preto",        100, "Feijão Carioca",          100, "Leguminosa", "Troca equivalente"],
  ["Lentilha",            100, "Grão de Bico",            100, "Leguminosa", "Troca equivalente"],
];

let _builtinId = 1;
export const BUILTIN_SUBSTITUTION_RULES: SubstitutionRule[] = BUILTIN_RULES.map(
  ([reference_food_name, ref_amount, substitute_food_name, sub_amount, category, criteria]) => ({
    id: _builtinId++,
    reference_food_name,
    ref_amount,
    substitute_food_name,
    sub_amount,
    category,
    criteria,
  }),
);

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
