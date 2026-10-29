const { supabaseAdmin } = require('../config/supabase');
const { datosDe } = require('./errores');

// Consultas a la tabla `pagos`. Las que reciben `db` usan el cliente con el token del
// profesional (RLS aplica); las que terminan en `ComoAdmin` usan el cliente de servicio
// y ven los datos de todos.
class PagoRepository {
  async listar(db, { desde, hasta, profesionalId }) {
    let q = db
      .from('pagos')
      .select(`
        *,
        sesion:sesiones(id, fecha, tipo),
        paciente:pacientes(id, nombre, apellido),
        profesional:profesionales!profesional_id(id, nombre, apellido, especialidad)
      `)
      .order('fecha_pago', { ascending: false });

    if (desde) q = q.gte('fecha_pago', desde).lt('fecha_pago', hasta);
    if (profesionalId) q = q.eq('profesional_id', profesionalId);

    return datosDe(await q);
  }

  async crear(db, pago) {
    return datosDe(await db.from('pagos').insert(pago).select().single());
  }

  // Montos de todos los profesionales en el rango, para la liquidación del mes.
  async listarMontosComoAdmin({ desde, hasta }) {
    return datosDe(await supabaseAdmin
      .from('pagos')
      .select(`
        profesional_id,
        monto_total, monto_profesional, monto_espacio,
        profesional:profesionales!profesional_id(nombre, apellido, especialidad)
      `)
      .gte('fecha_pago', desde)
      .lt('fecha_pago', hasta));
  }
}

module.exports = new PagoRepository();
