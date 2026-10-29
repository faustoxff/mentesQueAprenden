const { supabaseAdmin } = require('../config/supabase');
const { datosDe, datosOpcionales } = require('./errores');

// Consultas a la tabla `sesiones`. Las que reciben `db` usan el cliente con el token del
// profesional (RLS decide qué filas se ven); las que terminan en `ComoAdmin` usan el
// cliente de servicio y solo se llaman después de verificar el acceso.
class SesionRepository {
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
