-- Epic 10: Módulo Avançado de Exames Laboratoriais com Alvos Terapêuticos Nutricionais
-- Seguro para rodar múltiplas vezes (IF NOT EXISTS em todas as operações).

-- ─── 1. Catálogo de exames ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams_catalog (
  id                BIGSERIAL    PRIMARY KEY,
  name              TEXT         NOT NULL,
  group_category    TEXT         NOT NULL DEFAULT 'Outros',
  unit              TEXT,
  ref_min           NUMERIC(10,3),
  ref_max           NUMERIC(10,3),
  target_male_min   NUMERIC(10,3),
  target_male_max   NUMERIC(10,3),
  target_female_min NUMERIC(10,3),
  target_female_max NUMERIC(10,3),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─── 2. Protocolos de solicitação ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_protocols (
  id          BIGSERIAL   PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. Pivô protocolo ↔ exame ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS protocol_exams (
  id          BIGSERIAL PRIMARY KEY,
  protocol_id BIGINT    NOT NULL REFERENCES exam_protocols(id) ON DELETE CASCADE,
  exam_id     BIGINT    NOT NULL REFERENCES exams_catalog(id)  ON DELETE CASCADE,
  sort_order  SMALLINT  NOT NULL DEFAULT 0,
  UNIQUE (protocol_id, exam_id)
);

-- ─── 4. Pedidos de exame por paciente ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_exam_requests (
  id          BIGSERIAL   PRIMARY KEY,
  patient_id  BIGINT      NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  protocol_id BIGINT               REFERENCES exam_protocols(id) ON DELETE SET NULL,
  status      TEXT        NOT NULL DEFAULT 'Pendente'
                CHECK (status IN ('Pendente', 'Concluído')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Itens do pedido (quais exames foram solicitados)
CREATE TABLE IF NOT EXISTS patient_exam_request_items (
  id         BIGSERIAL PRIMARY KEY,
  request_id BIGINT    NOT NULL REFERENCES patient_exam_requests(id) ON DELETE CASCADE,
  exam_id    BIGINT    NOT NULL REFERENCES exams_catalog(id)         ON DELETE CASCADE,
  UNIQUE (request_id, exam_id)
);

-- ─── 5. Resultados dos laudos ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_exam_results (
  id             BIGSERIAL    PRIMARY KEY,
  request_id     BIGINT       NOT NULL REFERENCES patient_exam_requests(id) ON DELETE CASCADE,
  exam_id        BIGINT       NOT NULL REFERENCES exams_catalog(id)         ON DELETE CASCADE,
  result_value   NUMERIC(12,4),
  date_collected DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (request_id, exam_id)
);

-- ─── RLS ────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE exams_catalog              ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_protocols             ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_exams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_exam_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_exam_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_exam_results       ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='exams_catalog' AND policyname='anon_all_exams_catalog') THEN
    CREATE POLICY "anon_all_exams_catalog" ON exams_catalog FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='exams_catalog' AND policyname='auth_all_exams_catalog') THEN
    CREATE POLICY "auth_all_exams_catalog" ON exams_catalog FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='exam_protocols' AND policyname='anon_all_exam_protocols') THEN
    CREATE POLICY "anon_all_exam_protocols" ON exam_protocols FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='exam_protocols' AND policyname='auth_all_exam_protocols') THEN
    CREATE POLICY "auth_all_exam_protocols" ON exam_protocols FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='protocol_exams' AND policyname='anon_all_protocol_exams') THEN
    CREATE POLICY "anon_all_protocol_exams" ON protocol_exams FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='protocol_exams' AND policyname='auth_all_protocol_exams') THEN
    CREATE POLICY "auth_all_protocol_exams" ON protocol_exams FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patient_exam_requests' AND policyname='anon_all_patient_exam_requests') THEN
    CREATE POLICY "anon_all_patient_exam_requests" ON patient_exam_requests FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patient_exam_requests' AND policyname='auth_all_patient_exam_requests') THEN
    CREATE POLICY "auth_all_patient_exam_requests" ON patient_exam_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patient_exam_request_items' AND policyname='anon_all_patient_exam_request_items') THEN
    CREATE POLICY "anon_all_patient_exam_request_items" ON patient_exam_request_items FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patient_exam_request_items' AND policyname='auth_all_patient_exam_request_items') THEN
    CREATE POLICY "auth_all_patient_exam_request_items" ON patient_exam_request_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patient_exam_results' AND policyname='anon_all_patient_exam_results') THEN
    CREATE POLICY "anon_all_patient_exam_results" ON patient_exam_results FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patient_exam_results' AND policyname='auth_all_patient_exam_results') THEN
    CREATE POLICY "auth_all_patient_exam_results" ON patient_exam_results FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── SEED: Catálogo de Exames com Alvos Terapêuticos Nutricionais ──────────────────────────────────
