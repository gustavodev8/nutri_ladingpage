-- 1. Prevent duplicate payment processing (race condition protection)
ALTER TABLE payment_logs ADD COLUMN IF NOT EXISTS customer_cpf_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_logs_payment_id_unique
  ON payment_logs (payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_logs_cpf_hash
  ON payment_logs (customer_cpf_hash)
  WHERE customer_cpf_hash IS NOT NULL;

-- 2. Tighten RLS: restrict sensitive clinic data to authenticated users only
-- Public tables (bookings, payment_logs) keep anon access for the booking form.
-- Clinic records (patients, anamnesis, measurements, etc.) are admin-only.

-- patients
DROP POLICY IF EXISTS "anon_all_patients" ON patients;
CREATE POLICY "authenticated_all_patients" ON patients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- patient_photos
DROP POLICY IF EXISTS "anon_all_patient_photos" ON patient_photos;
CREATE POLICY "authenticated_all_patient_photos" ON patient_photos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- anamnesis
DROP POLICY IF EXISTS "anon_all_anamnesis" ON anamnesis;
CREATE POLICY "authenticated_all_anamnesis" ON anamnesis
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- measurements
DROP POLICY IF EXISTS "anon_all_measurements" ON measurements;
CREATE POLICY "authenticated_all_measurements" ON measurements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- meal_plans
DROP POLICY IF EXISTS "anon_all_meal_plans" ON meal_plans;
CREATE POLICY "authenticated_all_meal_plans" ON meal_plans
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- meals
DROP POLICY IF EXISTS "anon_all_meals" ON meals;
CREATE POLICY "authenticated_all_meals" ON meals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- meal_foods
DROP POLICY IF EXISTS "anon_all_meal_foods" ON meal_foods;
CREATE POLICY "authenticated_all_meal_foods" ON meal_foods
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- consultation_records (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'consultation_records') THEN
    DROP POLICY IF EXISTS "anon_all_consultation_records" ON consultation_records;
    EXECUTE 'CREATE POLICY "authenticated_all_consultation_records" ON consultation_records
      FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;
