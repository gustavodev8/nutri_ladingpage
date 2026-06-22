-- ================================================================
-- Patient reports as dated clinical documents
-- Each row is a separate report/version for the same patient.
-- ================================================================

CREATE TABLE IF NOT EXISTS patient_reports (
  id          BIGSERIAL PRIMARY KEY,
  patient_id  BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  report_text TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE patient_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_reports' AND policyname = 'anon_all_patient_reports') THEN
    CREATE POLICY "anon_all_patient_reports" ON patient_reports FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_reports' AND policyname = 'auth_all_patient_reports') THEN
    CREATE POLICY "auth_all_patient_reports" ON patient_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
