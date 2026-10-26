const { sanitizarBusqueda } = require('../../src/utils/busqueda');

describe('sanitizarBusqueda (evita filter injection en .or())', () => {
  test('deja pasar nombres y DNI normales', () => {
    expect(sanitizarBusqueda('María José')).toBe('María José');
    expect(sanitizarBusqueda('12345678')).toBe('12345678');
  });

  test('saca comas, paréntesis y comodines que cambiarían el filtro', () => {
    const malo = 'x%,profesional_principal_id.neq.0),or(id.not.is.null';
    const limpio = sanitizarBusqueda(malo);
    expect(limpio).not.toMatch(/[,()%*]/);
  });

  test('tolera null, undefined y números', () => {
    expect(sanitizarBusqueda(null)).toBe('');
    expect(sanitizarBusqueda(undefined)).toBe('');
    expect(sanitizarBusqueda(123)).toBe('123');
  });

  test('acota el largo', () => {
    expect(sanitizarBusqueda('a'.repeat(500))).toHaveLength(100);
  });
});
