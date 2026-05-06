-- Epic 4: Adiciona colunas de estratégia dietética ao meal_plans
ALTER TABLE meal_plans
  ADD COLUMN IF NOT EXISTS strategy_type    TEXT,        -- 'deficit' | 'maintenance' | 'surplus'
  ADD COLUMN IF NOT EXISTS target_calories  NUMERIC,     -- kcal/dia alvo
  ADD COLUMN IF NOT EXISTS target_protein_g NUMERIC,     -- g/dia proteína
  ADD COLUMN IF NOT EXISTS target_carbs_g   NUMERIC,     -- g/dia carboidrato
  ADD COLUMN IF NOT EXISTS target_fat_g     NUMERIC;     -- g/dia gordura
