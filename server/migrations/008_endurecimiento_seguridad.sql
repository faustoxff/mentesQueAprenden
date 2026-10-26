-- ============================================================
-- 008 — Endurecimiento de seguridad
--
-- Cierra los agujeros que se podían explotar pegándole directo a PostgREST
-- con la anon key (que va en el bundle del cliente):
--   1. profesionales, obras_sociales y configuracion_espacio no tenían RLS activada.
--   2. Un profesional podía cambiarse el rol a admin (profesionales_update_own).
--   3. turnos_select USING (true) exponía paciente_id y notas de todos.
--   4. Los INSERT de sesiones, archivos, evaluaciones, derivaciones, turnos y pagos
--      no validaban que el paciente fuera accesible para quien inserta.
--   5. archivos_adjuntos no tenía policy de DELETE.
--   6. Cualquiera con acceso por derivación podía quedarse con la titularidad
--      de un paciente.
--
-- IMPORTANTE: probar primero en una base de pruebas. Después de aplicarla hay
-- que desplegar el backend de esta misma rama (TurnoService usa las funciones
-- turnos_ocupacion y consultorio_libre que se crean acá).
-- ============================================================

-- ------------------------------------------------------------
-- Helper: ¿el usuario actual puede acceder a este paciente?
-- Mismo criterio que pacientes_select (titular o derivación aceptada),
-- sin excepción para admin: los pacientes son privados por profesional (004).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION puede_acceder_paciente(p_paciente_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pacientes p
    WHERE p.id = p_paciente_id
      AND p.deleted_at IS NULL
      AND (p.profesional_principal_id = auth.uid()
           OR tiene_acceso_por_derivacion(p.id, auth.uid()))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- 1) RLS en las tablas que no la tenían
-- ------------------------------------------------------------
ALTER TABLE profesionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras_sociales ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_espacio ENABLE ROW LEVEL SECURITY;

-- Solo usuarios logueados ven la lista de colegas (antes: USING (true), también anónimos).
DROP POLICY IF EXISTS profesionales_select ON profesionales;
CREATE POLICY profesionales_select ON profesionales
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Catálogo de obras sociales: solo lectura para usuarios logueados.
DROP POLICY IF EXISTS obras_sociales_select ON obras_sociales;
CREATE POLICY obras_sociales_select ON obras_sociales
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- configuracion_espacio guarda el token de WhatsApp: solo admin la lee; las
-- escrituras van por el backend con service role (que ignora RLS).
DROP POLICY IF EXISTS configuracion_select_admin ON configuracion_espacio;
CREATE POLICY configuracion_select_admin ON configuracion_espacio
  FOR SELECT USING (es_admin());

-- ------------------------------------------------------------
-- 2) Un profesional no puede cambiarse rol, estado ni honorarios
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION proteger_campos_profesional()
RETURNS TRIGGER AS $$
BEGIN
  -- auth.uid() es NULL cuando escribe el backend con service role: ahí se permite todo.
  IF auth.uid() IS NOT NULL AND NOT es_admin() THEN
    NEW.rol := OLD.rol;
    NEW.activo := OLD.activo;
    NEW.porcentaje_honorarios := OLD.porcentaje_honorarios;
    NEW.email := OLD.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_proteger_campos_profesional ON profesionales;
CREATE TRIGGER trg_proteger_campos_profesional
  BEFORE UPDATE ON profesionales
  FOR EACH ROW EXECUTE FUNCTION proteger_campos_profesional();

-- ------------------------------------------------------------
-- 3) Turnos: volver a la policy restrictiva y exponer la ocupación por función
-- ------------------------------------------------------------
DROP POLICY IF EXISTS turnos_select ON turnos;
CREATE POLICY turnos_select ON turnos
  FOR SELECT USING (
    es_admin()
    OR profesional_id = auth.uid()
    OR (paciente_id IS NOT NULL AND tiene_acceso_por_derivacion(paciente_id, auth.uid()))
  );

