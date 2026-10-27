// Turnos y consultorios: superposición (valores límite en el borde fin = inicio),
// turnos ajenos y la regla de la base que impide el choque de horarios.
const fs = require('fs');
const path = require('path');

const mockAdmin = { from: jest.fn() };
jest.mock('../../src/config/supabase', () => ({ supabaseAdmin: mockAdmin, supabase: {} }));

const TurnoService = require('../../src/services/TurnoService');
const SesionService = require('../../src/services/SesionService');
const { crearDb } = require('./helpers/fakeDb');

const ok = (data) => ({ data, error: null });
const FUNCION_AUSENTE = { data: null, error: { code: 'PGRST202' } };

describe('regla de superposición en la base (migración 007)', () => {
  const sql = fs.readFileSync(path.join(__dirname, '../../migrations/007_consultorios.sql'), 'utf8');
  const inicioCondicion = sql.indexOf('IF EXISTS');
  const condicion = sql.slice(inicioCondicion, sql.indexOf('THEN', inicioCondicion));

  test('CP-U71 compara con desigualdades estrictas: un turno que empieza justo cuando termina otro NO choca', () => {
    expect(condicion).toMatch(/fecha_inicio\s*<\s*NEW\.fecha_fin/);
    expect(condicion).toMatch(/fecha_fin\s*>\s*NEW\.fecha_inicio/);
    expect(condicion).not.toMatch(/<=|>=/);
  });

  test('CP-U72 solo compara turnos del mismo consultorio que no estén cancelados', () => {
    expect(condicion).toMatch(/consultorio\s*=\s*NEW\.consultorio/);
    expect(condicion).toMatch(/estado\s*!=\s*'cancelado'/);
  });

  test('CP-U73 el choque se informa con el código 23P01 que el backend traduce a 409', () => {
    expect(sql).toMatch(/ERRCODE\s*=\s*'23P01'/);
  });

  test('CP-U74 la columna consultorio solo admite 1, 2 o 3', () => {
    expect(sql).toMatch(/CHECK \(consultorio IN \(1, 2, 3\)\)/);
  });
});

describe('chequeo previo de consultorio libre (camino sin función de la base)', () => {
  const inicio = new Date('2026-11-02T13:00:00.000Z');
  const fin = new Date('2026-11-02T13:50:00.000Z');

  test('CP-U75 busca choques con < y > estrictos (borde fin = inicio permitido)', async () => {
    const { db, enTabla } = crearDb({ 'rpc:consultorio_libre': FUNCION_AUSENTE, turnos: ok([]) });

    await SesionService.verificarConsultorioLibre(db, 2, inicio, fin);

    expect(enTabla('turnos', 'lt')).toContainEqual(['fecha_inicio', fin.toISOString()]);
    expect(enTabla('turnos', 'gt')).toContainEqual(['fecha_fin', inicio.toISOString()]);
    expect(enTabla('turnos', 'lte')).toHaveLength(0);
    expect(enTabla('turnos', 'gte')).toHaveLength(0);
  });

  test('CP-U76 con un turno superpuesto (aunque sea 1 minuto) → 409', async () => {
    const { db } = crearDb({ 'rpc:consultorio_libre': FUNCION_AUSENTE, turnos: ok([{ id: 'otro' }]) });

    await expect(SesionService.verificarConsultorioLibre(db, 2, inicio, fin)).rejects.toMatchObject({ status: 409 });
  });

  test('CP-U77 al editar, excluye el propio turno de la búsqueda de choques', async () => {
    const { db, enTabla } = crearDb({ 'rpc:consultorio_libre': FUNCION_AUSENTE, turnos: ok([]) });

    await SesionService.verificarConsultorioLibre(db, 2, inicio, fin, 'turno-propio');

    expect(enTabla('turnos', 'neq')).toContainEqual(['id', 'turno-propio']);
  });

  test('CP-U78 con la función de la base, manda el rango exacto y el consultorio', async () => {
    const { db, rpcs } = crearDb({ 'rpc:consultorio_libre': ok(true) });

    await SesionService.verificarConsultorioLibre(db, 3, inicio, fin);

    expect(rpcs('consultorio_libre')[0]).toEqual({ p_consultorio: 3, p_inicio: inicio.toISOString(), p_fin: fin.toISOString(), p_excluir: null });
  });
});

