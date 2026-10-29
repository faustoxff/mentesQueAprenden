const pacienteService = require('./PacienteService');
const archivoRepository = require('../repositories/ArchivoRepository');
const almacenamientoRepository = require('../repositories/AlmacenamientoRepository');
const logAccesoRepository = require('../repositories/LogAccesoRepository');

const MIME_TO_EXT = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
};

class ArchivoService {
  // db es el cliente de Supabase autenticado con el JWT del usuario (respeta RLS).
  // Cada método lo recibe como parámetro porque depende de la request.

  async generarUrlSubida(db, profesionalId, body) {
    const { paciente_id, nombre_original, mime_type, tamanio_bytes, tipo, sesion_id, descripcion } = body;

    // Verificar acceso al paciente (incluye que no esté dado de baja). Se responde 403
    // como siempre en esta ruta.
    try {
      await pacienteService.asegurarAcceso(db, paciente_id);
    } catch (err) {
      if (err.status !== 404) throw err;
      throw Object.assign(new Error('Sin acceso a este paciente'), { status: 403 });
    }

    // Derivar extensión desde mime_type (no del nombre enviado por el cliente)
    const ext = MIME_TO_EXT[mime_type] || 'bin';
    const nombre_storage = `${paciente_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // URL firmada para upload (5 minutos)
    const uploadData = await almacenamientoRepository.urlDeSubida(nombre_storage);

    // Registrar el archivo en la BD (pendiente hasta que se confirme el upload)
    const archivo = await archivoRepository.crear(db, {
      paciente_id,
      sesion_id,
      nombre_original,
      nombre_storage,
      storage_path: nombre_storage,
      tipo,
      mime_type,
      tamanio_bytes,
      descripcion,
      subido_por: profesionalId
    });

    return {
      archivo_id: archivo.id,
      upload_url: uploadData.signedUrl,
      token: uploadData.token
    };
  }

  async obtenerUrlDescarga(db, id, profesionalId, { ip, userAgent }) {
    const archivo = await archivoRepository.obtener(db, id, '*, paciente:pacientes(id)');

    if (!archivo) {
      const err = new Error('Archivo no encontrado');
      err.status = 404;
      throw err;
    }

    // Log de la descarga (Ley 25.326). Si el log falla, la descarga sigue igual.
    await logAccesoRepository.registrarComoAdmin({
      profesional_id: profesionalId,
      paciente_id: archivo.paciente_id,
      accion: 'descargar_archivo',
      recurso: 'archivo:' + id,
      ip_address: ip,
      user_agent: userAgent,
      metadata: { nombre_original: archivo.nombre_original }
    });

    const url = await almacenamientoRepository.urlDeDescarga(archivo.storage_path, 300); // 5 minutos
    return { url, nombre_original: archivo.nombre_original };
  }

  async eliminar(db, id, profesional) {
    const archivo = await archivoRepository.obtener(db, id, 'storage_path, subido_por');

    if (!archivo) {
      const err = new Error('Archivo no encontrado');
      err.status = 404;
      throw err;
    }
    if (archivo.subido_por !== profesional.id && profesional.rol !== 'admin') {
      const err = new Error('Sin permiso para eliminar este archivo');
      err.status = 403;
      throw err;
    }

    // Primero la metadata, confirmando que se borró (sin policy de DELETE, RLS devuelve
    // 0 filas sin error). Recién después el archivo: si falla acá queda un archivo
    // huérfano en el storage, que es mejor que metadata apuntando a un archivo perdido.
    const borradas = await archivoRepository.eliminar(db, id);
    if (!borradas?.length) {
      const err = new Error('Sin permiso para eliminar este archivo');
      err.status = 403;
      throw err;
    }

    try {
      await almacenamientoRepository.eliminar(archivo.storage_path);
    } catch (error) {
      console.error('No se pudo borrar el archivo del storage:', error.message);
    }
  }
}

module.exports = new ArchivoService();
