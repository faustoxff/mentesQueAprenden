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

describe('PagoService.crear', () => {
  beforeEach(() => mockAdmin.from.mockReset());

  test('404 si la sesión no existe', async () => {
    conectarAdmin({ sesiones: { data: null, error: { message: 'x' } } });
    await expect(PagoService.crear(crearDb().db, 'prof', { sesion_id: 's1', monto_total: 100 }))
      .rejects.toMatchObject({ status: 404 });
  });

  test('409 si la sesión ya fue pagada', async () => {
    conectarAdmin({ sesiones: sesion({ pagado: true }) });
    await expect(PagoService.crear(crearDb().db, 'prof', { sesion_id: 's1', monto_total: 100 }))
      .rejects.toMatchObject({ status: 409 });
  });

  test('reparte el monto según el porcentaje del profesional (70/30)', async () => {
    conectarAdmin({ sesiones: [sesion(), { error: null }] });
    const { db, enTabla } = crearDb({ pagos: { data: { id: 'p1' }, error: null } });
    await PagoService.crear(db, 'registrador', { sesion_id: 's1', monto_total: 10000, metodo_pago: 'efectivo' });
    expect(enTabla('pagos', 'insert')[0][0]).toMatchObject({
      monto_total: 10000, monto_profesional: 7000, monto_espacio: 3000,
      porcentaje_profesional: 70, registrado_por: 'registrador'
    });
  });

  test('usa el porcentaje propio del profesional', async () => {
    conectarAdmin({ sesiones: [sesion({ profesional: { porcentaje_honorarios: 50 } }), { error: null }] });
    const { db, enTabla } = crearDb({ pagos: { data: {}, error: null } });
    await PagoService.crear(db, 'x', { sesion_id: 's1', monto_total: 200 });
    expect(enTabla('pagos', 'insert')[0][0]).toMatchObject({ monto_profesional: 100, monto_espacio: 100 });
  });

  test('si el profesional no tiene porcentaje cargado, cae al 70', async () => {
    conectarAdmin({ sesiones: [sesion({ profesional: { porcentaje_honorarios: null } }), { error: null }] });
    const { db, enTabla } = crearDb({ pagos: { data: {}, error: null } });
    await PagoService.crear(db, 'x', { sesion_id: 's1', monto_total: 100 });
    expect(enTabla('pagos', 'insert')[0][0].porcentaje_profesional).toBe(70);
  });

  test('marca la sesión como pagada después de registrar el pago', async () => {
    const admin = conectarAdmin({ sesiones: [sesion(), { error: null }] });
    const { db } = crearDb({ pagos: { data: {}, error: null } });
    await PagoService.crear(db, 'x', { sesion_id: 's1', monto_total: 100, metodo_pago: 'tarjeta' });
    expect(admin.enTabla('sesiones', 'update')[0][0]).toMatchObject({ pagado: true, metodo_pago: 'tarjeta' });
  });

  test('si falla el insert del pago, no marca la sesión como pagada', async () => {
    const admin = conectarAdmin({ sesiones: sesion() });
    const { db } = crearDb({ pagos: { data: null, error: { message: 'rls' } } });
    await expect(PagoService.crear(db, 'x', { sesion_id: 's1', monto_total: 100 })).rejects.toThrow('rls');
    expect(admin.enTabla('sesiones', 'update')).toHaveLength(0);
  });
});
