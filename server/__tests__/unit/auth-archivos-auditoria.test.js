// AuthService, ArchivoService (URLs firmadas), auditoría de accesos (Ley 25.326),
// ProfesionalService y EvaluacionService. Supabase mockeado, sin red.
process.env.OPENROUTER_API_KEY = 'test';

const mockAuth = { signInWithPassword: jest.fn(), refreshSession: jest.fn(), resetPasswordForEmail: jest.fn() };
const mockAdminAuth = { createUser: jest.fn(), deleteUser: jest.fn(), signOut: jest.fn(), updateUserById: jest.fn() };
const mockAdmin = { from: jest.fn(), auth: { admin: mockAdminAuth }, storage: { from: jest.fn() } };
jest.mock('../../src/config/supabase', () => ({ supabase: { auth: mockAuth }, supabaseAdmin: mockAdmin }));
const mockInforme = jest.fn();
jest.mock('../../src/services/informeGenerator', () => ({ generarInformeTexto: (...a) => mockInforme(...a) }));

const AuthService = require('../../src/services/AuthService');
const ArchivoService = require('../../src/services/ArchivoService');
const SesionService = require('../../src/services/SesionService');
const ProfesionalService = require('../../src/services/ProfesionalService');
const EvaluacionService = require('../../src/services/EvaluacionService');
const { registrarAcceso } = require('../../src/middleware/auditLog');
const { crearDb } = require('./helpers/fakeDb');

const ok = (data) => ({ data, error: null });
const sesionSupabase = { access_token: 'acc', refresh_token: 'ref', expires_at: 123, provider_token: 'no-debe-salir' };

// Cliente admin cuyo insert en logs_acceso deja registro de si la consulta se ejecutó:
// el builder de Supabase es perezoso y solo manda el pedido cuando alguien hace then/await.
function adminConAuditoria(resultados = {}) {
  const fake = crearDb(resultados);
  const ejecutados = [];
  mockAdmin.from.mockImplementation((tabla) => {
    if (tabla !== 'logs_acceso') return fake.db.from(tabla);
    return {
      insert: (fila) => ({
        then: (res, rej) => { ejecutados.push(fila); return Promise.resolve({ error: null }).then(res, rej); }
      })
    };
  });
  return { ...fake, ejecutados };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAdmin.from.mockReset();
});

// ─────────────────────────────────────────────────────────────
// AuthService
// ─────────────────────────────────────────────────────────────
describe('AuthService.login', () => {
  test('CP-U123 credenciales incorrectas → 401 genérico, sin el mensaje de Supabase', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials: user not found' } });

    await expect(AuthService.login({ email: 'a@b.com', password: 'x' })).rejects.toMatchObject({ status: 401, message: 'Credenciales inválidas' });
  });

  test('CP-U124 login correcto devuelve solo los tokens necesarios y el perfil', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' }, session: sesionSupabase }, error: null });
    const admin = crearDb({ profesionales: ok({ id: 'u1', rol: 'profesional' }) });
    mockAdmin.from.mockImplementation(admin.db.from);

    const res = await AuthService.login({ email: 'a@b.com', password: 'bien' });

    expect(res.session).toEqual({ access_token: 'acc', refresh_token: 'ref', expires_at: 123 });
    expect(res.profesional).toEqual({ id: 'u1', rol: 'profesional' });
  });

  test('CP-U125 el perfil del login no pide columnas sensibles', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' }, session: sesionSupabase }, error: null });
    const admin = crearDb({ profesionales: ok({}) });
    mockAdmin.from.mockImplementation(admin.db.from);

    await AuthService.login({ email: 'a@b.com', password: 'bien' });

    expect(admin.enTabla('profesionales', 'select')[0][0]).not.toMatch(/password|porcentaje|\*/);
  });
});

