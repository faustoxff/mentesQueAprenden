const { supabase, supabaseAdmin } = require('../config/supabase');

// Verifica el JWT de Supabase y adjunta el profesional al request
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const token = authHeader.split(' ')[1];

    const { data: { user } = {}, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Obtener datos del profesional
    const { data: profesional, error: profError } = await supabaseAdmin
      .from('profesionales')
      .select('id, nombre, apellido, rol, especialidad, activo')
      .eq('id', user.id)
      .single();

    if (profError || !profesional) {
      return res.status(401).json({ error: 'Profesional no encontrado' });
    }

    if (!profesional.activo) {
      return res.status(403).json({ error: 'Cuenta desactivada' });
    }

    req.user = user;
    req.profesional = profesional;
    req.token = token;
    next();
  } catch (err) {
    // Express 4 no captura rechazos de funciones async: sin esto el pedido quedaba colgado.
    console.error('Error verificando la sesión:', err.message);
    res.status(503).json({ error: 'No se pudo verificar la sesión, probá de nuevo' });
  }
}

// Crea un cliente Supabase autenticado como el usuario actual (respeta RLS).
// Nunca cae al cliente admin: sin token no hay cliente.
function getAuthenticatedClient(req) {
  if (!req.token) throw new Error('getAuthenticatedClient requiere un request autenticado');
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${req.token}` } },
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );
}

function requireAdmin(req, res, next) {
  if (req.profesional?.rol !== 'admin') {
    return res.status(403).json({ error: 'Se requiere rol admin' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, getAuthenticatedClient };
