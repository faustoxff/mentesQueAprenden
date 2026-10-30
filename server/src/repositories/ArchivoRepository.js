const { supabaseAdmin } = require('../config/supabase');
const { datosDe, datosOpcionales } = require('./errores');

// Metadata de los archivos adjuntos (tabla `archivos_adjuntos`). Las que reciben `db` usan
// el cliente con el token del profesional (RLS decide qué filas se ven); las que terminan
// en `ComoAdmin` usan el cliente de servicio y solo se llaman después de verificar el acceso.
class ArchivoRepository {
  async crear(db, archivo) {
    return datosDe(await db.from('archivos_adjuntos').insert(archivo).select().single());
  }

  // El archivo con las columnas pedidas, o null si no está (o RLS no lo deja ver).
  async obtener(db, id, campos) {
    return datosOpcionales(await db.from('archivos_adjuntos').select(campos).eq('id', id).single());
  }

  async listarDePaciente(db, pacienteId) {
    return datosDe(await db
      .from('archivos_adjuntos')
      .select(`
        id, nombre_original, tipo, mime_type, tamanio_bytes, descripcion, created_at,
        subido_por:profesionales!subido_por(id, nombre, apellido)
      `)
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false }));
  }

  // Guarda la descripción solo si el archivo no tenía una. No lanza: es un dato extra.
  async describirSiNoTieneComoAdmin(id, descripcion) {
    await supabaseAdmin
      .from('archivos_adjuntos')
      .update({ descripcion })
      .eq('id', id)
      .is('descripcion', null);
  }

  // Devuelve las filas borradas: sin policy de DELETE, RLS borra 0 filas sin error.
  async eliminar(db, id) {
    return datosDe(await db.from('archivos_adjuntos').delete().eq('id', id).select('id'));
  }
}

module.exports = new ArchivoRepository();
