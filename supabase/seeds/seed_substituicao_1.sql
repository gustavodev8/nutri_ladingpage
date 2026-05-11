-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: Template "Substituição 1"
-- Plano esportivo com 7 refeições (pré-treino → ceia)
-- O jantar das 18h possui duas opções intercambiáveis (Opção A / Opção B)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Template ───────────────────────────────────────────────────────────────
INSERT INTO diet_templates (name, description, strategy, is_active)
VALUES (
  'Substituição 1',
  'Plano alimentar esportivo com pré-treino (smoothie de whey), 7 refeições ao longo do dia. Jantar das 18h com duas opções intercambiáveis.',
  'hipertrofia',
  true
);

-- ── 2. Refeições ──────────────────────────────────────────────────────────────
WITH t AS (
  SELECT id FROM diet_templates
  WHERE name = 'Substituição 1'
  ORDER BY created_at DESC LIMIT 1
)
INSERT INTO diet_template_meals (template_id, meal_name, time_suggestion, order_index)
SELECT t.id, m.meal_name, m.time_suggestion, m.order_index
FROM t, (VALUES
  ('Pré-treino',             '06:30', 0),
  ('Café da manhã',          '08:30', 1),
  ('Lanche da manhã',        '10:00', 2),
  ('Almoço',                 '12:00', 3),
  ('Lanche da tarde',        '15:00', 4),
  ('Jantar — Opção A',       '18:00', 5),
  ('Jantar — Opção B',       '18:00', 6),
  ('Ceia',                   '21:00', 7)
) AS m(meal_name, time_suggestion, order_index);

-- ── 3. Alimentos — Pré-treino (06:30) ────────────────────────────────────────
-- Smoothie: liquidificador, bata tudo e sirva em seguida
WITH m AS (
  SELECT dtm.id
  FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name = 'Substituição 1'
    AND dtm.meal_name = 'Pré-treino'
  ORDER BY dt.created_at DESC LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount, order_index)
SELECT m.id, f.food_name, f.quantity, f.unit, f.household_measure, f.measure_amount, f.order_index
FROM m, (VALUES
  ('Whey Protein',       30,   'g',        NULL,                 NULL, 0),
  ('Morango congelado',  NULL, 'unidade',  'Unidade',            3,    1),
  ('Banana congelada',   NULL, 'unidade',  'Unidade média',      1,    2),
  ('Água',               200,  'ml',       'Copo médio (200ml)', 1,    3)
) AS f(food_name, quantity, unit, household_measure, measure_amount, order_index);

-- ── 4. Alimentos — Café da manhã (08:30) ─────────────────────────────────────
WITH m AS (
  SELECT dtm.id
  FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name = 'Substituição 1'
    AND dtm.meal_name = 'Café da manhã'
  ORDER BY dt.created_at DESC LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount, order_index)
SELECT m.id, f.food_name, f.quantity, f.unit, f.household_measure, f.measure_amount, f.order_index
FROM m, (VALUES
  ('Café',                      NULL, 'xícara', 'Xícara de café', 1, 0),
  ('Batata cozida',             70,   'g',       NULL,            NULL, 1),
  ('Ovo de galinha cozido',     NULL, 'unidade', 'Unidade',       2,    2)
) AS f(food_name, quantity, unit, household_measure, measure_amount, order_index);

-- ── 5. Alimentos — Lanche da manhã (10:00) ───────────────────────────────────
WITH m AS (
  SELECT dtm.id
  FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name = 'Substituição 1'
    AND dtm.meal_name = 'Lanche da manhã'
  ORDER BY dt.created_at DESC LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount, order_index)
SELECT m.id, f.food_name, f.quantity, f.unit, f.household_measure, f.measure_amount, f.order_index
FROM m, (VALUES
  ('Torrão de amendoim', 30, 'g', NULL, NULL, 0)
) AS f(food_name, quantity, unit, household_measure, measure_amount, order_index);

-- ── 6. Alimentos — Almoço (12:00) ────────────────────────────────────────────
WITH m AS (
  SELECT dtm.id
  FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name = 'Substituição 1'
    AND dtm.meal_name = 'Almoço'
  ORDER BY dt.created_at DESC LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount, order_index)
SELECT m.id, f.food_name, f.quantity, f.unit, f.household_measure, f.measure_amount, f.order_index
FROM m, (VALUES
  ('Filé de frango grelhado OU Carne bovina patinho sem gordura grelhado', 100, 'g', NULL,    NULL, 0),
  ('Alface',                                                               NULL, 'folha', 'Folha',  3,    1),
  ('Quiabo cozido',                                                        80,   'g',     NULL,     NULL, 2),
  ('Couve cozida',                                                         40,   'g',     NULL,     NULL, 3),
  ('Arroz branco cozido',                                                  50,   'g',     NULL,     NULL, 4),
  ('Feijão carioca cozido',                                                40,   'g',     NULL,     NULL, 5)
) AS f(food_name, quantity, unit, household_measure, measure_amount, order_index);

