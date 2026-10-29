const { supabaseAdmin } = require('../config/supabase');
const { datosDe } = require('./errores');

const BUCKET = 'historias-clinicas';

// Archivos de las historias clínicas en Supabase Storage. Usa el cliente de servicio: el
// acceso al paciente o al archivo se verifica antes, en el service.
class AlmacenamientoRepository {
  // URL firmada para subir (vence a los 5 minutos): { signedUrl, token }.
  async urlDeSubida(ruta) {
    return datosDe(await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(ruta));
  }

  async urlDeDescarga(ruta, segundos) {
    const { signedUrl } = datosDe(await supabaseAdmin.storage.from(BUCKET).createSignedUrl(ruta, segundos));
    return signedUrl;
  }

  async eliminar(ruta) {
    datosDe(await supabaseAdmin.storage.from(BUCKET).remove([ruta]));
  }
}

module.exports = new AlmacenamientoRepository();
