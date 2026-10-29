const { datosOpcionales } = require('./errores');

// Consultas a la tabla `profesionales`.
class ProfesionalRepository {
  // id y si está activo, o null si no está.
  async obtenerEstado(db, id) {
    return datosOpcionales(await db.from('profesionales').select('id, activo').eq('id', id).single());
  }
}

module.exports = new ProfesionalRepository();
