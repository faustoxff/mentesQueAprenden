// Pacientes (paginado, baja lógica, aislamiento por profesional) y derivaciones
// (transiciones de estado y acceso al paciente).
const mockAdmin = { from: jest.fn() };
jest.mock('../../src/config/supabase', () => ({ supabaseAdmin: mockAdmin, supabase: {} }));

const PacienteService = require('../../src/services/PacienteService');
const DerivacionService = require('../../src/services/DerivacionService');
const { crearDb } = require('./helpers/fakeDb');

const ok = (data) => ({ data, error: null });
const PROF = { id: 'prof-1', rol: 'profesional' };
const ADMIN = { id: 'admin-1', rol: 'admin' };

beforeEach(() => mockAdmin.from.mockReset());

describe('PacienteService.listar: paginado', () => {
  const listar = async (filtros, count = 45) => {
    const fake = crearDb({ pacientes: { data: [], error: null, count } });
    const res = await PacienteService.listar(fake.db, filtros, PROF.id);
    return { res, rango: fake.enTabla('pacientes', 'range')[0] };
  };

  test('CP-U90 la primera página (por defecto) pide las filas 0 a 19', async () => {
    const { rango } = await listar({});

    expect(rango).toEqual([0, 19]);
  });

  test('CP-U91 la última página con 45 pacientes pide 40–59 y la paginación informa 3 páginas', async () => {
    const { res, rango } = await listar({ page: 3 });

    expect(rango).toEqual([40, 59]);
    expect(res.pagination).toEqual({ total: 45, page: 3, limit: 20, pages: 3 });
  });

  test('CP-U92 page y limit que llegan como texto desde la query se interpretan como números', async () => {
    const { res, rango } = await listar({ page: '2', limit: '10' });

    expect(rango).toEqual([10, 19]);
    expect(res.pagination).toMatchObject({ page: 2, limit: 10, pages: 5 });
  });

  test('CP-U93 sin pacientes la paginación da 0 páginas', async () => {
    const { res } = await listar({}, 0);

    expect(res.pagination).toMatchObject({ total: 0, pages: 0 });
  });

  // DEF-A11: page=0 (o negativa) genera el rango (-20, -1) en vez de tratarse como la página 1.
  test.failing.each([0, -1])('CP-U94 page=%p se trata como la página 1', async (page) => {
    const { rango } = await listar({ page });

    expect(rango).toEqual([0, 19]);
  });

  // DEF-A11: no hay tope para limit; con limit=100000 se pide toda la tabla en una sola consulta.
  test.failing('CP-U95 limit se acota a un máximo razonable (100)', async () => {
    const { rango } = await listar({ limit: 100000 });

    expect(rango[1] - rango[0] + 1).toBeLessThanOrEqual(100);
  });

  test('CP-U96 solo lista pacientes sin baja lógica (deleted_at null)', async () => {
    const fake = crearDb({ pacientes: { data: [], error: null, count: 0 } });

    await PacienteService.listar(fake.db, {}, PROF.id);

    expect(fake.enTabla('pacientes', 'is')).toContainEqual(['deleted_at', null]);
  });

  test.each(['activo', 'derivado', 'alta', 'inactivo'])('CP-U97 filtra por estado "%s"', async (estado) => {
    const fake = crearDb({ pacientes: { data: [], error: null, count: 0 } });

    await PacienteService.listar(fake.db, { estado }, PROF.id);

    expect(fake.enTabla('pacientes', 'eq')).toContainEqual(['estado', estado]);
  });

  test('CP-U98 la búsqueda filtra por nombre, apellido o DNI', async () => {
    const fake = crearDb({ pacientes: { data: [], error: null, count: 0 } });

    await PacienteService.listar(fake.db, { busqueda: 'Pérez' }, PROF.id);

    expect(fake.enTabla('pacientes', 'or')[0][0]).toBe('nombre.ilike.%Pérez%,apellido.ilike.%Pérez%,dni.ilike.%Pérez%');
  });

  test('CP-U99 una búsqueda vacía o de solo símbolos no agrega filtro', async () => {
    const fake = crearDb({ pacientes: { data: [], error: null, count: 0 } });

    await PacienteService.listar(fake.db, { busqueda: ',()%' }, PROF.id);

    expect(fake.enTabla('pacientes', 'or')).toHaveLength(0);
  });
});

