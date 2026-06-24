-- Banco de refeicoes prontas para importacao no plano alimentar

CREATE TABLE IF NOT EXISTS meal_presets (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  meal_name TEXT NOT NULL,
  time_suggestion TEXT,
  notes TEXT,
  strategy TEXT,
  total_kcal NUMERIC(7,1),
  protein_g NUMERIC(6,1),
  carbs_g NUMERIC(6,1),
  fat_g NUMERIC(6,1),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  source_template_id BIGINT,
  source_template_meal_id BIGINT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meal_presets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'meal_presets' AND policyname = 'anon_all_meal_presets'
  ) THEN
    CREATE POLICY "anon_all_meal_presets"
      ON meal_presets
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'meal_presets' AND policyname = 'auth_all_meal_presets'
  ) THEN
    CREATE POLICY "auth_all_meal_presets"
      ON meal_presets
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meal_presets_name ON meal_presets(name);

CREATE TABLE IF NOT EXISTS meal_preset_foods (
  id BIGSERIAL PRIMARY KEY,
  preset_id BIGINT NOT NULL REFERENCES meal_presets(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  quantity NUMERIC(8,2),
  unit TEXT DEFAULT 'g',
  calories NUMERIC(7,2),
  protein NUMERIC(6,2),
  carbs NUMERIC(6,2),
  fat NUMERIC(6,2),
  notes TEXT,
  sort_order SMALLINT DEFAULT 0 NOT NULL,
  household_measure TEXT,
  measure_amount NUMERIC(5,2),
  food_group TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meal_preset_foods ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'meal_preset_foods' AND policyname = 'anon_all_meal_preset_foods'
  ) THEN
    CREATE POLICY "anon_all_meal_preset_foods"
      ON meal_preset_foods
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'meal_preset_foods' AND policyname = 'auth_all_meal_preset_foods'
  ) THEN
    CREATE POLICY "auth_all_meal_preset_foods"
      ON meal_preset_foods
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meal_preset_foods_preset_id ON meal_preset_foods(preset_id);

WITH preset_source AS (
  SELECT
    dt.id AS source_template_id,
    dtm.id AS source_template_meal_id,
    COALESCE(NULLIF(BTRIM(dt.name), ''), 'Modelo de refeicao') || ' - ' || COALESCE(NULLIF(BTRIM(dtm.meal_name), ''), 'Refeicao') AS name,
    dt.description,
    dtm.meal_name,
    dtm.time_suggestion,
    dtm.notes,
    dt.strategy,
    ROUND(COALESCE(SUM(COALESCE(dff.kcal_per_100g, 0) * COALESCE(dff.quantity, 0) / 100.0), 0)::numeric, 1) AS total_kcal,
    ROUND(COALESCE(SUM(COALESCE(dff.protein_per_100g, 0) * COALESCE(dff.quantity, 0) / 100.0), 0)::numeric, 1) AS protein_g,
    ROUND(COALESCE(SUM(COALESCE(dff.carbs_per_100g, 0) * COALESCE(dff.quantity, 0) / 100.0), 0)::numeric, 1) AS carbs_g,
    ROUND(COALESCE(SUM(COALESCE(dff.fat_per_100g, 0) * COALESCE(dff.quantity, 0) / 100.0), 0)::numeric, 1) AS fat_g
  FROM diet_templates dt
  JOIN diet_template_meals dtm
    ON dtm.template_id = dt.id
   AND dtm.is_substitution_of IS NULL
  LEFT JOIN diet_template_foods dff
    ON dff.template_meal_id = dtm.id
  WHERE COALESCE(dt.is_active, TRUE) = TRUE
  GROUP BY
    dt.id,
    dt.name,
    dt.description,
    dt.strategy,
    dtm.id,
    dtm.meal_name,
    dtm.time_suggestion,
    dtm.notes
),
upserted AS (
  INSERT INTO meal_presets (
    name,
    description,
    meal_name,
    time_suggestion,
    notes,
    strategy,
    total_kcal,
    protein_g,
    carbs_g,
    fat_g,
    is_active,
    source_template_id,
    source_template_meal_id
  )
  SELECT
    name,
    description,
    meal_name,
    time_suggestion,
    notes,
    strategy,
    total_kcal,
    protein_g,
    carbs_g,
    fat_g,
    TRUE,
    source_template_id,
    source_template_meal_id
  FROM preset_source
  ON CONFLICT (source_template_meal_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    meal_name = EXCLUDED.meal_name,
    time_suggestion = EXCLUDED.time_suggestion,
    notes = EXCLUDED.notes,
    strategy = EXCLUDED.strategy,
    total_kcal = EXCLUDED.total_kcal,
    protein_g = EXCLUDED.protein_g,
    carbs_g = EXCLUDED.carbs_g,
    fat_g = EXCLUDED.fat_g,
    is_active = TRUE,
    source_template_id = EXCLUDED.source_template_id
  RETURNING id, source_template_meal_id
),
cleared_foods AS (
  DELETE FROM meal_preset_foods mpf
  USING upserted u
  WHERE mpf.preset_id = u.id
  RETURNING mpf.preset_id
)
INSERT INTO meal_preset_foods (
  preset_id,
  food_name,
  quantity,
  unit,
  calories,
  protein,
  carbs,
  fat,
  notes,
  sort_order,
  household_measure,
  measure_amount,
  food_group
)
SELECT
  u.id,
  dff.food_name,
  dff.quantity,
  COALESCE(dff.unit, 'g'),
  CASE
    WHEN dff.kcal_per_100g IS NULL OR dff.quantity IS NULL THEN NULL
    ELSE ROUND((dff.kcal_per_100g * dff.quantity / 100.0)::numeric, 2)
  END,
  CASE
    WHEN dff.protein_per_100g IS NULL OR dff.quantity IS NULL THEN NULL
    ELSE ROUND((dff.protein_per_100g * dff.quantity / 100.0)::numeric, 2)
  END,
  CASE
    WHEN dff.carbs_per_100g IS NULL OR dff.quantity IS NULL THEN NULL
    ELSE ROUND((dff.carbs_per_100g * dff.quantity / 100.0)::numeric, 2)
  END,
  CASE
    WHEN dff.fat_per_100g IS NULL OR dff.quantity IS NULL THEN NULL
    ELSE ROUND((dff.fat_per_100g * dff.quantity / 100.0)::numeric, 2)
  END,
  dff.notes,
  COALESCE(dff.order_index, 0),
  dff.household_measure,
  dff.measure_amount,
  dff.food_group
FROM upserted u
JOIN diet_template_foods dff
  ON dff.template_meal_id = u.source_template_meal_id
ORDER BY u.id, COALESCE(dff.order_index, 0);
