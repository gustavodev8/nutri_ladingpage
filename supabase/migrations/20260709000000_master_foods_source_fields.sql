-- Adds source traceability to the master food catalog so large imports can be
-- tracked back to TACO, CSV exports, or custom entries.

ALTER TABLE master_foods
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS source_ref TEXT,
  ADD COLUMN IF NOT EXISTS source_code TEXT;

CREATE INDEX IF NOT EXISTS idx_master_foods_source ON master_foods (source);
CREATE INDEX IF NOT EXISTS idx_master_foods_lower_name ON master_foods (LOWER(name));
