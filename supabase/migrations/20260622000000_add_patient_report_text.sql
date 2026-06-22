-- ================================================================
-- Add dedicated clinical report field to patients
-- Keeps admin profile notes separate from evolution/report text.
-- ================================================================

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS report_text TEXT;
