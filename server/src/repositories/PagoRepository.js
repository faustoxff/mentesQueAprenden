const { datosDe } = require('./errores');

// Consultas a la tabla `pagos`. Reciben `db`, el cliente con el token del profesional
// (RLS aplica).
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
}

module.exports = new PagoRepository();
