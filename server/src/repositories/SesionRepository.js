const { datosDe } = require('./errores');

// Consultas a la tabla `sesiones`. Reciben `db`, el cliente con el token del profesional,
// así que RLS decide qué filas se ven.
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
}

module.exports = new SesionRepository();
