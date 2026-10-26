const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Faltan variables de entorno de Supabase');
}

// La clave de servicio (que ignora RLS) no puede ser la anon: con RLS activada el backend
// dejaría de ver tablas como `profesionales` y todos los pedidos con sesión darían 401
// "Profesional no encontrado". Falla al arrancar, con un mensaje claro, en vez de en silencio.
function rolDeLaClave(clave) {
  try {
    return JSON.parse(Buffer.from(clave.split('.')[1], 'base64url').toString()).role;
  } catch {
    return null; // formato nuevo (sb_secret_...) u otro: no se puede inspeccionar
  }
}
if (supabaseServiceKey === supabaseAnonKey || rolDeLaClave(supabaseServiceKey) === 'anon') {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY es la clave anon: tiene que ser la service_role (Supabase > Project Settings > API)');
}

// Cliente con anon key (respeta RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente con service role (bypasea RLS, solo para operaciones admin)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

module.exports = { supabase, supabaseAdmin };