describe('PacienteService: aislamiento por profesional (también para el admin)', () => {
  test('CP-U100 listar usa siempre el cliente del usuario (RLS), nunca el admin, aunque sea admin', async () => {
    const fake = crearDb({ pacientes: { data: [], error: null, count: 0 } });

    await PacienteService.listar(fake.db, {}, ADMIN.id);

    expect(mockAdmin.from).not.toHaveBeenCalled();
    expect(fake.enTabla('pacientes', 'select')).toHaveLength(1);
  });

  test('CP-U101 obtener un paciente que RLS no deja ver (PGRST116) → 404', async () => {
    const { db } = crearDb({ pacientes: { data: null, error: { code: 'PGRST116', message: 'no rows' } } });

    await expect(PacienteService.obtener(db, 'ajeno')).rejects.toMatchObject({ status: 404 });
  });

  test('CP-U102 obtener no devuelve pacientes dados de baja', async () => {
    const { db, enTabla } = crearDb({ pacientes: ok({ id: 'p1' }) });

    await PacienteService.obtener(db, 'p1');

    expect(enTabla('pacientes', 'is')).toContainEqual(['deleted_at', null]);
  });

  test('CP-U103 actualizar un paciente ajeno (PGRST116) → 404', async () => {
    const { db } = crearDb({ pacientes: { data: null, error: { code: 'PGRST116', message: 'no rows' } } });

    await expect(PacienteService.actualizar(db, 'ajeno', { nombre: 'X' }, PROF)).rejects.toMatchObject({ status: 404 });
  });

  test('CP-U104 actualizar con obra social vacía la guarda como null', async () => {
    const { db, enTabla } = crearDb({ pacientes: ok({ id: 'p1' }) });

    await PacienteService.actualizar(db, 'p1', { obra_social_id: '' }, PROF);

    expect(enTabla('pacientes', 'update')[0][0]).toEqual({ obra_social_id: null });
  });

  test('CP-U105 actualizar no permite tocar deleted_at ni created_by desde el body', async () => {
    const { db, enTabla } = crearDb({ pacientes: ok({ id: 'p1' }) });

    await PacienteService.actualizar(db, 'p1', { deleted_at: null, created_by: 'otro', estado: 'alta' }, PROF);

    expect(enTabla('pacientes', 'update')[0][0]).toEqual({ estado: 'alta' });
  });
});

describe('PacienteService.eliminar: baja lógica', () => {
  test('CP-U106 marca deleted_at y nunca hace un DELETE', async () => {
    const admin = crearDb({ pacientes: ok({ id: 'p1', nombre: 'Ana', apellido: 'Paz' }) });
    mockAdmin.from.mockImplementation(admin.db.from);
    const { db } = crearDb({ pacientes: ok({ id: 'p1', nombre: 'Ana', apellido: 'Paz' }) });

    const res = await PacienteService.eliminar(db, 'p1');

    expect(admin.enTabla('pacientes', 'update')[0][0]).toEqual({ deleted_at: expect.any(String) });
    expect(admin.enTabla('pacientes', 'delete')).toHaveLength(0);
    expect(res).toEqual({ message: 'Paciente Paz, Ana eliminado', id: 'p1' });
  });

  test('CP-U107 un paciente que RLS no deja ver → 404 y no se toca el cliente admin', async () => {
    const { db } = crearDb({ pacientes: ok(null) });

    await expect(PacienteService.eliminar(db, 'ajeno')).rejects.toMatchObject({ status: 404 });
    expect(mockAdmin.from).not.toHaveBeenCalled();
  });

  test('CP-U108 dar de baja dos veces: la segunda vez da 404 (ya no está activo)', async () => {
    const { db } = crearDb({ pacientes: { data: null, error: { code: 'PGRST116' } } });

    await expect(PacienteService.eliminar(db, 'p1')).rejects.toMatchObject({ status: 404 });
  });
});

describe('PacienteService: sub-recursos', () => {
  test.each([
    ['listarTurnos', 'turnos'],
    ['listarDerivaciones', 'derivaciones'],
    ['listarArchivos', 'archivos_adjuntos']
  ])('CP-U109 %s filtra por el paciente pedido', async (metodo, tabla) => {
    const fake = crearDb({ [tabla]: ok([]) });

    await PacienteService[metodo](fake.db, 'p1');

    expect(fake.enTabla(tabla, 'eq')).toContainEqual(['paciente_id', 'p1']);
  });

  test('CP-U110 listarSesiones pagina igual que el listado de pacientes', async () => {
    const fake = crearDb({ sesiones: { data: [], error: null, count: 3 } });

    const res = await PacienteService.listarSesiones(fake.db, 'p1', { page: 2, limit: 2 });

    expect(fake.enTabla('sesiones', 'range')[0]).toEqual([2, 3]);
    expect(res.pagination).toEqual({ total: 3, page: 2, limit: 2 });
  });

  test.each(['listarTurnos', 'listarDerivaciones', 'listarArchivos'])('CP-U111 %s propaga un error de la base', async (metodo) => {
    const fake = crearDb({ turnos: { error: { message: 'x' } }, derivaciones: { error: { message: 'x' } }, archivos_adjuntos: { error: { message: 'x' } } });

    await expect(PacienteService[metodo](fake.db, 'p1')).rejects.toThrow('x');
  });
});

