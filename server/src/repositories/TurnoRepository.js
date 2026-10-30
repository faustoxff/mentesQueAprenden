const { datosDe, datosOpcionales } = require('./errores');

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

  async listarDePaciente(db, pacienteId) {
    return datosDe(await db
      .from('turnos')
      .select(`
        id, fecha_inicio, fecha_fin, estado, tipo, notas,
        profesional:profesionales!profesional_id(id, nombre, apellido)
      `)
      .eq('paciente_id', pacienteId)
      .order('fecha_inicio', { ascending: false }));
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

  // Inserta o modifica sin pedir la fila de vuelta (un UPDATE que RLS no deja ver no falla).
  async insertarSinDevolver(db, turno) {
    datosDe(await db.from('turnos').insert(turno));
  }

  async actualizarSinDevolver(db, id, cambios) {
    datosDe(await db.from('turnos').update(cambios).eq('id', id));
  }

  // true si el consultorio está libre en el rango (función de la migración 008, que ve
  // los turnos de todos pero solo responde sí o no).
  async consultorioLibre(db, { consultorio, desde, hasta, excluirTurnoId }) {
    return datosDe(await db.rpc('consultorio_libre', {
      p_consultorio: consultorio,
      p_inicio: desde,
      p_fin: hasta,
      p_excluir: excluirTurnoId || null
    }));
  }

  // Camino anterior a la migración 008: algún turno activo que se superponga con el
  // rango, o null si no se pudo leer.
  async superpuestosSinFuncion(db, { consultorio, desde, hasta, excluirTurnoId }) {
    let q = db
      .from('turnos')
      .select('id')
      .eq('consultorio', consultorio)
      .neq('estado', 'cancelado')
      .lt('fecha_inicio', hasta)
      .gt('fecha_fin', desde);
    if (excluirTurnoId) q = q.neq('id', excluirTurnoId);
    return datosOpcionales(await q.limit(1));
  }

  // Turno activo vinculado a la sesión (a lo sumo uno), o null si no se pudo leer.
  async activosDeSesion(db, sesionId) {
    return datosOpcionales(await db
      .from('turnos')
      .select('id, fecha_inicio, consultorio')
      .eq('sesion_id', sesionId)
      .neq('estado', 'cancelado')
      .limit(1));
  }

  // Turnos activos sin sesión del mismo paciente y profesional en el rango, o null si no se pudo leer.
  async sinSesionEnRango(db, { pacienteId, profesionalId, desde, hasta }) {
    return datosOpcionales(await db
      .from('turnos')
      .select('id, fecha_inicio, consultorio')
      .is('sesion_id', null)
      .neq('estado', 'cancelado')
      .eq('paciente_id', pacienteId)
      .eq('profesional_id', profesionalId)
      .gte('fecha_inicio', desde)
      .lte('fecha_inicio', hasta));
  }

  async cancelar(db, id) {
    datosDe(await db
      .from('turnos')
      .update({ estado: 'cancelado' })
      .eq('id', id));
  }
}

module.exports = new TurnoRepository();