describe('AuthService: registro', () => {
  const datos = { email: 'n@x.com', password: '12345678', nombre: 'N', apellido: 'X', especialidad: 'otro' };

  test('CP-U126 el registro público siempre crea rol profesional, aunque el body pida admin', async () => {
    mockAdminAuth.createUser.mockResolvedValue({ data: { user: { id: 'u9' } }, error: null });
    const admin = crearDb({ profesionales: ok({ id: 'u9' }) });
    mockAdmin.from.mockImplementation(admin.db.from);
    mockAuth.signInWithPassword.mockResolvedValue({ data: { session: sesionSupabase }, error: null });

    await AuthService.signup({ ...datos, rol: 'admin', porcentaje_honorarios: 100 });

    expect(admin.enTabla('profesionales', 'insert')[0][0]).toMatchObject({ rol: 'profesional', porcentaje_honorarios: 70 });
  });

  test('CP-U127 si falla el alta en profesionales se borra el usuario de Auth (rollback)', async () => {
    mockAdminAuth.createUser.mockResolvedValue({ data: { user: { id: 'u9' } }, error: null });
    const admin = crearDb({ profesionales: { data: null, error: { code: 'XX000', message: 'x' } } });
    mockAdmin.from.mockImplementation(admin.db.from);

    await expect(AuthService.registrar(datos)).rejects.toMatchObject({ status: 500 });
    expect(mockAdminAuth.deleteUser).toHaveBeenCalledWith('u9');
  });

  test('CP-U128 email repetido → 409 con mensaje claro (y rollback)', async () => {
    mockAdminAuth.createUser.mockResolvedValue({ data: { user: { id: 'u9' } }, error: null });
    const admin = crearDb({ profesionales: { data: null, error: { code: '23505' } } });
    mockAdmin.from.mockImplementation(admin.db.from);

    await expect(AuthService.registrar(datos)).rejects.toMatchObject({ status: 409, message: 'Ya existe una cuenta con ese email' });
    expect(mockAdminAuth.deleteUser).toHaveBeenCalled();
  });

  test('CP-U129 si Supabase Auth rechaza el usuario → 400 y no se inserta nada', async () => {
    mockAdminAuth.createUser.mockResolvedValue({ data: null, error: { message: 'Password should be at least 8 characters' } });

    await expect(AuthService.registrar(datos)).rejects.toMatchObject({ status: 400 });
    expect(mockAdmin.from).not.toHaveBeenCalled();
  });

  test('CP-U130 si el login automático tras el registro falla, devuelve el perfil sin sesión', async () => {
    mockAdminAuth.createUser.mockResolvedValue({ data: { user: { id: 'u9' } }, error: null });
    mockAdmin.from.mockImplementation(crearDb({ profesionales: ok({ id: 'u9' }) }).db.from);
    mockAuth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'x' } });

    const res = await AuthService.signup(datos);

    expect(res).toEqual({ profesional: { id: 'u9' }, session: null });
  });

  // DEF-A01: `porcentaje_honorarios || 70.00` también pisa un 0 % elegido por el admin.
  test.failing('CP-U131 un admin puede registrar un profesional con 0 % de honorarios', async () => {
    mockAdminAuth.createUser.mockResolvedValue({ data: { user: { id: 'u9' } }, error: null });
    const admin = crearDb({ profesionales: ok({ id: 'u9' }) });
    mockAdmin.from.mockImplementation(admin.db.from);

    await AuthService.registrar({ ...datos, porcentaje_honorarios: 0 });

    expect(admin.enTabla('profesionales', 'insert')[0][0].porcentaje_honorarios).toBe(0);
  });
});

