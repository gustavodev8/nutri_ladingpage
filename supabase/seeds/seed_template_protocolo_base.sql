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
  1819.0, 148.0, 190.0, 41.0, TRUE
)
ON CONFLICT DO NOTHING;

-- ── STEP 2: Refeições ─────────────────────────────────────────────────────────
WITH tmpl AS (
  SELECT id FROM diet_templates WHERE name = 'Protocolo Base — 6 Refeições' LIMIT 1
)
INSERT INTO diet_template_meals (template_id, meal_name, time_suggestion, order_index)
SELECT tmpl.id, m.meal_name, m.time_suggestion, m.order_index
FROM tmpl, (VALUES
  ('Café da manhã',   '07:00', 0),
  ('Café da manhã',   '08:00', 1),
  ('Almoço',          '12:00', 2),
  ('Lanche da tarde', '15:30', 3),
  ('Jantar',          '19:30', 4),
  ('Ceia',            '23:30', 5)
) AS m(meal_name, time_suggestion, order_index)
ON CONFLICT DO NOTHING;

-- ── STEP 3: Alimentos ─────────────────────────────────────────────────────────
-- Macros SEMPRE por 100g. O sistema multiplica pela quantity para calcular a porção.
-- Casts ::numeric explícitos nas colunas que podem ser NULL para evitar erro de tipo.

-- 07:00 — Café da manhã
WITH meal AS (
  SELECT dtm.id FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name = 'Protocolo Base — 6 Refeições' AND dtm.time_suggestion = '07:00' LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount,
   kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, food_group, order_index)
VALUES
  -- TACO #437: Batata-doce cozida — 86 kcal, P 1.4, C 20.2, G 0.1
  ((SELECT id FROM meal), 'Batata doce cozida sem sal', 100.0, 'g',  NULL,     NULL::numeric,  86.0, 1.4, 20.2, 0.1, 'Carboidrato', 0),
  -- TACO #15: Café coado — ~2 kcal/100mL
  ((SELECT id FROM meal), 'Café coado (sem açúcar)',    200.0, 'ml', 'caneca', 1.0::numeric,    2.0, 0.3,  0.0, 0.0, 'Bebida',      1)
ON CONFLICT DO NOTHING;

-- 08:00 — Café da manhã
WITH meal AS (
  SELECT dtm.id FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name = 'Protocolo Base — 6 Refeições' AND dtm.time_suggestion = '08:00' LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount,
   kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, food_group, order_index)
VALUES
  -- Estimativa: Omelete de claras recheado — 104 kcal, P 15, C 1.7, G 3.8
  ((SELECT id FROM meal), 'Omelete de claras recheado', 120.0, 'g', NULL, NULL::numeric, 104.0, 15.0, 1.7, 3.8, 'Proteína', 0),
  -- TACO #190: Frango peito cozido — 159 kcal, P 32, C 0, G 3
  ((SELECT id FROM meal), 'Frango (peito)',              80.0,  'g', NULL, NULL::numeric, 159.0, 32.0, 0.0, 3.0, 'Proteína', 1),
  -- TACO #309: Rúcula crua — 25 kcal, P 2.6, C 2.4, G 0.5
  ((SELECT id FROM meal), 'Rúcula',                     50.0,  'g', NULL, NULL::numeric,  25.0,  2.6, 2.4, 0.5, 'Vegetal',  2)
ON CONFLICT DO NOTHING;

-- 12:00 — Almoço
WITH meal AS (
  SELECT dtm.id FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name = 'Protocolo Base — 6 Refeições' AND dtm.time_suggestion = '12:00' LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount,
   kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, food_group, order_index)
VALUES
  -- TACO #256: Mandioquinha cozida — 90 kcal, P 2.3, C 20.5, G 0.3
  ((SELECT id FROM meal), 'Mandioquinha cozida',                           80.0,  'g', NULL,      NULL::numeric,  90.0,  2.3, 20.5,  0.3, 'Carboidrato', 0),
  -- TACO #29: Patinho grelhado s/ gordura — 219 kcal, P 30.7, C 0, G 10
  ((SELECT id FROM meal), 'Carne bovina, patinho, sem gordura, grelhada', 100.0,  'g', NULL,      NULL::numeric, 219.0, 30.7,  0.0, 10.0, 'Proteína',    1),
  -- TACO #335: Tomate cru — 18 kcal, P 0.9, C 3.5, G 0.2 (1 unidade ≈ 100g)
  ((SELECT id FROM meal), 'Tomate cru',                                   100.0,  'g', 'unidade', 1.0::numeric,   18.0,  0.9,  3.5,  0.2, 'Vegetal',     2),
  -- TACO #99: Cebola crua — 38 kcal, P 1.2, C 8.6, G 0.1
  ((SELECT id FROM meal), 'Cebola crua',                                   30.0,  'g', NULL,      NULL::numeric,  38.0,  1.2,  8.6,  0.1, 'Vegetal',     3),
  -- TACO #288: Pepino — 15 kcal, P 0.7, C 2.5, G 0.2
  ((SELECT id FROM meal), 'Pepino',                                        30.0,  'g', NULL,      NULL::numeric,  15.0,  0.7,  2.5,  0.2, 'Vegetal',     4)
