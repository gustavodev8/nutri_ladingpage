ALTER TABLE payment_logs ADD COLUMN IF NOT EXISTS customer_cpf_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_logs_cpf_hash
  ON payment_logs (customer_cpf_hash)
  WHERE customer_cpf_hash IS NOT NULL;
