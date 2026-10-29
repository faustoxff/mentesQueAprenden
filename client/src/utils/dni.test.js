import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { DNI_REGEX, DNI_MENSAJE, PATRON_DNI, validarDni } from './dni';

// El server es CommonJS: se carga con require para comparar las dos reglas.
const require = createRequire(import.meta.url);
const server = require('../../../server/src/utils/dni.js');

describe('regla única del DNI (client)', () => {
  it.each([
    ['7 dígitos (límite inferior)', '1234567', null],
    ['8 dígitos (límite superior)', '12345678', null],
    ['6 dígitos (límite inferior - 1)', '123456', DNI_MENSAJE],
    ['9 dígitos (límite superior + 1)', '123456789', DNI_MENSAJE],
    ['con puntos', '12.345.678', DNI_MENSAJE],
    ['vacío', '', DNI_MENSAJE],
    ['sin valor', undefined, DNI_MENSAJE]
  ])('CP-U313 %s → %s', (_caso, valor, esperado) => {
    expect(validarDni(valor)).toBe(esperado);
  });

  it('CP-U314 el patrón para react-hook-form usa la misma expresión y mensaje', () => {
    expect(PATRON_DNI).toEqual({ value: DNI_REGEX, message: DNI_MENSAJE });
  });

  it('CP-U315 client y server tienen exactamente la misma regla y el mismo mensaje', () => {
    expect(DNI_REGEX.source).toBe(server.DNI_REGEX.source);
    expect(DNI_REGEX.flags).toBe(server.DNI_REGEX.flags);
    expect(DNI_MENSAJE).toBe(server.DNI_MENSAJE);
  });
});
