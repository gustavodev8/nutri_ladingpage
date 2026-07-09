-- Allow ready formulas to store custom item names and optional substrate references.
ALTER TABLE formula_items
  ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE formula_items
  ALTER COLUMN substrate_id DROP NOT NULL;

UPDATE formula_items fi
SET name = COALESCE(fi.name, s.name)
FROM substrates s
WHERE fi.substrate_id = s.id
  AND fi.name IS NULL;

