import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { validarFechaNacimiento, rangoFechaNacimiento, FECHA_NACIMIENTO_MENSAJE, EDAD_MAXIMA } from './fechaNacimiento';

// El server es CommonJS: se carga con require para comparar las dos reglas.
const require = createRequire(import.meta.url);
const server = require('../../../server/src/utils/fechaNacimiento.js');

const HOY = '2026-11-05';

describe('fecha de nacimiento: regla única (client)', () => {
  it.each([
    ['hoy (límite superior)', '2026-11-05', null],
    ['mañana (límite superior + 1)', '2026-11-06', FECHA_NACIMIENTO_MENSAJE],
    ['hace 150 años justos (límite inferior)', '1876-11-05', null],
    ['un día antes de los 150 años (límite inferior - 1)', '1876-11-04', FECHA_NACIMIENTO_MENSAJE],
    ['vacía (de eso se ocupa "obligatoria")', '', null]
  ])('CP-U354 %s → %s', (_caso, fecha, esperado) => {
    expect(validarFechaNacimiento(fecha, HOY)).toBe(esperado);
  });

  it('CP-U355 client y server tienen el mismo límite, el mismo mensaje y el mismo rango', () => {
    expect(EDAD_MAXIMA).toBe(server.EDAD_MAXIMA);
    expect(FECHA_NACIMIENTO_MENSAJE).toBe(server.FECHA_NACIMIENTO_MENSAJE);
    expect(rangoFechaNacimiento(HOY)).toEqual(server.rangoFechaNacimiento(HOY));
    for (const fecha of ['2026-11-05', '2026-11-06', '1876-11-05', '1876-11-04', '2015-03-10']) {
      expect(validarFechaNacimiento(fecha, HOY) === null).toBe(server.esFechaNacimientoValida(fecha, HOY));
    }
  });
});
