-- Epic 11: Módulo de Prescrição Magistral (Manipulados)
-- Seguro para rodar múltiplas vezes (IF NOT EXISTS em todas as operações).

-- ─── 1. Catálogo de substratos ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS substrates (
  id               BIGSERIAL    PRIMARY KEY,
  name             TEXT         NOT NULL,
  category         TEXT         NOT NULL DEFAULT 'Outros',
  min_dose         NUMERIC(10,3),
  ideal_dose       NUMERIC(10,3),
  max_dose         NUMERIC(10,3),
  unit             TEXT         NOT NULL DEFAULT 'mg',
  purpose          TEXT,
  interactions     TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─── 2. Fórmulas prontas (templates) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ready_formulas (
  id                  BIGSERIAL   PRIMARY KEY,
  name                TEXT        NOT NULL,
  objective           TEXT        NOT NULL DEFAULT 'Geral',
  posology            TEXT,
  pharmaceutical_form TEXT        NOT NULL DEFAULT 'Cápsulas',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. Itens da fórmula pronta ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS formula_items (
  id           BIGSERIAL PRIMARY KEY,
  formula_id   BIGINT    NOT NULL REFERENCES ready_formulas(id) ON DELETE CASCADE,
  substrate_id BIGINT    NOT NULL REFERENCES substrates(id)     ON DELETE CASCADE,
  applied_dose NUMERIC(10,3) NOT NULL,
  unit         TEXT      NOT NULL DEFAULT 'mg',
  sort_order   SMALLINT  NOT NULL DEFAULT 0,
  UNIQUE (formula_id, substrate_id)
);

-- ─── 4. Prescrições do paciente ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id         BIGSERIAL   PRIMARY KEY,
  patient_id BIGINT      NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 5. Blocos da prescrição (agrupamento de ativos numa fórmula) ──────────────
CREATE TABLE IF NOT EXISTS prescription_blocks (
  id                  BIGSERIAL   PRIMARY KEY,
  prescription_id     BIGINT      NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  label               TEXT        NOT NULL DEFAULT 'Fórmula 1',
  pharmaceutical_form TEXT        NOT NULL DEFAULT 'Cápsulas',
  posology            TEXT,
  sort_order          SMALLINT    NOT NULL DEFAULT 0
);

-- ─── 6. Itens de cada bloco (ativo + dosagem real) ────────────────────────────
CREATE TABLE IF NOT EXISTS prescription_block_items (
  id           BIGSERIAL     PRIMARY KEY,
  block_id     BIGINT        NOT NULL REFERENCES prescription_blocks(id) ON DELETE CASCADE,
  substrate_id BIGINT        REFERENCES substrates(id) ON DELETE SET NULL,
  name         TEXT          NOT NULL,
  dose         NUMERIC(10,3) NOT NULL,
  unit         TEXT          NOT NULL DEFAULT 'mg',
  sort_order   SMALLINT      NOT NULL DEFAULT 0
);

-- ─── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE substrates                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ready_formulas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE formula_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_blocks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_block_items   ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='substrates' AND policyname='all_substrates') THEN
    CREATE POLICY "all_substrates" ON substrates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ready_formulas' AND policyname='all_ready_formulas') THEN
    CREATE POLICY "all_ready_formulas" ON ready_formulas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='formula_items' AND policyname='all_formula_items') THEN
    CREATE POLICY "all_formula_items" ON formula_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='prescriptions' AND policyname='all_prescriptions') THEN
    CREATE POLICY "all_prescriptions" ON prescriptions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='prescription_blocks' AND policyname='all_prescription_blocks') THEN
    CREATE POLICY "all_prescription_blocks" ON prescription_blocks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='prescription_block_items' AND policyname='all_prescription_block_items') THEN
    CREATE POLICY "all_prescription_block_items" ON prescription_block_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── Seed: substratos base ────────────────────────────────────────────────────
