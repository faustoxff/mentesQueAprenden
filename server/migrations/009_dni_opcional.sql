-- ============================================================
-- 009 — El DNI del paciente pasa a ser opcional
--
-- Pedido del equipo: se puede dar de alta un paciente sin DNI.
-- Sigue siendo UNIQUE: dos pacientes no pueden tener el mismo DNI, pero
-- varios pueden no tenerlo (en Postgres los NULL no chocan entre sí).
-- El server guarda "sin DNI" como NULL, nunca como texto vacío ('' sí chocaría).
-- ============================================================

ALTER TABLE pacientes ALTER COLUMN dni DROP NOT NULL;

-- Por si alguna fila quedó con texto vacío o solo espacios.
UPDATE pacientes SET dni = NULL WHERE btrim(dni) = '';
