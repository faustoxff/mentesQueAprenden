-- ============================================================
-- 010 — Se saca el porcentaje de honorarios
--
-- Pedido del equipo: el reparto de honorarios entre profesional y espacio
-- (y la liquidación mensual que lo usaba) nunca lo pidió el cliente.
-- Un pago queda solo con su monto total.
--
-- IMPORTANTE:
-- * Correr DESPUÉS de publicar el código que ya no usa estas columnas
--   (si el server viejo sigue andando, los cobros fallarían).
-- * Borra datos y no se puede deshacer: los montos repartidos de los pagos
--   ya registrados y el porcentaje de cada profesional se pierden.
-- ============================================================

BEGIN;

-- 1) El trigger de la migración 008 copiaba porcentaje_honorarios: se recrea sin ese campo.
--    Un profesional sigue sin poder cambiarse rol, estado ni email.
CREATE OR REPLACE FUNCTION proteger_campos_profesional()
RETURNS TRIGGER AS $$
BEGIN
  -- auth.uid() es NULL cuando escribe el backend con service role: ahí se permite todo.
  IF auth.uid() IS NOT NULL AND NOT es_admin() THEN
    NEW.rol := OLD.rol;
    NEW.activo := OLD.activo;
    NEW.email := OLD.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Columnas que solo servían para el reparto.
ALTER TABLE profesionales DROP COLUMN IF EXISTS porcentaje_honorarios;

ALTER TABLE pagos
  DROP COLUMN IF EXISTS monto_profesional,
  DROP COLUMN IF EXISTS monto_espacio,
  DROP COLUMN IF EXISTS porcentaje_profesional;

ALTER TABLE configuracion_espacio DROP COLUMN IF EXISTS porcentaje_espacio_default;

COMMIT;
