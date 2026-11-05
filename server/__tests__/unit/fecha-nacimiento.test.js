// Regla única de la fecha de nacimiento: no puede ser futura ni de hace más de 150 años.
// Valores límite con un "hoy" fijo, para que el test no dependa del día en que se corre.
const { esFechaNacimientoValida, rangoFechaNacimiento, FECHA_NACIMIENTO_MENSAJE } = require('../../src/utils/fechaNacimiento');
const { exigirDatosValidos } = require('../../src/utils/validacion');
const { reglasCrearPaciente } = require('../../src/validaciones/pacientes');

const HOY = '2026-11-05';

describe('fecha de nacimiento: regla única (server)', () => {
  test.each([
    ['hoy (límite superior)', '2026-11-05', true],
    ['mañana (límite superior + 1)', '2026-11-06', false],
    ['hace 150 años justos (límite inferior)', '1876-11-05', true],
    ['un día antes de los 150 años (límite inferior - 1)', '1876-11-04', false],
    ['una fecha común', '2015-03-10', true],
    ['con hora (se usa solo la fecha)', '2015-03-10T00:00:00.000Z', true],
    ['texto que no es fecha', 'ayer', false],
    ['vacía', '', false]
  ])('CP-U350 %s → %s', (_caso, fecha, valida) => {
    expect(esFechaNacimientoValida(fecha, HOY)).toBe(valida);
  });

  test('CP-U351 el rango va de hoy a la misma fecha 150 años antes', () => {
    expect(rangoFechaNacimiento(HOY)).toEqual({ minimo: '1876-11-05', maximo: '2026-11-05' });
  });

  test.each([
    ['futura', '2999-01-01'],
    ['de hace más de 150 años', '1800-01-01']
  ])('CP-U352 crear un paciente (formulario o chat) con fecha %s → 422 con el mensaje de la regla', async (_caso, fecha) => {
    const datos = { nombre: 'ZZ-TEST', apellido: 'Fecha', dni: '1234567', fecha_nacimiento: fecha };

    await expect(exigirDatosValidos(reglasCrearPaciente, datos)).rejects.toMatchObject({ status: 422, message: FECHA_NACIMIENTO_MENSAJE });
  });
});
