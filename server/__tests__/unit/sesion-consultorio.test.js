jest.mock('../../src/config/supabase', () => ({ supabaseAdmin: {}, supabase: {} }));

const SesionService = require('../../src/services/SesionService');
const { crearDb } = require('./helpers/fakeDb');

describe('SesionService.verificarConsultorioLibre', () => {
  const inicio = new Date('2026-01-01T10:00:00Z');
  const fin = new Date('2026-01-01T10:50:00Z');

  test('usa la función consultorio_libre (ve turnos de todos sin exponerlos)', async () => {
    const { db, rpcs } = crearDb({ 'rpc:consultorio_libre': { data: true, error: null } });
    await SesionService.verificarConsultorioLibre(db, 2, inicio, fin, 'excluir-este');
    expect(rpcs('consultorio_libre')[0]).toEqual({
      p_consultorio: 2, p_inicio: inicio.toISOString(), p_fin: fin.toISOString(), p_excluir: 'excluir-este'
    });
  });

  test('consultorio ocupado → 409 con mensaje claro', async () => {
    const { db } = crearDb({ 'rpc:consultorio_libre': { data: false, error: null } });
    await expect(SesionService.verificarConsultorioLibre(db, 1, inicio, fin)).rejects
      .toMatchObject({ status: 409, message: expect.stringContaining('Consultorio 1 ocupado') });
  });

  test('si la función falla no se asume que está libre', async () => {
    const { db } = crearDb({ 'rpc:consultorio_libre': { data: null, error: { message: 'boom' } } });
    await expect(SesionService.verificarConsultorioLibre(db, 1, inicio, fin)).rejects.toThrow('boom');
  });

  test('si la función no existe todavía (migración 008 sin aplicar), cae al chequeo anterior', async () => {
    const { db } = crearDb({
      'rpc:consultorio_libre': { data: null, error: { code: 'PGRST202', message: 'not found' } },
      turnos: { data: [{ id: 'choque' }], error: null }
    });
    await expect(SesionService.verificarConsultorioLibre(db, 1, inicio, fin)).rejects.toMatchObject({ status: 409 });
  });

  test('con la función ausente y sin choque, deja pasar', async () => {
    const { db } = crearDb({
      'rpc:consultorio_libre': { data: null, error: { code: 'PGRST202', message: 'not found' } },
      turnos: { data: [], error: null }
    });
    await expect(SesionService.verificarConsultorioLibre(db, 1, inicio, fin)).resolves.toBeUndefined();
  });
});
