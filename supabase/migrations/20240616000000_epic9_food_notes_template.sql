-- ─── Epic 9: Flexibilização do Motor de Alimentos ────────────────────────────
--
-- meal_foods já possui: food_name (free-text), unit, notes, household_measure,
-- measure_amount, food_group.  Nenhuma alteração necessária nessa tabela.
--
-- diet_template_foods ainda não tem notas por alimento → adicionar.

ALTER TABLE diet_template_foods
  ADD COLUMN IF NOT EXISTS notes TEXT;
