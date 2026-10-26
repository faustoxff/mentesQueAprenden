const mockAdmin = { from: jest.fn() };
jest.mock('../../src/config/supabase', () => ({ supabaseAdmin: mockAdmin, supabase: {} }));

const PagoService = require('../../src/services/PagoService');
const { crearDb } = require('./helpers/fakeDb');

// supabaseAdmin se usa para leer la sesión y marcarla pagada: lo conectamos a otro db falso.
const conectarAdmin = (resultados) => {
  const fake = crearDb(resultados);
  mockAdmin.from.mockImplementation(fake.db.from);
  return fake;
};

const sesion = (extra = {}) => ({
  data: { id: 's1', paciente_id: 'pac', profesional_id: 'prof', pagado: false, profesional: { porcentaje_honorarios: 70 }, ...extra },
  error: null
});

const PROF = 'prof';
const ok = (data) => ({ data, error: null });
// Cliente del usuario: puede ver la sesión de PROF (RLS) y registra el pago.
const dbDe = (extra = {}, sesionVisible = ok({ id: 's1', profesional_id: PROF })) =>
  crearDb({ sesiones: sesionVisible, ...extra });

describe('PagoService.crear', () => {
  beforeEach(() => mockAdmin.from.mockReset());

  test('404 si la sesión no es visible para quien cobra (RLS), sin tocar el cliente admin', async () => {
    const { db } = dbDe({}, ok(null));
    await expect(PagoService.crear(db, PROF, { sesion_id: 'ajena', monto_total: 100 }, 'profesional'))
      .rejects.toMatchObject({ status: 404 });
    expect(mockAdmin.from).not.toHaveBeenCalled();
  });

  test('404 si la sesión es de otro profesional y quien cobra no es admin', async () => {
    const { db } = dbDe({}, ok({ id: 's1', profesional_id: 'otro' }));
    await expect(PagoService.crear(db, PROF, { sesion_id: 's1', monto_total: 100 }, 'profesional'))
      .rejects.toMatchObject({ status: 404 });
    expect(mockAdmin.from).not.toHaveBeenCalled();
  });

  test('un admin sí puede cobrar la sesión de otro profesional', async () => {
    conectarAdmin({ sesiones: [sesion(), { error: null }] });
    const { db } = dbDe({ pagos: ok({ id: 'p1' }) }, ok({ id: 's1', profesional_id: 'otro' }));
    await expect(PagoService.crear(db, PROF, { sesion_id: 's1', monto_total: 100 }, 'admin')).resolves.toBeDefined();
  });

  test('404 si la sesión no existe', async () => {
    conectarAdmin({ sesiones: { data: null, error: { message: 'x' } } });
    await expect(PagoService.crear(dbDe().db, PROF, { sesion_id: 's1', monto_total: 100 }, 'profesional'))
      .rejects.toMatchObject({ status: 404 });
  });

  test('409 si la sesión ya fue pagada', async () => {
    conectarAdmin({ sesiones: sesion({ pagado: true }) });
    await expect(PagoService.crear(dbDe().db, PROF, { sesion_id: 's1', monto_total: 100 }, 'profesional'))
      .rejects.toMatchObject({ status: 409 });
  });

  test('reparte el monto según el porcentaje del profesional (70/30)', async () => {
    conectarAdmin({ sesiones: [sesion(), { error: null }] });
    const { db, enTabla } = dbDe({ pagos: ok({ id: 'p1' }) });
    await PagoService.crear(db, PROF, { sesion_id: 's1', monto_total: 10000, metodo_pago: 'efectivo' }, 'profesional');
    expect(enTabla('pagos', 'insert')[0][0]).toMatchObject({
      monto_total: 10000, monto_profesional: 7000, monto_espacio: 3000,
      porcentaje_profesional: 70, registrado_por: PROF
    });
  });

  test('usa el porcentaje propio del profesional', async () => {
    conectarAdmin({ sesiones: [sesion({ profesional: { porcentaje_honorarios: 50 } }), { error: null }] });
    const { db, enTabla } = dbDe({ pagos: ok({}) });
    await PagoService.crear(db, PROF, { sesion_id: 's1', monto_total: 200 }, 'profesional');
    expect(enTabla('pagos', 'insert')[0][0]).toMatchObject({ monto_profesional: 100, monto_espacio: 100 });
  });

  test('si el profesional no tiene porcentaje cargado, cae al 70', async () => {
    conectarAdmin({ sesiones: [sesion({ profesional: { porcentaje_honorarios: null } }), { error: null }] });
    const { db, enTabla } = dbDe({ pagos: ok({}) });
    await PagoService.crear(db, PROF, { sesion_id: 's1', monto_total: 100 }, 'profesional');
    expect(enTabla('pagos', 'insert')[0][0].porcentaje_profesional).toBe(70);
  });

  test('marca la sesión como pagada después de registrar el pago', async () => {
    const admin = conectarAdmin({ sesiones: [sesion(), { error: null }] });
    const { db } = dbDe({ pagos: ok({}) });
    await PagoService.crear(db, PROF, { sesion_id: 's1', monto_total: 100, metodo_pago: 'tarjeta' }, 'profesional');
    expect(admin.enTabla('sesiones', 'update')[0][0]).toMatchObject({ pagado: true, metodo_pago: 'tarjeta' });
  });

  test('si falla el insert del pago, no marca la sesión como pagada', async () => {
    const admin = conectarAdmin({ sesiones: sesion() });
    const { db } = dbDe({ pagos: { data: null, error: { message: 'rls' } } });
    await expect(PagoService.crear(db, PROF, { sesion_id: 's1', monto_total: 100 }, 'profesional')).rejects.toThrow('rls');
    expect(admin.enTabla('sesiones', 'update')).toHaveLength(0);
  });
});
