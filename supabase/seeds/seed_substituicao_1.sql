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
)
ON CONFLICT DO NOTHING;

-- ── 2. Refeições ──────────────────────────────────────────────────────────────
WITH t AS (SELECT id FROM diet_templates WHERE name = 'Substituição 1' ORDER BY created_at DESC LIMIT 1)
INSERT INTO diet_template_meals (template_id, meal_name, time_suggestion, order_index)
SELECT t.id, m.n, m.t, m.o FROM t, (VALUES
  ('Pré-treino',       '06:30', 0),
  ('Café da manhã',    '08:30', 1),
  ('Lanche da manhã',  '10:00', 2),
  ('Almoço',           '12:00', 3),
  ('Lanche da tarde',  '15:00', 4),
  ('Jantar — Opção A', '18:00', 5),
  ('Jantar — Opção B', '18:00', 6),
  ('Ceia',             '21:00', 7)
) AS m(n,t,o) ON CONFLICT DO NOTHING;

-- ── 3. Pré-treino (06:30) ─────────────────────────────────────────────────────
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Substituição 1' AND dtm.meal_name='Pré-treino' ORDER BY dt.created_at DESC LIMIT 1)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount, order_index)
VALUES
  ((SELECT id FROM meal), 'Whey Protein',      30,   'g',       NULL,                  NULL::numeric, 0),
  ((SELECT id FROM meal), 'Morango congelado',  NULL, 'unidade', 'Unidade',             3::numeric,    1),
  ((SELECT id FROM meal), 'Banana congelada',   NULL, 'unidade', 'Unidade média',       1::numeric,    2),
  ((SELECT id FROM meal), 'Água',               200,  'ml',      'Copo médio (200ml)',  1::numeric,    3)
ON CONFLICT DO NOTHING;

-- ── 4. Café da manhã (08:30) ──────────────────────────────────────────────────
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Substituição 1' AND dtm.meal_name='Café da manhã' ORDER BY dt.created_at DESC LIMIT 1)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount, order_index)
VALUES
  ((SELECT id FROM meal), 'Café',                   NULL, 'xícara',  'Xícara de café', 1::numeric,    0),
  ((SELECT id FROM meal), 'Batata cozida',           70,   'g',       NULL,             NULL::numeric, 1),
  ((SELECT id FROM meal), 'Ovo de galinha cozido',   NULL, 'unidade', 'Unidade',        2::numeric,    2)
ON CONFLICT DO NOTHING;

-- ── 5. Lanche da manhã (10:00) ────────────────────────────────────────────────
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Substituição 1' AND dtm.meal_name='Lanche da manhã' ORDER BY dt.created_at DESC LIMIT 1)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount, order_index)
VALUES
  ((SELECT id FROM meal), 'Torrão de amendoim', 30, 'g', NULL, NULL::numeric, 0)
ON CONFLICT DO NOTHING;

-- ── 6. Almoço (12:00) ─────────────────────────────────────────────────────────
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Substituição 1' AND dtm.meal_name='Almoço' ORDER BY dt.created_at DESC LIMIT 1)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount, order_index)
VALUES
  ((SELECT id FROM meal), 'Filé de frango grelhado OU Patinho sem gordura grelhado', 100, 'g',     NULL,    NULL::numeric, 0),
  ((SELECT id FROM meal), 'Alface',                                                   NULL, 'folha', 'Folha', 3::numeric,    1),
  ((SELECT id FROM meal), 'Quiabo cozido',                                            80,   'g',     NULL,    NULL::numeric, 2),
  ((SELECT id FROM meal), 'Couve cozida',                                             40,   'g',     NULL,    NULL::numeric, 3),
  ((SELECT id FROM meal), 'Arroz branco cozido',                                      50,   'g',     NULL,    NULL::numeric, 4),
  ((SELECT id FROM meal), 'Feijão carioca cozido',                                    40,   'g',     NULL,    NULL::numeric, 5)
ON CONFLICT DO NOTHING;

-- ── 7. Lanche da tarde (15:00) ────────────────────────────────────────────────
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Substituição 1' AND dtm.meal_name='Lanche da tarde' ORDER BY dt.created_at DESC LIMIT 1)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount, order_index)
VALUES
  ((SELECT id FROM meal), 'Ameixa OU Laranja', NULL, 'unidade', 'Ameixa: 2 unidades pequenas  /  Laranja: 1 unidade pequena', 1::numeric, 0)
ON CONFLICT DO NOTHING;

-- ── 8. Jantar — Opção A (18:00) ───────────────────────────────────────────────
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Substituição 1' AND dtm.meal_name='Jantar — Opção A' ORDER BY dt.created_at DESC LIMIT 1)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount, order_index)
VALUES
  ((SELECT id FROM meal), 'Frango, peito, sem pele, cozido', NULL, 'colher de sopa', 'Colher de sopa',  3::numeric,    0),
  ((SELECT id FROM meal), 'Tapioca de goma',                  45,   'g',              NULL,              NULL::numeric, 1),
  ((SELECT id FROM meal), 'Suco de laranja',                  NULL, 'copo',           'Copo americano',  1::numeric,    2),
  ((SELECT id FROM meal), 'Alface',                           NULL, 'folha',          'Folha',           2::numeric,    3),
  ((SELECT id FROM meal), 'Tomate',                           NULL, 'fatia',          'Fatia pequena',   3::numeric,    4)
ON CONFLICT DO NOTHING;

-- ── 9. Jantar — Opção B (18:00) ───────────────────────────────────────────────
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Substituição 1' AND dtm.meal_name='Jantar — Opção B' ORDER BY dt.created_at DESC LIMIT 1)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount, order_index)
VALUES
  ((SELECT id FROM meal), 'Pão integral',             NULL, 'fatia',            'Fatia',               1::numeric,    0),
  ((SELECT id FROM meal), 'Atum em conserva em óleo',  50,   'g',               NULL,                  NULL::numeric, 1),
  ((SELECT id FROM meal), 'Requeijão light',           NULL, 'colher sobremesa', 'Colher de sobremesa', 1::numeric,    2),
  ((SELECT id FROM meal), 'Cenoura crua',               30,   'g',               NULL,                  NULL::numeric, 3),
  ((SELECT id FROM meal), 'Café com leite',             NULL, 'caneca',          'Caneca',              1::numeric,    4)
ON CONFLICT DO NOTHING;

-- ── 10. Ceia (21:00) ──────────────────────────────────────────────────────────
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Substituição 1' AND dtm.meal_name='Ceia' ORDER BY dt.created_at DESC LIMIT 1)
INSERT INTO diet_template_foods
  (template_meal_id, food_name, quantity, unit, household_measure, measure_amount, order_index)
VALUES
  ((SELECT id FROM meal), 'Ovo de galinha, clara cozida',     NULL, 'unidade',        'Unidade',        2::numeric, 0),
  ((SELECT id FROM meal), 'Frango, peito, sem pele, cozido',  NULL, 'colher de sopa', 'Colher de sopa', 3::numeric, 1),
  ((SELECT id FROM meal), 'Banana cozida (ouro/prata/d''água)', NULL, 'unidade',      'Unidade',        1::numeric, 2)
ON CONFLICT DO NOTHING;
