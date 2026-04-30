-- Add city column to availability_slots for per-city presencial scheduling
ALTER TABLE availability_slots ADD COLUMN IF NOT EXISTS city TEXT;

-- Drop the old unique constraint (date, start_time, type) and replace with
-- partial unique indexes so online and presencial-per-city are handled correctly.
ALTER TABLE availability_slots DROP CONSTRAINT IF EXISTS availability_slots_date_start_time_type_key;

-- Online: one slot per (date, start_time) regardless of city
CREATE UNIQUE INDEX IF NOT EXISTS uniq_slot_online
  ON availability_slots (date, start_time, type)
  WHERE type = 'online';

-- Presencial: one slot per (date, start_time, city)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_slot_presencial
  ON availability_slots (date, start_time, type, city)
  WHERE type = 'presencial';
