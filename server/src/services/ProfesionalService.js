const { supabaseAdmin } = require('../config/supabase');

const CAMPOS_EDITABLES = ['nombre', 'apellido', 'matricula', 'especialidad', 'telefono', 'porcentaje_honorarios'];

class ProfesionalService {
  // El porcentaje de honorarios es un dato económico: el admin lo ve de todos (panel de
  // administración); un profesional, solo el propio.
  async listar(solicitante) {
    const { data, error } = await supabaseAdmin
      .from('profesionales')
      .select('id, nombre, apellido, especialidad, rol, matricula, activo, porcentaje_honorarios')
      .eq('activo', true)
      .order('apellido');

    if (error) throw new Error(error.message);
    if (solicitante?.rol === 'admin') return data;
    return data.map(({ porcentaje_honorarios, ...p }) => (p.id === solicitante?.id ? { ...p, porcentaje_honorarios } : p));
  }

  async actualizar(id, solicitante, body) {
    if (id !== solicitante.id && solicitante.rol !== 'admin') {
      const err = new Error('Sin permiso');
      err.status = 403;
      throw err;
    }

    const updateData = Object.fromEntries(
      Object.entries(body).filter(([k]) => CAMPOS_EDITABLES.includes(k))
    );

    // Solo admin puede cambiar el porcentaje de honorarios
    if (updateData.porcentaje_honorarios !== undefined && solicitante.rol !== 'admin') {
      delete updateData.porcentaje_honorarios;
    }

    const { data, error } = await supabaseAdmin
      .from('profesionales')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async desactivar(id) {
    const { error } = await supabaseAdmin
      .from('profesionales')
      .update({ activo: false })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
}

module.exports = new ProfesionalService();
