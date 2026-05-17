-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: Template "Protocolo Base — 6 Refeições"
-- Macros baseados na Tabela TACO (UNICAMP) e IBGE.
-- Seguro para re-execução (ON CONFLICT DO NOTHING).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── STEP 1: Template principal ────────────────────────────────────────────────
INSERT INTO diet_templates (name, description, strategy, total_kcal, protein_g, carbs_g, fat_g, is_active)
VALUES (
  'Protocolo Base — 6 Refeições',
  'Plano equilibrado com 6 refeições distribuídas ao longo do dia. Foco em fonte proteica magra, carboidrato de baixo índice glicêmico e gorduras saudáveis. Ideal como base de personalização.',
  'alta_proteina',
  1640.0,
  114.0,
  188.0,
  38.0,
  TRUE
)
ON CONFLICT DO NOTHING;

-- ── STEP 2: Refeições ─────────────────────────────────────────────────────────
WITH tmpl AS (
  SELECT id FROM diet_templates WHERE name = 'Protocolo Base — 6 Refeições' LIMIT 1
)
INSERT INTO diet_template_meals (template_id, meal_name, time_suggestion, order_index)
SELECT tmpl.id, m.meal_name, m.time_suggestion, m.order_index
FROM tmpl, (VALUES
  ('Café da manhã',     '07:00', 0),
  ('Café da manhã',     '08:00', 1),
  ('Almoço',            '12:00', 2),
  ('Lanche da tarde',   '15:30', 3),
  ('Jantar',            '19:30', 4),
  ('Ceia',              '23:30', 5)
) AS m(meal_name, time_suggestion, order_index)
ON CONFLICT DO NOTHING;

-- ── STEP 3: Alimentos por refeição ────────────────────────────────────────────
-- Macros por 100g (TACO/IBGE). A coluna `quantity` representa a porção real prescrita.
-- Colunas de macro armazenadas são SEMPRE por 100g (o sistema calcula a porção).

-- 07:00 — Café da manhã
WITH meal AS (
  SELECT dtm.id
  FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name   = 'Protocolo Base — 6 Refeições'
    AND dtm.time_suggestion = '07:00'
  LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount,
   kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, food_group, order_index)
SELECT meal.id, f.food_name, f.quantity, f.unit, f.household_measure, f.measure_amount,
       f.kcal, f.prot, f.carbs, f.fat, f.food_group, f.ord
FROM meal, (VALUES
  -- Batata doce cozida sem sal: TACO #437 — 86 kcal, P 1.4, C 20.2, G 0.1
  ('Batata doce cozida sem sal', 100.0, 'g',  NULL,              NULL, 86.0, 1.4, 20.2, 0.1, 'Carboidrato', 0),
  -- Café coado (sem açúcar): TACO #15 — ~2 kcal/100mL, porção 200mL (caneca)
  ('Café coado (sem açúcar)',    200.0, 'ml', 'caneca',          1.0,  2.0,  0.3,  0.0, 0.0, 'Bebida',      1)
) AS f(food_name, quantity, unit, household_measure, measure_amount, kcal, prot, carbs, fat, food_group, ord)
ON CONFLICT DO NOTHING;

-- 08:00 — Café da manhã
WITH meal AS (
  SELECT dtm.id
  FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name   = 'Protocolo Base — 6 Refeições'
    AND dtm.time_suggestion = '08:00'
  LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount,
   kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, food_group, order_index)
SELECT meal.id, f.food_name, f.quantity, f.unit, f.household_measure, f.measure_amount,
       f.kcal, f.prot, f.carbs, f.fat, f.food_group, f.ord
FROM meal, (VALUES
  -- Omelete de claras recheado (~120g): estimativa — ≈125 kcal, P 18, C 2, G 4.5
  ('Omelete de claras recheado', 120.0, 'g', NULL, NULL, 104.0, 15.0, 1.7, 3.8, 'Proteína',     0),
  -- Frango peito cozido: TACO #190 — 159 kcal, P 32, C 0, G 3
  ('Frango (peito)',             80.0,  'g', NULL, NULL, 159.0, 32.0, 0.0, 3.0, 'Proteína',     1),
  -- Rúcula crua: TACO #309 — 25 kcal, P 2.6, C 2.4, G 0.5
  ('Rúcula',                     50.0,  'g', NULL, NULL,  25.0,  2.6,  2.4, 0.5, 'Vegetal',      2)
) AS f(food_name, quantity, unit, household_measure, measure_amount, kcal, prot, carbs, fat, food_group, ord)
ON CONFLICT DO NOTHING;

-- 12:00 — Almoço
WITH meal AS (
  SELECT dtm.id
  FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name   = 'Protocolo Base — 6 Refeições'
    AND dtm.time_suggestion = '12:00'
  LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount,
   kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, food_group, order_index)
SELECT meal.id, f.food_name, f.quantity, f.unit, f.household_measure, f.measure_amount,
       f.kcal, f.prot, f.carbs, f.fat, f.food_group, f.ord
