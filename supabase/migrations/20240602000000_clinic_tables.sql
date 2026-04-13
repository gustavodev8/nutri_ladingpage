-- ================================================================
-- NutriVida — Clinic Tables
-- Creates all clinical tables used by the admin panel.
-- Safe to run on a fresh or existing database (IF NOT EXISTS guards).
-- ================================================================

-- ─── PATIENTS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS patients (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  birth_date  DATE,
  gender      TEXT CHECK (gender IN ('M', 'F', 'outro')),
  occupation  TEXT,
  city        TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patients' AND policyname = 'anon_all_patients') THEN
    CREATE POLICY "anon_all_patients" ON patients FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patients' AND policyname = 'auth_all_patients') THEN
    CREATE POLICY "auth_all_patients" ON patients FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── PATIENT PHOTOS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS patient_photos (
  id          BIGSERIAL PRIMARY KEY,
  patient_id  BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  label       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE patient_photos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_photos' AND policyname = 'anon_all_patient_photos') THEN
    CREATE POLICY "anon_all_patient_photos" ON patient_photos FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_photos' AND policyname = 'auth_all_patient_photos') THEN
    CREATE POLICY "auth_all_patient_photos" ON patient_photos FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── ANAMNESIS ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS anamnesis (
  id                   BIGSERIAL PRIMARY KEY,
  patient_id           BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  main_complaint       TEXT,
  medical_history      TEXT,
  medications          TEXT,
  allergies            TEXT,
  food_aversions       TEXT,
  food_preferences     TEXT,
  meals_per_day        SMALLINT,
  water_intake         TEXT,
  physical_activity    TEXT,
  sleep_hours          NUMERIC(4,1),
  bowel_function       TEXT,
  goals                TEXT,
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (patient_id)
);

-- Rename old column names if the table was created with the previous schema
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anamnesis' AND column_name = 'chief_complaint') THEN
    ALTER TABLE anamnesis RENAME COLUMN chief_complaint TO main_complaint;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anamnesis' AND column_name = 'current_medications') THEN
    ALTER TABLE anamnesis RENAME COLUMN current_medications TO medications;
  END IF;
END $$;

ALTER TABLE anamnesis ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'anamnesis' AND policyname = 'anon_all_anamnesis') THEN
    CREATE POLICY "anon_all_anamnesis" ON anamnesis FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'anamnesis' AND policyname = 'auth_all_anamnesis') THEN
    CREATE POLICY "auth_all_anamnesis" ON anamnesis FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── MEASUREMENTS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS measurements (
  id               BIGSERIAL PRIMARY KEY,
  patient_id       BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  assessment_date  DATE NOT NULL,
  weight           NUMERIC(5,2),
  height           NUMERIC(5,2),
  waist            NUMERIC(5,2),
  hip              NUMERIC(5,2),
  arm              NUMERIC(5,2),
  neck             NUMERIC(5,2),
  body_fat         NUMERIC(5,2),
  lean_mass        NUMERIC(5,2),
  visceral_fat     NUMERIC(5,2),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'measurements' AND policyname = 'anon_all_measurements') THEN
    CREATE POLICY "anon_all_measurements" ON measurements FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'measurements' AND policyname = 'auth_all_measurements') THEN
    CREATE POLICY "auth_all_measurements" ON measurements FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── MEAL PLANS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meal_plans (
  id               BIGSERIAL PRIMARY KEY,
  patient_id       BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title            TEXT NOT NULL DEFAULT 'Plano Alimentar',
  start_date       DATE,
  end_date         DATE,
  daily_calories   NUMERIC(6,0),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meal_plans' AND policyname = 'anon_all_meal_plans') THEN
    CREATE POLICY "anon_all_meal_plans" ON meal_plans FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meal_plans' AND policyname = 'auth_all_meal_plans') THEN
    CREATE POLICY "auth_all_meal_plans" ON meal_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── MEALS ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meals (
  id               BIGSERIAL PRIMARY KEY,
  plan_id          BIGINT NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  meal_name        TEXT NOT NULL,
  time_suggestion  TEXT,
  notes            TEXT,
  sort_order       SMALLINT DEFAULT 0
);

-- Add notes column if the table already existed without it
ALTER TABLE meals ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meals' AND policyname = 'anon_all_meals') THEN
    CREATE POLICY "anon_all_meals" ON meals FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meals' AND policyname = 'auth_all_meals') THEN
    CREATE POLICY "auth_all_meals" ON meals FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── MEAL FOODS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meal_foods (
  id               BIGSERIAL PRIMARY KEY,
  meal_id          BIGINT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  food_name        TEXT NOT NULL,
  quantity         NUMERIC(8,2),
  unit             TEXT DEFAULT 'g',
  calories         NUMERIC(7,2),
  protein          NUMERIC(6,2),
  carbs            NUMERIC(6,2),
  fat              NUMERIC(6,2),
  notes            TEXT,
  sort_order       SMALLINT DEFAULT 0,
  kcal_per_100g    NUMERIC(7,2),
  protein_per_100g NUMERIC(6,2),
  carbs_per_100g   NUMERIC(6,2),
  fat_per_100g     NUMERIC(6,2)
);

ALTER TABLE meal_foods ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meal_foods' AND policyname = 'anon_all_meal_foods') THEN
    CREATE POLICY "anon_all_meal_foods" ON meal_foods FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meal_foods' AND policyname = 'auth_all_meal_foods') THEN
    CREATE POLICY "auth_all_meal_foods" ON meal_foods FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
