const { supabaseAdmin } = require('../config/supabase');
const { datosDe, datosOpcionales } = require('./errores');

// Consultas a la tabla `profesionales`. Las que reciben `db` usan el cliente con el token
// del profesional (RLS aplica); las que terminan en `ComoAdmin` usan el cliente de
// servicio, porque RLS no deja ver ni editar a los demás profesionales.
class ProfesionalRepository {
  // id y si está activo, o null si no está.
  async obtenerEstado(db, id) {
    return datosOpcionales(await db.from('profesionales').select('id, activo').eq('id', id).single());
  }

  async listarActivosComoAdmin() {
    return datosDe(await supabaseAdmin
      .from('profesionales')
      .select('id, nombre, apellido, especialidad, rol, matricula, activo, porcentaje_honorarios')
      .eq('activo', true)
      .order('apellido'));
  }

  async actualizarComoAdmin(id, cambios) {
    return datosDe(await supabaseAdmin
      .from('profesionales')
      .update(cambios)
      .eq('id', id)
      .select()
      .single());
  }

  async desactivarComoAdmin(id) {
    datosDe(await supabaseAdmin
      .from('profesionales')
      .update({ activo: false })
      .eq('id', id));
  }
}

module.exports = new ProfesionalRepository();
