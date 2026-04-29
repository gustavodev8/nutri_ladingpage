-- Migração para adicionar campos detalhados de antropometria
-- Execute este script no SQL Editor do seu projeto Supabase

ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS shoulder FLOAT,
ADD COLUMN IF NOT EXISTS chest FLOAT,
ADD COLUMN IF NOT EXISTS abdomen FLOAT,
ADD COLUMN IF NOT EXISTS arm_relax_r FLOAT,
ADD COLUMN IF NOT EXISTS arm_relax_l FLOAT,
ADD COLUMN IF NOT EXISTS arm_contract_r FLOAT,
ADD COLUMN IF NOT EXISTS arm_contract_l FLOAT,
ADD COLUMN IF NOT EXISTS forearm_r FLOAT,
ADD COLUMN IF NOT EXISTS forearm_l FLOAT,
ADD COLUMN IF NOT EXISTS wrist_r FLOAT,
ADD COLUMN IF NOT EXISTS wrist_l FLOAT,
ADD COLUMN IF NOT EXISTS calf_r FLOAT,
ADD COLUMN IF NOT EXISTS calf_l FLOAT,
ADD COLUMN IF NOT EXISTS thigh_r FLOAT,
ADD COLUMN IF NOT EXISTS thigh_l FLOAT,
ADD COLUMN IF NOT EXISTS thigh_prox_r FLOAT,
ADD COLUMN IF NOT EXISTS thigh_prox_l FLOAT;

-- Comentários para documentação no banco de dados
COMMENT ON COLUMN measurements.shoulder IS 'Circunferência do ombro';
COMMENT ON COLUMN measurements.chest IS 'Circunferência peitoral';
COMMENT ON COLUMN measurements.abdomen IS 'Circunferência abdominal';
COMMENT ON COLUMN measurements.arm_relax_r IS 'Braço relaxado direito';
COMMENT ON COLUMN measurements.arm_relax_l IS 'Braço relaxado esquerdo';
COMMENT ON COLUMN measurements.arm_contract_r IS 'Braço contraído direito';
COMMENT ON COLUMN measurements.arm_contract_l IS 'Braço contraído esquerdo';
COMMENT ON COLUMN measurements.forearm_r IS 'Antebraço direito';
COMMENT ON COLUMN measurements.forearm_l IS 'Antebraço esquerdo';
COMMENT ON COLUMN measurements.wrist_r IS 'Punho direito';
COMMENT ON COLUMN measurements.wrist_l IS 'Punho esquerdo';
COMMENT ON COLUMN measurements.calf_r IS 'Panturrilha direita';
COMMENT ON COLUMN measurements.calf_l IS 'Panturrilha esquerda';
COMMENT ON COLUMN measurements.thigh_r IS 'Coxa direita';
COMMENT ON COLUMN measurements.thigh_l IS 'Coxa esquerda';
COMMENT ON COLUMN measurements.thigh_prox_r IS 'Coxa proximal direita';
COMMENT ON COLUMN measurements.thigh_prox_l IS 'Coxa proximal esquerda';