-- ── 7. Alimentos — Lanche da tarde (15:00) ───────────────────────────────────
WITH m AS (
  SELECT dtm.id
  FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name = 'Substituição 1'
    AND dtm.meal_name = 'Lanche da tarde'
  ORDER BY dt.created_at DESC LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount, order_index)
SELECT m.id, f.food_name, f.quantity, f.unit, f.household_measure, f.measure_amount, f.order_index
FROM m, (VALUES
  ('Ameixa OU Laranja', NULL, 'unidade', 'Ameixa: 2 unidades pequenas  /  Laranja: 1 unidade pequena', 1, 0)
) AS f(food_name, quantity, unit, household_measure, measure_amount, order_index);

-- ── 8. Alimentos — Jantar Opção A (18:00) ────────────────────────────────────
WITH m AS (
  SELECT dtm.id
  FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name = 'Substituição 1'
    AND dtm.meal_name = 'Jantar — Opção A'
  ORDER BY dt.created_at DESC LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount, order_index)
SELECT m.id, f.food_name, f.quantity, f.unit, f.household_measure, f.measure_amount, f.order_index
FROM m, (VALUES
  ('Frango, peito, sem pele, cozido', NULL, 'colher de sopa', 'Colher de sopa', 3, 0),
  ('Tapioca de goma',                 45,   'g',              NULL,             NULL, 1),
  ('Suco de laranja',                 NULL, 'copo',           'Copo americano', 1,    2),
  ('Alface',                          NULL, 'folha',          'Folha',          2,    3),
  ('Tomate',                          NULL, 'fatia',          'Fatia pequena',  3,    4)
) AS f(food_name, quantity, unit, household_measure, measure_amount, order_index);

-- ── 9. Alimentos — Jantar Opção B (18:00) ────────────────────────────────────
WITH m AS (
  SELECT dtm.id
  FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name = 'Substituição 1'
    AND dtm.meal_name = 'Jantar — Opção B'
  ORDER BY dt.created_at DESC LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount, order_index)
SELECT m.id, f.food_name, f.quantity, f.unit, f.household_measure, f.measure_amount, f.order_index
FROM m, (VALUES
  ('Pão integral',              NULL, 'fatia',           'Fatia',                1, 0),
  ('Atum em conserva em óleo',  50,   'g',               NULL,                  NULL, 1),
  ('Requeijão light',           NULL, 'colher sobremesa','Colher de sobremesa',  1,    2),
  ('Cenoura crua',              30,   'g',               NULL,                  NULL, 3),
  ('Café com leite',            NULL, 'caneca',          'Caneca',               1,    4)
) AS f(food_name, quantity, unit, household_measure, measure_amount, order_index);

-- ── 10. Alimentos — Ceia (21:00) ─────────────────────────────────────────────
WITH m AS (
  SELECT dtm.id
  FROM diet_template_meals dtm
  JOIN diet_templates dt ON dt.id = dtm.template_id
  WHERE dt.name = 'Substituição 1'
    AND dtm.meal_name = 'Ceia'
  ORDER BY dt.created_at DESC LIMIT 1
)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount, order_index)
SELECT m.id, f.food_name, f.quantity, f.unit, f.household_measure, f.measure_amount, f.order_index
FROM m, (VALUES
  ('Ovo de galinha, clara cozida (10 min)', NULL, 'unidade',       'Unidade',       2,    0),
  ('Frango, peito, sem pele, cozido',       NULL, 'colher de sopa','Colher de sopa', 3,   1),
  ('Banana cozida (ouro/prata/d''água)',    NULL, 'unidade',       'Unidade',       1,    2)
) AS f(food_name, quantity, unit, household_measure, measure_amount, order_index);

-- ── Verificação (opcional) ────────────────────────────────────────────────────
-- SELECT dt.name, dtm.meal_name, dtm.time_suggestion, dtf.food_name, dtf.quantity, dtf.unit, dtf.household_measure, dtf.measure_amount
-- FROM diet_templates dt
-- JOIN diet_template_meals dtm ON dtm.template_id = dt.id
-- JOIN diet_template_foods dtf ON dtf.template_meal_id = dtm.id
-- WHERE dt.name = 'Substituição 1'
-- ORDER BY dtm.order_index, dtf.order_index;