INSERT INTO substrates (name, category, min_dose, ideal_dose, max_dose, unit, purpose) VALUES
-- Adaptógenos
('Ashwagandha (KSM-66)',    'Adaptógeno',   300,  600,  1200, 'mg', 'Redução do cortisol, energia, foco'),
('Rhodiola Rosea',          'Adaptógeno',   200,  400,   600, 'mg', 'Fadiga, desempenho cognitivo'),
('Panax Ginseng',           'Adaptógeno',   200,  400,   800, 'mg', 'Energia, imunidade, libido'),
('Maca Peruana',            'Adaptógeno',   500, 1500,  3000, 'mg', 'Energia, libido, fertilidade'),
-- Termogênicos
('Cafeína Anidra',          'Termogênico',   50,  200,   400, 'mg', 'Energia, foco, termogênese'),
('Extrato de Chá Verde',    'Termogênico',  200,  500,   800, 'mg', 'Antioxidante, termogênese'),
('Capsaicina',              'Termogênico',    2,    5,    10, 'mg', 'Termogênese, saciedade'),
('Sinefrina',               'Termogênico',   10,   20,    50, 'mg', 'Energia, queima de gordura'),
('Forskolina',              'Termogênico',   25,   50,   125, 'mg', 'Lipólise, testosterona'),
-- Fitoterápicos
('Berberina',               'Fitoterápico', 500,  500,  1500, 'mg', 'Glicemia, colesterol, emagrecimento'),
('Curcumina (com piperina)','Fitoterápico', 500, 1000,  2000, 'mg', 'Anti-inflamatório, antioxidante'),
('Gymnema Sylvestre',       'Fitoterápico', 200,  400,   800, 'mg', 'Controle glicêmico, craving de doce'),
('Passiflora',              'Fitoterápico', 100,  200,   400, 'mg', 'Ansiedade, sono'),
('Valeriana',               'Fitoterápico', 300,  600,  1200, 'mg', 'Sono, ansiedade'),
('Melatonina',              'Fitoterápico', 0.5,    1,     5, 'mg', 'Ritmo circadiano, sono'),
-- Vitaminas
('Vitamina D3',             'Vitamina',    1000, 5000, 10000, 'UI', 'Imunidade, ossos, humor'),
('Vitamina K2 (MK-7)',      'Vitamina',      45,  100,   200, 'mcg','Calcificação vascular, ossos'),
('Vitamina C (Ácido Ascórbico)','Vitamina', 500, 1000,  3000, 'mg', 'Imunidade, antioxidante, colágeno'),
('Vitamina B12 (Metilcobalamina)','Vitamina',500,1000,  5000, 'mcg','Energia, neurológico, homocisteína'),
('Vitamina B6 (P-5-P)',     'Vitamina',      25,   50,   100, 'mg', 'Metabolismo proteico, PMS'),
-- Minerais
('Magnésio Gliccinato',     'Mineral',      200,  400,   800, 'mg', 'Sono, músculos, stress, glicemia'),
('Zinco Quelato',           'Mineral',        5,   15,    40, 'mg', 'Imunidade, testosterona, pele'),
('Selênio',                 'Mineral',       55,  100,   200, 'mcg','Tireóide, antioxidante'),
('Cromo Picolinato',        'Mineral',      100,  200,   500, 'mcg','Glicemia, craving de doce'),
('Ferro Bisglicinato',      'Mineral',        8,   18,    45, 'mg', 'Anemia, energia, imunidade'),
-- Aminoácidos
('L-Triptofano',            'Aminoácido',   500,  500,  2000, 'mg', 'Serotonina, sono, humor'),
('L-Glutamina',             'Aminoácido',  2000, 5000, 10000, 'mg', 'Intestino, imunidade, recuperação'),
('L-Carnitina Tartarato',   'Aminoácido',  500, 2000,  4000, 'mg', 'Metabolismo lipídico, energia'),
('5-HTP',                   'Aminoácido',    50,  100,   300, 'mg', 'Serotonina, humor, sono, saciedade'),
('L-Teanina',               'Aminoácido',   100,  200,   400, 'mg', 'Calma, foco sem sedação'),
-- Ômega / Lipídios
('Ômega-3 EPA+DHA',         'Lipídio',     1000, 2000,  4000, 'mg', 'Inflamação, cardiovascular, cérebro'),
('CLA (Ácido Linoleico Conjugado)','Lipídio',1000,3000, 6000,'mg', 'Composição corporal, metabolismo'),
-- Probióticos / Intestino
('Lactobacillus acidophilus','Probiótico',    1,    5,    20, 'bilhões UFC', 'Microbiota, imunidade, digestão'),
('Inulina (Prebiótico)',     'Probiótico',  2000, 5000, 10000,'mg', 'Microbiota, saciedade'),
-- Outros
('Coenzima Q10',            'Antioxidante',  100,  200,   400, 'mg', 'Energia mitocondrial, cardio'),
('Ácido Alfa-Lipóico',      'Antioxidante',  150,  300,   600, 'mg', 'Glicemia, antioxidante, neuropatia'),
('N-Acetilcisteína (NAC)',   'Antioxidante',  600,  600,  1800, 'mg', 'Glutationa, fígado, muco'),
('Resveratrol',             'Antioxidante',  150,  250,   500, 'mg', 'Envelhecimento, cardiovascular'),
('DHEA',                    'Hormonal',       10,   25,    50, 'mg', 'Energia, libido, composição corporal')
ON CONFLICT DO NOTHING;

