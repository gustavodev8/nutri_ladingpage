-- Link bookings to patients via CPF
ALTER TABLE patients ADD COLUMN IF NOT EXISTS cpf TEXT UNIQUE;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_cpf TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_id BIGINT REFERENCES patients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_patient_id ON bookings (patient_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_cpf  ON bookings (client_cpf);