describe('AuthService: sesión y contraseña', () => {
  test('CP-U132 refresh con un token inválido → 401', async () => {
    mockAuth.refreshSession.mockResolvedValue({ data: {}, error: { message: 'Already Used' } });

    await expect(AuthService.refresh('usado')).rejects.toMatchObject({ status: 401 });
  });

  test('CP-U133 refresh correcto devuelve los nuevos tokens', async () => {
    mockAuth.refreshSession.mockResolvedValue({ data: { session: sesionSupabase }, error: null });

    await expect(AuthService.refresh('ref')).resolves.toEqual({ access_token: 'acc', refresh_token: 'ref', expires_at: 123 });
  });

  test('CP-U134 logout revoca el token del usuario', async () => {
    await AuthService.logout('tok');

    expect(mockAdminAuth.signOut).toHaveBeenCalledWith('tok');
  });

  test('CP-U135 logout sin token no llama a Supabase', async () => {
    await AuthService.logout(undefined);

    expect(mockAdminAuth.signOut).not.toHaveBeenCalled();
  });

  test('CP-U136 el link de recuperación apunta a /reset-password del frontend', async () => {
    process.env.FRONTEND_URL = 'https://app.test';

    await AuthService.forgotPassword('a@b.com');

    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.com', { redirectTo: 'https://app.test/reset-password' });
  });

  test('CP-U137 cambiar la contraseña con error de Supabase → 400', async () => {
    mockAdminAuth.updateUserById.mockResolvedValue({ error: { message: 'weak password' } });

    await expect(AuthService.changePassword('u1', '123')).rejects.toMatchObject({ status: 400 });
  });

  test('CP-U138 cambiar la contraseña correctamente no lanza', async () => {
    mockAdminAuth.updateUserById.mockResolvedValue({ error: null });

    await expect(AuthService.changePassword('u1', '12345678')).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// ArchivoService
// ─────────────────────────────────────────────────────────────
describe('ArchivoService: URLs firmadas', () => {
  const firmador = { createSignedUploadUrl: jest.fn(), createSignedUrl: jest.fn() };
  beforeEach(() => mockAdmin.storage.from.mockReturnValue(firmador));

  test('CP-U139 sin acceso al paciente → 403 y no se firma ninguna URL', async () => {
    const { db } = crearDb({ pacientes: ok(null) });

    await expect(ArchivoService.generarUrlSubida(db, 'prof', { paciente_id: 'ajeno', mime_type: 'application/pdf' })).rejects.toMatchObject({ status: 403 });
    expect(firmador.createSignedUploadUrl).not.toHaveBeenCalled();
  });

  test('CP-U140 la extensión sale del mime_type, no del nombre que manda el cliente', async () => {
    firmador.createSignedUploadUrl.mockResolvedValue({ data: { signedUrl: 'https://s', token: 't' }, error: null });
    const { db } = crearDb({ pacientes: ok({ id: 'p1' }), archivos_adjuntos: ok({ id: 'a1' }) });

    await ArchivoService.generarUrlSubida(db, 'prof', { paciente_id: 'p1', nombre_original: 'virus.exe', mime_type: 'application/pdf' });

    expect(firmador.createSignedUploadUrl.mock.calls[0][0]).toMatch(/^p1\/\d+-[a-z0-9]+\.pdf$/);
  });

  test('CP-U141 un mime desconocido se guarda como .bin (nunca con la extensión del cliente)', async () => {
    firmador.createSignedUploadUrl.mockResolvedValue({ data: { signedUrl: 'https://s', token: 't' }, error: null });
    const { db } = crearDb({ pacientes: ok({ id: 'p1' }), archivos_adjuntos: ok({ id: 'a1' }) });

    await ArchivoService.generarUrlSubida(db, 'prof', { paciente_id: 'p1', nombre_original: 'x.html', mime_type: 'text/html' });

    expect(firmador.createSignedUploadUrl.mock.calls[0][0]).toMatch(/\.bin$/);
  });

  test('CP-U142 devuelve la URL de subida y registra la metadata a nombre de quien sube', async () => {
    firmador.createSignedUploadUrl.mockResolvedValue({ data: { signedUrl: 'https://s', token: 't' }, error: null });
    const { db, enTabla } = crearDb({ pacientes: ok({ id: 'p1' }), archivos_adjuntos: ok({ id: 'a1' }) });

    const res = await ArchivoService.generarUrlSubida(db, 'prof', { paciente_id: 'p1', mime_type: 'image/png', subido_por: 'otro' });

    expect(res).toEqual({ archivo_id: 'a1', upload_url: 'https://s', token: 't' });
    expect(enTabla('archivos_adjuntos', 'insert')[0][0].subido_por).toBe('prof');
  });

  test('CP-U143 la URL de descarga dura como máximo 5 minutos (300 s)', async () => {
    adminConAuditoria();
    firmador.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://d' }, error: null });
    const { db } = crearDb({ archivos_adjuntos: ok({ id: 'a1', paciente_id: 'p1', storage_path: 'p1/x.pdf', nombre_original: 'x.pdf' }) });

    const res = await ArchivoService.obtenerUrlDescarga(db, 'a1', 'prof', { ip: '1.1.1.1', userAgent: 'jest' });

    expect(firmador.createSignedUrl).toHaveBeenCalledWith('p1/x.pdf', 300);
    expect(res).toEqual({ url: 'https://d', nombre_original: 'x.pdf' });
  });

  test('CP-U144 descargar un archivo que RLS no deja ver → 404 sin firmar URL', async () => {
    const { db } = crearDb({ archivos_adjuntos: { data: null, error: { code: 'PGRST116' } } });

    await expect(ArchivoService.obtenerUrlDescarga(db, 'ajeno', 'prof', {})).rejects.toMatchObject({ status: 404 });
    expect(firmador.createSignedUrl).not.toHaveBeenCalled();
  });

  // DEF-A02: el insert en logs_acceso no se espera ni se encadena; el builder de Supabase
  // es perezoso, así que la consulta nunca se envía y la descarga no queda auditada.
  test.failing('CP-U145 descargar un archivo deja registro en logs_acceso', async () => {
    const admin = adminConAuditoria();
    firmador.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://d' }, error: null });
    const { db } = crearDb({ archivos_adjuntos: ok({ id: 'a1', paciente_id: 'p1', storage_path: 'p1/x.pdf' }) });

    await ArchivoService.obtenerUrlDescarga(db, 'a1', 'prof', { ip: '1.1.1.1', userAgent: 'jest' });

    expect(admin.ejecutados).toContainEqual(expect.objectContaining({ accion: 'descargar_archivo', paciente_id: 'p1' }));
  });
});

// ─────────────────────────────────────────────────────────────
// Auditoría de accesos
// ─────────────────────────────────────────────────────────────
describe('auditoría de accesos a historias clínicas', () => {
  const req = (extra = {}) => ({ params: { id: 'p1' }, profesional: { id: 'prof' }, ip: '1.1.1.1', method: 'GET', path: '/p1', get: () => 'jest', ...extra });

  test('CP-U146 registrarAcceso inserta y espera el log antes de seguir', async () => {
    const admin = adminConAuditoria();
    const next = jest.fn();

    await registrarAcceso('ver', 'paciente')(req(), {}, next);

    expect(admin.ejecutados[0]).toMatchObject({ profesional_id: 'prof', paciente_id: 'p1', accion: 'ver', recurso: 'paciente', ip_address: '1.1.1.1' });
    expect(next).toHaveBeenCalled();
  });

  test('CP-U147 sin paciente en la ruta no registra nada y sigue', async () => {
    const admin = adminConAuditoria();
    const next = jest.fn();

    await registrarAcceso('ver', 'paciente')(req({ params: {} }), {}, next);

    expect(admin.ejecutados).toHaveLength(0);
    expect(next).toHaveBeenCalled();
  });

  test('CP-U148 si falla el log, el pedido sigue igual', async () => {
    mockAdmin.from.mockImplementation(() => ({ insert: () => Promise.reject(new Error('caída')) }));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const next = jest.fn();

    await registrarAcceso('ver', 'paciente')(req(), {}, next);

    expect(next).toHaveBeenCalled();
  });

  // DEF-A02: mismo problema que la descarga: ver una sesión no queda auditado.
  test.failing('CP-U149 ver el detalle de una sesión deja registro en logs_acceso', async () => {
    const admin = adminConAuditoria();
    const { db } = crearDb({ sesiones: ok({ id: 's1', paciente_id: 'p1', turnos: [] }) });

    await SesionService.obtener(db, 's1', 'prof', { ip: '1.1.1.1', get: () => 'jest' });

    expect(admin.ejecutados).toContainEqual(expect.objectContaining({ accion: 'ver', recurso: 'sesion', paciente_id: 'p1' }));
  });
});

// ─────────────────────────────────────────────────────────────
// ProfesionalService
// ─────────────────────────────────────────────────────────────
describe('ProfesionalService', () => {
  test('CP-U150 un profesional no puede editar a otro (403)', async () => {
    await expect(ProfesionalService.actualizar('otro', { id: 'yo', rol: 'profesional' }, { nombre: 'X' })).rejects.toMatchObject({ status: 403 });
  });

  test('CP-U151 un profesional no puede cambiarse su propio porcentaje de honorarios', async () => {
    const admin = crearDb({ profesionales: ok({ id: 'yo' }) });
    mockAdmin.from.mockImplementation(admin.db.from);

    await ProfesionalService.actualizar('yo', { id: 'yo', rol: 'profesional' }, { telefono: '1122334455', porcentaje_honorarios: 100 });

    expect(admin.enTabla('profesionales', 'update')[0][0]).toEqual({ telefono: '1122334455' });
  });

  test('CP-U152 un admin sí puede cambiar el porcentaje de otro', async () => {
    const admin = crearDb({ profesionales: ok({ id: 'otro' }) });
    mockAdmin.from.mockImplementation(admin.db.from);

    await ProfesionalService.actualizar('otro', { id: 'adm', rol: 'admin' }, { porcentaje_honorarios: 60 });

    expect(admin.enTabla('profesionales', 'update')[0][0]).toEqual({ porcentaje_honorarios: 60 });
  });

  test('CP-U153 nadie puede cambiarse el rol ni el estado activo por PATCH', async () => {
    const admin = crearDb({ profesionales: ok({ id: 'yo' }) });
    mockAdmin.from.mockImplementation(admin.db.from);

    await ProfesionalService.actualizar('yo', { id: 'yo', rol: 'profesional' }, { rol: 'admin', activo: true, email: 'x@y.com' });

    expect(admin.enTabla('profesionales', 'update')[0][0]).toEqual({});
  });

  test('CP-U154 desactivar es una baja lógica (activo = false), no un borrado', async () => {
    const admin = crearDb({ profesionales: ok(null) });
    mockAdmin.from.mockImplementation(admin.db.from);

    await ProfesionalService.desactivar('p9');

    expect(admin.enTabla('profesionales', 'update')[0][0]).toEqual({ activo: false });
    expect(admin.enTabla('profesionales', 'delete')).toHaveLength(0);
  });

  // DEF-A20: GET /profesionales (lo usa cualquier profesional) incluye el porcentaje de honorarios de todos.
  test.failing('CP-U267 el listado general no expone el porcentaje de honorarios de los demás', async () => {
    const admin = crearDb({ profesionales: ok([]) });
    mockAdmin.from.mockImplementation(admin.db.from);

    await ProfesionalService.listar();

    expect(admin.enTabla('profesionales', 'select')[0][0]).not.toMatch(/porcentaje_honorarios/);
  });

  test('CP-U155 listar devuelve solo profesionales activos', async () => {
    const admin = crearDb({ profesionales: ok([]) });
    mockAdmin.from.mockImplementation(admin.db.from);

    await ProfesionalService.listar();

    expect(admin.enTabla('profesionales', 'eq')).toContainEqual(['activo', true]);
  });
});

// ─────────────────────────────────────────────────────────────
// EvaluacionService
// ─────────────────────────────────────────────────────────────
describe('EvaluacionService', () => {
  test('CP-U156 crear descarta campos fuera de la allowlist y firma con el profesional actual', async () => {
    const { db, enTabla } = crearDb({ evaluaciones: ok({ id: 'e1' }) });

    await EvaluacionService.crear(db, 'prof', { paciente_id: 'p1', fecha_evaluacion: '2026-10-01', informe_generado: 'trucho', profesional_id: 'otro' });

    expect(enTabla('evaluaciones', 'insert')[0][0]).toEqual({ paciente_id: 'p1', fecha_evaluacion: '2026-10-01', profesional_id: 'prof', created_by: 'prof' });
  });

  test('CP-U157 actualizar no permite mover la evaluación a otro paciente', async () => {
    const { db, enTabla } = crearDb({ evaluaciones: ok({ id: 'e1' }) });

    await EvaluacionService.actualizar(db, 'e1', { paciente_id: 'otro', estado: 'finalizado' });

    expect(enTabla('evaluaciones', 'update')[0][0]).toEqual({ estado: 'finalizado' });
  });

  test('CP-U158 obtener una evaluación ajena (PGRST116) → 404', async () => {
    const { db } = crearDb({ evaluaciones: { data: null, error: { code: 'PGRST116', message: 'x' } } });

    await expect(EvaluacionService.obtener(db, 'ajena')).rejects.toMatchObject({ status: 404 });
  });

  test('CP-U159 la primera prueba se agrega con orden 0 y la siguiente con el orden siguiente', async () => {
    const { db, enTabla } = crearDb({ pruebas_aplicadas: [{ count: 0 }, ok({ id: 'pr1' }), { count: 1 }, ok({ id: 'pr2' })] });

    await EvaluacionService.agregarPrueba(db, 'e1', { nombre_prueba: 'WISC-V', resultados_texto: 'CIT 98' });
    await EvaluacionService.agregarPrueba(db, 'e1', { nombre_prueba: 'Bender' });

    const [[a], [b]] = enTabla('pruebas_aplicadas', 'insert');
    expect(a).toMatchObject({ orden: 0, resultados: { texto: 'CIT 98' } });
    expect(b).toMatchObject({ orden: 1, resultados: { texto: '' } });
  });

  test('CP-U160 actualizar una prueba solo cambia los campos enviados', async () => {
    const { db, enTabla } = crearDb({ pruebas_aplicadas: ok({ id: 'pr1' }) });

    await EvaluacionService.actualizarPrueba(db, 'pr1', { resultados_texto: 'nuevo' });

    expect(enTabla('pruebas_aplicadas', 'update')[0][0]).toEqual({ resultados: { texto: 'nuevo' } });
  });

  test('CP-U161 generar el informe de una evaluación inexistente → 404 sin llamar a la IA', async () => {
    const { db } = crearDb({ evaluaciones: ok(null) });

    await expect(EvaluacionService.generarInforme(db, 'e1')).rejects.toMatchObject({ status: 404 });
    expect(mockInforme).not.toHaveBeenCalled();
  });

  test('CP-U162 el informe generado se guarda en la evaluación', async () => {
    mockInforme.mockResolvedValue('Informe redactado');
    const { db, enTabla } = crearDb({ evaluaciones: [ok({ id: 'e1', pruebas: [] }), ok({ id: 'e1', informe_generado: 'Informe redactado' })] });

    await EvaluacionService.generarInforme(db, 'e1');

    expect(enTabla('evaluaciones', 'update')[0][0]).toEqual({ informe_generado: 'Informe redactado' });
  });

  test('CP-U163 si la IA falla, no se pisa el informe anterior', async () => {
    mockInforme.mockRejectedValue(Object.assign(new Error('La IA no devolvió un informe válido'), { status: 502 }));
    const { db, enTabla } = crearDb({ evaluaciones: ok({ id: 'e1', pruebas: [] }) });

    await expect(EvaluacionService.generarInforme(db, 'e1')).rejects.toMatchObject({ status: 502 });
    expect(enTabla('evaluaciones', 'update')).toHaveLength(0);
  });
});
