-- Normalized key to prevent near-duplicate food names from being inserted.
-- It removes accents, punctuation and whitespace so
-- "Arroz, branco, cozido" and "Arroz branco cozido" collapse to the same key.

ALTER TABLE master_foods
  ADD COLUMN IF NOT EXISTS name_key TEXT;

UPDATE master_foods
SET name_key = lower(
  regexp_replace(
    translate(
      coalesce(name, ''),
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
    ),
    '[^a-zA-Z0-9]+',
    '',
    'g'
  )
)
WHERE name_key IS NULL OR name_key = '';

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY name_key
      ORDER BY
        CASE WHEN source = 'taco_csv' THEN 0 ELSE 1 END,
        id
    ) AS rn
  FROM master_foods
  WHERE name_key IS NOT NULL AND name_key <> ''
)
DELETE FROM master_foods
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE rn > 1
);

ALTER TABLE master_foods
  ALTER COLUMN name_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_master_foods_name_key
  ON master_foods (name_key);
