-- Adiciona suporte a refeições substitutivas em templates de dieta
ALTER TABLE diet_template_meals
  ADD COLUMN IF NOT EXISTS is_substitution_of INTEGER REFERENCES diet_template_meals(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_dtm_substitution_of ON diet_template_meals(is_substitution_of);
