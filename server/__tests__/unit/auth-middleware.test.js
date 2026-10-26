// Tests unitarios: Supabase está mockeado, no necesitan red ni credenciales.
const mockGetUser = jest.fn();
const mockSingle = jest.fn();

jest.mock('../../src/config/supabase', () => {
  const chain = {};
  ['select', 'eq', 'limit'].forEach((m) => { chain[m] = () => chain; });
  chain.single = (...a) => mockSingle(...a);
  return {
    supabase: { auth: { getUser: (...a) => mockGetUser(...a) } },
    supabaseAdmin: { from: () => chain }
  };
});

const { requireAuth, requireAdmin, getAuthenticatedClient } = require('../../src/middleware/auth');

const crearRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('requireAuth', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockSingle.mockReset();
    process.env.NODE_ENV = 'test';
  });

  test('sin header Authorization responde 401', async () => {
    const res = crearRes();
    const next = jest.fn();
    await requireAuth({ headers: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('no existe ningún token de atajo: "dev-token" se trata como un token inválido, también en development', async () => {
    process.env.NODE_ENV = 'development';
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } });
    const res = crearRes();
    const next = jest.fn();
    await requireAuth({ headers: { authorization: 'Bearer dev-token' } }, res, next);
    expect(mockGetUser).toHaveBeenCalledWith('dev-token');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('si Supabase falla por red responde 503 en vez de colgar el pedido', async () => {
    mockGetUser.mockRejectedValue(new Error('fetch failed'));
    const res = crearRes();
    const next = jest.fn();
    await requireAuth({ headers: { authorization: 'Bearer x' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  test('token que Supabase no reconoce responde 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'jwt expired' } });
    const res = crearRes();
    const next = jest.fn();
    await requireAuth({ headers: { authorization: 'Bearer x' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('usuario válido sin fila en profesionales responde 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockSingle.mockResolvedValue({ data: null, error: { message: 'no rows' } });
    const res = crearRes();
    const next = jest.fn();
    await requireAuth({ headers: { authorization: 'Bearer x' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('cuenta desactivada responde 403', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockSingle.mockResolvedValue({ data: { id: 'u1', rol: 'profesional', activo: false }, error: null });
    const res = crearRes();
    const next = jest.fn();
    await requireAuth({ headers: { authorization: 'Bearer x' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('token válido adjunta usuario y profesional al request', async () => {
    const profesional = { id: 'u1', rol: 'profesional', activo: true };
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockSingle.mockResolvedValue({ data: profesional, error: null });
    const req = { headers: { authorization: 'Bearer tok' } };
    const next = jest.fn();
    await requireAuth(req, crearRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.profesional).toEqual(profesional);
    expect(req.token).toBe('tok');
  });
});

describe('requireAdmin', () => {
  test('deja pasar a un admin', () => {
    const next = jest.fn();
    requireAdmin({ profesional: { rol: 'admin' } }, crearRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('rechaza a un profesional con 403', () => {
    const res = crearRes();
    const next = jest.fn();
    requireAdmin({ profesional: { rol: 'profesional' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('rechaza si no hay profesional en el request', () => {
    const res = crearRes();
    requireAdmin({}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('getAuthenticatedClient', () => {
  test('sin token no devuelve el cliente admin: lanza un error', () => {
    expect(() => getAuthenticatedClient({})).toThrow();
  });
});
