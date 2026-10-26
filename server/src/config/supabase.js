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
if (supabaseServiceKey === supabaseAnonKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY y SUPABASE_ANON_KEY tienen el MISMO valor: cada una tiene que ser su clave (Supabase > Project Settings > API > Legacy API keys: filas anon y service_role)');
}
if (rolDeLaClave(supabaseServiceKey) === 'anon') {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY tiene una clave con rol anon: tiene que ser la de la fila service_role');
}
if (rolDeLaClave(supabaseAnonKey) === 'service_role') {
  // La clave pública jamás puede ser la de servicio: ignoraría RLS en todo lo que use el cliente "anon".
  throw new Error('SUPABASE_ANON_KEY tiene la clave service_role: tiene que ser la de la fila anon');
}

// Cliente con anon key (respeta RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente con service role (bypasea RLS, solo para operaciones admin)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

module.exports = { supabase, supabaseAdmin };
