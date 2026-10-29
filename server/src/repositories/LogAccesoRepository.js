const { supabaseAdmin } = require('../config/supabase');

// Registro de accesos a historias clínicas (Ley 25.326), con el cliente de servicio: un
// profesional no puede escribir en `logs_acceso` con su token.
class LogAccesoRepository {
  // Se espera el insert: el builder de Supabase solo manda la consulta con await/then, y
  // en Vercel (serverless) la función puede terminar apenas se responde. Un fallo del log
  // no corta el pedido: queda en consola y nunca lanza.
  async registrarComoAdmin(entrada) {
    try {
      const { error } = await supabaseAdmin.from('logs_acceso').insert(entrada);
      if (error) console.error('Error al registrar log de acceso:', error);
    } catch (err) {
      console.error('Error al registrar log de acceso:', err.message);
    }
  }
}

module.exports = new LogAccesoRepository();
