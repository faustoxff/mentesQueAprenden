-- ============================================================
-- 011 — Restaura las columnas de cobro que se borraron por error
--
-- El 2026-11-27, además de lo que borraba la 010, desaparecieron de la base
-- columnas que el código sí usa. Sin ellas fallan la agenda, las sesiones,
-- el chat y los cobros:
--   sesiones.pagado, sesiones.fecha_pago, sesiones.metodo_pago
--   pagos.numero_comprobante
-- Se vuelven a crear con la misma definición de la 001.
--
-- El estado de pago de cada sesión se reconstruye desde la tabla `pagos`
-- (cada cobro guarda su sesion_id, su fecha y su método). Lo que no se
-- puede recuperar: una sesión marcada como pagada a mano sin un cobro
-- registrado, y los números de comprobante ya cargados.
--
-- También desaparecieron estas, que el código no usa (WhatsApp, descartado,
-- y la factura): quedan borradas y se dejan anotadas acá para que las
-- migraciones reflejen la base real.
--   turnos.recordatorio_enviado, turnos.recordatorio_enviado_at
--   sesiones.numero_factura
--   configuracion_espacio.whatsapp_api_token, configuracion_espacio.whatsapp_phone_id
-- ============================================================

BEGIN;

ALTER TABLE sesiones
  ADD COLUMN IF NOT EXISTS pagado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50);

ALTER TABLE pagos ADD COLUMN IF NOT EXISTS numero_comprobante VARCHAR(100);

-- Las sesiones con un cobro registrado vuelven a quedar pagadas, con su fecha y método.
UPDATE sesiones s
SET pagado = true, fecha_pago = p.fecha_pago, metodo_pago = p.metodo_pago
FROM pagos p
WHERE p.sesion_id = s.id;

-- Lo que el código no usa queda borrado (no hace nada si ya no existe).
ALTER TABLE turnos
  DROP COLUMN IF EXISTS recordatorio_enviado,
  DROP COLUMN IF EXISTS recordatorio_enviado_at;
ALTER TABLE sesiones DROP COLUMN IF EXISTS numero_factura;
ALTER TABLE configuracion_espacio
  DROP COLUMN IF EXISTS whatsapp_api_token,
  DROP COLUMN IF EXISTS whatsapp_phone_id;

COMMIT;
