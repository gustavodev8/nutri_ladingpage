-- Epic: Gestão Global de Exames, Alvos Terapêuticos e Protocolos
-- Seguro para re-execução (IF NOT EXISTS / ON CONFLICT DO NOTHING)

-- ─── Catálogo de Exames ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS global_exams_catalog (
  id                    BIGSERIAL     PRIMARY KEY,
  name                  TEXT          NOT NULL,
  category              TEXT          NOT NULL DEFAULT 'Geral',
  clinical_axis         TEXT,
  unit                  TEXT,
  lab_ref_min           NUMERIC(12,3),
  lab_ref_max           NUMERIC(12,3),
  target_male_min       NUMERIC(12,3),
  target_male_max       NUMERIC(12,3),
  target_female_min     NUMERIC(12,3),
  target_female_max     NUMERIC(12,3),
  clinical_observation  TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_catalog_name     ON global_exams_catalog (lower(name));
CREATE INDEX IF NOT EXISTS idx_exam_catalog_category ON global_exams_catalog (category);

ALTER TABLE global_exams_catalog ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='global_exams_catalog' AND policyname='all_exam_catalog') THEN
    CREATE POLICY "all_exam_catalog" ON global_exams_catalog FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── Protocolos ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS global_exam_protocols (
  id          BIGSERIAL  PRIMARY KEY,
  name        TEXT       NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE global_exam_protocols ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='global_exam_protocols' AND policyname='all_exam_protocols') THEN
    CREATE POLICY "all_exam_protocols" ON global_exam_protocols FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── Itens de Protocolo (pivot N:N) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS global_protocol_items (
  protocol_id BIGINT NOT NULL REFERENCES global_exam_protocols(id) ON DELETE CASCADE,
  exam_id     BIGINT NOT NULL REFERENCES global_exams_catalog(id)  ON DELETE CASCADE,
  PRIMARY KEY (protocol_id, exam_id)
);

ALTER TABLE global_protocol_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='global_protocol_items' AND policyname='all_protocol_items') THEN
    CREATE POLICY "all_protocol_items" ON global_protocol_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── Seed: Catálogo base ─────────────────────────────────────────────────────
INSERT INTO global_exams_catalog
  (name, category, clinical_axis, unit, lab_ref_min, lab_ref_max, target_male_min, target_male_max, target_female_min, target_female_max, clinical_observation)
VALUES

-- Nutricional
('Vitamina D3 (25-OH)',        'Nutricional',   'Imunidade / Hormonal',          'ng/mL',   20,    100,   50,    80,    50,    80,    'Alvo funcional muito superior ao mínimo laboratorial. Investigar deficiência de magnésio e vitamina K2 se não houver resposta à suplementação.'),
('Vitamina B12 (Cobalamina)',  'Nutricional',   'Neurológico / Energético',       'pg/mL',   200,   900,   600,   900,   600,   900,   'Valores entre 200–400 pg/mL podem cursar com sintomas subclínicos (fadiga, parestesia). Vegetarianos têm risco elevado.'),
('Folato (Vitamina B9)',       'Nutricional',   'Metilação / Neurológico',        'ng/mL',   3,     17,    10,    17,    10,    17,    'Essencial para metilação do DNA e síntese de neurotransmissores. Investigar polimorfismo MTHFR em deficiências recorrentes.'),
('Zinco Sérico',               'Nutricional',   'Imunidade / Hormonal',           'μg/dL',   70,    120,   90,    120,   85,    110,   'Cofator de mais de 300 enzimas. Deficiência frequente em vegetarianos, idosos e uso de inibidores de bomba de prótons.'),
('Magnésio Sérico',            'Nutricional',   'Metabólico / Muscular',          'mg/dL',   1.7,   2.5,   2.0,   2.5,   2.0,   2.5,   'Magnésio sérico é fraco marcador — prefira magnésio eritrocitário. Deficiência subclínica muito comum (70% da população).'),
('Selênio',                    'Nutricional',   'Antioxidante / Tireoidiano',     'μg/L',    70,    120,   100,   120,   100,   120,   '1–2 castanhas do Pará/dia suprem a necessidade diária. Essencial para conversão de T4→T3 e função da glutationa peroxidase.'),
('Ferritina',                  'Hematológico',  'Reserva de Ferro / Energia',     'ng/mL',   10,    200,   70,    150,   50,    100,   'Principal marcador de reserva de ferro. Valores < 50 ng/mL podem causar queda de cabelo, fadiga e baixa performance mesmo sem anemia.'),
('Ferro Sérico',               'Hematológico',  'Transporte de Ferro',            'μg/dL',   60,    170,   80,    160,   60,    140,   'Associar sempre a ferritina, TIBC e saturação de transferrina para diagnóstico completo.'),
('Homocisteína',               'Cardiovascular','Metilação / Risco Vascular',     'μmol/L',  null,  15,    null,  10,    null,  8,     'Marcador independente de risco cardiovascular e neurodegenerativo. Alvo funcional < 10 μmol/L. Responde bem a B12, B6 e folato.'),

