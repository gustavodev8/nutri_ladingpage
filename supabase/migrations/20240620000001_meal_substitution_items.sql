-- Epic 14b: sub-itens de substituição por refeição
ALTER TABLE meals ADD COLUMN IF NOT EXISTS substitution_items JSONB NOT NULL DEFAULT '[]'::jsonb;