-- Calendario compartido: SOLO fecha/hora, consultorio, estado y profesional.
-- Nunca paciente_id ni notas.
CREATE OR REPLACE FUNCTION turnos_ocupacion(p_desde TIMESTAMPTZ, p_hasta TIMESTAMPTZ)
RETURNS TABLE (
  id UUID, fecha_inicio TIMESTAMPTZ, fecha_fin TIMESTAMPTZ, estado TEXT,
  consultorio INT, profesional_id UUID, profesional_nombre TEXT, profesional_apellido TEXT
) AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT t.id, t.fecha_inicio, t.fecha_fin, t.estado::TEXT, t.consultorio::INT,
           t.profesional_id, pr.nombre::TEXT, pr.apellido::TEXT
    FROM turnos t
    JOIN profesionales pr ON pr.id = t.profesional_id
    WHERE t.estado::TEXT <> 'cancelado'
      AND (p_desde IS NULL OR t.fecha_inicio >= p_desde)
      AND (p_hasta IS NULL OR t.fecha_inicio <= p_hasta);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ¿Está libre el consultorio en ese horario? (para avisar antes de insertar)
CREATE OR REPLACE FUNCTION consultorio_libre(
  p_consultorio INT, p_inicio TIMESTAMPTZ, p_fin TIMESTAMPTZ, p_excluir UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM turnos t
    WHERE t.consultorio = p_consultorio
      AND t.estado::TEXT <> 'cancelado'
      AND t.fecha_inicio < p_fin
      AND t.fecha_fin > p_inicio
      AND (p_excluir IS NULL OR t.id <> p_excluir)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

REVOKE ALL ON FUNCTION turnos_ocupacion(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION consultorio_libre(INT, TIMESTAMPTZ, TIMESTAMPTZ, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION turnos_ocupacion(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION consultorio_libre(INT, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;

-- ------------------------------------------------------------
-- 4) INSERT: el paciente tiene que ser accesible para quien inserta
-- ------------------------------------------------------------
DROP POLICY IF EXISTS sesiones_insert ON sesiones;
CREATE POLICY sesiones_insert ON sesiones
  FOR INSERT WITH CHECK (
    (es_admin() OR profesional_id = auth.uid())
    AND puede_acceder_paciente(paciente_id)
  );

DROP POLICY IF EXISTS archivos_insert ON archivos_adjuntos;
CREATE POLICY archivos_insert ON archivos_adjuntos
  FOR INSERT WITH CHECK (
    (es_admin() OR subido_por = auth.uid())
    AND puede_acceder_paciente(paciente_id)
  );

DROP POLICY IF EXISTS evaluaciones_insert ON evaluaciones;
CREATE POLICY evaluaciones_insert ON evaluaciones
  FOR INSERT WITH CHECK (
    (es_admin() OR profesional_id = auth.uid())
    AND puede_acceder_paciente(paciente_id)
  );

DROP POLICY IF EXISTS derivaciones_insert ON derivaciones;
CREATE POLICY derivaciones_insert ON derivaciones
  FOR INSERT WITH CHECK (
    (es_admin() OR profesional_origen_id = auth.uid())
    AND puede_acceder_paciente(paciente_id)
  );

DROP POLICY IF EXISTS turnos_insert ON turnos;
CREATE POLICY turnos_insert ON turnos
  FOR INSERT WITH CHECK (
    (es_admin() OR profesional_id = auth.uid())
    AND (paciente_id IS NULL OR puede_acceder_paciente(paciente_id))
  );

-- Un pago solo se registra sobre una sesión propia (o de cualquiera, si sos admin).
DROP POLICY IF EXISTS pagos_insert ON pagos;
CREATE POLICY pagos_insert ON pagos
  FOR INSERT WITH CHECK (
    (es_admin() OR registrado_por = auth.uid())
    AND EXISTS (
      SELECT 1 FROM sesiones s
      WHERE s.id = sesion_id
        AND (es_admin() OR s.profesional_id = auth.uid())
    )
  );

-- ------------------------------------------------------------
-- 5) Archivos: poder borrar la metadata (antes RLS devolvía 0 filas sin error)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS archivos_delete ON archivos_adjuntos;
CREATE POLICY archivos_delete ON archivos_adjuntos
  FOR DELETE USING (es_admin() OR subido_por = auth.uid());

-- ------------------------------------------------------------
-- 6) La titularidad de un paciente solo la cambia un admin
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION proteger_titularidad_paciente()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.profesional_principal_id IS DISTINCT FROM OLD.profesional_principal_id
     AND NOT es_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede reasignar el profesional principal de un paciente'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_proteger_titularidad_paciente ON pacientes;
CREATE TRIGGER trg_proteger_titularidad_paciente
  BEFORE UPDATE ON pacientes
  FOR EACH ROW EXECUTE FUNCTION proteger_titularidad_paciente();
