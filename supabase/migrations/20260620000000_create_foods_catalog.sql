-- ─── Criação do Catálogo de Alimentos (Epic 15) ───────────────────────────

CREATE TABLE IF NOT EXISTS foods (
  id               BIGSERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  category         TEXT,
  kcal_per_100g    NUMERIC(7,2),
  protein_per_100g NUMERIC(6,2),
  carbs_per_100g   NUMERIC(6,2),
  fat_per_100g     NUMERIC(7,2),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name)
);

ALTER TABLE foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_foods" ON foods
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ─── Migração de dados de meal_foods para a tabela foods ──────────────────────

INSERT INTO foods (name, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
SELECT DISTINCT 
  food_name,
  MAX(kcal_per_100g),
  MAX(protein_per_100g),
  MAX(carbs_per_100g),
  MAX(fat_per_100g)
FROM meal_foods
WHERE food_name IS NOT NULL
GROUP BY food_name
ON CONFLICT (name) DO NOTHING;
