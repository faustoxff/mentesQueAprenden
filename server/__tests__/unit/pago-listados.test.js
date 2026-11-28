// Listados de pagos: sesiones pendientes de cobro y pagos del mes.
const mockAdmin = { from: jest.fn() };
jest.mock('../../src/config/supabase', () => ({ supabaseAdmin: mockAdmin, supabase: {} }));

const PagoService = require('../../src/services/PagoService');
const { crearDb } = require('./helpers/fakeDb');

const ok = (data) => ({ data, error: null });

beforeEach(() => mockAdmin.from.mockReset());

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
