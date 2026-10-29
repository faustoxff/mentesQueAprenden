const derivacionRepository = require('../repositories/DerivacionRepository');
const profesionalRepository = require('../repositories/ProfesionalRepository');

class DerivacionService {
  // db es el cliente de Supabase autenticado con el JWT del usuario (respeta RLS).
  // Cada método lo recibe como parámetro porque depende de la request.

  async crear(db, profesionalOrigenId, body) {
    if (body.profesional_destino_id === profesionalOrigenId) {
      const err = new Error('No podés derivar al mismo profesional');
      err.status = 422;
      throw err;
    }

    const destino = await profesionalRepository.obtenerEstado(db, body.profesional_destino_id);

    if (!destino || !destino.activo) {
      const err = new Error('El profesional destinatario no existe o está inactivo');
      err.status = 422;
      throw err;
    }

    return derivacionRepository.crear(db, {
      paciente_id: body.paciente_id,
      profesional_origen_id: profesionalOrigenId,
      profesional_destino_id: body.profesional_destino_id,
      motivo: body.motivo,
      observaciones: body.observaciones
    });
  }

  async responder(db, id, profesionalId, body) {
    // Verificar que el profesional destino es quien responde
    const derivacion = await derivacionRepository.obtenerCampos(db, id, 'profesional_destino_id, estado');

    if (!derivacion) {
      const err = new Error('Derivación no encontrada');
      err.status = 404;
      throw err;
    }
    if (derivacion.profesional_destino_id !== profesionalId) {
      const err = new Error('Solo el profesional destinatario puede responder');
      err.status = 403;
      throw err;
    }
    if (derivacion.estado !== 'pendiente') {
      const err = new Error('Esta derivación ya fue respondida');
      err.status = 409;
      throw err;
    }

    return derivacionRepository.actualizar(db, id, {
      estado: body.estado,
      observaciones: body.observaciones,
      fecha_respuesta: new Date().toISOString(),
      activa: body.estado === 'aceptada'
    });
  }

  async completar(db, id, profesionalId) {
    // Cierra el acceso del destino al paciente: cualquiera de las dos partes
    // puede marcarla completada (ej: terminó el tratamiento derivado).
    const derivacion = await derivacionRepository.obtenerCampos(db, id, 'profesional_origen_id, profesional_destino_id, estado, activa');

    if (!derivacion) {
      const err = new Error('Derivación no encontrada');
      err.status = 404;
      throw err;
    }
    if (derivacion.profesional_origen_id !== profesionalId && derivacion.profesional_destino_id !== profesionalId) {
      const err = new Error('No tenés permiso sobre esta derivación');
      err.status = 403;
      throw err;
    }
    if (derivacion.estado !== 'aceptada' || !derivacion.activa) {
      const err = new Error('Solo se puede completar una derivación aceptada y activa');
      err.status = 409;
      throw err;
    }

    return derivacionRepository.actualizar(db, id, { estado: 'completada', activa: false });
  }

  async listar(db, profesionalId) {
    return derivacionRepository.listarDelProfesional(db, profesionalId);
  }

  async listarPendientes(db, profesionalId) {
    return derivacionRepository.listarPendientesDe(db, profesionalId);
  }
}

module.exports = new DerivacionService();
