-- ================================================================
-- NutriVida — Setup do banco Supabase
-- Execute este SQL no Supabase > SQL Editor
-- ================================================================

-- 1. Criar tabela
CREATE TABLE IF NOT EXISTS site_content (
  id         INTEGER PRIMARY KEY DEFAULT 1,
  content    JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- 2. Inserir linha inicial vazia (o app preenche com os defaults)
INSERT INTO site_content (id, content)
VALUES (1, '{}')
ON CONFLICT (id) DO NOTHING;

-- 3. Habilitar Row Level Security
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- 4. Política: qualquer um pode LER (necessário para o site público)
CREATE POLICY "public_read"
  ON site_content
  FOR SELECT
  USING (true);

-- 5. Política: qualquer um pode ATUALIZAR (o admin é protegido pela senha do app)
--    Obs: a chave anon só permite INSERT/UPDATE, nunca DELETE da única linha.
CREATE POLICY "public_update"
  ON site_content
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_upsert"
  ON site_content
  FOR INSERT
  WITH CHECK (true);