-- ─── Seed: fórmulas prontas ───────────────────────────────────────────────────
INSERT INTO ready_formulas (name, objective, posology, pharmaceutical_form) VALUES
('Protocolo Sono Profundo',       'Sono',         'Tomar 1 cápsula 30 min antes de dormir',    'Cápsulas'),
('Protocolo Emagrecimento',       'Emagrecimento','Tomar 1 cápsula em jejum e 1 após almoço',  'Cápsulas'),
('Protocolo Energia e Foco',      'Energia',      'Tomar 1 cápsula pela manhã',                'Cápsulas'),
('Protocolo Glicemia',            'Glicemia',     'Tomar 1 cápsula antes das refeições',       'Cápsulas'),
('Protocolo Anti-inflamatório',   'Inflamação',   'Tomar 2 cápsulas ao dia com refeição',      'Cápsulas'),
('Protocolo Hipertrofia',         'Hipertrofia',  'Tomar 1 dose pós-treino',                   'Sachê'),
('Protocolo Imunidade',           'Imunidade',    'Tomar 1 cápsula ao dia',                    'Cápsulas'),
('Protocolo Tireóide',            'Tireóide',     'Tomar 1 cápsula pela manhã em jejum',       'Cápsulas'),
('Protocolo Ansiedade',           'Ansiedade',    'Tomar 1 cápsula ao dia ou conforme necessário', 'Cápsulas'),
('Protocolo Cardiovascular',      'Cardiovascular','Tomar 2 cápsulas ao dia com refeição',     'Cápsulas')
ON CONFLICT DO NOTHING;

-- ─── Seed: itens das fórmulas prontas ────────────────────────────────────────
-- Usamos subqueries para pegar IDs sem depender de sequência
DO $$ DECLARE
  f_sono       BIGINT; f_emagr BIGINT; f_energia BIGINT; f_glicemia BIGINT;
  f_antiinf    BIGINT; f_hipert BIGINT; f_imun BIGINT; f_tireoid BIGINT;
  f_ansi       BIGINT; f_cardio BIGINT;
  s_ashwa BIGINT; s_rhodiola BIGINT; s_passiflora BIGINT; s_valeriana BIGINT;
  s_melatonina BIGINT; s_triptofano BIGINT; s_teanina BIGINT; s_5htp BIGINT;
  s_magnésio BIGINT; s_cafeina BIGINT; s_chaver BIGINT; s_capsaicina BIGINT;
  s_sinefrina BIGINT; s_berberina BIGINT; s_gymnema BIGINT; s_cromo BIGINT;
  s_curcumina BIGINT; s_omega3 BIGINT; s_ala BIGINT; s_resveratrol BIGINT;
  s_glutamina BIGINT; s_carnitina BIGINT; s_zinco BIGINT; s_vd3 BIGINT;
  s_vitc BIGINT; s_selênio BIGINT; s_vitb12 BIGINT; s_coq10 BIGINT;
  s_forskolina BIGINT; s_nac BIGINT;
