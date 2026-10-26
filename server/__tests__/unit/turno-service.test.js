jest.mock('../../src/config/supabase', () => ({ supabaseAdmin: {}, supabase: {} }));

const TurnoService = require('../../src/services/TurnoService');
const { crearDb } = require('./helpers/fakeDb');

describe('TurnoService.crear', () => {
  test('registra al profesional como creador aunque el body diga otro', async () => {
    const { db, enTabla } = crearDb({ turnos: { data: { id: 't1' }, error: null } });
    await TurnoService.crear(db, 'prof-1', { fecha_inicio: 'x', created_by: 'falso' });
    expect(enTabla('turnos', 'insert')[0][0].created_by).toBe('prof-1');
  });

  test('superposición de horario en el consultorio (23P01) da 409', async () => {
    const { db } = crearDb({ turnos: { data: null, error: { code: '23P01', message: 'consultorio ocupado' } } });
    await expect(TurnoService.crear(db, 'prof-1', {})).rejects.toMatchObject({ status: 409, message: 'consultorio ocupado' });
  });

  test('otro error de la base no se disfraza de 409', async () => {
    const { db } = crearDb({ turnos: { data: null, error: { code: 'XX', message: 'boom' } } });
    const err = await TurnoService.crear(db, 'prof-1', {}).catch((e) => e);
    expect(err.message).toBe('boom');
    expect(err.status).toBeUndefined();
  });
});

describe('TurnoService.actualizar', () => {
  test('ignora id, created_by y created_at del body', async () => {
    const { db, enTabla } = crearDb({ turnos: { data: { id: 't1' }, error: null } });
    await TurnoService.actualizar(db, 't1', { id: 'otro', created_by: 'x', created_at: 'y', notas: 'hola' });
    expect(enTabla('turnos', 'update')[0][0]).toEqual({ notas: 'hola' });
  });

  test('mapea los errores: no existe → 404, superposición → 409, resto → 500', async () => {
    const casos = [['PGRST116', 404], ['23P01', 409], ['XX', 500]];
    for (const [code, status] of casos) {
      const { db } = crearDb({ turnos: { data: null, error: { code, message: 'm' } } });
      await expect(TurnoService.actualizar(db, 't1', {})).rejects.toMatchObject({ status });
    }
  });
});

describe('TurnoService.cancelar', () => {
  test('marca el turno como cancelado, no lo borra', async () => {
    const { db, enTabla } = crearDb({ turnos: { error: null } });
    await TurnoService.cancelar(db, 't1');
    expect(enTabla('turnos', 'update')[0][0]).toEqual({ estado: 'cancelado' });
    expect(enTabla('turnos', 'delete')).toHaveLength(0);
  });
});
