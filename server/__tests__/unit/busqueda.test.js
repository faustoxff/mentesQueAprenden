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

describe('buscarParecidos (búsqueda de pacientes que tolera errores de tipeo)', () => {
  const { buscarParecidos } = require('../../src/utils/busqueda');
  const pacientes = [
    { id: 1, nombre: 'María', apellido: 'González', dni: '1234567' },
    { id: 2, nombre: 'fausto', apellido: 'zacanti', dni: '1231234' },
    { id: 3, nombre: 'Fausto', apellido: 'Zaccanti', dni: '8761832' },
    { id: 4, nombre: 'Eva', apellido: 'Sol', dni: '30111222' }
  ];
  const ids = (termino) => buscarParecidos(pacientes, termino).map((p) => p.id);

  test('CP-U373 un error de tipeo igual encuentra al paciente, primero el más parecido', () => {
    expect(ids('faisto zacanti')).toEqual([2, 3]);
    expect(ids('fuasto')).toEqual([2, 3]);
  });

  test('CP-U374 no distingue mayúsculas ni acentos, ni el orden de las palabras', () => {
    expect(ids('GONZALEZ maria')).toEqual([1]);
  });

  test('CP-U375 todas las palabras tienen que coincidir con el mismo paciente', () => {
    expect(ids('fausto gonzalez')).toEqual([]);
  });

  test('CP-U376 las palabras de hasta 3 letras y los números no se aproximan', () => {
    expect(ids('ana')).toEqual([]);
    expect(ids('1231235')).toEqual([]);
    expect(ids('8761')).toEqual([3]);
  });
});
