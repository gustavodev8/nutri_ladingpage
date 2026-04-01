CREATE TABLE IF NOT EXISTS payment_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  payment_id TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  product_name TEXT,
  product_index INTEGER,
  amount NUMERIC,
  status TEXT DEFAULT 'approved',
  pdf_url TEXT
);

ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read payment_logs"
  ON payment_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert payment_logs"
  ON payment_logs FOR INSERT
  TO service_role
  WITH CHECK (true);