BEGIN
  SELECT id INTO f_sono        FROM ready_formulas WHERE name='Protocolo Sono Profundo';
  SELECT id INTO f_emagr       FROM ready_formulas WHERE name='Protocolo Emagrecimento';
  SELECT id INTO f_energia     FROM ready_formulas WHERE name='Protocolo Energia e Foco';
  SELECT id INTO f_glicemia    FROM ready_formulas WHERE name='Protocolo Glicemia';
  SELECT id INTO f_antiinf     FROM ready_formulas WHERE name='Protocolo Anti-inflamatório';
  SELECT id INTO f_hipert      FROM ready_formulas WHERE name='Protocolo Hipertrofia';
  SELECT id INTO f_imun        FROM ready_formulas WHERE name='Protocolo Imunidade';
  SELECT id INTO f_tireoid     FROM ready_formulas WHERE name='Protocolo Tireóide';
  SELECT id INTO f_ansi        FROM ready_formulas WHERE name='Protocolo Ansiedade';
  SELECT id INTO f_cardio      FROM ready_formulas WHERE name='Protocolo Cardiovascular';

  SELECT id INTO s_ashwa       FROM substrates WHERE name='Ashwagandha (KSM-66)';
  SELECT id INTO s_rhodiola    FROM substrates WHERE name='Rhodiola Rosea';
  SELECT id INTO s_passiflora  FROM substrates WHERE name='Passiflora';
  SELECT id INTO s_valeriana   FROM substrates WHERE name='Valeriana';
  SELECT id INTO s_melatonina  FROM substrates WHERE name='Melatonina';
  SELECT id INTO s_triptofano  FROM substrates WHERE name='L-Triptofano';
  SELECT id INTO s_teanina     FROM substrates WHERE name='L-Teanina';
  SELECT id INTO s_5htp        FROM substrates WHERE name='5-HTP';
  SELECT id INTO s_magnésio    FROM substrates WHERE name='Magnésio Gliccinato';
  SELECT id INTO s_cafeina     FROM substrates WHERE name='Cafeína Anidra';
  SELECT id INTO s_chaver      FROM substrates WHERE name='Extrato de Chá Verde';
  SELECT id INTO s_capsaicina  FROM substrates WHERE name='Capsaicina';
  SELECT id INTO s_sinefrina   FROM substrates WHERE name='Sinefrina';
  SELECT id INTO s_berberina   FROM substrates WHERE name='Berberina';
  SELECT id INTO s_gymnema     FROM substrates WHERE name='Gymnema Sylvestre';
  SELECT id INTO s_cromo       FROM substrates WHERE name='Cromo Picolinato';
  SELECT id INTO s_curcumina   FROM substrates WHERE name='Curcumina (com piperina)';
  SELECT id INTO s_omega3      FROM substrates WHERE name='Ômega-3 EPA+DHA';
  SELECT id INTO s_ala         FROM substrates WHERE name='Ácido Alfa-Lipóico';
  SELECT id INTO s_resveratrol FROM substrates WHERE name='Resveratrol';
  SELECT id INTO s_glutamina   FROM substrates WHERE name='L-Glutamina';
  SELECT id INTO s_carnitina   FROM substrates WHERE name='L-Carnitina Tartarato';
  SELECT id INTO s_zinco       FROM substrates WHERE name='Zinco Quelato';
  SELECT id INTO s_vd3         FROM substrates WHERE name='Vitamina D3';
  SELECT id INTO s_vitc        FROM substrates WHERE name='Vitamina C (Ácido Ascórbico)';
  SELECT id INTO s_selênio     FROM substrates WHERE name='Selênio';
  SELECT id INTO s_vitb12      FROM substrates WHERE name='Vitamina B12 (Metilcobalamina)';
  SELECT id INTO s_coq10       FROM substrates WHERE name='Coenzima Q10';
  SELECT id INTO s_forskolina  FROM substrates WHERE name='Forskolina';
  SELECT id INTO s_nac         FROM substrates WHERE name='N-Acetilcisteína (NAC)';

  -- Sono
  INSERT INTO formula_items (formula_id, substrate_id, applied_dose, unit, sort_order) VALUES
    (f_sono, s_passiflora, 200, 'mg', 1), (f_sono, s_valeriana, 300, 'mg', 2),
    (f_sono, s_melatonina, 1,   'mg', 3), (f_sono, s_magnésio,  200, 'mg', 4),
    (f_sono, s_teanina,    100, 'mg', 5)
  ON CONFLICT DO NOTHING;

  -- Emagrecimento
  INSERT INTO formula_items (formula_id, substrate_id, applied_dose, unit, sort_order) VALUES
    (f_emagr, s_cafeina,   100, 'mg', 1), (f_emagr, s_chaver,   300, 'mg', 2),
    (f_emagr, s_sinefrina,  15, 'mg', 3), (f_emagr, s_forskolina,25, 'mg', 4),
    (f_emagr, s_carnitina, 500, 'mg', 5), (f_emagr, s_cromo,    200, 'mcg',6)
  ON CONFLICT DO NOTHING;

  -- Energia e Foco
  INSERT INTO formula_items (formula_id, substrate_id, applied_dose, unit, sort_order) VALUES
    (f_energia, s_ashwa,    300, 'mg', 1), (f_energia, s_rhodiola, 200, 'mg', 2),
    (f_energia, s_cafeina,  100, 'mg', 3), (f_energia, s_teanina,  200, 'mg', 4),
    (f_energia, s_vitb12,   500, 'mcg',5), (f_energia, s_coq10,    100, 'mg', 6)
  ON CONFLICT DO NOTHING;

  -- Glicemia
  INSERT INTO formula_items (formula_id, substrate_id, applied_dose, unit, sort_order) VALUES
    (f_glicemia, s_berberina, 500, 'mg', 1), (f_glicemia, s_gymnema, 300, 'mg', 2),
    (f_glicemia, s_cromo,     200, 'mcg',3), (f_glicemia, s_ala,     150, 'mg', 4),
    (f_glicemia, s_magnésio,  150, 'mg', 5)
  ON CONFLICT DO NOTHING;

  -- Anti-inflamatório
  INSERT INTO formula_items (formula_id, substrate_id, applied_dose, unit, sort_order) VALUES
    (f_antiinf, s_curcumina, 500, 'mg', 1), (f_antiinf, s_omega3, 1000, 'mg', 2),
    (f_antiinf, s_resveratrol,150,'mg', 3), (f_antiinf, s_nac,    600, 'mg', 4),
    (f_antiinf, s_zinco,      15, 'mg', 5)
  ON CONFLICT DO NOTHING;

  -- Hipertrofia
  INSERT INTO formula_items (formula_id, substrate_id, applied_dose, unit, sort_order) VALUES
    (f_hipert, s_glutamina, 5000, 'mg', 1), (f_hipert, s_carnitina, 2000, 'mg', 2),
    (f_hipert, s_ashwa,      300, 'mg', 3), (f_hipert, s_coq10,     100, 'mg', 4),
    (f_hipert, s_magnésio,   200, 'mg', 5), (f_hipert, s_zinco,      10, 'mg', 6)
  ON CONFLICT DO NOTHING;

  -- Imunidade
  INSERT INTO formula_items (formula_id, substrate_id, applied_dose, unit, sort_order) VALUES
    (f_imun, s_vitc,  1000, 'mg', 1), (f_imun, s_vd3,  2000, 'UI', 2),
    (f_imun, s_zinco,   15, 'mg', 3), (f_imun, s_selênio, 100,'mcg',4),
    (f_imun, s_nac,    600, 'mg', 5)
  ON CONFLICT DO NOTHING;

  -- Tireóide
  INSERT INTO formula_items (formula_id, substrate_id, applied_dose, unit, sort_order) VALUES
    (f_tireoid, s_selênio, 100, 'mcg',1), (f_tireoid, s_zinco,  15, 'mg', 2),
    (f_tireoid, s_vd3,    2000, 'UI', 3), (f_tireoid, s_ashwa,  300, 'mg', 4)
  ON CONFLICT DO NOTHING;

  -- Ansiedade
  INSERT INTO formula_items (formula_id, substrate_id, applied_dose, unit, sort_order) VALUES
    (f_ansi, s_ashwa,     300, 'mg', 1), (f_ansi, s_passiflora,200,'mg', 2),
    (f_ansi, s_magnésio,  200, 'mg', 3), (f_ansi, s_teanina,   200,'mg', 4),
    (f_ansi, s_5htp,      100, 'mg', 5)
  ON CONFLICT DO NOTHING;

  -- Cardiovascular
  INSERT INTO formula_items (formula_id, substrate_id, applied_dose, unit, sort_order) VALUES
    (f_cardio, s_omega3,    2000, 'mg', 1), (f_cardio, s_coq10,  200, 'mg', 2),
    (f_cardio, s_resveratrol,200,'mg', 3), (f_cardio, s_ala,     200, 'mg', 4),
    (f_cardio, s_magnésio,  200, 'mg', 5)
  ON CONFLICT DO NOTHING;
END $$;
