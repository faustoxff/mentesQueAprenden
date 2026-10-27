const { porcentajeHonorarios } = require('../../src/utils/honorarios');

describe('porcentajeHonorarios (partición y valores límite)', () => {
  test.each([
    ['0 (límite inferior)', 0, 0],
    ['100 (límite superior)', 100, 100],
    ['62,5 (decimal)', 62.5, 62.5],
    ['"0" como texto', '0', 0],
    ['"62.5" como texto', '62.5', 62.5],
    ['null → por defecto', null, 70],
    ['undefined → por defecto', undefined, 70],
    ['vacío → por defecto', '', 70]
  ])('CP-U300 %s', (_caso, valor, esperado) => {
    expect(porcentajeHonorarios(valor)).toBe(esperado);
  });

  test.each([
    ['-1 (límite inferior - 1)', -1],
    ['100,01 (límite superior + 0,01)', 100.01],
    ['101', 101],
    ['texto no numérico', 'abc']
  ])('CP-U300 %s → error 422', (_caso, valor) => {
    expect(() => porcentajeHonorarios(valor)).toThrow(expect.objectContaining({ status: 422 }));
  });
});
