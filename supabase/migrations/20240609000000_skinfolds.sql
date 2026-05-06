-- Adiciona dobras cutâneas e protocolo de cálculo à tabela measurements
-- Execute no Supabase SQL Editor

ALTER TABLE measurements
  ADD COLUMN IF NOT EXISTS sf_pectoral     FLOAT,
  ADD COLUMN IF NOT EXISTS sf_midaxillary  FLOAT,
  ADD COLUMN IF NOT EXISTS sf_triceps      FLOAT,
  ADD COLUMN IF NOT EXISTS sf_biceps       FLOAT,
  ADD COLUMN IF NOT EXISTS sf_subscapular  FLOAT,
  ADD COLUMN IF NOT EXISTS sf_suprailiac   FLOAT,
  ADD COLUMN IF NOT EXISTS sf_abdominal    FLOAT,
  ADD COLUMN IF NOT EXISTS sf_thigh_sf     FLOAT,
  ADD COLUMN IF NOT EXISTS sf_calf_sf      FLOAT,
  ADD COLUMN IF NOT EXISTS sf_protocol     TEXT,
  ADD COLUMN IF NOT EXISTS body_density    FLOAT;

COMMENT ON COLUMN measurements.sf_pectoral    IS 'Dobra cutânea peitoral (mm)';
COMMENT ON COLUMN measurements.sf_midaxillary IS 'Dobra cutânea axilar média (mm)';
COMMENT ON COLUMN measurements.sf_triceps     IS 'Dobra cutânea tríceps (mm)';
COMMENT ON COLUMN measurements.sf_biceps      IS 'Dobra cutânea bíceps (mm)';
COMMENT ON COLUMN measurements.sf_subscapular IS 'Dobra cutânea subescapular (mm)';
COMMENT ON COLUMN measurements.sf_suprailiac  IS 'Dobra cutânea suprailíaca (mm)';
COMMENT ON COLUMN measurements.sf_abdominal   IS 'Dobra cutânea abdominal (mm)';
COMMENT ON COLUMN measurements.sf_thigh_sf    IS 'Dobra cutânea coxa (mm)';
COMMENT ON COLUMN measurements.sf_calf_sf     IS 'Dobra cutânea panturrilha (mm)';
COMMENT ON COLUMN measurements.sf_protocol    IS 'Protocolo usado: JP3M | JP3F | JP7M | JP7F | GUEDES_M | GUEDES_F';
COMMENT ON COLUMN measurements.body_density   IS 'Densidade corporal calculada pelo protocolo (g/mL)';
