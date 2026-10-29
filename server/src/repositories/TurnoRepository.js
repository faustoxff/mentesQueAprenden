const { datosDe } = require('./errores');

// Consultas a la tabla `turnos`. Reciben `db`, el cliente con el token del profesional,
// así que RLS decide qué filas se ven.
class TurnoRepository {
  async listar(db, { desde, hasta, profesionalId, incluirCancelados }) {
    let q = db
      .from('turnos')
      .select(`
        id, fecha_inicio, fecha_fin, estado, tipo, notas, consultorio, recordatorio_enviado,
        paciente_id,
        paciente:pacientes(id, nombre, apellido, telefono),
        profesional:profesionales!profesional_id(id, nombre, apellido, especialidad),
        sesion:sesiones(id)
      `)
      .order('fecha_inicio', { ascending: true });

    if (!incluirCancelados) q = q.neq('estado', 'cancelado');
    if (desde) q = q.gte('fecha_inicio', desde);
    if (hasta) q = q.lte('fecha_inicio', hasta);
    if (profesionalId) q = q.eq('profesional_id', profesionalId);

    return datosDe(await q);
  }

  // Ocupación de los consultorios de todos los profesionales, sin datos clínicos
  // (función de la migración 008).
  async ocupacion(db, { desde, hasta }) {
    return datosDe(await db.rpc('turnos_ocupacion', { p_desde: desde || null, p_hasta: hasta || null }));
  }

  // Camino anterior a la migración 008 (la policy dejaba leer todos los turnos): solo
  // se piden las columnas que no son datos clínicos.
  async ocupacionSinFuncion(db, { desde, hasta, profesionalId }) {
    let q = db
      .from('turnos')
      .select('id, fecha_inicio, fecha_fin, estado, consultorio, profesional:profesionales!profesional_id(id, nombre, apellido)')
      .neq('estado', 'cancelado');
    if (desde) q = q.gte('fecha_inicio', desde);
    if (hasta) q = q.lte('fecha_inicio', hasta);
    if (profesionalId) q = q.eq('profesional_id', profesionalId);

    return datosDe(await q);
  }

  async crear(db, turno) {
    return datosDe(await db
      .from('turnos')
      .insert(turno)
      .select(`
        *,
        paciente:pacientes(id, nombre, apellido, telefono),
        profesional:profesionales!profesional_id(id, nombre, apellido)
      `)
      .single());
  }

  async actualizar(db, id, cambios) {
    return datosDe(await db
      .from('turnos')
      .update(cambios)
      .eq('id', id)
      .select()
      .single());
  }

  async cancelar(db, id) {
    datosDe(await db
      .from('turnos')
      .update({ estado: 'cancelado' })
      .eq('id', id));
  }
}

module.exports = new TurnoRepository();