describe('TurnoService: turnos ajenos', () => {
  test('CP-U79 editar un turno ajeno (RLS no devuelve la fila: PGRST116) → 404', async () => {
    const { db } = crearDb({ turnos: { data: null, error: { code: 'PGRST116', message: 'no rows' } } });

    await expect(TurnoService.actualizar(db, 'ajeno', { estado: 'confirmado' })).rejects.toMatchObject({ status: 404 });
  });

  test('CP-U80 mover un turno a un horario ocupado (23P01) → 409 con el mensaje de la base', async () => {
    const { db } = crearDb({ turnos: { data: null, error: { code: '23P01', message: 'Consultorio 2 ocupado en ese horario' } } });

    await expect(TurnoService.actualizar(db, 't1', { consultorio: 2 })).rejects.toMatchObject({ status: 409, message: 'Consultorio 2 ocupado en ese horario' });
  });

  // DEF-A04: con RLS el UPDATE de un turno ajeno afecta 0 filas sin error, y cancelar() responde como si hubiera cancelado.
  test.failing('CP-U81 cancelar un turno ajeno o inexistente → 404 (no "Turno cancelado")', async () => {
    const { db } = crearDb({ turnos: { data: [], error: null } });

    await expect(TurnoService.cancelar(db, 'ajeno')).rejects.toMatchObject({ status: 404 });
  });

  test('CP-U82 un turno ajeno en el calendario no trae paciente, notas ni tipo', async () => {
    const ajeno = { id: 't2', fecha_inicio: '2026-11-02T13:00:00Z', fecha_fin: '2026-11-02T13:50:00Z', estado: 'programado', consultorio: 1, tipo: 'evaluacion', notas: 'privado', paciente: { nombre: 'X' }, profesional: { id: 'otro', nombre: 'B', apellido: 'C' } };
    const { db } = crearDb({ turnos: ok([ajeno]), 'rpc:turnos_ocupacion': ok([]) });

    const [t] = await TurnoService.listar(db, {}, 'yo');

    expect(t).toMatchObject({ id: 't2', ocupado: true, consultorio: 1 });
    expect(t).not.toHaveProperty('paciente');
    expect(t).not.toHaveProperty('notas');
    expect(t).not.toHaveProperty('tipo');
  });

  test('CP-U83 las sesiones sin turno aparecen en la agenda con fin = inicio + duración (50 min por defecto)', async () => {
    const { db } = crearDb({ turnos: ok([]), 'rpc:turnos_ocupacion': ok([]), sesiones: ok([{ id: 's1', fecha: '2026-11-02T13:00:00.000Z', duracion_minutos: null, turnos: [] }]) });

    const [s] = await TurnoService.listar(db, {}, 'yo', { incluirSesiones: true });

    expect(s).toMatchObject({ id: 'sesion-s1', es_sesion: true, consultorio: null, fecha_fin: '2026-11-02T13:50:00.000Z' });
  });

  test('CP-U84 una sesión que ya tiene un turno activo no se duplica en la agenda', async () => {
    const { db } = crearDb({ turnos: ok([]), 'rpc:turnos_ocupacion': ok([]), sesiones: ok([{ id: 's1', fecha: '2026-11-02T13:00:00Z', turnos: [{ id: 't1', estado: 'programado' }] }]) });

    const lista = await TurnoService.listar(db, {}, 'yo', { incluirSesiones: true });

    expect(lista).toHaveLength(0);
  });
});

describe('SesionService.crear: consultorio y turno vinculado', () => {
  beforeEach(() => mockAdmin.from.mockReset());

  test('CP-U85 si el consultorio está ocupado no se inserta la sesión', async () => {
    const { db, enTabla } = crearDb({ 'rpc:consultorio_libre': ok(false) });

    await expect(SesionService.crear(db, 'prof', { paciente_id: 'p', fecha: '2026-11-02T13:00:00Z', tipo: 'tratamiento', consultorio: 1 }))
      .rejects.toMatchObject({ status: 409 });
    expect(enTabla('sesiones', 'insert')).toHaveLength(0);
  });

  test('CP-U86 si no se puede crear el turno, la sesión recién insertada se deshace', async () => {
    const admin = crearDb({ sesiones: ok(null) });
    mockAdmin.from.mockImplementation(admin.db.from);
    const { db } = crearDb({ 'rpc:consultorio_libre': ok(true), sesiones: ok({ id: 's-nueva', paciente_id: 'p', profesional_id: 'prof' }), turnos: { error: { code: '23P01', message: 'Consultorio 1 ocupado' } } });

    await expect(SesionService.crear(db, 'prof', { paciente_id: 'p', fecha: '2026-11-02T13:00:00Z', tipo: 'tratamiento', consultorio: 1 }))
      .rejects.toMatchObject({ status: 409 });
    expect(admin.enTabla('sesiones', 'delete')).toHaveLength(1);
    expect(admin.enTabla('sesiones', 'eq')).toContainEqual(['id', 's-nueva']);
  });

  test('CP-U87 sin duración, el turno creado dura 50 minutos', async () => {
    const { db, enTabla } = crearDb({ 'rpc:consultorio_libre': ok(true), sesiones: ok({ id: 's1' }), turnos: ok(null) });

    await SesionService.crear(db, 'prof', { paciente_id: 'p', fecha: '2026-11-02T13:00:00.000Z', tipo: 'tratamiento', consultorio: 2 });

    expect(enTabla('turnos', 'insert')[0][0]).toMatchObject({ consultorio: 2, fecha_fin: '2026-11-02T13:50:00.000Z' });
  });

  test('CP-U88 la sesión se registra a nombre de quien la crea, aunque el body diga otro profesional', async () => {
    const { db, enTabla } = crearDb({ sesiones: ok({ id: 's1' }) });

    await SesionService.crear(db, 'prof', { paciente_id: 'p', fecha: '2026-11-02T13:00:00Z', tipo: 'tratamiento', profesional_id: 'otro' });

    expect(enTabla('sesiones', 'insert')[0][0]).toMatchObject({ profesional_id: 'prof', created_by: 'prof' });
  });

  test('CP-U89 actualizar ignora campos fuera de la lista editable (paciente, profesional)', async () => {
    const { db, enTabla } = crearDb({ sesiones: ok({ id: 's1' }) });

    await SesionService.actualizar(db, 's1', { notas_libres: 'nueva', paciente_id: 'otro', profesional_id: 'otro' });

    expect(enTabla('sesiones', 'update')[0][0]).toEqual({ notas_libres: 'nueva' });
  });
});