-- Metabólico / Glicemia
('Glicemia de Jejum',          'Metabólico',    'Glicemia / Insulino-resistência','mg/dL',   70,    99,    75,    90,    75,    90,    'Alvo ótimo 75–90 mg/dL. Valores > 90 já indicam risco metabólico elevado — associar à insulina de jejum e HOMA-IR.'),
('Insulina de Jejum',          'Metabólico',    'Insulino-resistência',           'μUI/mL',  2,     25,    2,     10,    2,     8,     'Hiperinsulinemia é o marcador mais precoce de resistência insulínica. Mulheres têm alvo mais baixo por sensibilidade hormonal.'),
('HbA1c (Hemoglobina Glicada)','Metabólico',    'Controle Glicêmico',            '%',       null,  5.7,   null,  5.2,   null,  5.2,   'Reflete média glicêmica dos últimos 2–3 meses. Alvo funcional < 5,2% para prevenção de doenças metabólicas crônicas.'),
('HOMA-IR',                    'Metabólico',    'Insulino-resistência',           'índice',  null,  2.7,   null,  2.0,   null,  1.8,   'Calculado: (Insulina × Glicemia) / 405. HOMA > 2,0 já indica resistência insulínica subclínica.'),
('Peptídeo-C',                 'Metabólico',    'Função Pancreática',             'ng/mL',   0.8,   3.1,   1.1,   2.5,   1.0,   2.5,   'Marcador de secreção endógena de insulina. Útil para diferenciar DM1 de DM2 e avaliar reserva pancreática.'),

-- Tireoidiano
('TSH',                        'Hormonal',      'Tireoide',                       'μUI/mL',  0.4,   4.0,   0.5,   2.5,   0.5,   2.0,   'Alvo funcional muito mais restrito que o laboratorial. TSH > 2,5 em mulheres pode causar sintomas tireoidianos subclínicos.'),
('T3 Livre (FT3)',             'Hormonal',      'Tireoide / Metabolismo',         'pg/mL',   2.3,   4.2,   3.2,   4.2,   3.0,   4.2,   'Forma ativa. Baixo FT3 com TSH normal indica hipotireoidismo periférico — investigar selênio, ferro e cortisol.'),
('T4 Livre (FT4)',             'Hormonal',      'Tireoide',                       'ng/dL',   0.7,   1.9,   1.2,   1.9,   1.1,   1.9,   'Pró-hormônio. Conversão T4→T3 depende de selênio, zinco e função hepática adequada.'),
('Anti-TPO',                   'Hormonal',      'Autoimunidade Tireoidiana',      'UI/mL',   null,  35,    null,  35,    null,  35,    'Anticorpos anti-peroxidase. Positivo indica tireoidite de Hashimoto. Protocolo nutricional: selênio 200 μg/dia, glúten-free.'),