-- Valores baseados nas diretrizes SBD, SBC, SBEM, SBPC/ML e medicina funcional integrativa.
-- target_*: alvos terapêuticos mais restritos que os valores de referência laboratorial.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM exams_catalog LIMIT 1) THEN
    INSERT INTO exams_catalog (name, group_category, unit, ref_min, ref_max, target_male_min, target_male_max, target_female_min, target_female_max) VALUES
    -- ── Glicídios ────────────────────────────────────────────────────────────────────────────
    ('Glicemia de Jejum',              'Glicídios',           'mg/dL',    70,    99,    70,    90,    70,    90),
    ('Hemoglobina Glicada (HbA1c)',    'Glicídios',           '%',        NULL,  5.7,   NULL,  5.4,   NULL,  5.4),
    ('Insulina de Jejum',              'Glicídios',           'µUI/mL',   2,     25,    2,     10,    2,     10),
    ('HOMA-IR',                        'Glicídios',           '',         NULL,  2.7,   NULL,  1.5,   NULL,  1.5),
    ('Peptídeo C',                     'Glicídios',           'ng/mL',    0.8,   3.1,   0.8,   2.0,   0.8,   2.0),
    -- ── Lipídios ───────────────────────────────────────────────────────────────────────────
    ('Colesterol Total',               'Lipídios',            'mg/dL',    NULL,  200,   NULL,  180,   NULL,  180),
    ('HDL-Colesterol',                 'Lipídios',            'mg/dL',    40,    NULL,  55,    NULL,  65,    NULL),
    ('LDL-Colesterol',                 'Lipídios',            'mg/dL',    NULL,  130,   NULL,  100,   NULL,  100),
    ('VLDL',                           'Lipídios',            'mg/dL',    NULL,  30,    NULL,  20,    NULL,  20),
    ('Triglicerídeos',                 'Lipídios',            'mg/dL',    NULL,  150,   NULL,  100,   NULL,  100),
    ('Lp(a)',                          'Lipídios',            'mg/dL',    NULL,  30,    NULL,  20,    NULL,  20),
    ('ApoB',                           'Lipídios',            'mg/dL',    NULL,  100,   NULL,  80,    NULL,  80),
    -- ── Função Hepática ────────────────────────────────────────────────────────────────────────
    ('TGO (AST)',                      'Função Hepática',     'U/L',      NULL,  40,    NULL,  30,    NULL,  25),
    ('TGP (ALT)',                      'Função Hepática',     'U/L',      NULL,  41,    NULL,  25,    NULL,  20),
    ('Gama-GT',                        'Função Hepática',     'U/L',      NULL,  61,    NULL,  30,    NULL,  24),
    ('Fosfatase Alcalina',             'Função Hepática',     'U/L',      44,    147,   44,    100,   44,    100),
    ('Bilirrubina Total',              'Função Hepática',     'mg/dL',    NULL,  1.2,   NULL,  1.0,   NULL,  1.0),
    -- ── Função Renal ──────────────────────────────────────────────────────────────────────────
    ('Creatinina',                     'Função Renal',        'mg/dL',    0.5,   1.2,   0.7,   1.1,   0.5,   0.9),
    ('Ureia',                          'Função Renal',        'mg/dL',    15,    45,    15,    40,    15,    40),
    ('Ácido Úrico',                    'Função Renal',        'mg/dL',    2.4,   7.0,   2.4,   5.5,   2.4,   5.0),
    ('TFG Estimada (CKD-EPI)',         'Função Renal',        'mL/min',   60,    NULL,  90,    NULL,  90,    NULL),
    -- ── Hematologia ───────────────────────────────────────────────────────────────────────────
    ('Hemoglobina',                    'Hematologia',         'g/dL',     12,    17.5,  13.5,  17.5,  12,    16),
    ('Hematócrito',                    'Hematologia',         '%',        36,    52,    40,    52,    36,    48),
    ('VCM',                            'Hematologia',         'fL',       80,    100,   82,    97,    82,    97),
    ('Leucócitos',                     'Hematologia',         '/µL',      4000,  11000, 4500,  8000,  4500,  8000),
    ('Plaquetas',                      'Hematologia',         'mil/µL',   150,   400,   150,   350,   150,   350),
    ('Ferritina',                      'Hematologia',         'ng/mL',    12,    300,   100,   300,   50,    150),
    ('Ferro Sérico',                   'Hematologia',         'µg/dL',    59,    158,   80,    150,   59,    140),
    ('Transferrina',                   'Hematologia',         'mg/dL',    200,   360,   200,   300,   200,   360),
    ('Saturação de Transferrina',      'Hematologia',         '%',        20,    50,    25,    45,    20,    40),
    -- ── Tireoide ─────────────────────────────────────────────────────────────────────────────
    ('TSH',                            'Tireoide',            'µUI/mL',   0.4,   4.0,   0.5,   2.5,   0.5,   2.0),
    ('T4 Livre',                       'Tireoide',            'ng/dL',    0.8,   1.9,   1.0,   1.7,   1.0,   1.7),
    ('T3 Livre',                       'Tireoide',            'pg/mL',    2.3,   4.2,   2.5,   4.0,   2.5,   4.0),
    ('T3 Total',                       'Tireoide',            'ng/dL',    80,    200,   100,   180,   100,   180),
    ('Anti-TPO',                       'Tireoide',            'UI/mL',    NULL,  34,    NULL,  10,    NULL,  10),
    -- ── Vitaminas e Minerais ─────────────────────────────────────────────────────────────────────
    ('Vitamina D (25-OH)',             'Vitaminas e Minerais','ng/mL',    20,    100,   40,    80,    40,    80),
    ('Vitamina B12',                   'Vitaminas e Minerais','pg/mL',    200,   900,   500,   900,   500,   900),
    ('Vitamina B9 (Ácido Fólico)',     'Vitaminas e Minerais','ng/mL',    3,     17,    6,     17,    6,     17),
    ('Zinco',                          'Vitaminas e Minerais','µg/dL',    70,    120,   80,    120,   70,    110),
    ('Magnésio',                       'Vitaminas e Minerais','mg/dL',    1.6,   2.6,   1.9,   2.6,   1.9,   2.5),
    ('Cobre',                          'Vitaminas e Minerais','µg/dL',    70,    140,   70,    130,   80,    140),
    ('Selênio',                        'Vitaminas e Minerais','µg/L',     60,    120,   70,    120,   70,    120),
    -- ── Inflamação ─────────────────────────────────────────────────────────────────────────────
    ('PCR Ultrassensível',             'Inflamação',          'mg/L',     NULL,  5.0,   NULL,  1.0,   NULL,  1.0),
    ('Homocisteína',                   'Inflamação',          'µmol/L',   NULL,  15,    NULL,  10,    NULL,  10),
    ('VHS',                            'Inflamação',          'mm/h',     NULL,  20,    NULL,  10,    NULL,  15),
    -- ── Hormônios ────────────────────────────────────────────────────────────────────────────
    ('Cortisol (Manhã)',               'Hormônios',           'µg/dL',    5,     25,    10,    20,    10,    20),
    ('DHEA-S',                         'Hormônios',           'µg/dL',    80,    560,   150,   400,   45,    270),
    ('Testosterona Total',             'Hormônios',           'ng/dL',    190,   830,   400,   800,   NULL,  NULL),
    ('Testosterona Livre',             'Hormônios',           'pg/mL',    5,     21,    10,    21,    NULL,  NULL),
    ('Estradiol',                      'Hormônios',           'pg/mL',    NULL,  NULL,  NULL,  NULL,  30,    200),
    ('Progesterona',                   'Hormônios',           'ng/mL',    NULL,  NULL,  NULL,  NULL,  2,     25),
    ('LH',                             'Hormônios',           'mUI/mL',   NULL,  NULL,  NULL,  NULL,  2,     15),
    ('FSH',                            'Hormônios',           'mUI/mL',   NULL,  NULL,  NULL,  NULL,  2,     12),
    ('Prolactina',                     'Hormônios',           'ng/mL',    NULL,  20,    NULL,  10,    NULL,  20),
    ('IGF-1',                          'Hormônios',           'ng/mL',    100,   300,   150,   250,   100,   230),
    -- ── Proteínas ────────────────────────────────────────────────────────────────────────────
    ('Proteínas Totais',               'Proteínas',           'g/dL',     6.0,   8.5,   6.5,   8.0,   6.5,   8.0),
    ('Albumina',                       'Proteínas',           'g/dL',     3.5,   5.2,   4.0,   5.0,   4.0,   5.0),
    -- ── Eletrólitos ───────────────────────────────────────────────────────────────────────────
    ('Sódio',                          'Eletrólitos',         'mEq/L',    136,   145,   138,   142,   138,   142),
    ('Potássio',                       'Eletrólitos',         'mEq/L',    3.5,   5.0,   3.8,   4.8,   3.8,   4.8),
    ('Cálcio Total',                   'Eletrólitos',         'mg/dL',    8.5,   10.5,  9.0,   10.2,  9.0,   10.2),
    ('Fósforo',                        'Eletrólitos',         'mg/dL',    2.5,   4.5,   2.7,   4.0,   2.7,   4.0),
    ('Cloro',                          'Eletrólitos',         'mEq/L',    98,    107,   100,   106,   100,   106);
  END IF;
