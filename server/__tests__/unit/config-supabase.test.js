jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({})) }));

const jwt = (role) => `x.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.y`;

const cargar = (env) => {
  jest.resetModules();
  Object.assign(process.env, { SUPABASE_URL: 'http://x', ...env });
  return require('../../src/config/supabase');
};

describe('config/supabase: clave de servicio', () => {
  test('dos claves con el mismo valor: el mensaje lo dice (caso anon repetida)', () => {
    const k = jwt('anon');
    expect(() => cargar({ SUPABASE_ANON_KEY: k, SUPABASE_SERVICE_ROLE_KEY: k })).toThrow(/MISMO valor/);
  });

  test('dos claves con el mismo valor: también cuando ambas son la service_role', () => {
    const k = jwt('service_role');
    expect(() => cargar({ SUPABASE_ANON_KEY: k, SUPABASE_SERVICE_ROLE_KEY: k })).toThrow(/MISMO valor/);
  });

  test('la clave de servicio con rol anon se distingue de la repetida', () => {
    expect(() => cargar({ SUPABASE_ANON_KEY: jwt('anon'), SUPABASE_SERVICE_ROLE_KEY: jwt('anon') + 'z' })).toThrow(/rol anon/);
  });

  test('la clave anon no puede ser la service_role (ignoraría RLS)', () => {
    expect(() => cargar({ SUPABASE_ANON_KEY: jwt('service_role'), SUPABASE_SERVICE_ROLE_KEY: jwt('service_role') + 'z' })).toThrow(/SUPABASE_ANON_KEY tiene la clave service_role/);
  });

  test('el mensaje nunca incluye el valor de las claves', () => {
    const k = jwt('anon');
    try { cargar({ SUPABASE_ANON_KEY: k, SUPABASE_SERVICE_ROLE_KEY: k }); } catch (e) { expect(e.message).not.toContain(k); }
  });

  test('arranca con una service_role real', () => {
    expect(() => cargar({ SUPABASE_ANON_KEY: jwt('anon'), SUPABASE_SERVICE_ROLE_KEY: jwt('service_role') })).not.toThrow();
  });

  test('arranca con claves de formato nuevo (no inspeccionables)', () => {
    expect(() => cargar({ SUPABASE_ANON_KEY: 'sb_publishable_abc', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_def' })).not.toThrow();
  });
});
