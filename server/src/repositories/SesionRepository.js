const { supabaseAdmin } = require('../config/supabase');
const { datosDe, datosOpcionales } = require('./errores');

// Consultas a la tabla `sesiones`. Las que reciben `db` usan el cliente con el token del
// profesional (RLS decide qué filas se ven); las que terminan en `ComoAdmin` usan el
// cliente de servicio y solo se llaman después de verificar el acceso.
class SesionRepository {
  // Detalle de la sesión con paciente, profesional y sus turnos.
  async obtenerDetalle(db, id) {
    return datosDe(await db
      .from('sesiones')
      .select(`
        *,
        paciente:pacientes(id, nombre, apellido, dni, fecha_nacimiento),
        profesional:profesionales!profesional_id(id, nombre, apellido, especialidad),
        turnos(id, consultorio, estado)
      `)
      .eq('id', id)
      .single());
  }

  async obtener(db, id, campos = '*') {
    return datosDe(await db.from('sesiones').select(campos).eq('id', id).single());
  }

  // Sesiones registradas por el profesional, de la más reciente a la más vieja.
  async listarDelProfesional(db, profesionalId, { pacienteId, hasta, limite }) {
    let q = db
      .from('sesiones')
      .select('id, fecha, tipo, duracion_minutos, pagado, paciente:pacientes(id, nombre, apellido)')
      .eq('profesional_id', profesionalId)
      .order('fecha', { ascending: false })
      .limit(limite);

    if (pacienteId) q = q.eq('paciente_id', pacienteId);
    if (hasta) q = q.lte('fecha', hasta);

    return datosDe(await q);
  }

  // Columnas pedidas de la sesión, o null si no está (o no se pudo leer).
  async obtenerSiExiste(db, id, campos) {
    return datosOpcionales(await db.from('sesiones').select(campos).eq('id', id).maybeSingle());
  }

  // Las últimas sesiones del paciente, o null si no se pudieron leer.
  async ultimasDePaciente(db, pacienteId, { campos, limite }) {
    return datosOpcionales(await db
      .from('sesiones')
      .select(campos)
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: false })
      .limit(limite));
  }

  async crear(db, sesion) {
    return datosDe(await db.from('sesiones').insert(sesion).select().single());
  }

  async actualizar(db, id, cambios) {
    return datosDe(await db.from('sesiones').update(cambios).eq('id', id).select().single());
  }

  async actualizarSinDevolver(db, id, cambios) {
    datosDe(await db.from('sesiones').update(cambios).eq('id', id));
  }

  // Deshace una sesión recién creada. No lanza: se usa mientras ya se está reportando otro error.
  async eliminarComoAdmin(id) {
    await supabaseAdmin.from('sesiones').delete().eq('id', id);
  }

  // Una página de sesiones del paciente, de la más nueva a la más vieja: { data, count }.
  async listarDePaciente(db, pacienteId, { desde, hasta }) {
    const respuesta = await db
      .from('sesiones')
      .select(`
        id, fecha, tipo, duracion_minutos, notas_libres, resumen_ia,
        monto, pagado, fecha_pago,
        profesional:profesionales!profesional_id(id, nombre, apellido, especialidad)
      `, { count: 'exact' })
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: false })
      .range(desde, hasta);
    return { data: datosDe(respuesta), count: respuesta.count };
  }

  async listarVersionesDeNotas(db, sesionId) {
    return datosDe(await db
      .from('versiones_notas')
      .select(`
        *,
        modificado_por:profesionales(id, nombre, apellido)
      `)
      .eq('sesion_id', sesionId)
      .order('modificado_at', { ascending: false }));
  }

  // Sesiones del profesional en el rango, con sus turnos para saber si ya están en la agenda.
  async listarDelProfesionalConTurnos(db, profesionalId, { desde, hasta }) {
    let q = db
      .from('sesiones')
      .select('id, fecha, duracion_minutos, tipo, paciente_id, paciente:pacientes(id, nombre, apellido, telefono), turnos(id, estado)')
      .eq('profesional_id', profesionalId);
    if (desde) q = q.gte('fecha', desde);
    if (hasta) q = q.lte('fecha', hasta);

    return datosDe(await q);
  }

  // Sesiones sin pagar y con monto cargado, de la más nueva a la más vieja.
  async listarPendientesDeCobro(db) {
    return datosDe(await db
      .from('sesiones')
      .select(`
        id, fecha, tipo, monto, duracion_minutos,
        paciente:pacientes(id, nombre, apellido),
        profesional:profesionales!profesional_id(id, nombre, apellido)
      `)
      .eq('pagado', false)
      .not('monto', 'is', null)
      .order('fecha', { ascending: false }));
  }

  // id y profesional de la sesión si RLS la deja ver; si no, null.
  async obtenerTitular(db, id) {
    return datosOpcionales(await db.from('sesiones').select('id, profesional_id').eq('id', id).maybeSingle());
  }

  async obtenerConHonorariosComoAdmin(id) {
    return datosOpcionales(await supabaseAdmin
      .from('sesiones')
      .select('*, profesional:profesionales!profesional_id(porcentaje_honorarios)')
      .eq('id', id)
      .single());
  }

  // Si falla no corta el cobro: el pago ya quedó registrado.
  async marcarPagadaComoAdmin(id, { fechaPago, metodoPago }) {
    await supabaseAdmin
      .from('sesiones')
      .update({ pagado: true, fecha_pago: fechaPago, metodo_pago: metodoPago })
      .eq('id', id);
  }
}

module.exports = new SesionRepository();