describe('SesionService.actualizar: el turno vinculado se mueve con la sesión', () => {
  const previa = { id: 's1', fecha: '2026-11-02T13:00:00.000Z', duracion_minutos: 50, tipo: 'tratamiento', paciente_id: 'p', profesional_id: 'prof' };
  const vinculado = { id: 't1', fecha_inicio: '2026-11-02T13:00:00.000Z', consultorio: 1 };

  test('CP-U195 cambiar la hora mueve el turno conservando la duración', async () => {
    const { db, enTabla } = crearDb({ sesiones: [ok(previa), ok({ id: 's1' })], turnos: [ok([vinculado]), ok(null)] });

    await SesionService.actualizar(db, 's1', { fecha: '2026-11-02T15:00:00.000Z' });

    expect(enTabla('turnos', 'update')[0][0]).toEqual({ fecha_inicio: '2026-11-02T15:00:00.000Z', fecha_fin: '2026-11-02T15:50:00.000Z' });
  });

  test('CP-U196 "sin consultorio" cancela el turno vinculado (libera la sala)', async () => {
    const { db, enTabla } = crearDb({ sesiones: [ok(previa), ok({ id: 's1' })], turnos: [ok([vinculado]), ok(null)] });

    await SesionService.actualizar(db, 's1', { consultorio: null });

    expect(enTabla('turnos', 'update')[0][0]).toEqual({ sesion_id: 's1', estado: 'cancelado' });
  });

  test('CP-U197 si no cambia nada de la agenda, no se toca el turno', async () => {
    const { db, enTabla } = crearDb({ sesiones: [ok(previa), ok({ id: 's1' })], turnos: [ok([vinculado])] });

    await SesionService.actualizar(db, 's1', { fecha: previa.fecha, consultorio: 1 });

    expect(enTabla('turnos', 'update')).toHaveLength(0);
  });

  test('CP-U198 una sesión sin turno que pasa a tener consultorio crea su turno', async () => {
    const { db, enTabla } = crearDb({ sesiones: [ok(previa), ok({ id: 's1' })], turnos: [ok([]), ok([]), ok(null)] });

    await SesionService.actualizar(db, 's1', { consultorio: 3 });

    expect(enTabla('turnos', 'insert')[0][0]).toMatchObject({ consultorio: 3, sesion_id: 's1', fecha_fin: '2026-11-02T13:50:00.000Z' });
  });

  test('CP-U199 si el nuevo horario choca (23P01) → 409 y la sesión NO se modifica', async () => {
    const { db, enTabla } = crearDb({ sesiones: ok(previa), turnos: [ok([vinculado]), { error: { code: '23P01', message: 'Consultorio 1 ocupado' } }] });

    await expect(SesionService.actualizar(db, 's1', { fecha: '2026-11-02T15:00:00.000Z' })).rejects.toMatchObject({ status: 409 });
    expect(enTabla('sesiones', 'update')).toHaveLength(0);
  });

  test('CP-U200 una sesión vieja sin vínculo se asocia al único turno candidato a menos de 12 h', async () => {
    const { db, enTabla } = crearDb({ sesiones: [ok(previa), ok({ id: 's1' })], turnos: [ok([]), ok([vinculado]), ok(null)] });

    await SesionService.actualizar(db, 's1', { tipo: 'evaluacion' });

    expect(enTabla('turnos', 'update')[0][0]).toMatchObject({ sesion_id: 's1', tipo: 'evaluacion' });
  });

  test('CP-U201 actualizar una sesión ajena (PGRST116) → 404', async () => {
    const { db } = crearDb({ sesiones: { data: null, error: { code: 'PGRST116', message: 'x' } } });

    await expect(SesionService.actualizar(db, 'ajena', { notas_libres: 'x' })).rejects.toMatchObject({ status: 404 });
  });
});