ON CONFLICT DO NOTHING;

-- 15:30 — Lanche da tarde
WITH meal AS (
  SELECT dtm.id FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name = 'Protocolo Base — 6 Refeições' AND dtm.time_suggestion = '15:30' LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount,
   kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, food_group, order_index)
VALUES
  -- TACO #234: Mamão formoso — 44 kcal, P 0.5, C 10.4, G 0.1
  ((SELECT id FROM meal), 'Mamão',   80.0,  'g', NULL,      NULL::numeric, 44.0, 0.5, 10.4, 0.1, 'Fruta', 0),
  -- TACO #225: Maçã com casca — 56 kcal, P 0.3, C 14.9, G 0.1 (1 unid ≈ 130g)
  ((SELECT id FROM meal), 'Maçã',  130.0,  'g', 'unidade', 1.0::numeric,  56.0, 0.3, 14.9, 0.1, 'Fruta', 1),
  -- TACO #74: Banana prata — 98 kcal, P 1.3, C 25.8, G 0.1 (1 unid ≈ 100g)
  ((SELECT id FROM meal), 'Banana', 100.0,  'g', 'unidade', 1.0::numeric,  98.0, 1.3, 25.8, 0.1, 'Fruta', 2)
ON CONFLICT DO NOTHING;

-- 19:30 — Jantar
WITH meal AS (
  SELECT dtm.id FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name = 'Protocolo Base — 6 Refeições' AND dtm.time_suggestion = '19:30' LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount,
   kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, food_group, order_index)
VALUES
  -- Estimativa: Sopa de legumes c/ carne — 50 kcal/100g, P 3.5, C 5.5, G 1.2
  ((SELECT id FROM meal), 'Sopa de legumes com carne',  200.0, 'g', NULL, NULL::numeric,  50.0, 3.5,  5.5, 1.2, 'Outro',       0),
  -- TACO #437: Batata-doce cozida — mesma do café da manhã
  ((SELECT id FROM meal), 'Batata doce cozida sem sal',  70.0, 'g', NULL, NULL::numeric,  86.0, 1.4, 20.2, 0.1, 'Carboidrato', 1)
ON CONFLICT DO NOTHING;

-- 23:30 — Ceia
WITH meal AS (
  SELECT dtm.id FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name = 'Protocolo Base — 6 Refeições' AND dtm.time_suggestion = '23:30' LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount,
   kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, food_group, order_index)
VALUES
  -- TACO #6: Aveia em flocos — 394 kcal, P 13.9, C 66.6, G 8.5
  ((SELECT id FROM meal), 'Aveia em flocos',           50.0, 'g', NULL, NULL::numeric, 394.0, 13.9, 66.6, 8.5, 'Carboidrato', 0),
  -- TACO #190: Filé de frango cozido — 159 kcal, P 32.0, C 0.0, G 3.0
  ((SELECT id FROM meal), 'Filé de frango cozido',    100.0, 'g', NULL, NULL::numeric, 159.0, 32.0,  0.0, 3.0, 'Proteína',    1),
  -- TACO #309: Rúcula crua — 25 kcal, P 2.6, C 2.4, G 0.5
  ((SELECT id FROM meal), 'Rúcula',                    80.0, 'g', NULL, NULL::numeric,  25.0,  2.6,  2.4, 0.5, 'Vegetal',     2)
ON CONFLICT DO NOTHING;

-- ── STEP 4: Conferência de macros por refeição ────────────────────────────────
SELECT
  dtm.time_suggestion || ' — ' || dtm.meal_name                        AS refeicao,
  COUNT(dtf.id)                                                         AS alimentos,
  ROUND(SUM(dtf.quantity * dtf.kcal_per_100g    / 100), 1)             AS kcal,
  ROUND(SUM(dtf.quantity * dtf.protein_per_100g / 100), 1)             AS prot_g,
  ROUND(SUM(dtf.quantity * dtf.carbs_per_100g   / 100), 1)             AS carbs_g,
  ROUND(SUM(dtf.quantity * dtf.fat_per_100g     / 100), 1)             AS fat_g
FROM diet_templates dt
JOIN diet_template_meals dtm ON dtm.template_id = dt.id
LEFT JOIN diet_template_foods dtf ON dtf.template_meal_id = dtm.id
WHERE dt.name = 'Protocolo Base — 6 Refeições'
GROUP BY dtm.time_suggestion, dtm.meal_name, dtm.order_index
ORDER BY dtm.order_index;
