-- Adiciona food_group em diet_template_foods (coluna já existe em meal_foods desde Epic 7)
ALTER TABLE diet_template_foods
  ADD COLUMN IF NOT EXISTS food_group TEXT;
