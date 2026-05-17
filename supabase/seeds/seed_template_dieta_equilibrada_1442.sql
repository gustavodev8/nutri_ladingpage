-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: Template "Dieta Equilibrada — 1442 kcal 4 Refeições"
-- Macros baseados na Tabela TACO (UNICAMP).
-- Seguro para re-execução (ON CONFLICT DO NOTHING).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── STEP 1: Template ──────────────────────────────────────────────────────────
INSERT INTO diet_templates (name, description, strategy, total_kcal, protein_g, carbs_g, fat_g, is_active)
VALUES (
  'Dieta Equilibrada — 1442 kcal 4 Refeições',
  'Plano com 4 refeições distribuídas ao longo do dia. Equilibrado em macronutrientes com ênfase em proteínas de alto valor biológico (ovos, frango, queijo), carboidratos complexos e vegetais. PTN 26% · CHO 46% · LIP 28%.',
  'emagrecimento',
  1442.0, 95.6, 169.4, 45.5, TRUE
)
ON CONFLICT DO NOTHING;

-- ── STEP 2: Refeições ─────────────────────────────────────────────────────────
WITH tmpl AS (
  SELECT id FROM diet_templates WHERE name = 'Dieta Equilibrada — 1442 kcal 4 Refeições' LIMIT 1
)
INSERT INTO diet_template_meals (template_id, meal_name, time_suggestion, order_index)
SELECT tmpl.id, m.meal_name, m.time_suggestion, m.order_index
FROM tmpl, (VALUES
  ('Café da manhã',      '06:30', 0),
  ('Almoço',             '12:30', 1),
  ('Lanche da tarde',    '17:30', 2),
  ('Jantar',             '20:30', 3)
) AS m(meal_name, time_suggestion, order_index)
ON CONFLICT DO NOTHING;

-- ── STEP 3: Alimentos ─────────────────────────────────────────────────────────

-- 06:30 — Café da manhã
WITH meal AS (
  SELECT dtm.id FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name = 'Dieta Equilibrada — 1442 kcal 4 Refeições' AND dtm.time_suggestion = '06:30' LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount,
   kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, food_group, order_index)
VALUES
  -- TACO #126: Cuscuz cozido — 71 kcal, P 2.1, C 15.6, G 0.3
  ((SELECT id FROM meal), 'Cuscuz',               80.0,  'g', NULL,       NULL::numeric,  71.0,  2.1, 15.6,  0.3, 'Carboidrato', 0),
  -- TACO #186: Ovo de galinha inteiro — 143 kcal, P 12.4, C 0.4, G 9.5 (5 unidades × 50g = 250g)
  ((SELECT id FROM meal), 'Ovo de galinha',       250.0,  'g', 'unidade',  5.0::numeric, 143.0, 12.4,  0.4,  9.5, 'Proteína',    1),
  -- TACO #210: Queijo minas frescal — 264 kcal, P 17.4, C 2.8, G 20.2 (2 fatias × 30g = 60g)
  ((SELECT id FROM meal), 'Queijo minas frescal',  60.0,  'g', 'fatia',    2.0::numeric, 264.0, 17.4,  2.8, 20.2, 'Laticínio',   2)
ON CONFLICT DO NOTHING;

-- 12:30 — Almoço
WITH meal AS (
  SELECT dtm.id FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name = 'Dieta Equilibrada — 1442 kcal 4 Refeições' AND dtm.time_suggestion = '12:30' LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount,
   kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, food_group, order_index)
VALUES
  -- Ervilha congelada cozida (estimativa) — 80 kcal, P 5.8, C 14.2, G 0.4
  ((SELECT id FROM meal), 'Ervilha congelada',   80.0, 'g', NULL, NULL::numeric,  80.0,  5.8, 14.2,  0.4, 'Leguminosa', 0),
  -- TACO #79: Brócolis cozido — 35 kcal, P 2.9, C 4.7, G 0.4
  ((SELECT id FROM meal), 'Brócolis cozido',     80.0, 'g', NULL, NULL::numeric,  35.0,  2.9,  4.7,  0.4, 'Vegetal',    1),
  -- TACO #210: Queijo minas frescal — 264 kcal, P 17.4, C 2.8, G 20.2
  ((SELECT id FROM meal), 'Queijo minas frescal',30.0, 'g', NULL, NULL::numeric, 264.0, 17.4,  2.8, 20.2, 'Laticínio',  2),
  -- TACO #174: Couve cozida — 19 kcal, P 1.7, C 1.8, G 0.5
  ((SELECT id FROM meal), 'Couve cozida',        50.0, 'g', NULL, NULL::numeric,  19.0,  1.7,  1.8,  0.5, 'Vegetal',    3),
  -- TACO #190: Filé de frango cozido — 159 kcal, P 32.0, C 0.0, G 3.0
  ((SELECT id FROM meal), 'Filé de frango',     100.0, 'g', NULL, NULL::numeric, 159.0, 32.0,  0.0,  3.0, 'Proteína',   4)