FROM meal, (VALUES
  -- Mandioquinha cozida: TACO #256 — 90 kcal, P 2.3, C 20.5, G 0.3
  ('Mandioquinha cozida',                             80.0,  'g',  NULL,      NULL, 90.0,  2.3, 20.5, 0.3, 'Carboidrato', 0),
  -- Patinho grelhado (sem gordura): TACO #29 — 219 kcal, P 30.7, C 0, G 10.0
  ('Carne bovina, patinho, sem gordura, grelhada',   100.0,  'g',  NULL,      NULL, 219.0, 30.7, 0.0, 10.0, 'Proteína',   1),
  -- Tomate cru: TACO #335 — 18 kcal, P 0.9, C 3.5, G 0.2 (1 unidade ≈ 100g)
  ('Tomate cru',                                     100.0,  'g',  'unidade', 1.0,  18.0,  0.9,  3.5, 0.2, 'Vegetal',    2),
  -- Cebola crua: TACO #99 — 38 kcal, P 1.2, C 8.6, G 0.1
  ('Cebola crua',                                     30.0,  'g',  NULL,      NULL, 38.0,  1.2,  8.6, 0.1, 'Vegetal',    3),
  -- Pepino: TACO #288 — 15 kcal, P 0.7, C 2.5, G 0.2
  ('Pepino',                                          30.0,  'g',  NULL,      NULL, 15.0,  0.7,  2.5, 0.2, 'Vegetal',    4)
) AS f(food_name, quantity, unit, household_measure, measure_amount, kcal, prot, carbs, fat, food_group, ord)
ON CONFLICT DO NOTHING;

-- 15:30 — Lanche da tarde
WITH meal AS (
  SELECT dtm.id
  FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name   = 'Protocolo Base — 6 Refeições'
    AND dtm.time_suggestion = '15:30'
  LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount,
   kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, food_group, order_index)
SELECT meal.id, f.food_name, f.quantity, f.unit, f.household_measure, f.measure_amount,
       f.kcal, f.prot, f.carbs, f.fat, f.food_group, f.ord
FROM meal, (VALUES
  -- Mamão formoso: TACO #234 — 44 kcal, P 0.5, C 10.4, G 0.1
  ('Mamão',    80.0,  'g',  NULL,      NULL, 44.0,  0.5, 10.4, 0.1, 'Fruta', 0),
  -- Maçã com casca: TACO #225 — 56 kcal, P 0.3, C 14.9, G 0.1 (1 unidade ≈ 130g)
  ('Maçã',    130.0,  'g',  'unidade', 1.0,  56.0,  0.3, 14.9, 0.1, 'Fruta', 1),
  -- Banana prata: TACO #74 — 98 kcal, P 1.3, C 25.8, G 0.1 (1 unidade ≈ 100g)
  ('Banana',  100.0,  'g',  'unidade', 1.0,  98.0,  1.3, 25.8, 0.1, 'Fruta', 2)
) AS f(food_name, quantity, unit, household_measure, measure_amount, kcal, prot, carbs, fat, food_group, ord)
ON CONFLICT DO NOTHING;

-- 19:30 — Jantar
WITH meal AS (
  SELECT dtm.id
  FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name   = 'Protocolo Base — 6 Refeições'
    AND dtm.time_suggestion = '19:30'
  LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount,
   kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, food_group, order_index)
SELECT meal.id, f.food_name, f.quantity, f.unit, f.household_measure, f.measure_amount,
       f.kcal, f.prot, f.carbs, f.fat, f.food_group, f.ord
FROM meal, (VALUES
  -- Sopa de legumes com carne: estimativa média — 50 kcal/100g, P 3.5, C 5.5, G 1.2
  ('Sopa de legumes com carne',     200.0, 'g',  NULL,  NULL, 50.0,  3.5,  5.5, 1.2, 'Outro',      0),
  -- Batata doce cozida sem sal (mesma do café): TACO #437
  ('Batata doce cozida sem sal',     70.0, 'g',  NULL,  NULL, 86.0,  1.4, 20.2, 0.1, 'Carboidrato',1)
) AS f(food_name, quantity, unit, household_measure, measure_amount, kcal, prot, carbs, fat, food_group, ord)
ON CONFLICT DO NOTHING;

-- 23:30 — Ceia
WITH meal AS (
  SELECT dtm.id
  FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name   = 'Protocolo Base — 6 Refeições'
    AND dtm.time_suggestion = '23:30'
  LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount,
   kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, food_group, order_index)
SELECT meal.id, f.food_name, f.quantity, f.unit, f.household_measure, f.measure_amount,
       f.kcal, f.prot, f.carbs, f.fat, f.food_group, f.ord
FROM meal, (VALUES
  -- Aveia em flocos: TACO #6 — 394 kcal, P 13.9, C 66.6, G 8.5
  ('Aveia em flocos', 50.0, 'g', NULL, NULL, 394.0, 13.9, 66.6, 8.5, 'Carboidrato', 0)
) AS f(food_name, quantity, unit, household_measure, measure_amount, kcal, prot, carbs, fat, food_group, ord)
ON CONFLICT DO NOTHING;

-- ── STEP 4: Verificação (opcional — remova antes de prod se preferir) ─────────
SELECT
  dt.name                               AS template,
  dtm.time_suggestion || ' — ' || dtm.meal_name AS refeicao,
  COUNT(dtf.id)                         AS qtd_alimentos,
  ROUND(SUM(dtf.quantity * dtf.kcal_per_100g   / 100), 1) AS kcal,
  ROUND(SUM(dtf.quantity * dtf.protein_per_100g / 100), 1) AS prot_g,
  ROUND(SUM(dtf.quantity * dtf.carbs_per_100g  / 100), 1) AS carbs_g,
  ROUND(SUM(dtf.quantity * dtf.fat_per_100g    / 100), 1) AS fat_g
FROM diet_templates dt
JOIN diet_template_meals dtm ON dtm.template_id = dt.id
LEFT JOIN diet_template_foods dtf ON dtf.template_meal_id = dtm.id
WHERE dt.name = 'Protocolo Base — 6 Refeições'
GROUP BY dt.name, dtm.time_suggestion, dtm.meal_name, dtm.order_index
ORDER BY dtm.order_index;