-- Lipídico
('Colesterol Total',           'Lipídico',      'Risco Cardiovascular',           'mg/dL',   null,  200,   null,  190,   null,  190,   'Isoladamente tem pouco valor preditivo. Analisar sempre o contexto: HDL, LDL, triglicerídeos e PCR-us.'),
('HDL-Colesterol',             'Lipídico',      'Cardioproteção',                 'mg/dL',   40,    null,  55,    null,  60,    null,  'Quanto maior, melhor. HDL baixo (< 50 ♀ / < 40 ♂) é fator de risco independente mesmo com LDL normal.'),
('LDL-Colesterol',             'Lipídico',      'Risco Cardiovascular',           'mg/dL',   null,  130,   null,  100,   null,  100,   'Preferir LDL pequeno e denso (LDLsd) quando disponível. LDL alto com triglicerídeos normais e HDL alto tem menor impacto.'),
('Triglicerídeos',             'Lipídico',      'Risco Metabólico',               'mg/dL',   null,  150,   null,  100,   null,  100,   'Triglicerídeos > 100 associados a resistência insulínica. Responde muito bem a intervenção nutricional (redução de açúcar e carboidrato refinado).'),
('VLDL-Colesterol',            'Lipídico',      'Risco Cardiovascular',           'mg/dL',   null,  30,    null,  20,    null,  20,    'VLDL = TG / 5. Elevado indica sobrecarga de carboidratos e fígado gorduroso.'),

-- Inflamatório
('PCR-us (Proteína C Reativa)','Inflamatório',  'Inflamação Sistêmica',           'mg/L',    null,  3.0,   null,  1.0,   null,  1.0,   'Alvo funcional < 1,0 mg/L. PCR > 3,0 indica risco cardiovascular elevado. Reduz com anti-inflamatórios (ômega-3, cúrcuma, polifenóis).'),
('VHS (Velocidade de Hemossedimentação)','Inflamatório','Inflamação / Autoimunidade','mm/h',  null,  20,    null,  10,    null,  15,    'Marcador inespecífico. Útil para monitorar processo inflamatório ativo ou autoimune.'),
('Ferritina (marcador inflamatório)','Inflamatório','Inflamação / Sobrecarga de Ferro','ng/mL',null, 300,  null,  150,   null,  100,   'Ferritina muito elevada pode ser marcador de inflamação crônica — descartar hemocromatose e síndrome metabólica.'),

-- Hormonal
('Testosterona Total',         'Hormonal',      'Hormonal / Metabolismo',         'ng/dL',   300,   1000,  500,   900,   null,  null,  'Em homens: alvo ótimo 500–900 ng/dL. Abaixo de 400: investigar hipogonadismo. Influenciado por sono, estresse e % de gordura.'),
('Testosterona Livre',         'Hormonal',      'Hormonal / Anabolismo',          'pg/mL',   50,    210,   100,   210,   null,  null,  'Mais sensível que testosterona total. SHBG elevada pode resultar em baixa testosterona livre mesmo com total normal.'),
('Estradiol (E2)',             'Hormonal',      'Ciclo / Saúde Óssea',            'pg/mL',   null,  null,  null,  null,  30,    200,   'Em mulheres varia com fase do ciclo (folicular: 30–120, ovulatória: 200–400, lútea: 70–200). Avaliar sempre dentro do contexto do ciclo.'),
('Progesterona',               'Hormonal',      'Ciclo / Fertilidade',            'ng/mL',   null,  null,  null,  null,  1,     25,    'Fase lútea: 5–25 ng/mL. Progesterona < 8 na fase lútea indica anovulação ou insuficiência lútea.'),
('DHEA-S',                     'Hormonal',      'Adrenal / Vitalidade',           'μg/dL',   80,    560,   300,   500,   100,   350,   'Marcador de reserva adrenal e "hormônio da juventude". Cai ~2% ao ano após os 30. Associado à longevidade e composição corporal.'),
('Cortisol Matinal',           'Hormonal',      'Estresse / Adrenal',             'μg/dL',   5,     25,    10,    20,    10,    20,    'Colher entre 7–9h. Cortisol < 8: insuficiência adrenal (investigar). Cortisol > 20: hipercortisolismo ou estresse crônico.'),
('SHBG',                       'Hormonal',      'Ligação Hormonal',               'nmol/L',  10,    80,    20,    60,    40,    120,   'Proteína que liga hormônios sexuais. SHBG alta reduz hormônios livres biologicamente ativos. Influenciada pela insulina e estrogênio.'),
('LH',                         'Hormonal',      'Gonadotrofina',                  'mUI/mL',  1.5,   12,    2,     10,    1,     15,    'Em mulheres varia com o ciclo. Pico de LH indica ovulação. LH elevado em repouso sugere SOP ou falência ovariana precoce.'),
('FSH',                        'Hormonal',      'Gonadotrofina',                  'mUI/mL',  1.5,   12,    2,     10,    2,     15,    'FSH elevado indica reserva ovariana reduzida. Em homens, FSH alto com baixa testosterona = hipogonadismo hipergonadotrófico.'),

