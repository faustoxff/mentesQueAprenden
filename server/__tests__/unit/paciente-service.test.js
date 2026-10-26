// Tests unitarios de PacienteService con un "db" falso: sin red ni credenciales.
const mockAdmin = { from: jest.fn() };
jest.mock('../../src/config/supabase', () => ({ supabaseAdmin: mockAdmin, supabase: {} }));

const PacienteService = require('../../src/services/PacienteService');
const { crearDb: crearDbCompartido } = require('./helpers/fakeDb');

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

describe('PacienteService: titularidad y búsqueda', () => {
  beforeEach(() => mockAdmin.from.mockReset());

  test('un profesional común no puede crear un paciente asignado a otro (403)', async () => {
    const { db, enTabla } = crearDbCompartido({ pacientes: { data: {}, error: null } });
    await expect(PacienteService.crear(db, { nombre: 'Ana', profesional_principal_id: 'otro' }, { id: 'prof-1', rol: 'profesional' }))
      .rejects.toMatchObject({ status: 403 });
    expect(enTabla('pacientes', 'insert')).toHaveLength(0);
  });

  test('un admin puede asignarlo a otro; se inserta con el cliente admin (RLS no le deja ver el resultado)', async () => {
    const admin = crearDbCompartido({ pacientes: { data: { id: 'p1' }, error: null } });
    mockAdmin.from.mockImplementation(admin.db.from);
    const usuario = crearDbCompartido({ pacientes: { data: null, error: { message: 'no debería usarse' } } });

    await PacienteService.crear(usuario.db, { nombre: 'Ana', profesional_principal_id: 'otro' }, { id: 'adm', rol: 'admin' });

    expect(admin.enTabla('pacientes', 'insert')[0][0]).toMatchObject({ profesional_principal_id: 'otro', created_by: 'adm' });
    expect(usuario.enTabla('pacientes', 'insert')).toHaveLength(0);
  });

  test('crear para uno mismo usa el cliente del usuario (RLS aplica)', async () => {
    const usuario = crearDbCompartido({ pacientes: { data: { id: 'p1' }, error: null } });
    await PacienteService.crear(usuario.db, { nombre: 'Ana' }, { id: 'prof-1', rol: 'profesional' });
    expect(usuario.enTabla('pacientes', 'insert')).toHaveLength(1);
    expect(mockAdmin.from).not.toHaveBeenCalled();
  });

  test('actualizar: un no-admin no puede cambiar el profesional principal', async () => {
    const { db, enTabla } = crearDbCompartido({ pacientes: { data: { id: 'p1' }, error: null } });
    await PacienteService.actualizar(db, 'p1', { telefono: '1155555555', profesional_principal_id: 'yo-mismo' }, { id: 'prof-1', rol: 'profesional' });
    const cambios = enTabla('pacientes', 'update')[0][0];
    expect(cambios).not.toHaveProperty('profesional_principal_id');
    expect(cambios.telefono).toBe('1155555555');
  });

  test('actualizar: un admin sí puede reasignar la titularidad', async () => {
    const { db, enTabla } = crearDbCompartido({ pacientes: { data: { id: 'p1' }, error: null } });
    await PacienteService.actualizar(db, 'p1', { profesional_principal_id: 'otro' }, { id: 'adm', rol: 'admin' });
    expect(enTabla('pacientes', 'update')[0][0].profesional_principal_id).toBe('otro');
  });

  test('listar: la búsqueda no puede inyectar filtros', async () => {
    const { db, enTabla } = crearDbCompartido({ pacientes: { data: [], error: null, count: 0 } });
    await PacienteService.listar(db, { busqueda: 'x,profesional_principal_id.neq.0)' }, 'prof-1');
    const filtro = enTabla('pacientes', 'or')[0][0];
    expect(filtro.split(',')).toHaveLength(3);
    expect(filtro).not.toContain(')');
  });
});
