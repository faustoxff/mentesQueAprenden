const { erroresDeValidacion } = require('../../src/utils/validacion');

describe('erroresDeValidacion', () => {
  test('CP-U297 devuelve solo path y msg de cada error (sin value, type ni location)', () => {
    const resultado = { array: () => [{ type: 'field', value: 'secreta', msg: 'Muy corta', path: 'password', location: 'body' }] };

    expect(erroresDeValidacion(resultado)).toEqual([{ path: 'password', msg: 'Muy corta' }]);
  });
});
