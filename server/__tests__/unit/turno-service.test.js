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

describe('TurnoService.listar: calendario compartido sin filtrar datos clínicos', () => {
  const propio = {
    id: 't-propio', fecha_inicio: '2026-01-01T10:00:00Z', fecha_fin: '2026-01-01T10:50:00Z', estado: 'programado',
    consultorio: 1, notas: 'nota clínica', paciente_id: 'pac', paciente: { id: 'pac' }, profesional: { id: 'yo' }
  };
  const ajeno = {
    id: 't-ajeno', fecha_inicio: '2026-01-01T11:00:00Z', fecha_fin: '2026-01-01T11:50:00Z', estado: 'confirmado',
    consultorio: 2, profesional_id: 'otro', profesional_nombre: 'Luis', profesional_apellido: 'Paz'
  };

  test('los turnos ajenos vienen de la función turnos_ocupacion y sin paciente ni notas', async () => {
    const { db, rpcs } = crearDb({ turnos: { data: [propio], error: null }, 'rpc:turnos_ocupacion': { data: [ajeno], error: null } });
    const r = await TurnoService.listar(db, { fecha_inicio: 'a', fecha_fin: 'b' }, 'yo');

    expect(rpcs('turnos_ocupacion')[0]).toEqual({ p_desde: 'a', p_hasta: 'b' });
    expect(r.map(t => t.id)).toEqual(['t-propio', 't-ajeno']);
    const ocupado = r.find(t => t.id === 't-ajeno');
    expect(ocupado).toMatchObject({ ocupado: true, consultorio: 2, profesional: { id: 'otro', nombre: 'Luis' } });
    expect(ocupado).not.toHaveProperty('notas');
    expect(ocupado).not.toHaveProperty('paciente_id');
    expect(ocupado).not.toHaveProperty('paciente');
  });

  test('un turno propio que también figura en la ocupación no se duplica', async () => {
    const { db } = crearDb({
      turnos: { data: [propio], error: null },
      'rpc:turnos_ocupacion': { data: [{ ...ajeno, id: 't-propio', profesional_id: 'yo' }, ajeno], error: null }
    });
    const r = await TurnoService.listar(db, {}, 'yo');
    expect(r.filter(t => t.id === 't-propio')).toHaveLength(1);
  });

  test('con filtro por profesional solo trae la ocupación de ese profesional', async () => {
    const { db } = crearDb({
      turnos: { data: [], error: null },
      'rpc:turnos_ocupacion': { data: [ajeno, { ...ajeno, id: 'otro-mas', profesional_id: 'tercero' }], error: null }
    });
    const r = await TurnoService.listar(db, { profesional_id: 'otro' }, 'yo');
    expect(r.map(t => t.id)).toEqual(['t-ajeno']);
  });

  test('si la función falla, el error se propaga', async () => {
    const { db } = crearDb({ turnos: { data: [], error: null }, 'rpc:turnos_ocupacion': { data: null, error: { message: 'boom' } } });
    await expect(TurnoService.listar(db, {}, 'yo')).rejects.toThrow('boom');
  });
});
