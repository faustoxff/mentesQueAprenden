// Tests unitarios de PacienteService con un "db" falso: sin red ni credenciales.
jest.mock('../../src/config/supabase', () => ({ supabaseAdmin: {}, supabase: {} }));

const PacienteService = require('../../src/services/PacienteService');

// Query builder falso: registra las llamadas y resuelve con `resultado` al hacer await.
function crearDb(resultado) {
  const llamadas = [];
  const q = {};
  ['select', 'insert', 'update', 'eq', 'is', 'order', 'range', 'or'].forEach((m) => {
    q[m] = (...args) => { llamadas.push([m, args]); return q; };
  });
  q.single = () => Promise.resolve(resultado);
  q.then = (res, rej) => Promise.resolve(resultado).then(res, rej);
  return { db: { from: () => q }, llamadas };
}

const profesional = { id: 'prof-1' };

describe('PacienteService.crear', () => {
  test('asigna al profesional actual como principal y creador por defecto', async () => {
    const { db, llamadas } = crearDb({ data: { id: 'p1' }, error: null });
    await PacienteService.crear(db, { nombre: 'Ana', apellido: 'Paz' }, profesional);
    const insert = llamadas.find(([m]) => m === 'insert')[1][0];
    expect(insert).toMatchObject({ nombre: 'Ana', profesional_principal_id: 'prof-1', created_by: 'prof-1' });
  });

  test('descarta campos que no están en la allowlist', async () => {
    const { db, llamadas } = crearDb({ data: {}, error: null });
    await PacienteService.crear(db, { nombre: 'Ana', rol: 'admin', deleted_at: 'x', created_by: 'otro' }, profesional);
    const insert = llamadas.find(([m]) => m === 'insert')[1][0];
    expect(insert).not.toHaveProperty('rol');
    expect(insert).not.toHaveProperty('deleted_at');
    expect(insert.created_by).toBe('prof-1');
  });

  test('un UUID vacío ("") del formulario no se manda al insert', async () => {
    const { db, llamadas } = crearDb({ data: {}, error: null });
    await PacienteService.crear(db, { nombre: 'Ana', obra_social_id: '', profesional_principal_id: '' }, profesional);
    const insert = llamadas.find(([m]) => m === 'insert')[1][0];
    expect(insert).not.toHaveProperty('obra_social_id');
    expect(insert.profesional_principal_id).toBe('prof-1');
  });

  test('DNI duplicado (23505) lanza 409 con mensaje claro', async () => {
    const { db } = crearDb({ data: null, error: { code: '23505', message: 'dup' } });
    await expect(PacienteService.crear(db, { nombre: 'Ana' }, profesional))
      .rejects.toMatchObject({ status: 409, message: 'Ya existe un paciente con ese DNI' });
  });

  test('cualquier otro error de la base lanza 500', async () => {
    const { db } = crearDb({ data: null, error: { code: '42501', message: 'rls' } });
    await expect(PacienteService.crear(db, { nombre: 'Ana' }, profesional))
      .rejects.toMatchObject({ status: 500 });
  });
});

describe('PacienteService.listar', () => {
  const filas = [
    { id: 'a', profesional_principal: { id: 'prof-1' } },
    { id: 'b', profesional_principal: { id: 'otro' } }
  ];

  test('marca como derivados los pacientes de otro profesional', async () => {
    const { db } = crearDb({ data: filas, error: null, count: 2 });
    const r = await PacienteService.listar(db, {}, 'prof-1');
    expect(r.data.map((p) => p.derivado)).toEqual([false, true]);
  });

  test('ordena por apellido ascendente', async () => {
    const { db, llamadas } = crearDb({ data: [], error: null, count: 0 });
    await PacienteService.listar(db, {}, 'prof-1');
    expect(llamadas.find(([m]) => m === 'order')[1]).toEqual(['apellido', { ascending: true }]);
  });

  test('calcula la paginación', async () => {
    const { db, llamadas } = crearDb({ data: [], error: null, count: 45 });
    const r = await PacienteService.listar(db, { page: 2, limit: 20 }, 'prof-1');
    expect(r.pagination).toEqual({ total: 45, page: 2, limit: 20, pages: 3 });
    expect(llamadas.find(([m]) => m === 'range')[1]).toEqual([20, 39]);
  });

  test('un error de la base se propaga', async () => {
    const { db } = crearDb({ data: null, error: { message: 'boom' }, count: null });
    await expect(PacienteService.listar(db, {}, 'prof-1')).rejects.toThrow('boom');
  });
});