-- Hematológico
('Hemoglobina',                'Hematológico',  'Anemia / Capacidade Aeróbica',   'g/dL',    12,    18,    13.5,  17.5,  12,    16,    'Queda abaixo do alvo reduz capacidade aeróbica e performance cognitiva mesmo antes de anemia clínica declarada.'),
('Hematócrito',                'Hematológico',  'Anemia / Viscosidade',           '%',       36,    54,    40,    52,    36,    47,    'Hematócrito muito alto (> 52%) aumenta viscosidade sanguínea e risco trombótico.'),
('Leucócitos Totais',          'Hematológico',  'Imunidade',                      'mil/μL',  4.0,   11.0,  5.5,   8.5,   5.0,   8.0,   'Leucocitose persistente sem infecção ativa sugere inflamação crônica. Leucopenia < 4 mil → investigar imunossupressão.'),
('Vitamina B12 eritrocitária', 'Hematológico',  'Megaloblástico',                 'pg/mL',   140,   960,   500,   960,   500,   960,   'Marcador mais preciso de B12 intracelular que a sérica. Útil quando sérica é borderline.'),

-- Renal / Hepático
('Creatinina',                 'Renal',         'Função Renal / Massa Muscular',  'mg/dL',   0.6,   1.3,   0.8,   1.2,   0.6,   1.0,   'Creatinina baixa pode indicar sarcopenia. Alta indica sobrecarga renal. TFG é melhor parâmetro — calcular sempre.'),
('TFG Estimada (CKD-EPI)',     'Renal',         'Função Renal',                   'mL/min',  60,    null,  90,    null,  90,    null,  'TFG < 60 = doença renal crônica estágio 3. Alvo funcional > 90 mL/min para saúde renal ótima.'),
('Ureia',                      'Renal',         'Função Renal / Hidratação',      'mg/dL',   15,    50,    20,    40,    15,    35,    'Ureia/Creatinina > 20 sugere desidratação ou hipercatabolismo proteico. < 10 pode indicar dieta baixa em proteína.'),
('ALT (TGP)',                  'Hepático',      'Função Hepática / DHGNA',        'U/L',     null,  40,    null,  30,    null,  25,    'Alvo funcional mais restrito que laboratório. ALT > 25 em mulheres já pode indicar fígado gorduroso não alcoólico (DHGNA).'),
('AST (TGO)',                  'Hepático',      'Função Hepática / Muscular',     'U/L',     null,  40,    null,  30,    null,  25,    'AST elevada isolada pode ser de origem muscular (rabdomiólise). Relação AST/ALT > 2 sugere doença alcoólica hepática.'),
('GGT',                        'Hepático',      'Fígado / Álcool / Estresse Ox.', 'U/L',     null,  60,    null,  30,    null,  25,    'Marcador sensível de DHGNA e consumo de álcool. Também elevado em deficiência de selênio e estresse oxidativo.'),
('Ácido Úrico',                'Metabólico',    'Gota / Inflamação / Frutose',    'mg/dL',   3.5,   7.2,   3.5,   6.0,   3.5,   5.5,   'Elevado com alto consumo de frutose, carne vermelha e álcool. Alvo funcional < 6 mg/dL para prevenção de gota e risco cardiovascular.')

ON CONFLICT DO NOTHING;

-- ─── Seed: Protocolos base ───────────────────────────────────────────────────
INSERT INTO global_exam_protocols (name, description) VALUES
('Check-up Base',            'Painel inicial completo para novos pacientes — avalia metabolismo, inflamação e micronutrientes essenciais.'),
('Check-up Hormonal Feminino','Painel focado em saúde hormonal feminina — ciclo, tireoide e reserva adrenal.'),
('Check-up Hipertrofia',     'Painel para atletas e praticantes de musculação — hormônios anabólicos, ferro e função renal.'),
('Check-up Metabólico',      'Painel para investigação de resistência insulínica, síndrome metabólica e risco cardiovascular.'),
('Monitoramento Nutricional','Painel de acompanhamento semestral de micronutrientes críticos.')
ON CONFLICT DO NOTHING;
