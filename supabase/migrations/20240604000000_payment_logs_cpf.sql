-- Migração para adicionar hash do CPF nos logs de pagamento
-- Execute este script no SQL Editor do seu projeto Supabase

ALTER TABLE payment_logs 
ADD COLUMN IF NOT EXISTS customer_cpf_hash TEXT;

-- Adicionar um índice para deixar a verificação de elegibilidade (bônus) mais rápida
CREATE INDEX IF NOT EXISTS idx_payment_logs_cpf_hash ON payment_logs(customer_cpf_hash);

-- Comentário para documentação
COMMENT ON COLUMN payment_logs.customer_cpf_hash IS 'Hash SHA-256 do CPF do cliente. Usado para validar a elegibilidade do bônus de consulta gratuita.';