describe('DerivacionService: transiciones', () => {
  test('CP-U112 pendiente → aceptada deja la derivación activa (da acceso al paciente) y registra la fecha', async () => {
    const { db, enTabla } = crearDb({ derivaciones: [ok({ profesional_destino_id: 'yo', estado: 'pendiente' }), ok({ id: 'd1' })] });

    await DerivacionService.responder(db, 'd1', 'yo', { estado: 'aceptada' });

    expect(enTabla('derivaciones', 'update')[0][0]).toMatchObject({ estado: 'aceptada', activa: true, fecha_respuesta: expect.any(String) });
  });

  test('CP-U113 pendiente → rechazada no da acceso al paciente (activa = false)', async () => {
    const { db, enTabla } = crearDb({ derivaciones: [ok({ profesional_destino_id: 'yo', estado: 'pendiente' }), ok({ id: 'd1' })] });

    await DerivacionService.responder(db, 'd1', 'yo', { estado: 'rechazada' });

    expect(enTabla('derivaciones', 'update')[0][0]).toMatchObject({ estado: 'rechazada', activa: false });
  });

  test.each(['aceptada', 'rechazada', 'completada'])('CP-U114 responder una derivación ya %s → 409', async (estado) => {
    const { db, enTabla } = crearDb({ derivaciones: ok({ profesional_destino_id: 'yo', estado }) });

    await expect(DerivacionService.responder(db, 'd1', 'yo', { estado: 'aceptada' })).rejects.toMatchObject({ status: 409 });
    expect(enTabla('derivaciones', 'update')).toHaveLength(0);
  });

  test('CP-U115 rechazada → completada no está permitido (409)', async () => {
    const { db } = crearDb({ derivaciones: ok({ profesional_origen_id: 'yo', profesional_destino_id: 'otro', estado: 'rechazada', activa: false }) });

    await expect(DerivacionService.completar(db, 'd1', 'yo')).rejects.toMatchObject({ status: 409 });
  });

  test('CP-U116 completar dos veces → 409 la segunda', async () => {
    const { db } = crearDb({ derivaciones: ok({ profesional_origen_id: 'yo', profesional_destino_id: 'otro', estado: 'completada', activa: false }) });

    await expect(DerivacionService.completar(db, 'd1', 'yo')).rejects.toMatchObject({ status: 409 });
  });

  test('CP-U117 aceptada → completada cierra el acceso (activa = false)', async () => {
    const { db, enTabla } = crearDb({ derivaciones: [ok({ profesional_origen_id: 'otro', profesional_destino_id: 'yo', estado: 'aceptada', activa: true }), ok({ id: 'd1' })] });

    await DerivacionService.completar(db, 'd1', 'yo');

    expect(enTabla('derivaciones', 'update')[0][0]).toEqual({ estado: 'completada', activa: false });
  });

  test('CP-U118 derivarse a uno mismo → 422 sin consultar la base', async () => {
    const { db, llamadas } = crearDb({});

    await expect(DerivacionService.crear(db, 'yo', { paciente_id: 'p', profesional_destino_id: 'yo', motivo: 'm' })).rejects.toMatchObject({ status: 422 });
    expect(llamadas).toHaveLength(0);
  });

  test('CP-U119 listar trae las enviadas y las recibidas del profesional', async () => {
    const { db, enTabla } = crearDb({ derivaciones: ok([]) });

    await DerivacionService.listar(db, 'yo');

    expect(enTabla('derivaciones', 'or')[0][0]).toBe('profesional_origen_id.eq.yo,profesional_destino_id.eq.yo');
  });

  test('CP-U120 listarPendientes trae solo las recibidas en estado pendiente', async () => {
    const { db, enTabla } = crearDb({ derivaciones: ok([]) });

    await DerivacionService.listarPendientes(db, 'yo');

    expect(enTabla('derivaciones', 'eq')).toEqual([['profesional_destino_id', 'yo'], ['estado', 'pendiente']]);
  });

  test.each(['listar', 'listarPendientes'])('CP-U121 %s propaga un error de la base', async (metodo) => {
    const { db } = crearDb({ derivaciones: { error: { message: 'caída' } } });

    await expect(DerivacionService[metodo](db, 'yo')).rejects.toThrow('caída');
  });
});

describe('acceso al paciente solo con derivación aceptada (migración 005)', () => {
  const fs = require('fs');
  const path = require('path');
  const sql = fs.readFileSync(path.join(__dirname, '../../migrations/005_derivacion_solo_aceptada.sql'), 'utf8');

  test('CP-U122 la regla de acceso exige estado aceptada y derivación activa', () => {
    expect(sql).toMatch(/estado\s*=\s*'aceptada'/);
    expect(sql).toMatch(/activa\s*=\s*true/i);
  });
});
