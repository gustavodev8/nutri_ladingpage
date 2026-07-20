-- Unifica a solicitação de exames com a Biblioteca Clínica global sem perder histórico.
-- Também expande o catálogo e preenche protocolos prontos com itens utilizáveis.

ALTER TABLE patient_exam_requests
  ADD COLUMN IF NOT EXISTS global_protocol_id BIGINT,
  ADD COLUMN IF NOT EXISTS status_key TEXT NOT NULL DEFAULT 'pending'
    CHECK (status_key IN ('pending', 'completed'));

ALTER TABLE patient_exam_request_items
  ALTER COLUMN exam_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS global_exam_id BIGINT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS exam_name TEXT,
  ADD COLUMN IF NOT EXISTS group_category TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS ref_min NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS ref_max NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS target_male_min NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS target_male_max NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS target_female_min NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS target_female_max NUMERIC(10,3);

ALTER TABLE patient_exam_results
  ALTER COLUMN exam_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS global_exam_id BIGINT;

ALTER TABLE global_protocol_items
  ADD COLUMN IF NOT EXISTS sort_order SMALLINT NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_exam_requests_global_protocol_id_fkey') THEN
    ALTER TABLE patient_exam_requests
      ADD CONSTRAINT patient_exam_requests_global_protocol_id_fkey
      FOREIGN KEY (global_protocol_id) REFERENCES global_exam_protocols(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_exam_request_items_global_exam_id_fkey') THEN
    ALTER TABLE patient_exam_request_items
      ADD CONSTRAINT patient_exam_request_items_global_exam_id_fkey
      FOREIGN KEY (global_exam_id) REFERENCES global_exams_catalog(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_exam_results_global_exam_id_fkey') THEN
    ALTER TABLE patient_exam_results
      ADD CONSTRAINT patient_exam_results_global_exam_id_fkey
      FOREIGN KEY (global_exam_id) REFERENCES global_exams_catalog(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_exam_request_items_request_global_exam_unique') THEN
    ALTER TABLE patient_exam_request_items
      ADD CONSTRAINT patient_exam_request_items_request_global_exam_unique
      UNIQUE (request_id, global_exam_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_exam_results_request_global_exam_unique') THEN
    ALTER TABLE patient_exam_results
      ADD CONSTRAINT patient_exam_results_request_global_exam_unique
      UNIQUE (request_id, global_exam_id);
  END IF;
END $$;

WITH expanded_exams(name, category, clinical_axis, unit, lab_ref_min, lab_ref_max, target_male_min, target_male_max, target_female_min, target_female_max, clinical_observation) AS (
  VALUES
    ('Hemograma Completo', 'Hematológico', 'Triagem geral / Anemia', null, null, null, null, null, null, null, 'Painel hematológico base para triagem clínica.'),
    ('Leucócitos Totais', 'Hematológico', 'Imunidade', '/mm³', 4000, 11000, 4500, 9000, 4500, 9000, 'Avaliar infecção, inflamação e imunidade.'),
    ('Plaquetas', 'Hematológico', 'Coagulação / Inflamação', '/mm³', 150000, 450000, 180000, 350000, 180000, 350000, 'Útil em triagem inflamatória e hematológica.'),
    ('VCM', 'Hematológico', 'Anemia / B12 / Folato', 'fL', 80, 100, 86, 94, 86, 94, 'Ajuda a diferenciar padrões de anemia e deficiência de B12/folato.'),
    ('HCM', 'Hematológico', 'Anemia', 'pg', 27, 33, 29, 32, 29, 32, 'Marcador complementar do hemograma.'),
    ('CHCM', 'Hematológico', 'Anemia', 'g/dL', 32, 36, 33, 35, 33, 35, 'Marcador complementar do hemograma.'),
    ('RDW', 'Hematológico', 'Anemia / Deficiências', '%', 11.5, 14.5, 11.5, 13.5, 11.5, 13.5, 'Pode subir em deficiências nutricionais.'),
    ('Transferrina', 'Hematológico', 'Metabolismo do ferro', 'mg/dL', 200, 360, 220, 330, 220, 330, 'Complementa ferritina, ferro sérico e saturação.'),
    ('Saturação de Transferrina', 'Hematológico', 'Metabolismo do ferro', '%', 20, 50, 25, 45, 25, 45, 'Avalia disponibilidade de ferro.'),
    ('TIBC / Capacidade Total de Ligação do Ferro', 'Hematológico', 'Metabolismo do ferro', 'µg/dL', 250, 450, 280, 400, 280, 400, 'Complementar em investigação de anemia.'),

    ('Creatinina', 'Renal', 'Função renal', 'mg/dL', 0.6, 1.3, 0.7, 1.1, 0.6, 1.0, 'Interpretar com massa muscular e eTFG.'),
    ('Ureia', 'Renal', 'Função renal / Proteína', 'mg/dL', 10, 50, 20, 40, 20, 40, 'Sobe com maior ingestão proteica, desidratação ou alteração renal.'),
    ('eTFG / Ritmo de Filtração Glomerular', 'Renal', 'Função renal', 'mL/min/1.73m²', 60, null, 90, null, 90, null, 'Avaliação funcional renal.'),
    ('Sódio', 'Renal', 'Eletrólitos', 'mmol/L', 135, 145, 138, 142, 138, 142, 'Eletrólito essencial.'),
    ('Potássio', 'Renal', 'Eletrólitos', 'mmol/L', 3.5, 5.1, 4.0, 4.7, 4.0, 4.7, 'Avaliar risco cardiometabólico e equilíbrio eletrolítico.'),
    ('Cloro', 'Renal', 'Eletrólitos', 'mmol/L', 98, 107, 100, 106, 100, 106, 'Complementar aos eletrólitos.'),
    ('Cálcio Total', 'Nutricional', 'Minerais / Ossos', 'mg/dL', 8.5, 10.5, 9.0, 10.0, 9.0, 10.0, 'Interpretar com albumina e vitamina D.'),
    ('Cálcio Ionizado', 'Nutricional', 'Minerais / Ossos', 'mmol/L', 1.12, 1.32, 1.16, 1.28, 1.16, 1.28, 'Melhor fração biologicamente ativa do cálcio.'),
    ('Fósforo', 'Nutricional', 'Minerais', 'mg/dL', 2.5, 4.5, 3.0, 4.2, 3.0, 4.2, 'Avaliação mineral e renal.'),
    ('Magnésio Eritrocitário', 'Nutricional', 'Magnésio intracelular', 'mg/dL', 4.2, 6.8, 5.0, 6.5, 5.0, 6.5, 'Melhor marcador que magnésio sérico para reservas.'),

    ('AST / TGO', 'Hepático', 'Função hepática / Muscular', 'U/L', 5, 40, 10, 30, 10, 28, 'Pode subir por treino intenso, álcool, esteatose ou lesão hepática.'),
    ('ALT / TGP', 'Hepático', 'Função hepática', 'U/L', 5, 45, 10, 30, 8, 25, 'Marcador sensível para esteatose e inflamação hepática.'),
    ('Gama GT', 'Hepático', 'Fígado / Álcool / Inflamação', 'U/L', 5, 55, 10, 35, 8, 25, 'Útil para metabolismo hepático e estresse oxidativo.'),
    ('Fosfatase Alcalina', 'Hepático', 'Fígado / Ossos', 'U/L', 40, 130, 50, 100, 45, 95, 'Interpretar com GGT, vitamina D e metabolismo ósseo.'),
    ('Bilirrubina Total', 'Hepático', 'Função hepática', 'mg/dL', 0.2, 1.2, 0.3, 1.0, 0.3, 1.0, 'Marcador hepático e biliar.'),
    ('Bilirrubina Direta', 'Hepático', 'Função hepática', 'mg/dL', 0, 0.3, 0, 0.25, 0, 0.25, 'Complementar à bilirrubina total.'),
    ('Albumina', 'Hepático', 'Proteína / Fígado', 'g/dL', 3.5, 5.2, 4.2, 5.0, 4.2, 5.0, 'Marcador nutricional e hepático.'),
    ('Proteínas Totais', 'Hepático', 'Proteínas séricas', 'g/dL', 6.0, 8.3, 6.8, 7.8, 6.8, 7.8, 'Complementa albumina e globulinas.'),

    ('Colesterol Total', 'Lipídico', 'Risco cardiovascular', 'mg/dL', null, 190, null, 180, null, 180, 'Interpretar com frações e contexto metabólico.'),
    ('LDL-c', 'Lipídico', 'Risco cardiovascular', 'mg/dL', null, 130, null, 100, null, 100, 'Alvo varia por risco cardiovascular.'),
    ('HDL-c', 'Lipídico', 'Risco cardiovascular', 'mg/dL', 40, null, 50, null, 60, null, 'Marcador protetor, interpretar com TG e hábitos.'),
    ('Triglicerídeos', 'Lipídico', 'Resistência insulínica', 'mg/dL', null, 150, null, 100, null, 90, 'Marcador prático de resistência insulínica.'),
    ('Apolipoproteína B', 'Lipídico', 'Partículas aterogênicas', 'mg/dL', null, 110, null, 80, null, 80, 'Melhor marcador de partículas aterogênicas que LDL isolado.'),
    ('Lipoproteína(a)', 'Lipídico', 'Risco cardiovascular genético', 'mg/dL', null, 30, null, 30, null, 30, 'Avaliar ao menos uma vez na vida.'),

    ('PCR Ultrassensível', 'Inflamatório', 'Inflamação sistêmica', 'mg/L', null, 3, null, 1, null, 1, 'Marcador inflamatório e cardiovascular.'),
    ('VHS', 'Inflamatório', 'Inflamação', 'mm/h', null, 20, null, 15, null, 15, 'Marcador inflamatório inespecífico.'),
    ('Fibrinogênio', 'Inflamatório', 'Coagulação / Inflamação', 'mg/dL', 200, 400, 220, 350, 220, 350, 'Associado a inflamação e risco cardiovascular.'),

    ('Cortisol Matinal', 'Hormonal', 'Eixo adrenal', 'µg/dL', 5, 25, 10, 18, 10, 18, 'Interpretar com horário da coleta e sintomas.'),
    ('DHEA-S', 'Hormonal', 'Adrenal / Andrógenos', 'µg/dL', null, null, null, null, null, null, 'Interpretar por idade e sexo.'),
    ('Testosterona Total', 'Hormonal', 'Andrógenos', 'ng/dL', null, null, 500, 900, 20, 60, 'Interpretar com SHBG e testosterona livre.'),
    ('Testosterona Livre', 'Hormonal', 'Andrógenos livres', 'pg/mL', null, null, null, null, null, null, 'Interpretar conforme método do laboratório.'),
    ('SHBG', 'Hormonal', 'Hormônios sexuais', 'nmol/L', null, null, 20, 60, 40, 120, 'Altera fração livre dos hormônios sexuais.'),
    ('Estradiol', 'Hormonal', 'Hormônios sexuais', 'pg/mL', null, null, null, null, null, null, 'Interpretar por fase do ciclo ou menopausa.'),
    ('Progesterona', 'Hormonal', 'Hormônios sexuais', 'ng/mL', null, null, null, null, null, null, 'Interpretar por fase lútea.'),
    ('LH', 'Hormonal', 'Eixo gonadal', 'mUI/mL', null, null, null, null, null, null, 'Interpretar por sexo/fase do ciclo.'),
    ('FSH', 'Hormonal', 'Eixo gonadal', 'mUI/mL', null, null, null, null, null, null, 'Interpretar por sexo/fase do ciclo.'),
    ('Prolactina', 'Hormonal', 'Eixo hormonal', 'ng/mL', null, null, null, 20, null, 25, 'Pode alterar libido, ciclo e composição corporal.'),
    ('T3 Reverso', 'Hormonal', 'Tireoide periférica', 'ng/dL', 10, 24, 10, 18, 10, 18, 'Útil em suspeita de baixa conversão periférica.'),
    ('Anti-Tg', 'Hormonal', 'Autoimunidade tireoidiana', 'UI/mL', null, 40, null, 40, null, 40, 'Complementa anti-TPO.'),

    ('Vitamina A / Retinol', 'Nutricional', 'Vitaminas lipossolúveis', 'µg/dL', 20, 80, 35, 70, 35, 70, 'Avaliar em baixa imunidade, pele e saúde ocular.'),
    ('Vitamina E / Alfa-tocoferol', 'Nutricional', 'Antioxidante', 'mg/L', 5, 20, 10, 18, 10, 18, 'Antioxidante lipossolúvel.'),
    ('Vitamina B6 / PLP', 'Nutricional', 'Metabolismo / Neurotransmissores', 'nmol/L', 20, 125, 50, 110, 50, 110, 'Importante para neurotransmissores e metabolismo proteico.'),
    ('Vitamina C', 'Nutricional', 'Antioxidante / Colágeno', 'mg/dL', 0.4, 2.0, 0.8, 1.8, 0.8, 1.8, 'Marcador de antioxidantes e suporte imune.'),
    ('Cobre', 'Nutricional', 'Minerais / Ferro', 'µg/dL', 70, 140, 80, 120, 85, 130, 'Importante no metabolismo do ferro e zinco.'),
    ('Ceruloplasmina', 'Nutricional', 'Cobre / Inflamação', 'mg/dL', 20, 35, 22, 32, 22, 32, 'Complementa avaliação de cobre.'),
    ('Iodo Urinário', 'Nutricional', 'Tireoide / Iodo', 'µg/L', 100, 299, 120, 250, 120, 250, 'Avaliação de ingestão de iodo populacional/individual.'),

    ('HOMA-B', 'Metabólico', 'Função beta-pancreática', 'índice', null, null, null, null, null, null, 'Interpretar com glicemia e insulina.'),
    ('Frutosamina', 'Metabólico', 'Controle glicêmico curto prazo', 'µmol/L', 205, 285, 210, 260, 210, 260, 'Média glicêmica aproximada de 2 a 3 semanas.'),
    ('Peptídeo Natriurético BNP', 'Cardiovascular', 'Sobrecarga cardíaca', 'pg/mL', null, 100, null, 100, null, 100, 'Triagem cardiovascular quando indicado.'),
    ('CK / Creatinoquinase', 'Metabólico', 'Músculo / Treino', 'U/L', 30, 200, null, null, null, null, 'Sobe com treino intenso e lesão muscular.'),
    ('LDH', 'Metabólico', 'Marcador inespecífico', 'U/L', 120, 250, 130, 220, 130, 220, 'Marcador inespecífico, interpretar contexto.')
)
INSERT INTO global_exams_catalog
  (name, category, clinical_axis, unit, lab_ref_min, lab_ref_max, target_male_min, target_male_max, target_female_min, target_female_max, clinical_observation)
SELECT e.*
FROM expanded_exams e
WHERE NOT EXISTS (
  SELECT 1 FROM global_exams_catalog g WHERE lower(g.name) = lower(e.name)
);

WITH protocol_map(protocol_name, exam_name, sort_order) AS (
  VALUES
    ('Check-up Base', 'Hemograma Completo', 1),
    ('Check-up Base', 'Glicemia de Jejum', 2),
    ('Check-up Base', 'Insulina de Jejum', 3),
    ('Check-up Base', 'HbA1c (Hemoglobina Glicada)', 4),
    ('Check-up Base', 'Ferritina', 5),
    ('Check-up Base', 'Ferro Sérico', 6),
    ('Check-up Base', 'Saturação de Transferrina', 7),
    ('Check-up Base', 'Vitamina D3 (25-OH)', 8),
    ('Check-up Base', 'Vitamina B12 (Cobalamina)', 9),
    ('Check-up Base', 'Folato (Vitamina B9)', 10),
    ('Check-up Base', 'Magnésio Sérico', 11),
    ('Check-up Base', 'Zinco Sérico', 12),
    ('Check-up Base', 'Creatinina', 13),
    ('Check-up Base', 'Ureia', 14),
    ('Check-up Base', 'AST / TGO', 15),
    ('Check-up Base', 'ALT / TGP', 16),
    ('Check-up Base', 'Gama GT', 17),
    ('Check-up Base', 'Colesterol Total', 18),
    ('Check-up Base', 'LDL-c', 19),
    ('Check-up Base', 'HDL-c', 20),
    ('Check-up Base', 'Triglicerídeos', 21),
    ('Check-up Base', 'PCR Ultrassensível', 22),

    ('Check-up Metabólico', 'Glicemia de Jejum', 1),
    ('Check-up Metabólico', 'Insulina de Jejum', 2),
    ('Check-up Metabólico', 'HOMA-IR', 3),
    ('Check-up Metabólico', 'HbA1c (Hemoglobina Glicada)', 4),
    ('Check-up Metabólico', 'Frutosamina', 5),
    ('Check-up Metabólico', 'Peptídeo-C', 6),
    ('Check-up Metabólico', 'Colesterol Total', 7),
    ('Check-up Metabólico', 'LDL-c', 8),
    ('Check-up Metabólico', 'HDL-c', 9),
    ('Check-up Metabólico', 'Triglicerídeos', 10),
    ('Check-up Metabólico', 'Apolipoproteína B', 11),
    ('Check-up Metabólico', 'Lipoproteína(a)', 12),
    ('Check-up Metabólico', 'PCR Ultrassensível', 13),
    ('Check-up Metabólico', 'Ácido Úrico', 14),
    ('Check-up Metabólico', 'Homocisteína', 15),

    ('Check-up Hormonal Feminino', 'TSH', 1),
    ('Check-up Hormonal Feminino', 'T4 Livre (FT4)', 2),
    ('Check-up Hormonal Feminino', 'T3 Livre (FT3)', 3),
    ('Check-up Hormonal Feminino', 'T3 Reverso', 4),
    ('Check-up Hormonal Feminino', 'Anti-TPO', 5),
    ('Check-up Hormonal Feminino', 'Anti-Tg', 6),
    ('Check-up Hormonal Feminino', 'Estradiol', 7),
    ('Check-up Hormonal Feminino', 'Progesterona', 8),
    ('Check-up Hormonal Feminino', 'LH', 9),
    ('Check-up Hormonal Feminino', 'FSH', 10),
    ('Check-up Hormonal Feminino', 'Prolactina', 11),
    ('Check-up Hormonal Feminino', 'SHBG', 12),
    ('Check-up Hormonal Feminino', 'Cortisol Matinal', 13),
    ('Check-up Hormonal Feminino', 'DHEA-S', 14),
    ('Check-up Hormonal Feminino', 'Ferritina', 15),
    ('Check-up Hormonal Feminino', 'Vitamina D3 (25-OH)', 16),
    ('Check-up Hormonal Feminino', 'Vitamina B12 (Cobalamina)', 17),

    ('Check-up Hipertrofia', 'Hemograma Completo', 1),
    ('Check-up Hipertrofia', 'Creatinina', 2),
    ('Check-up Hipertrofia', 'Ureia', 3),
    ('Check-up Hipertrofia', 'eTFG / Ritmo de Filtração Glomerular', 4),
    ('Check-up Hipertrofia', 'AST / TGO', 5),
    ('Check-up Hipertrofia', 'ALT / TGP', 6),
    ('Check-up Hipertrofia', 'Gama GT', 7),
    ('Check-up Hipertrofia', 'CK / Creatinoquinase', 8),
    ('Check-up Hipertrofia', 'Testosterona Total', 9),
    ('Check-up Hipertrofia', 'Testosterona Livre', 10),
    ('Check-up Hipertrofia', 'SHBG', 11),
    ('Check-up Hipertrofia', 'Cortisol Matinal', 12),
    ('Check-up Hipertrofia', 'Ferritina', 13),
    ('Check-up Hipertrofia', 'Vitamina D3 (25-OH)', 14),
    ('Check-up Hipertrofia', 'Magnésio Sérico', 15),
    ('Check-up Hipertrofia', 'Zinco Sérico', 16),

    ('Monitoramento Nutricional', 'Vitamina D3 (25-OH)', 1),
    ('Monitoramento Nutricional', 'Vitamina B12 (Cobalamina)', 2),
    ('Monitoramento Nutricional', 'Folato (Vitamina B9)', 3),
    ('Monitoramento Nutricional', 'Ferritina', 4),
    ('Monitoramento Nutricional', 'Ferro Sérico', 5),
    ('Monitoramento Nutricional', 'Zinco Sérico', 6),
    ('Monitoramento Nutricional', 'Magnésio Sérico', 7),
    ('Monitoramento Nutricional', 'Magnésio Eritrocitário', 8),
    ('Monitoramento Nutricional', 'Selênio', 9),
    ('Monitoramento Nutricional', 'Cobre', 10),
    ('Monitoramento Nutricional', 'Vitamina A / Retinol', 11),
    ('Monitoramento Nutricional', 'Vitamina E / Alfa-tocoferol', 12),
    ('Monitoramento Nutricional', 'Vitamina B6 / PLP', 13),
    ('Monitoramento Nutricional', 'Vitamina C', 14),
    ('Monitoramento Nutricional', 'Iodo Urinário', 15)
),
resolved AS (
  SELECT gp.id AS protocol_id, ge.id AS exam_id, pm.sort_order
  FROM protocol_map pm
  JOIN global_exam_protocols gp ON lower(gp.name) = lower(pm.protocol_name)
  JOIN global_exams_catalog ge ON lower(ge.name) = lower(pm.exam_name)
)
INSERT INTO global_protocol_items (protocol_id, exam_id, sort_order)
SELECT protocol_id, exam_id, sort_order
FROM resolved
ON CONFLICT (protocol_id, exam_id) DO UPDATE
SET sort_order = EXCLUDED.sort_order;

UPDATE patient_exam_requests
SET status_key = CASE
  WHEN status ILIKE 'Conclu%do' THEN 'completed'
  ELSE 'pending'
END
WHERE status_key IS NULL OR status_key = 'pending';

WITH matched_protocols AS (
  SELECT r.id AS request_id, MIN(gp.id) AS global_protocol_id
  FROM patient_exam_requests r
  JOIN exam_protocols p ON p.id = r.protocol_id
  JOIN global_exam_protocols gp ON lower(gp.name) = lower(p.name)
  WHERE r.global_protocol_id IS NULL
  GROUP BY r.id
)
UPDATE patient_exam_requests r
SET global_protocol_id = mp.global_protocol_id
FROM matched_protocols mp
WHERE r.id = mp.request_id;

UPDATE patient_exam_request_items i
SET
  exam_name = COALESCE(i.exam_name, e.name),
  group_category = COALESCE(i.group_category, e.group_category),
  unit = COALESCE(i.unit, e.unit),
  ref_min = COALESCE(i.ref_min, e.ref_min),
  ref_max = COALESCE(i.ref_max, e.ref_max),
  target_male_min = COALESCE(i.target_male_min, e.target_male_min),
  target_male_max = COALESCE(i.target_male_max, e.target_male_max),
  target_female_min = COALESCE(i.target_female_min, e.target_female_min),
  target_female_max = COALESCE(i.target_female_max, e.target_female_max)
FROM exams_catalog e
WHERE i.exam_id = e.id;

WITH matched_items AS (
  SELECT i.id AS item_id, MIN(ge.id) AS global_exam_id
  FROM patient_exam_request_items i
  JOIN exams_catalog e ON e.id = i.exam_id
  JOIN global_exams_catalog ge ON lower(ge.name) = lower(e.name)
  WHERE i.global_exam_id IS NULL
  GROUP BY i.id
)
UPDATE patient_exam_request_items i
SET global_exam_id = mi.global_exam_id
FROM matched_items mi
WHERE i.id = mi.item_id;

UPDATE patient_exam_results r
SET global_exam_id = i.global_exam_id
FROM patient_exam_request_items i
WHERE r.global_exam_id IS NULL
  AND r.request_id = i.request_id
  AND r.exam_id = i.exam_id
  AND i.global_exam_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patient_exam_requests_global_protocol
  ON patient_exam_requests(global_protocol_id);
CREATE INDEX IF NOT EXISTS idx_patient_exam_request_items_global_exam
  ON patient_exam_request_items(global_exam_id);
CREATE INDEX IF NOT EXISTS idx_patient_exam_results_global_exam
  ON patient_exam_results(global_exam_id);
CREATE INDEX IF NOT EXISTS idx_global_protocol_items_sort
  ON global_protocol_items(protocol_id, sort_order);

-- Dados clínicos: remove policies abertas para anon e mantém acesso via sessão autenticada.
DROP POLICY IF EXISTS "anon_all_exams_catalog" ON exams_catalog;
DROP POLICY IF EXISTS "anon_all_exam_protocols" ON exam_protocols;
DROP POLICY IF EXISTS "anon_all_protocol_exams" ON protocol_exams;
DROP POLICY IF EXISTS "anon_all_patient_exam_requests" ON patient_exam_requests;
DROP POLICY IF EXISTS "anon_all_patient_exam_request_items" ON patient_exam_request_items;
DROP POLICY IF EXISTS "anon_all_patient_exam_results" ON patient_exam_results;
DROP POLICY IF EXISTS "all_exam_catalog" ON global_exams_catalog;
DROP POLICY IF EXISTS "all_exam_protocols" ON global_exam_protocols;
DROP POLICY IF EXISTS "all_protocol_items" ON global_protocol_items;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='global_exams_catalog' AND policyname='auth_all_global_exams_catalog') THEN
    CREATE POLICY "auth_all_global_exams_catalog" ON global_exams_catalog FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='global_exam_protocols' AND policyname='auth_all_global_exam_protocols') THEN
    CREATE POLICY "auth_all_global_exam_protocols" ON global_exam_protocols FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='global_protocol_items' AND policyname='auth_all_global_protocol_items') THEN
    CREATE POLICY "auth_all_global_protocol_items" ON global_protocol_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
