const logAccesoRepository = require('../repositories/LogAccesoRepository');

// Middleware para registrar accesos a historias clínicas (Ley 25.326)
function registrarAcceso(accion, recurso) {
  return async (req, res, next) => {
    const pacienteId = req.params.pacienteId || req.params.id || req.body?.paciente_id;

    if (!pacienteId || !req.profesional) {
      return next();
    }

    // Se espera el log antes de seguir; si falla, el pedido sigue igual.
    await logAccesoRepository.registrarComoAdmin({
      profesional_id: req.profesional.id,
      paciente_id: pacienteId,
      accion,
      recurso,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      metadata: {
        method: req.method,
        path: req.path,
        params: req.params
      }
    });

    next();
  };
}

module.exports = { registrarAcceso };
