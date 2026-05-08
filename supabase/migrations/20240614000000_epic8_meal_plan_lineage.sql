-- ─── Epic 8: Linhagem do Plano Alimentar ────────────────────────────────────
-- Vincula cada meal_plan à avaliação física e ao GET que embasaram o planejamento.
-- Isso garante rastreabilidade: o nutricionista saberá com qual peso/composição
-- corporal cada plano foi calculado, mesmo após futuras reavaliações.

ALTER TABLE meal_plans
  ADD COLUMN IF NOT EXISTS measurement_id BIGINT REFERENCES measurements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS get_kcal       NUMERIC(7,1);

COMMENT ON COLUMN meal_plans.measurement_id IS
  'Avaliação física (measurements) usada como base para cálculo do GET deste plano.';

COMMENT ON COLUMN meal_plans.get_kcal IS
  'Gasto Energético Total (GET) em kcal/dia calculado no momento da criação do plano.';
