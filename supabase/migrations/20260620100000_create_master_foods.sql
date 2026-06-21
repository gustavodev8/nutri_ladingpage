-- ─── MIGRATION: 20260620100000_create_master_foods.sql ──────────────────────────

CREATE TABLE IF NOT EXISTS master_foods (
  id               BIGSERIAL PRIMARY KEY,
  name             TEXT NOT NULL UNIQUE,
  category         TEXT NOT NULL,
  kcal_per_100g    NUMERIC(7,2) NOT NULL,
  protein_per_100g NUMERIC(6,2) NOT NULL,
  carbs_per_100g   NUMERIC(6,2) NOT NULL,
  fat_per_100g     NUMERIC(6,2) NOT NULL,
  fiber_per_100g   NUMERIC(6,2) DEFAULT 0,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE master_foods ENABLE ROW LEVEL SECURITY;

-- Policies (Assuming similar access as other clinical tables)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'master_foods' AND policyname = 'anon_all_master_foods') THEN
    CREATE POLICY "anon_all_master_foods" ON master_foods FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'master_foods' AND policyname = 'auth_all_master_foods') THEN
    CREATE POLICY "auth_all_master_foods" ON master_foods FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
