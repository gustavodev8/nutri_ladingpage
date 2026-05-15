-- Epic 14: Motor de Substituições Inteligentes
-- Seguro para rodar múltiplas vezes (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS smart_substitutions (
  id                   BIGSERIAL    PRIMARY KEY,
  reference_food_name  TEXT         NOT NULL,
  ref_amount           NUMERIC(10,3) NOT NULL,
  substitute_food_name TEXT         NOT NULL,
  sub_amount           NUMERIC(10,3) NOT NULL,
  category             TEXT         NOT NULL DEFAULT 'Geral',
  criteria             TEXT,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smart_sub_ref ON smart_substitutions (lower(reference_food_name));

ALTER TABLE smart_substitutions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='smart_substitutions' AND policyname='all_smart_substitutions') THEN
    CREATE POLICY "all_smart_substitutions" ON smart_substitutions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── Seed: regras base ────────────────────────────────────────────────────────
-- Formato: ref_amount g de reference_food ≡ sub_amount g de substitute_food
INSERT INTO smart_substitutions (reference_food_name, ref_amount, substitute_food_name, sub_amount, category, criteria) VALUES

-- Carboidratos complexos
('Arroz Branco',        100, 'Batata Doce',         120, 'Carboidrato', 'Troca por densidade calórica'),
('Arroz Branco',        100, 'Mandioquinha',         130, 'Carboidrato', 'Troca por índice glicêmico'),
('Arroz Branco',        100, 'Quinoa',                80, 'Carboidrato', 'Troca por perfil proteico'),
('Arroz Branco',        100, 'Arroz Integral',       100, 'Carboidrato', 'Troca por fibras'),
('Arroz Branco',        100, 'Macarrão Integral',     80, 'Carboidrato', 'Troca por fibras'),
('Arroz Integral',      100, 'Quinoa',                80, 'Carboidrato', 'Troca por perfil proteico'),
('Arroz Integral',      100, 'Batata Doce',          120, 'Carboidrato', 'Troca por densidade calórica'),
('Batata Doce',         100, 'Mandioquinha',         110, 'Carboidrato', 'Troca por índice glicêmico'),
('Batata Doce',         100, 'Inhame',               100, 'Carboidrato', 'Troca equivalente'),
('Batata Doce',         100, 'Arroz Integral',        80, 'Carboidrato', 'Troca por fibras'),
('Batata Inglesa',      100, 'Batata Doce',           90, 'Carboidrato', 'Troca por índice glicêmico'),
('Mandioca',            100, 'Batata Doce',           90, 'Carboidrato', 'Troca por densidade calórica'),
('Macarrão',            100, 'Macarrão Integral',    100, 'Carboidrato', 'Troca por fibras'),
('Macarrão',            100, 'Quinoa',                80, 'Carboidrato', 'Troca por perfil proteico'),
('Tapioca',              50, 'Pão Integral',          40, 'Carboidrato', 'Troca por fibras'),
('Pão Branco',           50, 'Pão Integral',          50, 'Carboidrato', 'Troca por fibras'),
('Pão Branco',           50, 'Tapioca',               60, 'Carboidrato', 'Troca sem glúten'),
('Aveia',                40, 'Farinha de Aveia',      40, 'Carboidrato', 'Troca equivalente'),
('Aveia',                40, 'Granola sem Açúcar',    40, 'Carboidrato', 'Troca equivalente'),

-- Proteínas
('Frango (peito)',      100, 'Tilápia',              120, 'Proteína', 'Troca por perfil lipídico'),
('Frango (peito)',      100, 'Atum em água',          80, 'Proteína', 'Troca por praticidade'),
('Frango (peito)',      100, 'Carne Bovina Magra',   100, 'Proteína', 'Troca equivalente'),
('Frango (peito)',      100, 'Ovos',                 150, 'Proteína', 'Troca por ovos (≈3 unid)'),
('Frango (peito)',      100, 'Tofu',                 160, 'Proteína', 'Troca vegana'),
('Carne Bovina Magra', 100, 'Frango (peito)',        100, 'Proteína', 'Troca por perfil lipídico'),
('Carne Bovina Magra', 100, 'Atum em água',           80, 'Proteína', 'Troca por ômega-3'),
('Tilápia',            100, 'Frango (peito)',         90, 'Proteína', 'Troca equivalente'),
('Tilápia',            100, 'Salmão',                 90, 'Proteína', 'Troca por ômega-3'),
('Salmão',             100, 'Atum em água',           80, 'Proteína', 'Troca por praticidade'),
('Atum em água',       100, 'Frango (peito)',         110,'Proteína', 'Troca equivalente'),
('Ovos',               100, 'Claras de Ovo',         180, 'Proteína', 'Troca low-fat'),
('Ovos',               100, 'Frango (peito)',          70, 'Proteína', 'Troca equivalente'),
('Tofu',               100, 'Frango (peito)',          70, 'Proteína', 'Troca por animal'),
('Whey Protein',        30, 'Frango (peito)',         100, 'Proteína', 'Equivalente proteico'),

-- Gorduras boas
('Azeite de Oliva',     10, 'Óleo de Coco',           10, 'Gordura', 'Troca equivalente'),
('Abacate',            100, 'Azeite de Oliva',         15, 'Gordura', 'Troca por praticidade'),
('Castanha do Pará',    20, 'Castanha de Caju',        25, 'Gordura', 'Troca equivalente'),
('Castanha do Pará',    20, 'Amendoim',                30, 'Gordura', 'Troca por custo'),
('Pasta de Amendoim',   30, 'Castanha do Pará',        20, 'Gordura', 'Troca por micronutrientes'),

-- Laticínios
('Leite Integral',     200, 'Leite Desnatado',       200, 'Laticínio', 'Troca low-fat'),
('Leite Integral',     200, 'Bebida Vegetal',        200, 'Laticínio', 'Troca vegana'),
('Iogurte Integral',   150, 'Iogurte Grego',         120, 'Laticínio', 'Troca por proteína'),
('Iogurte Grego',      150, 'Cottage',               150, 'Laticínio', 'Troca por proteína'),
('Queijo Minas',        50, 'Ricota',                 60, 'Laticínio', 'Troca low-fat'),
('Requeijão',           30, 'Queijo Cottage',         60, 'Laticínio', 'Troca low-fat'),

-- Frutas
('Banana',             100, 'Maçã',                  120, 'Fruta', 'Troca por índice glicêmico'),
('Banana',             100, 'Pera',                  130, 'Fruta', 'Troca por índice glicêmico'),
('Banana',             100, 'Manga',                  90, 'Fruta', 'Troca equivalente'),
('Maçã',              100, 'Pera',                   110, 'Fruta', 'Troca equivalente'),
('Mamão',             100, 'Melão',                  120, 'Fruta', 'Troca por densidade calórica'),

-- Leguminosas
('Feijão Carioca',    100, 'Lentilha',                90, 'Leguminosa', 'Troca por índice glicêmico'),
('Feijão Carioca',    100, 'Grão de Bico',            90, 'Leguminosa', 'Troca equivalente'),
('Feijão Preto',      100, 'Feijão Carioca',         100, 'Leguminosa', 'Troca equivalente'),
('Lentilha',          100, 'Grão de Bico',           100, 'Leguminosa', 'Troca equivalente')

ON CONFLICT DO NOTHING;
