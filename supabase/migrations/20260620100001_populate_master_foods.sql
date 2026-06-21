-- ─── MIGRATION: 20260620100001_populate_master_foods.sql ───────────────────────
-- Extrai alimentos únicos de meal_foods e diet_template_foods e insere em master_foods.
-- Usamos INSERT ... ON CONFLICT DO NOTHING para evitar duplicidade.

INSERT INTO master_foods (name, category, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
SELECT DISTINCT 
    food_name, 
    'Personalizado' AS category, -- Categoria padrão, pois não temos mapeamento para todas as inserções
    COALESCE(kcal_per_100g, 0),
    COALESCE(protein_per_100g, 0),
    COALESCE(carbs_per_100g, 0),
    COALESCE(fat_per_100g, 0)
FROM meal_foods
WHERE food_name IS NOT NULL
ON CONFLICT (name) DO NOTHING;

INSERT INTO master_foods (name, category, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
SELECT DISTINCT 
    food_name, 
    'Personalizado' AS category,
    COALESCE(kcal_per_100g, 0),
    COALESCE(protein_per_100g, 0),
    COALESCE(carbs_per_100g, 0),
    COALESCE(fat_per_100g, 0)
FROM diet_template_foods
WHERE food_name IS NOT NULL
ON CONFLICT (name) DO NOTHING;
