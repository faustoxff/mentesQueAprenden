const { supabaseAdmin } = require('../config/supabase');
const { datosDe } = require('./errores');

// Catálogo de obras sociales: es el mismo para todos, se lee con el cliente de servicio.
class ObraSocialRepository {
  async listarActivasComoAdmin() {
    return datosDe(await supabaseAdmin
      .from('obras_sociales')
      .select('id, nombre, codigo')
      .eq('activa', true)
      .order('nombre'));
  }
}

module.exports = new ObraSocialRepository();
