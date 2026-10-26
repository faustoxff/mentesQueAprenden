const mockRemove = jest.fn().mockResolvedValue({ error: null });
const mockAdmin = { storage: { from: () => ({ remove: (...a) => mockRemove(...a) }) } };
jest.mock('../../src/config/supabase', () => ({ supabaseAdmin: mockAdmin, supabase: {} }));

const ArchivoService = require('../../src/services/ArchivoService');
const { crearDb } = require('./helpers/fakeDb');

const ok = (data) => ({ data, error: null });
const yo = { id: 'prof-1', rol: 'profesional' };

describe('ArchivoService.eliminar', () => {
  beforeEach(() => mockRemove.mockClear());

  test('404 si el archivo no existe', async () => {
    const { db } = crearDb({ archivos_adjuntos: ok(null) });
    await expect(ArchivoService.eliminar(db, 'a1', yo)).rejects.toMatchObject({ status: 404 });
  });

  test('403 si lo subió otro y no sos admin; no toca el storage', async () => {
    const { db } = crearDb({ archivos_adjuntos: ok({ storage_path: 'x', subido_por: 'otro' }) });
    await expect(ArchivoService.eliminar(db, 'a1', yo)).rejects.toMatchObject({ status: 403 });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  test('si la base no borró ninguna fila (RLS) NO se pierde el archivo del storage y responde 403', async () => {
    const { db } = crearDb({ archivos_adjuntos: [ok({ storage_path: 'x', subido_por: 'prof-1' }), ok([])] });
    await expect(ArchivoService.eliminar(db, 'a1', yo)).rejects.toMatchObject({ status: 403 });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  test('si se borró la metadata, recién ahí borra el archivo del storage', async () => {
    const { db } = crearDb({ archivos_adjuntos: [ok({ storage_path: 'ruta/a.pdf', subido_por: 'prof-1' }), ok([{ id: 'a1' }])] });
    await ArchivoService.eliminar(db, 'a1', yo);
    expect(mockRemove).toHaveBeenCalledWith(['ruta/a.pdf']);
  });

  test('un fallo al borrar del storage no rompe la respuesta (queda un huérfano, no metadata colgada)', async () => {
    mockRemove.mockResolvedValueOnce({ error: { message: 'storage caído' } });
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { db } = crearDb({ archivos_adjuntos: [ok({ storage_path: 'x', subido_por: 'prof-1' }), ok([{ id: 'a1' }])] });
    await expect(ArchivoService.eliminar(db, 'a1', yo)).resolves.toBeUndefined();
    spy.mockRestore();
  });
});
