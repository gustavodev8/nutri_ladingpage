-- Epic 6: Adiciona coluna JSONB para triagem clínica estruturada
-- Mantém as colunas de texto legado intactas para compatibilidade

ALTER TABLE anamnesis
  ADD COLUMN IF NOT EXISTS structured_data JSONB DEFAULT '{}';

COMMENT ON COLUMN anamnesis.structured_data IS
  'Respostas estruturadas da triagem clínica (booleans + enums). '
  'Chaves: goal_*, diet_*, training_*, habit_*, clinical_*, exam_*';
