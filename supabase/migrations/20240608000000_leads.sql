CREATE TABLE IF NOT EXISTS leads (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'popup',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email ON leads (email);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_leads" ON leads
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "authenticated_all_leads" ON leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
