import type { MealFood } from "./supabase";

// Regras embutidas — usadas quando a tabela smart_substitutions não existe ou retorna vazio.
// Formato: [reference_food_name, ref_amount, substitute_food_name, sub_amount, category, criteria]
const BUILTIN_RULES: [string, number, string, number, string, string][] = [

  // ── Carboidratos ──────────────────────────────────────────────────────────────
  ["Arroz Branco",             100, "Batata Doce",           120, "Carboidrato", "Troca por densidade calórica"],
  ["Arroz Branco",             100, "Mandioquinha",           130, "Carboidrato", "Troca por índice glicêmico"],
  ["Arroz Branco",             100, "Quinoa",                  80, "Carboidrato", "Troca por perfil proteico"],
  ["Arroz Branco",             100, "Arroz Integral",         100, "Carboidrato", "Troca por fibras"],
  ["Arroz Branco",             100, "Macarrão Integral",       80, "Carboidrato", "Troca por fibras"],
  ["Arroz Branco",             100, "Cuscuz",                 100, "Carboidrato", "Troca regional equivalente"],
  ["Arroz Integral",           100, "Quinoa",                  80, "Carboidrato", "Troca por perfil proteico"],
  ["Arroz Integral",           100, "Batata Doce",            120, "Carboidrato", "Troca por densidade calórica"],
  ["Arroz Integral",           100, "Arroz de Couve-flor",    200, "Carboidrato", "Troca low-carb"],
  ["Batata Doce",              100, "Mandioquinha",            110, "Carboidrato", "Troca por índice glicêmico"],
  ["Batata Doce",              100, "Inhame",                 100, "Carboidrato", "Troca equivalente"],
  ["Batata Doce",              100, "Arroz Integral",          80, "Carboidrato", "Troca por fibras"],
  ["Batata Doce",              100, "Abóbora",                150, "Carboidrato", "Troca low-calorie"],
  ["Batata Inglesa",           100, "Batata Doce",             90, "Carboidrato", "Troca por índice glicêmico"],
  ["Batata Inglesa",           100, "Batata Baroa",           100, "Carboidrato", "Troca equivalente"],
  ["Mandioca",                 100, "Batata Doce",             90, "Carboidrato", "Troca por densidade calórica"],
  ["Mandioca",                 100, "Inhame",                 100, "Carboidrato", "Troca equivalente"],
  ["Macarrão",                 100, "Macarrão Integral",      100, "Carboidrato", "Troca por fibras"],
  ["Macarrão",                 100, "Macarrão de Arroz",      100, "Carboidrato", "Troca sem glúten"],
  ["Macarrão",                 100, "Abobrinha em espiral",   200, "Carboidrato", "Troca low-carb"],
  ["Macarrão",                 100, "Quinoa",                  80, "Carboidrato", "Troca por perfil proteico"],
  ["Tapioca",                   50, "Pão Integral",             40, "Carboidrato", "Troca por fibras"],
  ["Tapioca",                   50, "Crepioca",                50, "Carboidrato", "Troca por proteína"],
  ["Pão Branco",                50, "Pão Integral",             50, "Carboidrato", "Troca por fibras"],
  ["Pão Branco",                50, "Tapioca",                 60, "Carboidrato", "Troca sem glúten"],
  ["Pão Branco",                50, "Pão de Forma Integral",   50, "Carboidrato", "Troca por fibras"],
  ["Pão Integral",              50, "Torrada Integral",         30, "Carboidrato", "Troca por praticidade"],
  ["Pão Integral",              50, "Biscoito Integral",        30, "Carboidrato", "Troca por praticidade"],
  ["Aveia",                     40, "Granola sem Açúcar",       40, "Carboidrato", "Troca equivalente"],
  ["Aveia",                     40, "Farinha de Aveia",         40, "Carboidrato", "Troca equivalente"],
  ["Aveia",                     40, "Quinoa em flocos",         35, "Carboidrato", "Troca por perfil proteico"],
  ["Cuscuz",                   100, "Arroz Branco",            100, "Carboidrato", "Troca regional equivalente"],
  ["Cuscuz",                   100, "Tapioca",                 100, "Carboidrato", "Troca sem glúten"],
  ["Milho Cozido",             100, "Batata Doce",              90, "Carboidrato", "Troca por índice glicêmico"],
  ["Milho Cozido",             100, "Arroz Integral",           80, "Carboidrato", "Troca por fibras"],
  ["Crepioca",                  50, "Tapioca",                  50, "Carboidrato", "Troca equivalente"],

  // ── Proteínas ─────────────────────────────────────────────────────────────────
  ["Frango (peito)",           100, "Tilápia",                120, "Proteína", "Troca por perfil lipídico"],
  ["Frango (peito)",           100, "Atum em água",             80, "Proteína", "Troca por praticidade"],
  ["Frango (peito)",           100, "Carne Bovina Magra",     100, "Proteína", "Troca equivalente"],
  ["Frango (peito)",           100, "Ovos",                   150, "Proteína", "Troca por ovos (≈3 unid)"],
  ["Frango (peito)",           100, "Tofu",                   160, "Proteína", "Troca vegana"],
  ["Frango (peito)",           100, "Peito de Peru",          100, "Proteína", "Troca equivalente"],
  ["Frango (peito)",           100, "Sardinha em água",        90, "Proteína", "Troca por ômega-3"],
  ["Carne Bovina Magra",       100, "Frango (peito)",         100, "Proteína", "Troca por perfil lipídico"],
  ["Carne Bovina Magra",       100, "Atum em água",            80, "Proteína", "Troca por ômega-3"],
  ["Carne Bovina Magra",       100, "Carne Suína Magra",      100, "Proteína", "Troca equivalente"],
  ["Tilápia",                  100, "Frango (peito)",           90, "Proteína", "Troca equivalente"],
  ["Tilápia",                  100, "Salmão",                   90, "Proteína", "Troca por ômega-3"],
  ["Tilápia",                  100, "Atum em água",             80, "Proteína", "Troca por praticidade"],
  ["Salmão",                   100, "Atum em água",             80, "Proteína", "Troca por praticidade"],
  ["Salmão",                   100, "Sardinha em água",         90, "Proteína", "Troca por ômega-3"],
  ["Atum em água",             100, "Frango (peito)",          110, "Proteína", "Troca equivalente"],
  ["Atum em água",             100, "Sardinha em água",        100, "Proteína", "Troca por ômega-3"],
  ["Sardinha em água",         100, "Atum em água",            100, "Proteína", "Troca por praticidade"],
  ["Ovos",                     100, "Claras de Ovo",           180, "Proteína", "Troca low-fat"],
  ["Ovos",                     100, "Frango (peito)",           70, "Proteína", "Troca equivalente"],
  ["Claras de Ovo",            180, "Ovos",                   100, "Proteína", "Troca com gema"],
  ["Whey Protein",              30, "Frango (peito)",          100, "Proteína", "Equivalente proteico"],
  ["Whey Protein",              30, "Ovo inteiro",              2,  "Proteína", "Equivalente (≈2 ovos)"],
  ["Peito de Peru",            100, "Frango (peito)",          100, "Proteína", "Troca equivalente"],
  ["Tofu",                     160, "Frango (peito)",          100, "Proteína", "Troca por animal"],
  ["Carne Suína Magra",        100, "Frango (peito)",          100, "Proteína", "Troca por perfil lipídico"],
  ["Camarão",                  100, "Tilápia",                 100, "Proteína", "Troca por praticidade"],

  // ── Gorduras ──────────────────────────────────────────────────────────────────
  ["Azeite de Oliva",           10, "Óleo de Coco",             10, "Gordura", "Troca equivalente"],
  ["Azeite de Oliva",           10, "Manteiga Ghee",            10, "Gordura", "Troca por sabor"],
  ["Óleo de Coco",              10, "Azeite de Oliva",          10, "Gordura", "Troca equivalente"],
  ["Abacate",                  100, "Azeite de Oliva",          15, "Gordura", "Troca por praticidade"],
  ["Abacate",                  100, "Pasta de Amendoim",        30, "Gordura", "Troca por praticidade"],
  ["Castanha do Pará",          20, "Castanha de Caju",         25, "Gordura", "Troca equivalente"],
  ["Castanha do Pará",          20, "Amendoim",                 30, "Gordura", "Troca por custo"],
  ["Castanha do Pará",          20, "Nozes",                    20, "Gordura", "Troca por ômega-3"],
  ["Castanha do Pará",          20, "Amêndoa",                  22, "Gordura", "Troca por vitamina E"],
  ["Castanha de Caju",          25, "Castanha do Pará",         20, "Gordura", "Troca por selênio"],
  ["Amendoim",                  30, "Castanha do Pará",         20, "Gordura", "Troca por micronutrientes"],
  ["Pasta de Amendoim",         30, "Pasta de Amêndoa",         28, "Gordura", "Troca equivalente"],
  ["Pasta de Amendoim",         30, "Abacate",                 100, "Gordura", "Troca por vitaminas"],
  ["Nozes",                     20, "Castanha do Pará",         20, "Gordura", "Troca por selênio"],
  ["Manteiga",                  10, "Azeite de Oliva",          10, "Gordura", "Troca por gordura insaturada"],
  ["Manteiga",                  10, "Manteiga Ghee",            10, "Gordura", "Troca sem lactose"],
  ["Chia",                      15, "Linhaça",                  15, "Gordura", "Troca por ômega-3"],
  ["Linhaça",                   15, "Chia",                     15, "Gordura", "Troca equivalente"],

  // ── Laticínios ────────────────────────────────────────────────────────────────
  ["Leite Integral",           200, "Leite Desnatado",          200, "Laticínio", "Troca low-fat"],
  ["Leite Integral",           200, "Leite Semidesnatado",      200, "Laticínio", "Troca low-fat moderada"],
  ["Leite Integral",           200, "Leite de Aveia",           200, "Laticínio", "Troca vegana sem lactose"],
  ["Leite Integral",           200, "Leite de Amêndoa",         200, "Laticínio", "Troca vegana low-calorie"],
  ["Leite Integral",           200, "Bebida de Soja",           200, "Laticínio", "Troca vegana com proteína"],
  ["Leite Integral",           200, "Leite sem Lactose",        200, "Laticínio", "Troca para intolerante"],
  ["Leite Desnatado",          200, "Leite de Aveia",           200, "Laticínio", "Troca vegana"],
  ["Iogurte Integral",         150, "Iogurte Grego",            120, "Laticínio", "Troca por proteína"],
  ["Iogurte Integral",         150, "Iogurte Natural Desnatado",150, "Laticínio", "Troca low-fat"],
  ["Iogurte Grego",            150, "Cottage",                  150, "Laticínio", "Troca por proteína"],
  ["Iogurte Grego",            150, "Iogurte Integral",         150, "Laticínio", "Troca equivalente"],
  ["Queijo Minas",              50, "Ricota",                    60, "Laticínio", "Troca low-fat"],
  ["Queijo Minas",              50, "Queijo Cottage",            80, "Laticínio", "Troca low-fat"],
  ["Queijo Prato",              30, "Queijo Minas",              50, "Laticínio", "Troca low-fat"],
  ["Cream Cheese",              30, "Ricota",                    50, "Laticínio", "Troca low-fat"],
  ["Requeijão",                 30, "Queijo Cottage",            60, "Laticínio", "Troca low-fat"],
  ["Requeijão",                 30, "Ricota",                    50, "Laticínio", "Troca low-fat"],
  ["Cottage",                  150, "Iogurte Grego",            120, "Laticínio", "Troca equivalente"],

  // ── Frutas ────────────────────────────────────────────────────────────────────
  ["Banana",                   100, "Maçã",                     120, "Fruta", "Troca por índice glicêmico"],
  ["Banana",                   100, "Pera",                     130, "Fruta", "Troca por índice glicêmico"],
  ["Banana",                   100, "Manga",                     90, "Fruta", "Troca equivalente"],
  ["Banana",                   100, "Mamão",                    120, "Fruta", "Troca por digestibilidade"],
  ["Maçã",                    100, "Pera",                     110, "Fruta", "Troca equivalente"],
  ["Maçã",                    100, "Nectarina",                100, "Fruta", "Troca equivalente"],
  ["Mamão",                   100, "Melão",                    120, "Fruta", "Troca por densidade calórica"],
  ["Mamão",                   100, "Abacaxi",                  120, "Fruta", "Troca por enzimas digestivas"],
  ["Abacaxi",                 100, "Manga",                     90, "Fruta", "Troca equivalente"],
  ["Abacaxi",                 100, "Melão",                    120, "Fruta", "Troca por densidade calórica"],
  ["Laranja",                 100, "Tangerina",                100, "Fruta", "Troca equivalente"],
  ["Laranja",                 100, "Limão",                     80, "Fruta", "Troca por vitamina C"],
  ["Laranja",                 100, "Acerola",                   50, "Fruta", "Troca por vitamina C"],
  ["Morango",                 100, "Framboesa",                100, "Fruta", "Troca equivalente"],
  ["Morango",                 100, "Mirtilo",                  100, "Fruta", "Troca por antioxidantes"],
  ["Morango",                 100, "Amora",                    100, "Fruta", "Troca por antioxidantes"],
  ["Uva",                     100, "Morango",                  120, "Fruta", "Troca por índice glicêmico"],
  ["Melancia",                100, "Melão",                    100, "Fruta", "Troca equivalente"],
  ["Manga",                   100, "Abacaxi",                  110, "Fruta", "Troca equivalente"],
  ["Kiwi",                    100, "Morango",                  110, "Fruta", "Troca por vitamina C"],

  // ── Leguminosas ───────────────────────────────────────────────────────────────
  ["Feijão Carioca",          100, "Lentilha",                  90, "Leguminosa", "Troca por índice glicêmico"],
  ["Feijão Carioca",          100, "Grão de Bico",              90, "Leguminosa", "Troca equivalente"],
  ["Feijão Carioca",          100, "Feijão Preto",             100, "Leguminosa", "Troca equivalente"],
  ["Feijão Preto",            100, "Feijão Carioca",           100, "Leguminosa", "Troca equivalente"],
  ["Feijão Preto",            100, "Lentilha",                  90, "Leguminosa", "Troca por índice glicêmico"],
  ["Lentilha",                100, "Grão de Bico",             100, "Leguminosa", "Troca equivalente"],
  ["Lentilha",                100, "Feijão Carioca",           100, "Leguminosa", "Troca equivalente"],
  ["Grão de Bico",            100, "Lentilha",                 100, "Leguminosa", "Troca equivalente"],
  ["Grão de Bico",            100, "Feijão Carioca",           100, "Leguminosa", "Troca equivalente"],
  ["Ervilha",                 100, "Lentilha",                 100, "Leguminosa", "Troca equivalente"],
  ["Soja",                    100, "Grão de Bico",             100, "Leguminosa", "Troca equivalente"],

  // ── Vegetais ──────────────────────────────────────────────────────────────────
  ["Brócolis",                100, "Couve-flor",               100, "Vegetal", "Troca equivalente"],
  ["Brócolis",                100, "Couve",                    100, "Vegetal", "Troca por ferro"],
  ["Espinafre",               100, "Rúcula",                   100, "Vegetal", "Troca equivalente"],
  ["Espinafre",               100, "Agrião",                   100, "Vegetal", "Troca equivalente"],
  ["Cenoura",                 100, "Beterraba",                100, "Vegetal", "Troca por antioxidantes"],
  ["Cenoura",                 100, "Abóbora",                  100, "Vegetal", "Troca equivalente"],
  ["Abobrinha",               100, "Pepino",                   100, "Vegetal", "Troca equivalente"],
  ["Couve-flor",              100, "Brócolis",                 100, "Vegetal", "Troca equivalente"],
  ["Beterraba",               100, "Cenoura",                  100, "Vegetal", "Troca equivalente"],
  ["Abóbora",                 100, "Batata Doce",               80, "Vegetal", "Troca por densidade calórica"],
  ["Tomate",                  100, "Pimentão Vermelho",         90, "Vegetal", "Troca por vitamina C"],
  ["Alface",                  100, "Rúcula",                   100, "Vegetal", "Troca por antioxidantes"],

  // ── Bebidas e Sucos ───────────────────────────────────────────────────────────
  ["Suco de Laranja",         200, "Suco de Acerola",          200, "Bebida", "Troca por vitamina C"],
  ["Suco de Laranja",         200, "Suco de Abacaxi",          200, "Bebida", "Troca equivalente"],
  ["Suco de Laranja",         200, "Água de Coco",             200, "Bebida", "Troca por hidratação"],
  ["Suco de Laranja",         200, "Suco de Limão com água",   300, "Bebida", "Troca low-calorie"],
  ["Suco de Laranja",         200, "Vitamina de Fruta",        200, "Bebida", "Troca por proteína"],
  ["Suco de Abacaxi",         200, "Suco de Laranja",          200, "Bebida", "Troca equivalente"],
  ["Suco de Abacaxi",         200, "Água de Coco",             200, "Bebida", "Troca por hidratação"],
  ["Suco de Uva",             200, "Suco de Romã",             200, "Bebida", "Troca por antioxidantes"],
  ["Suco de Uva",             200, "Suco de Açaí",             150, "Bebida", "Troca por antioxidantes"],
  ["Água de Coco",            200, "Suco de Laranja",          200, "Bebida", "Troca por vitamina C"],
  ["Água de Coco",            200, "Chá de Hibisco gelado",    300, "Bebida", "Troca low-calorie"],
  ["Água de Coco",            200, "Isotônico Natural",        300, "Bebida", "Troca por eletrólitos"],
  ["Leite de Coco",           200, "Bebida de Amêndoa",        200, "Bebida", "Troca low-calorie"],
  ["Leite de Coco",           200, "Leite de Aveia",           200, "Bebida", "Troca por fibras"],
  ["Vitamina de Banana",      300, "Vitamina de Mamão",        300, "Bebida", "Troca por digestibilidade"],
  ["Vitamina de Banana",      300, "Vitamina de Abacate",      250, "Bebida", "Troca por gorduras boas"],
  ["Vitamina de Morango",     300, "Vitamina de Frutas Vermelhas", 300, "Bebida", "Troca por antioxidantes"],
  ["Chá Verde",               200, "Chá de Gengibre",          200, "Bebida", "Troca por anti-inflamatório"],
  ["Chá Verde",               200, "Chá de Hibisco",           200, "Bebida", "Troca por antioxidantes"],
  ["Chá Verde",               200, "Água com Limão",           300, "Bebida", "Troca detox"],
  ["Café",                    100, "Chá Verde",                200, "Bebida", "Troca por menor cafeína"],
  ["Café com Leite",          200, "Café com Leite Vegetal",   200, "Bebida", "Troca vegana"],
  ["Shake de Proteína",       300, "Vitamina com Whey",        300, "Bebida", "Troca equivalente"],
  ["Suco de Beterraba",       200, "Suco de Cenoura",          200, "Bebida", "Troca equivalente"],
  ["Suco de Cenoura",         200, "Suco de Beterraba",        200, "Bebida", "Troca equivalente"],
  ["Suco Verde",              300, "Água de Coco com Limão",   300, "Bebida", "Troca detox equivalente"],
  ["Iogurte Líquido",         200, "Kefir",                    200, "Bebida", "Troca por probióticos"],

  // ── Cereais e Sementes ────────────────────────────────────────────────────────
  ["Granola",                  40, "Granola sem Açúcar",        40, "Cereal", "Troca sem açúcar"],
  ["Granola",                  40, "Aveia",                     40, "Cereal", "Troca por fibras"],
  ["Chia",                     15, "Linhaça",                   15, "Semente", "Troca por ômega-3"],
  ["Chia",                     15, "Semente de Abóbora",        15, "Semente", "Troca equivalente"],
  ["Linhaça",                  15, "Chia",                      15, "Semente", "Troca equivalente"],
  ["Gergelim",                 10, "Chia",                      10, "Semente", "Troca equivalente"],

  // ── Snacks e Lanches ──────────────────────────────────────────────────────────
  ["Biscoito Integral",        30, "Torrada Integral",          25, "Lanche", "Troca por menos sódio"],
  ["Biscoito Integral",        30, "Castanha do Pará",          20, "Lanche", "Troca por gorduras boas"],
  ["Barra de Cereal",          30, "Banana + Amendoim",         80, "Lanche", "Troca in natura"],
  ["Barra de Proteína",        60, "Iogurte Grego + Frutas",   150, "Lanche", "Troca in natura"],
  ["Pipoca",                   30, "Torrada Integral",          25, "Lanche", "Troca equivalente"],
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
