const { DNI_REGEX, DNI_MENSAJE, esDniValido } = require('../../src/utils/dni');

describe('regla única del DNI (server)', () => {
  test.each([
    ['7 dígitos (límite inferior)', '1234567', true],
    ['8 dígitos (límite superior)', '12345678', true],
    ['6 dígitos (límite inferior - 1)', '123456', false],
    ['9 dígitos (límite superior + 1)', '123456789', false],
    ['con puntos', '12.345.678', false],
    ['con espacios', '12 345 678', false],
    ['con letras', '1234567a', false],
    ['vacío', '', false],
    ['número en vez de texto', 12345678, false],
    ['sin valor', undefined, false]
  ])('CP-U309 %s → válido: %s', (_caso, valor, esperado) => {
    expect(esDniValido(valor)).toBe(esperado);
  });

  test('CP-U310 el mensaje dice el formato esperado y la expresión no tiene flags', () => {
    expect(DNI_MENSAJE).toBe('El DNI debe tener 7 u 8 dígitos, sin puntos ni espacios');
    expect(DNI_REGEX.flags).toBe('');
  });
});
