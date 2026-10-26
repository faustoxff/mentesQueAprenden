jest.mock('../../src/config/supabase', () => ({ supabaseAdmin: {}, supabase: {} }));

const DerivacionService = require('../../src/services/DerivacionService');
const { crearDb } = require('./helpers/fakeDb');

const ok = (data) => ({ data, error: null });

describe('DerivacionService.crear', () => {
  const body = { paciente_id: 'pac', profesional_destino_id: 'destino', motivo: 'm' };

  test('no deja derivar al mismo profesional', async () => {
    const { db } = crearDb();
    await expect(DerivacionService.crear(db, 'destino', body)).rejects.toMatchObject({ status: 422 });
  });

  test('rechaza un destinatario inexistente', async () => {
    const { db } = crearDb({ profesionales: ok(null) });
    await expect(DerivacionService.crear(db, 'origen', body)).rejects.toMatchObject({ status: 422 });
  });

  test('rechaza un destinatario inactivo', async () => {
    const { db } = crearDb({ profesionales: ok({ id: 'destino', activo: false }) });
    await expect(DerivacionService.crear(db, 'origen', body)).rejects.toMatchObject({ status: 422 });
  });

  test('crea la derivación con el origen tomado de la sesión, no del body', async () => {
    const { db, enTabla } = crearDb({
      profesionales: ok({ id: 'destino', activo: true }),
      derivaciones: ok({ id: 'd1' })
    });
    const r = await DerivacionService.crear(db, 'origen', { ...body, profesional_origen_id: 'falso' });
    expect(r).toEqual({ id: 'd1' });
    expect(enTabla('derivaciones', 'insert')[0][0]).toMatchObject({ profesional_origen_id: 'origen' });
  });
});

describe('DerivacionService.responder', () => {
  const pendiente = ok({ profesional_destino_id: 'destino', estado: 'pendiente' });

  test('404 si la derivación no existe', async () => {
    const { db } = crearDb({ derivaciones: ok(null) });
    await expect(DerivacionService.responder(db, 'x', 'destino', {})).rejects.toMatchObject({ status: 404 });
  });

  test('solo el destinatario puede responder (403)', async () => {
    const { db } = crearDb({ derivaciones: pendiente });
    await expect(DerivacionService.responder(db, 'x', 'otro', { estado: 'aceptada' })).rejects.toMatchObject({ status: 403 });
  });

  test('no se puede responder dos veces (409)', async () => {
    const { db } = crearDb({ derivaciones: ok({ profesional_destino_id: 'destino', estado: 'aceptada' }) });
    await expect(DerivacionService.responder(db, 'x', 'destino', { estado: 'rechazada' })).rejects.toMatchObject({ status: 409 });
  });

  test('aceptar deja la derivación activa; rechazar, inactiva', async () => {
    for (const [estado, activa] of [['aceptada', true], ['rechazada', false]]) {
      const { db, enTabla } = crearDb({ derivaciones: [pendiente, ok({ id: 'x' })] });
      await DerivacionService.responder(db, 'x', 'destino', { estado });
      expect(enTabla('derivaciones', 'update')[0][0]).toMatchObject({ estado, activa });
    }
  });
});

describe('DerivacionService.completar', () => {
  const aceptada = { profesional_origen_id: 'origen', profesional_destino_id: 'destino', estado: 'aceptada', activa: true };

  test('404 si no existe', async () => {
    const { db } = crearDb({ derivaciones: ok(null) });
    await expect(DerivacionService.completar(db, 'x', 'origen')).rejects.toMatchObject({ status: 404 });
  });

  test('un tercero no puede completarla (403)', async () => {
    const { db } = crearDb({ derivaciones: ok(aceptada) });
    await expect(DerivacionService.completar(db, 'x', 'tercero')).rejects.toMatchObject({ status: 403 });
  });

  test('solo se completa una derivación aceptada y activa (409)', async () => {
    for (const estado of [{ estado: 'pendiente' }, { activa: false }]) {
      const { db } = crearDb({ derivaciones: ok({ ...aceptada, ...estado }) });
      await expect(DerivacionService.completar(db, 'x', 'origen')).rejects.toMatchObject({ status: 409 });
    }
  });

  test('origen y destino pueden completarla y se cierra el acceso', async () => {
    for (const quien of ['origen', 'destino']) {
      const { db, enTabla } = crearDb({ derivaciones: [ok(aceptada), ok({ id: 'x' })] });
      await DerivacionService.completar(db, 'x', quien);
      expect(enTabla('derivaciones', 'update')[0][0]).toEqual({ estado: 'completada', activa: false });
    }
  });
});
