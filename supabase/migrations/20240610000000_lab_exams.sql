-- Tabela de painéis de exames (uma solicitação por data)
CREATE TABLE IF NOT EXISTS lab_exams (
  id          BIGSERIAL PRIMARY KEY,
  patient_id  BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  exam_date   DATE NOT NULL,
  lab_name    TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_exams_patient ON lab_exams(patient_id, exam_date DESC);

-- Tabela de resultados individuais por exame
CREATE TABLE IF NOT EXISTS lab_results (
  id            BIGSERIAL PRIMARY KEY,
  exam_id       BIGINT NOT NULL REFERENCES lab_exams(id) ON DELETE CASCADE,
  exam_name     TEXT NOT NULL,
  value_num     FLOAT,            -- valor numérico (quando aplicável)
  value_text    TEXT,             -- valor textual (ex: "Reagente")
  unit          TEXT,             -- unidade (mg/dL, UI/L, etc.)
  ref_min       FLOAT,            -- referência mínima
  ref_max       FLOAT,            -- referência máxima
  ref_text      TEXT,             -- referência textual (ex: "Não reagente")
  status        TEXT,             -- normal | alto | baixo | critico_alto | critico_baixo
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_results_exam ON lab_results(exam_id);

-- RLS
ALTER TABLE lab_exams   ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_lab_exams"   ON lab_exams;
DROP POLICY IF EXISTS "authenticated_all_lab_results" ON lab_results;

CREATE POLICY "authenticated_all_lab_exams" ON lab_exams
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_lab_results" ON lab_results
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
