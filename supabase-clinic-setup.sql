-- ================================================================
-- NutriVida — Setup das tabelas clínicas
-- Execute este SQL no Supabase > SQL Editor
-- ================================================================

-- ─── PATIENTS ────────────────────────────────────────────────────────────────

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

CREATE POLICY "anon_all_patients" ON patients
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ─── ANAMNESIS ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS anamnesis (
  id                   BIGSERIAL PRIMARY KEY,
  patient_id           BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  chief_complaint      TEXT,
  medical_history      TEXT,
  current_medications  TEXT,
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

ALTER TABLE anamnesis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_anamnesis" ON anamnesis
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ─── MEASUREMENTS (Antropometria) ─────────────────────────────────────────────

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

CREATE POLICY "anon_all_measurements" ON measurements
  FOR ALL TO anon USING (true) WITH CHECK (true);

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

CREATE POLICY "anon_all_meal_plans" ON meal_plans
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ─── MEALS ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meals (
  id               BIGSERIAL PRIMARY KEY,
  plan_id          BIGINT NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  meal_name        TEXT NOT NULL,
  time_suggestion  TEXT,
  sort_order       SMALLINT DEFAULT 0
);

ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_meals" ON meals
  FOR ALL TO anon USING (true) WITH CHECK (true);

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

CREATE POLICY "anon_all_meal_foods" ON meal_foods
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ─── AVAILABILITY SLOTS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS availability_slots (
  id          BIGSERIAL PRIMARY KEY,
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('online', 'presencial')),
  active      BOOLEAN DEFAULT TRUE,
  UNIQUE (date, start_time, type)
);

ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_slots" ON availability_slots
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_write_slots" ON availability_slots
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ─── BOOKINGS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bookings (
  id                BIGSERIAL PRIMARY KEY,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  booking_group_id  TEXT NOT NULL,
  session_number    SMALLINT NOT NULL DEFAULT 1,
  total_sessions    SMALLINT NOT NULL DEFAULT 1,
  client_name       TEXT NOT NULL,
  client_email      TEXT NOT NULL,
  client_phone      TEXT,
  plan_name         TEXT,
  plan_index        SMALLINT,
  appointment_date  DATE NOT NULL,
  appointment_time  TIME NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('online', 'presencial')),
  status            TEXT DEFAULT 'pending',
  notes             TEXT,
  completed_at      TIMESTAMPTZ,
  UNIQUE (booking_group_id, session_number)
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_bookings" ON bookings
  FOR SELECT TO anon USING (true);

CREATE POLICY "public_insert_bookings" ON bookings
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_bookings" ON bookings
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ─── CONSULTATION RECORDS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS consultation_records (
  id                BIGSERIAL PRIMARY KEY,
  booking_id        BIGINT REFERENCES bookings(id) ON DELETE SET NULL,
  booking_group_id  TEXT,
  session_number    SMALLINT,
  client_name       TEXT,
  client_email      TEXT,
  notes             TEXT,
  weight            NUMERIC(5,2),
  height            NUMERIC(5,2),
  next_return_date  DATE,
  next_steps        TEXT,
  files             JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consultation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_consultation_records" ON consultation_records
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ─── BLOG POSTS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blog_posts (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  title            TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  content          TEXT NOT NULL,
  cover_image_url  TEXT,
  font             TEXT DEFAULT 'sans',
  published        BOOLEAN DEFAULT FALSE NOT NULL
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_published_posts" ON blog_posts
  FOR SELECT TO anon USING (published = true);

CREATE POLICY "anon_write_posts" ON blog_posts
  FOR ALL TO anon USING (true) WITH CHECK (true);
