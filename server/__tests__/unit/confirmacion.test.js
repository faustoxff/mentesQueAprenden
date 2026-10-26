process.env.CONFIRM_SECRET = 'secreto-de-test';
const { crearToken, verificarToken } = require('../../src/utils/confirmacion');

const datos = { accion: 'eliminar_paciente', profesionalId: 'prof-1', recursoId: 'pac-1' };

describe('tokens de confirmación firmados', () => {
  test('un token válido devuelve el recurso al que corresponde', () => {
    const token = crearToken(datos);
    expect(verificarToken(token, { accion: 'eliminar_paciente', profesionalId: 'prof-1' }))
      .toMatchObject({ recursoId: 'pac-1' });
  });

  test('un token alterado se rechaza (cambiar el recurso rompe la firma)', () => {
    const [payload, firma] = crearToken(datos).split('.');
    const falso = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url')), recursoId: 'otro-paciente' })).toString('base64url');
    expect(() => verificarToken(`${falso}.${firma}`, { accion: 'eliminar_paciente', profesionalId: 'prof-1' }))
      .toThrow('Confirmación inválida');
  });

  test('basura o vacío se rechazan', () => {
    for (const t of ['', 'abc', undefined, null, 'a.b']) {
      expect(() => verificarToken(t, { accion: 'eliminar_paciente', profesionalId: 'prof-1' })).toThrow();
    }
  });

  test('vence a los 5 minutos', () => {
    const token = crearToken(datos, 1_000_000);
    expect(() => verificarToken(token, { accion: 'eliminar_paciente', profesionalId: 'prof-1' }, 1_000_000 + 5 * 60 * 1000 + 1))
      .toThrow('venció');
  });

  test('solo sirve para la persona que lo pidió (403)', () => {
    const token = crearToken(datos);
    let error;
    try { verificarToken(token, { accion: 'eliminar_paciente', profesionalId: 'otra-persona' }); } catch (e) { error = e; }
    expect(error).toMatchObject({ status: 403 });
  });

  test('solo sirve para la acción para la que se creó', () => {
    const token = crearToken(datos);
    expect(() => verificarToken(token, { accion: 'otra_accion', profesionalId: 'prof-1' })).toThrow();
  });

  test('un token firmado con otro secreto no vale', () => {
    const token = crearToken(datos);
    process.env.CONFIRM_SECRET = 'otro-secreto';
    expect(() => verificarToken(token, { accion: 'eliminar_paciente', profesionalId: 'prof-1' })).toThrow();
    process.env.CONFIRM_SECRET = 'secreto-de-test';
  });
});