ON CONFLICT DO NOTHING;

-- 17:30 — Lanche da tarde
WITH meal AS (
  SELECT dtm.id FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name = 'Dieta Equilibrada — 1442 kcal 4 Refeições' AND dtm.time_suggestion = '17:30' LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount,
   kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, food_group, order_index)
VALUES
  -- TACO #74: Banana prata — 98 kcal, P 1.3, C 25.8, G 0.1 (2 unidades médias × 100g = 200g)
  ((SELECT id FROM meal), 'Banana',     200.0, 'g',  'unidade',    2.0::numeric,  98.0,  1.3, 25.8,  0.1, 'Fruta',  0),
  -- TACO #245: Mel — 309 kcal, P 0.3, C 82.4, G 0.0 (2 col. sopa × 15g = 30g)
  ((SELECT id FROM meal), 'Mel',         30.0, 'g',  'col. sopa',  2.0::numeric, 309.0,  0.3, 82.4,  0.0, 'Outro',  1),
  -- TACO #349: Uva passa — 296 kcal, P 2.8, C 78.6, G 0.3 (2 col. sopa × 20g = 40g)
  ((SELECT id FROM meal), 'Uva passa',   40.0, 'g',  'col. sopa',  2.0::numeric, 296.0,  2.8, 78.6,  0.3, 'Fruta',  2)
ON CONFLICT DO NOTHING;

-- 20:30 — Jantar
WITH meal AS (
  SELECT dtm.id FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name = 'Dieta Equilibrada — 1442 kcal 4 Refeições' AND dtm.time_suggestion = '20:30' LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount,
   kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, food_group, order_index)
VALUES
  -- TACO #74: Banana prata — 98 kcal, P 1.3, C 25.8, G 0.1 (2 unidades × 100g = 200g)
  ((SELECT id FROM meal), 'Banana',          200.0, 'g', 'unidade', 2.0::numeric,  98.0,  1.3, 25.8, 0.1, 'Fruta',   0),
  -- TACO #187: Clara de ovo de galinha — 51 kcal, P 10.8, C 0.8, G 0.1 (2 unidades × 34g = 68g)
  ((SELECT id FROM meal), 'Clara de ovo',     68.0, 'g', 'unidade', 2.0::numeric,  51.0, 10.8,  0.8, 0.1, 'Proteína',1)
ON CONFLICT DO NOTHING;

-- ── STEP 4: Conferência ───────────────────────────────────────────────────────
SELECT
  dtm.time_suggestion || ' — ' || dtm.meal_name                       AS refeicao,
  COUNT(dtf.id)                                                        AS alimentos,
  ROUND(SUM(dtf.quantity * dtf.kcal_per_100g    / 100), 1)            AS kcal,
  ROUND(SUM(dtf.quantity * dtf.protein_per_100g / 100), 1)            AS prot_g,
  ROUND(SUM(dtf.quantity * dtf.carbs_per_100g   / 100), 1)            AS carbs_g,
  ROUND(SUM(dtf.quantity * dtf.fat_per_100g     / 100), 1)            AS fat_g
FROM diet_templates dt
JOIN diet_template_meals dtm ON dtm.template_id = dt.id
LEFT JOIN diet_template_foods dtf ON dtf.template_meal_id = dtm.id
WHERE dt.name = 'Dieta Equilibrada — 1442 kcal 4 Refeições'
GROUP BY dtm.time_suggestion, dtm.meal_name, dtm.order_index
ORDER BY dtm.order_index;
