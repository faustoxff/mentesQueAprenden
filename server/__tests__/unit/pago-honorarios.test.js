// División de honorarios, sesiones pendientes y liquidación mensual.
// Partición de equivalencia sobre el porcentaje (0 / intermedio / 100) y valores límite.
const mockAdmin = { from: jest.fn() };
jest.mock('../../src/config/supabase', () => ({ supabaseAdmin: mockAdmin, supabase: {} }));

const PagoService = require('../../src/services/PagoService');
const { crearDb } = require('./helpers/fakeDb');

const ok = (data) => ({ data, error: null });
const PROF = 'prof';

const conectarAdmin = (resultados) => {
  const fake = crearDb(resultados);
  mockAdmin.from.mockImplementation(fake.db.from);
  return fake;
};

// Registra un pago de `monto` para un profesional con `porcentaje` y devuelve lo que se insertó.
async function cobrar(monto, porcentaje) {
  conectarAdmin({ sesiones: [ok({ id: 's1', paciente_id: 'pac', profesional_id: PROF, pagado: false, profesional: { porcentaje_honorarios: porcentaje } }), ok(null)] });
  const { db, enTabla } = crearDb({ sesiones: ok({ id: 's1', profesional_id: PROF }), pagos: ok({ id: 'p1' }) });
  await PagoService.crear(db, PROF, { sesion_id: 's1', monto_total: monto, metodo_pago: 'efectivo' }, 'profesional');
  return enTabla('pagos', 'insert')[0][0];
}

beforeEach(() => mockAdmin.from.mockReset());

describe('PagoService.crear: división de honorarios', () => {
  test('CP-U52 con 100 % el espacio no se queda con nada', async () => {
    const pago = await cobrar(5000, 100);

    expect(pago).toMatchObject({ monto_profesional: 5000, monto_espacio: 0, porcentaje_profesional: 100 });
  });

  // DEF-A01: `porcentaje_honorarios || 70` convierte un 0 % legítimo en 70 %.
  test.failing('CP-U53 con 0 % todo el monto queda para el espacio', async () => {
    const pago = await cobrar(5000, 0);

    expect(pago).toMatchObject({ monto_profesional: 0, monto_espacio: 5000, porcentaje_profesional: 0 });
  });

  test('CP-U54 con un porcentaje decimal (62,5 %) el reparto es exacto', async () => {
    const pago = await cobrar(1000, 62.5);

    expect(pago).toMatchObject({ monto_profesional: 625, monto_espacio: 375 });
  });

  test.each([
    [100.01, 70],
    [0.01, 70],
    [3333.33, 33.33],
    [9999.99, 99.99]
  ])('CP-U55 con monto %p y %p %% las dos partes suman exactamente el total', async (monto, porcentaje) => {
    const pago = await cobrar(monto, porcentaje);

    expect(pago.monto_profesional + pago.monto_espacio).toBeCloseTo(monto, 10);
  });

  // DEF-A15: el reparto no se redondea a centavos; 70 % de $100,01 da 70,007 y queda a cargo de la base.
  test.failing('CP-U56 los montos repartidos se guardan redondeados a centavos', async () => {
    const pago = await cobrar(100.01, 70);

    expect(pago.monto_profesional).toBe(70.01);
    expect(pago.monto_espacio).toBe(30);
  });

  test('CP-U57 sin porcentaje cargado (undefined) usa el 70 % por defecto', async () => {
    const pago = await cobrar(1000, undefined);

    expect(pago).toMatchObject({ monto_profesional: 700, monto_espacio: 300, porcentaje_profesional: 70 });
  });
});

describe('PagoService.listarSesionesPendientes', () => {
  test('CP-U58 pide solo sesiones no pagadas y con monto cargado, de la más nueva a la más vieja', async () => {
    const { db, enTabla } = crearDb({ sesiones: ok([{ id: 's1' }]) });

    const data = await PagoService.listarSesionesPendientes(db);

    expect(data).toEqual([{ id: 's1' }]);
    expect(enTabla('sesiones', 'eq')).toContainEqual(['pagado', false]);
    expect(enTabla('sesiones', 'not')).toContainEqual(['monto', 'is', null]);
    expect(enTabla('sesiones', 'order')[0]).toEqual(['fecha', { ascending: false }]);
  });

  test('CP-U59 un error de la base se propaga', async () => {
    const { db } = crearDb({ sesiones: { data: null, error: { message: 'boom' } } });

    await expect(PagoService.listarSesionesPendientes(db)).rejects.toThrow('boom');
  });
});

