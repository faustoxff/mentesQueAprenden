jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({})) }));

const jwt = (role) => `x.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.y`;

const cargar = (env) => {
  jest.resetModules();
  Object.assign(process.env, { SUPABASE_URL: 'http://x', ...env });
  return require('../../src/config/supabase');
};

describe('config/supabase: clave de servicio', () => {
  test('falla al arrancar si la clave de servicio es la misma que la anon', () => {
    const k = jwt('anon');
    expect(() => cargar({ SUPABASE_ANON_KEY: k, SUPABASE_SERVICE_ROLE_KEY: k })).toThrow(/service_role/);
  });

  test('falla si la clave de servicio tiene rol anon aunque sea otra cadena', () => {
    expect(() => cargar({ SUPABASE_ANON_KEY: jwt('anon'), SUPABASE_SERVICE_ROLE_KEY: jwt('anon') + 'z' })).toThrow();
  });

  test('arranca con una service_role real', () => {
    expect(() => cargar({ SUPABASE_ANON_KEY: jwt('anon'), SUPABASE_SERVICE_ROLE_KEY: jwt('service_role') })).not.toThrow();
  });

  test('arranca con claves de formato nuevo (no inspeccionables)', () => {
    expect(() => cargar({ SUPABASE_ANON_KEY: 'sb_publishable_abc', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_def' })).not.toThrow();
  });
});
