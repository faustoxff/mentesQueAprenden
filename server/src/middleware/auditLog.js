const { supabaseAdmin } = require('../config/supabase');

// Middleware para registrar accesos a historias clínicas (Ley 25.326)
function registrarAcceso(accion, recurso) {
  return async (req, res, next) => {
    const pacienteId = req.params.pacienteId || req.params.id || req.body?.paciente_id;

    if (!pacienteId || !req.profesional) {
      return next();
    }

    // Se espera el insert: en Vercel (serverless) la función puede terminar apenas
    // se responde y un insert "fire-and-forget" se perdería. Un fallo del log no
    // corta el pedido.
    try {
      const { error } = await supabaseAdmin.from('logs_acceso').insert({
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
      if (error) console.error('Error al registrar log de acceso:', error);
    } catch (err) {
      console.error('Error al registrar log de acceso:', err.message);
    }

    next();
  };
}

module.exports = { registrarAcceso };