END $$;

-- ─── SEED: Protocolos com seus exames ──────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  p1 BIGINT; p2 BIGINT; p3 BIGINT; p4 BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM exam_protocols LIMIT 1) THEN

    INSERT INTO exam_protocols (name, description) VALUES
      ('Checkup Básico', 'Avaliação geral de saúde metabólica e hematológica')
    RETURNING id INTO p1;

    INSERT INTO exam_protocols (name, description) VALUES
      ('Checkup Emagrecimento', 'Painel focado em metabolismo e resistência à insulina para perda de peso')
    RETURNING id INTO p2;

    INSERT INTO exam_protocols (name, description) VALUES
      ('Checkup Hipertrofia', 'Painel hormonal e nutricional para ganho de massa muscular')
    RETURNING id INTO p3;

    INSERT INTO exam_protocols (name, description) VALUES
      ('Checkup Tireoidiano', 'Avaliação completa da função tireoidiana com marcadores nutricionais')
    RETURNING id INTO p4;

    -- Checkup Básico
    INSERT INTO protocol_exams (protocol_id, exam_id, sort_order)
    SELECT p1, id, ROW_NUMBER() OVER (ORDER BY id) - 1
    FROM exams_catalog WHERE name IN (
      'Glicemia de Jejum','Hemoglobina Glicada (HbA1c)','Insulina de Jejum',
      'Colesterol Total','HDL-Colesterol','LDL-Colesterol','Triglicerídeos',
      'TGO (AST)','TGP (ALT)','Gama-GT',
      'Creatinina','Ureia','Ácido Úrico',
      'Hemoglobina','Leucócitos','Plaquetas','Ferritina',
      'TSH','T4 Livre',
      'Vitamina D (25-OH)','Vitamina B12',
      'PCR Ultrassensível'
    );

    -- Checkup Emagrecimento
    INSERT INTO protocol_exams (protocol_id, exam_id, sort_order)
    SELECT p2, id, ROW_NUMBER() OVER (ORDER BY id) - 1
    FROM exams_catalog WHERE name IN (
      'Glicemia de Jejum','Hemoglobina Glicada (HbA1c)','Insulina de Jejum','HOMA-IR',
      'Colesterol Total','HDL-Colesterol','LDL-Colesterol','Triglicerídeos','VLDL',
      'TSH','T4 Livre','T3 Livre',
      'Vitamina D (25-OH)','Vitamina B12','Magnésio','Zinco',
      'PCR Ultrassensível','Homocisteína',
      'Ferritina','Cortisol (Manhã)','DHEA-S',
      'TGO (AST)','TGP (ALT)'
    );

    -- Checkup Hipertrofia
    INSERT INTO protocol_exams (protocol_id, exam_id, sort_order)
    SELECT p3, id, ROW_NUMBER() OVER (ORDER BY id) - 1
    FROM exams_catalog WHERE name IN (
      'Testosterona Total','Testosterona Livre','DHEA-S','Cortisol (Manhã)',
      'IGF-1','LH','FSH','Prolactina',
      'Glicemia de Jejum','Insulina de Jejum','HOMA-IR',
      'Hemoglobina','Ferritina','Ferro Sérico',
      'Vitamina D (25-OH)','Vitamina B12','Zinco','Magnésio',
      'PCR Ultrassensível','Albumina',
      'TGO (AST)','TGP (ALT)','Creatinina'
    );

    -- Checkup Tireoidiano
    INSERT INTO protocol_exams (protocol_id, exam_id, sort_order)
    SELECT p4, id, ROW_NUMBER() OVER (ORDER BY id) - 1
    FROM exams_catalog WHERE name IN (
      'TSH','T4 Livre','T3 Livre','T3 Total','Anti-TPO',
      'Ferritina','Zinco','Selênio','Magnésio',
      'Vitamina D (25-OH)','Vitamina B12',
      'PCR Ultrassensível','Homocisteína'
    );

  END IF;
END $$;
