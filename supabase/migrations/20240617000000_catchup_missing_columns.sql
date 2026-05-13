-- ─── Catch-up: garante que todas as colunas dos Epics 4, 7, 8 e 9 existam ─────
-- Seguro para rodar múltiplas vezes (IF NOT EXISTS em todos os ALTER TABLE).

-- ── Epic 4: estratégia dietética em meal_plans ─────────────────────────────────
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS strategy_type    TEXT;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS target_calories  NUMERIC;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS target_protein_g NUMERIC;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS target_carbs_g   NUMERIC;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS target_fat_g     NUMERIC;

-- ── Epic 7: medidas caseiras e grupo alimentar em meal_foods ───────────────────
ALTER TABLE meal_foods ADD COLUMN IF NOT EXISTS household_measure TEXT;
ALTER TABLE meal_foods ADD COLUMN IF NOT EXISTS measure_amount    NUMERIC(5,2);
ALTER TABLE meal_foods ADD COLUMN IF NOT EXISTS food_group        TEXT;

-- ── Epic 8: linhagem do plano alimentar ───────────────────────────────────────
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS measurement_id BIGINT REFERENCES measurements(id) ON DELETE SET NULL;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS get_kcal        NUMERIC(7,1);

-- ── Epic 9: notas por alimento em diet_template_foods ─────────────────────────
ALTER TABLE diet_template_foods ADD COLUMN IF NOT EXISTS notes TEXT;

-- ── notas por refeição em diet_template_meals ────────────────────────────────
ALTER TABLE diet_template_meals ADD COLUMN IF NOT EXISTS notes TEXT;
