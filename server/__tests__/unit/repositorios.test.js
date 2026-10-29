// Capa de repositorios: los errores de Supabase/Postgres llegan a los services como tipos
// propios, sin códigos de PostgREST ni de Postgres.
const { ErrorDeDatos, datosDe } = require('../../src/repositories/errores');
const turnoRepository = require('../../src/repositories/TurnoRepository');
const { crearDb } = require('./helpers/fakeDb');

describe('errores de datos', () => {
  test.each([
    ['PGRST116', 'NO_ENCONTRADO'],
    ['23505', 'DUPLICADO'],
    ['23P01', 'CHOQUE_HORARIO'],
    ['PGRST202', 'FUNCION_INEXISTENTE'],
    ['42883', 'FUNCION_INEXISTENTE'],
    ['XX000', 'OTRO'],
    [undefined, 'OTRO']
  ])('CP-U329 el código %p se traduce al tipo %p y conserva el mensaje', (code, tipo) => {
    const error = new ErrorDeDatos({ code, message: 'detalle de la base' });

    expect(error).toMatchObject({ tipo, message: 'detalle de la base' });
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toHaveProperty('status');
  });

  test('CP-U330 datosDe devuelve los datos cuando no hay error', () => {
    expect(datosDe({ data: [{ id: 't1' }], error: null })).toEqual([{ id: 't1' }]);
  });
});

describe('TurnoRepository', () => {
  test('CP-U331 un choque de consultorio al crear llega como CHOQUE_HORARIO, no como 23P01', async () => {
    const { db } = crearDb({ turnos: { data: null, error: { code: '23P01', message: 'Consultorio 1 ocupado' } } });

    await expect(turnoRepository.crear(db, {})).rejects.toMatchObject({ tipo: 'CHOQUE_HORARIO', message: 'Consultorio 1 ocupado' });
  });

  test('CP-U332 la ocupación pide a la función de la base el rango con null cuando falta un extremo', async () => {
    const { db, rpcs } = crearDb({ 'rpc:turnos_ocupacion': { data: [], error: null } });

    await turnoRepository.ocupacion(db, { desde: '2026-11-01' });

    expect(rpcs('turnos_ocupacion')[0]).toEqual({ p_desde: '2026-11-01', p_hasta: null });
  });
});