describe('PagoService.listar', () => {
  test('CP-U60 con mes filtra desde el 1° a las 00:00 (UTC-3) hasta el 1° del mes siguiente', async () => {
    const { db, enTabla } = crearDb({ pagos: ok([]) });

    await PagoService.listar(db, { mes: '2026-10' });

    expect(enTabla('pagos', 'gte')[0]).toEqual(['fecha_pago', '2026-10-01T00:00:00-03:00']);
    expect(enTabla('pagos', 'lt')[0]).toEqual(['fecha_pago', '2026-11-01T03:00:00.000Z']);
  });

  test('CP-U61 diciembre cierra en enero del año siguiente', async () => {
    const { db, enTabla } = crearDb({ pagos: ok([]) });

    await PagoService.listar(db, { mes: '2026-12' });

    expect(enTabla('pagos', 'lt')[0]).toEqual(['fecha_pago', '2027-01-01T03:00:00.000Z']);
  });

  test('CP-U62 sin mes ni profesional no aplica filtros', async () => {
    const { db, enTabla } = crearDb({ pagos: ok([]) });

    await PagoService.listar(db, {});

    expect(enTabla('pagos', 'gte')).toHaveLength(0);
    expect(enTabla('pagos', 'eq')).toHaveLength(0);
  });

  test('CP-U63 con profesional_id filtra por ese profesional', async () => {
    const { db, enTabla } = crearDb({ pagos: ok([]) });

    await PagoService.listar(db, { profesional_id: 'prof-9' });

    expect(enTabla('pagos', 'eq')).toContainEqual(['profesional_id', 'prof-9']);
  });

  // DEF-A10: un mes mal formado hace que toISOString() tire RangeError (termina en 500).
  test.failing('CP-U64 con un mes mal formado responde un error de validación (422)', async () => {
    const { db } = crearDb({ pagos: ok([]) });

    await expect(PagoService.listar(db, { mes: '2026-13' })).rejects.toMatchObject({ status: 422 });
  });
});

describe('PagoService.liquidacion', () => {
  const pago = (prof, total, profesional, espacio) => ({
    profesional_id: prof, monto_total: total, monto_profesional: profesional, monto_espacio: espacio,
    profesional: { nombre: prof, apellido: 'X', especialidad: 'psicologia' }
  });

  test('CP-U65 agrupa por profesional y suma totales y cantidad de sesiones', async () => {
    conectarAdmin({ pagos: ok([pago('ana', 1000, 700, 300), pago('ana', 2000, 1400, 600), pago('luis', 500, 250, 250)]) });

    const res = await PagoService.liquidacion('2026-10');

    const ana = res.profesionales.find((p) => p.profesional.nombre === 'ana');
    expect(ana).toMatchObject({ total_facturado: 3000, total_profesional: 2100, total_espacio: 900, cantidad_sesiones: 2 });
    expect(res.profesionales).toHaveLength(2);
  });

  test('CP-U66 los totales generales suman lo de todos los profesionales', async () => {
    conectarAdmin({ pagos: ok([pago('ana', 1000, 700, 300), pago('luis', 500, 250, 250)]) });

    const res = await PagoService.liquidacion('2026-10');

    expect(res).toMatchObject({ mes: '2026-10', total_facturado: 1500, total_espacio: 550 });
  });

  test('CP-U67 los montos que vienen como texto (numeric de Postgres) se suman como números', async () => {
    conectarAdmin({ pagos: ok([pago('ana', '1000.50', '700.35', '300.15'), pago('ana', '0.50', '0.35', '0.15')]) });

    const res = await PagoService.liquidacion('2026-10');

    expect(res.total_facturado).toBeCloseTo(1001, 10);
  });

  test('CP-U68 un mes sin pagos devuelve totales en cero, no un error', async () => {
    conectarAdmin({ pagos: ok([]) });

    const res = await PagoService.liquidacion('2026-10');

    expect(res).toEqual({ mes: '2026-10', profesionales: [], total_espacio: 0, total_facturado: 0 });
  });

  test('CP-U69 se calcula con el cliente admin (ve los pagos de todos) en el rango del mes', async () => {
    const admin = conectarAdmin({ pagos: ok([]) });

    await PagoService.liquidacion('2026-02');

    expect(admin.enTabla('pagos', 'gte')[0]).toEqual(['fecha_pago', '2026-02-01T00:00:00-03:00']);
    expect(admin.enTabla('pagos', 'lt')[0]).toEqual(['fecha_pago', '2026-03-01T03:00:00.000Z']);
  });

  test('CP-U70 un error de la base se propaga', async () => {
    conectarAdmin({ pagos: { data: null, error: { message: 'timeout' } } });

    await expect(PagoService.liquidacion('2026-10')).rejects.toThrow('timeout');
  });
});
