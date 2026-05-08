-- ─── Epic 7: Templates de Cardápio + Medidas Caseiras ────────────────────────

-- ── 1. diet_templates ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diet_templates (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  strategy    TEXT,            -- 'low_carb' | 'mediterranea' | 'hipertrofia' | 'emagrecimento' | etc.
  total_kcal  NUMERIC(7,1),
  protein_g   NUMERIC(6,1),
  carbs_g     NUMERIC(6,1),
  fat_g       NUMERIC(6,1),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE diet_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diet_templates' AND policyname = 'anon_all_diet_templates') THEN
    CREATE POLICY "anon_all_diet_templates" ON diet_templates FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diet_templates' AND policyname = 'auth_all_diet_templates') THEN
    CREATE POLICY "auth_all_diet_templates" ON diet_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 2. diet_template_meals ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diet_template_meals (
  id              BIGSERIAL PRIMARY KEY,
  template_id     BIGINT NOT NULL REFERENCES diet_templates(id) ON DELETE CASCADE,
  meal_name       TEXT NOT NULL,
  time_suggestion TEXT,
  order_index     SMALLINT DEFAULT 0
);

ALTER TABLE diet_template_meals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diet_template_meals' AND policyname = 'anon_all_diet_template_meals') THEN
    CREATE POLICY "anon_all_diet_template_meals" ON diet_template_meals FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diet_template_meals' AND policyname = 'auth_all_diet_template_meals') THEN
    CREATE POLICY "auth_all_diet_template_meals" ON diet_template_meals FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 3. diet_template_foods ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diet_template_foods (
  id                 BIGSERIAL PRIMARY KEY,
  template_meal_id   BIGINT NOT NULL REFERENCES diet_template_meals(id) ON DELETE CASCADE,
  food_name          TEXT NOT NULL,
  quantity           NUMERIC(8,2),
  unit               TEXT DEFAULT 'g',
  household_measure  TEXT,     -- ex: 'colher de sopa', 'unidade média', 'escumadeira'
  measure_amount     NUMERIC(5,2), -- ex: 1, 2, 0.5
  kcal_per_100g      NUMERIC(7,2),
  protein_per_100g   NUMERIC(6,2),
  carbs_per_100g     NUMERIC(6,2),
  fat_per_100g       NUMERIC(6,2),
  order_index        SMALLINT DEFAULT 0
);

ALTER TABLE diet_template_foods ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diet_template_foods' AND policyname = 'anon_all_diet_template_foods') THEN
    CREATE POLICY "anon_all_diet_template_foods" ON diet_template_foods FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diet_template_foods' AND policyname = 'auth_all_diet_template_foods') THEN
    CREATE POLICY "auth_all_diet_template_foods" ON diet_template_foods FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 4. Medidas caseiras em meal_foods ──────────────────────────────────────────
ALTER TABLE meal_foods
  ADD COLUMN IF NOT EXISTS household_measure TEXT,
  ADD COLUMN IF NOT EXISTS measure_amount    NUMERIC(5,2);

-- ── 5. Coluna food_group em meal_foods (para substituições inteligentes) ───────
ALTER TABLE meal_foods
  ADD COLUMN IF NOT EXISTS food_group TEXT;

-- ── 7. Seed: 2 templates demo ─────────────────────────────────────────────────
INSERT INTO diet_templates (name, description, strategy, total_kcal, protein_g, carbs_g, fat_g)
VALUES
  (
    'Low Carb 1800 kcal',
    'Plano hipocalórico com restrição de carboidratos. Ideal para emagrecimento com preservação de massa magra.',
    'low_carb',
    1800, 160, 90, 80
  ),
  (
    'Mediterrânea 2000 kcal',
    'Baseado na dieta mediterrânea: rica em azeite, peixes, leguminosas e vegetais. Ótima para saúde cardiovascular.',
    'mediterranea',
    2000, 120, 220, 75
  )
ON CONFLICT DO NOTHING;

-- Refeições do template Low Carb 1800 kcal (id=1)
WITH t AS (SELECT id FROM diet_templates WHERE name = 'Low Carb 1800 kcal' LIMIT 1)
INSERT INTO diet_template_meals (template_id, meal_name, time_suggestion, order_index)
SELECT t.id, m.meal_name, m.time_suggestion, m.order_index FROM t, (VALUES
  ('Café da manhã',   '07:00 – 08:00', 0),
  ('Lanche da manhã', '10:00 – 10:30', 1),
  ('Almoço',          '12:00 – 13:00', 2),
  ('Lanche da tarde', '15:30 – 16:00', 3),
  ('Jantar',          '19:00 – 20:00', 4)
) AS m(meal_name, time_suggestion, order_index)
ON CONFLICT DO NOTHING;

-- Refeições do template Mediterrânea 2000 kcal (id=2)
WITH t AS (SELECT id FROM diet_templates WHERE name = 'Mediterrânea 2000 kcal' LIMIT 1)
INSERT INTO diet_template_meals (template_id, meal_name, time_suggestion, order_index)
SELECT t.id, m.meal_name, m.time_suggestion, m.order_index FROM t, (VALUES
  ('Café da manhã',   '07:00 – 08:00', 0),
  ('Almoço',          '12:00 – 13:00', 1),
  ('Lanche da tarde', '15:30 – 16:00', 2),
  ('Jantar',          '19:00 – 20:00', 3)
) AS m(meal_name, time_suggestion, order_index)
ON CONFLICT DO NOTHING;
