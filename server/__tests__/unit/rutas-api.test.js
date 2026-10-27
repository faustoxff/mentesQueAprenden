// Pruebas de las rutas Express con Supertest, sin red ni base: Supabase y los services
// están mockeados. Verifican lo que agrega la capa HTTP: autenticación, roles,
// validación de entrada (partición de equivalencia y valores límite) y formato de error.
// Cada test: preparar → ejecutar → verificar.
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_AUTH_MAX = '0';
process.env.OPENROUTER_API_KEY = 'test';

jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({})) }));

const mockGetUser = jest.fn();
const mockPerfiles = {};
jest.mock('../../src/config/supabase', () => {
  const consultaPerfil = () => {
    let id;
    const q = {
      select: () => q,
      eq: (_c, v) => { id = v; return q; },
      single: () => Promise.resolve(mockPerfiles[id] ? { data: mockPerfiles[id], error: null } : { data: null, error: { message: 'no rows' } }),
      insert: () => Promise.resolve({ error: null })
    };
    return q;
  };
  return {
    supabase: { auth: { getUser: (...a) => mockGetUser(...a) } },
    supabaseAdmin: { from: consultaPerfil }
  };
});

const mockServicio = (metodos) => () => Object.fromEntries(metodos.map((m) => [m, jest.fn()]));
jest.mock('../../src/services/PagoService', () => mockServicio(['listar', 'listarSesionesPendientes', 'crear', 'liquidacion'])());
jest.mock('../../src/services/TurnoService', () => mockServicio(['listar', 'crear', 'actualizar', 'cancelar'])());
jest.mock('../../src/services/PacienteService', () => mockServicio(['listar', 'obtener', 'crear', 'actualizar', 'eliminar', 'listarSesiones', 'listarTurnos', 'listarDerivaciones', 'listarArchivos'])());
jest.mock('../../src/services/DerivacionService', () => mockServicio(['crear', 'responder', 'completar', 'listar', 'listarPendientes'])());
jest.mock('../../src/services/ArchivoService', () => mockServicio(['generarUrlSubida', 'obtenerUrlDescarga', 'eliminar'])());
jest.mock('../../src/services/AuthService', () => mockServicio(['registrar', 'signup', 'login', 'logout', 'forgotPassword', 'refresh', 'changePassword'])());
jest.mock('../../src/services/SesionService', () => mockServicio(['obtener', 'crear', 'actualizar', 'listarVersiones', 'listarDelProfesional'])());

const request = require('supertest');
const app = require('../../src/index');
const pagoService = require('../../src/services/PagoService');
const turnoService = require('../../src/services/TurnoService');
const pacienteService = require('../../src/services/PacienteService');
const derivacionService = require('../../src/services/DerivacionService');
const archivoService = require('../../src/services/ArchivoService');
const authService = require('../../src/services/AuthService');
const sesionService = require('../../src/services/SesionService');

const UUID = '11111111-1111-4111-8111-111111111111';
const PROF = { id: 'prof-1', nombre: 'Ana', apellido: 'Paz', rol: 'profesional', especialidad: 'psicopedagogia', activo: true };
const ADMIN = { id: 'admin-1', nombre: 'Eva', apellido: 'Sol', rol: 'admin', especialidad: 'psicologia', activo: true };
const TOKENS = { 'tok-prof': PROF, 'tok-admin': ADMIN };

const comoProf = (req) => req.set('Authorization', 'Bearer tok-prof');
const comoAdmin = (req) => req.set('Authorization', 'Bearer tok-admin');

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(mockPerfiles, { [PROF.id]: PROF, [ADMIN.id]: ADMIN });
  mockGetUser.mockImplementation(async (token) => (TOKENS[token]
    ? { data: { user: { id: TOKENS[token].id } }, error: null }
    : { data: { user: null }, error: { message: 'invalid JWT' } }));
});

// ─────────────────────────────────────────────────────────────
// Autenticación
// ─────────────────────────────────────────────────────────────
describe('autenticación en las rutas protegidas', () => {
  test('CP-U01 sin header Authorization → 401 con { error }', async () => {
    const res = await request(app).get('/api/pacientes');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Token requerido' });
    expect(pacienteService.listar).not.toHaveBeenCalled();
  });

  test.each([
    ['esquema distinto de Bearer', 'Basic dXNlcjpwYXNz'],
    ['"bearer" en minúscula', 'bearer tok-prof'],
    ['Bearer sin token', 'Bearer '],
    ['token sin esquema', 'tok-prof']
  ])('CP-U02 header malformado (%s) → 401', async (_caso, header) => {
    const res = await request(app).get('/api/pacientes').set('Authorization', header);

    expect(res.status).toBe(401);
    expect(pacienteService.listar).not.toHaveBeenCalled();
  });

  test('CP-U03 token vencido o que Supabase no reconoce → 401 "Token inválido o expirado"', async () => {
    const res = await request(app).get('/api/pacientes').set('Authorization', 'Bearer vencido');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token inválido o expirado');
  });

  test('CP-U04 token válido de una cuenta desactivada → 403', async () => {
    mockPerfiles[PROF.id] = { ...PROF, activo: false };

    const res = await comoProf(request(app).get('/api/pacientes'));

    expect(res.status).toBe(403);
    expect(pacienteService.listar).not.toHaveBeenCalled();
  });

  test('CP-U05 GET /auth/me devuelve el perfil sin contraseña ni claves', async () => {
    const res = await comoProf(request(app).get('/api/auth/me'));

    expect(res.status).toBe(200);
    expect(res.body.profesional).toMatchObject({ id: PROF.id, rol: 'profesional' });
    expect(JSON.stringify(res.body)).not.toMatch(/password|token|service_role|apikey/i);
  });
});

// ─────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────
describe('roles: admin vs profesional', () => {
  test('CP-U06 un profesional en /pagos/liquidacion → 403 y no se calcula nada', async () => {
    const res = await comoProf(request(app).get('/api/pagos/liquidacion?mes=2026-10'));

    expect(res.status).toBe(403);
    expect(pagoService.liquidacion).not.toHaveBeenCalled();
  });

  test('CP-U07 un admin en /pagos/liquidacion con mes válido → 200', async () => {
    pagoService.liquidacion.mockResolvedValue({ mes: '2026-10', profesionales: [] });

    const res = await comoAdmin(request(app).get('/api/pagos/liquidacion?mes=2026-10'));

    expect(res.status).toBe(200);
    expect(pagoService.liquidacion).toHaveBeenCalledWith('2026-10');
  });

  test('CP-U08 un admin en /pagos/liquidacion sin mes → 422', async () => {
    const res = await comoAdmin(request(app).get('/api/pagos/liquidacion'));

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/mes/);
  });

  // DEF-A10: el mes no se valida; "2026-13" o "octubre" llegan al service y terminan en 500.
  test.failing.each(['2026-13', 'octubre', '2026-1'])('CP-U09 un admin en /pagos/liquidacion con mes mal formado (%s) → 422', async (mes) => {
    pagoService.liquidacion.mockResolvedValue({});

    const res = await comoAdmin(request(app).get(`/api/pagos/liquidacion?mes=${mes}`));

    expect(res.status).toBe(422);
    expect(pagoService.liquidacion).not.toHaveBeenCalled();
  });

  test('CP-U10 un profesional no puede registrar profesionales (POST /auth/register → 403)', async () => {
    const res = await comoProf(request(app).post('/api/auth/register').send({
      email: 'x@y.com', password: '12345678', nombre: 'A', apellido: 'B', especialidad: 'otro', rol: 'admin'
    }));

    expect(res.status).toBe(403);
    expect(authService.registrar).not.toHaveBeenCalled();
  });

  test('CP-U11 un profesional no puede desactivar profesionales (DELETE /profesionales/:id → 403)', async () => {
    const res = await comoProf(request(app).delete(`/api/profesionales/${UUID}`));

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────
// Pagos: validación del monto (partición + límites)
// ─────────────────────────────────────────────────────────────
describe('POST /pagos: validación', () => {
  const pago = (extra) => ({ sesion_id: UUID, monto_total: 100, metodo_pago: 'efectivo', ...extra });

  test.each([
    ['0 (límite inferior inválido)', 0],
    ['negativo', -100],
    ['no numérico', 'cien'],
    ['vacío', ''],
    ['nulo', null]
  ])('CP-U12 monto %s → 422 y no se registra el pago', async (_caso, monto) => {
    const res = await comoProf(request(app).post('/api/pagos').send(pago({ monto_total: monto })));

    expect(res.status).toBe(422);
    expect(res.body.errors[0].path).toBe('monto_total');
    expect(pagoService.crear).not.toHaveBeenCalled();
  });

  test.each([0.01, 100, 99999.99])('CP-U13 monto válido %p → 201', async (monto) => {
    pagoService.crear.mockResolvedValue({ id: 'p1' });

    const res = await comoProf(request(app).post('/api/pagos').send(pago({ monto_total: monto })));

    expect(res.status).toBe(201);
    expect(pagoService.crear).toHaveBeenCalledWith({}, PROF.id, expect.objectContaining({ monto_total: monto }), 'profesional');
  });

  test('CP-U14 método de pago fuera de la lista → 422', async () => {
    const res = await comoProf(request(app).post('/api/pagos').send(pago({ metodo_pago: 'bitcoin' })));

    expect(res.status).toBe(422);
  });

  test('CP-U15 sesion_id que no es UUID → 422', async () => {
    const res = await comoProf(request(app).post('/api/pagos').send(pago({ sesion_id: '123' })));

    expect(res.status).toBe(422);
  });

  test('CP-U16 sesión ya pagada: el 409 del service llega con su mensaje', async () => {
    pagoService.crear.mockRejectedValue(Object.assign(new Error('Esta sesión ya fue pagada'), { status: 409 }));

    const res = await comoProf(request(app).post('/api/pagos').send(pago()));

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Esta sesión ya fue pagada' });
  });

  test('CP-U17 un error inesperado se enmascara: 500 "Error interno", sin detalles de la base', async () => {
    pagoService.crear.mockRejectedValue(new Error('relation "pagos" does not exist'));

    const res = await comoProf(request(app).post('/api/pagos').send(pago()));

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error interno' });
  });
});

// ─────────────────────────────────────────────────────────────
// Turnos y consultorios
// ─────────────────────────────────────────────────────────────
describe('POST /turnos: validación', () => {
  const turno = (extra) => ({
    fecha_inicio: '2026-11-02T13:00:00.000Z', fecha_fin: '2026-11-02T13:50:00.000Z', profesional_id: UUID, consultorio: 1, ...extra
  });

  test.each([0, 4, -1, 1.5, 'uno'])('CP-U18 consultorio inválido (%p) → 422', async (consultorio) => {
    const res = await comoProf(request(app).post('/api/turnos').send(turno({ consultorio })));

    expect(res.status).toBe(422);
    expect(res.body.errors[0].path).toBe('consultorio');
    expect(turnoService.crear).not.toHaveBeenCalled();
  });

  test.each([1, 2, 3])('CP-U19 consultorio válido (%p) → 201', async (consultorio) => {
    turnoService.crear.mockResolvedValue({ id: 't1' });

    const res = await comoProf(request(app).post('/api/turnos').send(turno({ consultorio })));

    expect(res.status).toBe(201);
  });

  test.each([
    ['formato dd/mm/aaaa', { fecha_inicio: '02/11/2026 10:00' }],
    ['texto', { fecha_fin: 'mañana' }],
    ['sin fecha_fin', { fecha_fin: undefined }]
  ])('CP-U20 fecha mal formada (%s) → 422', async (_caso, extra) => {
    const res = await comoProf(request(app).post('/api/turnos').send(turno(extra)));

    expect(res.status).toBe(422);
    expect(turnoService.crear).not.toHaveBeenCalled();
  });

  // DEF-A13: isISO8601 no es estricto; un 30 de febrero pasa la validación y lo rechaza la base (500).
  test.failing('CP-U51 fecha de calendario inexistente (30/02) → 422', async () => {
    turnoService.crear.mockResolvedValue({ id: 't1' });

    const res = await comoProf(request(app).post('/api/turnos').send(turno({ fecha_inicio: '2026-02-30T10:00:00Z', fecha_fin: '2026-02-30T10:50:00Z' })));

    expect(res.status).toBe(422);
  });

  // DEF-A03: no hay validación (ni CHECK en la base) de que el fin sea posterior al inicio.
  test.failing.each([
    ['fin anterior al inicio', '2026-11-02T12:00:00.000Z'],
    ['duración cero (fin = inicio)', '2026-11-02T13:00:00.000Z']
  ])('CP-U21 %s → 422', async (_caso, fecha_fin) => {
    turnoService.crear.mockResolvedValue({ id: 't1' });

    const res = await comoProf(request(app).post('/api/turnos').send(turno({ fecha_fin })));

    expect(res.status).toBe(422);
    expect(turnoService.crear).not.toHaveBeenCalled();
  });

  test('CP-U276 GET /turnos: incluir_cancelados acepta true/false y rechaza otro valor', async () => {
    turnoService.listar.mockResolvedValue([]);

    const invalido = await comoProf(request(app).get('/api/turnos?incluir_cancelados=si'));
    const porDefecto = await comoProf(request(app).get('/api/turnos'));
    const conCancelados = await comoProf(request(app).get('/api/turnos?incluir_cancelados=true'));

    expect(invalido.status).toBe(422);
    expect(invalido.body.errors[0].path).toBe('incluir_cancelados');
    expect(porDefecto.status).toBe(200);
    expect(turnoService.listar.mock.calls[0][3]).toEqual({ incluirSesiones: true, incluirCancelados: false });
    expect(conCancelados.status).toBe(200);
    expect(turnoService.listar.mock.calls[1][3]).toEqual({ incluirSesiones: true, incluirCancelados: true });
  });

  test('CP-U22 choque de consultorio: el 409 del service llega al cliente', async () => {
    turnoService.crear.mockRejectedValue(Object.assign(new Error('Consultorio 1 ocupado en ese horario'), { status: 409 }));

    const res = await comoProf(request(app).post('/api/turnos').send(turno()));

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Consultorio 1 ocupado/);
  });

  test('CP-U23 PATCH /turnos/:id con id que no es UUID → 422', async () => {
    const res = await comoProf(request(app).patch('/api/turnos/abc').send({ estado: 'confirmado' }));

    expect(res.status).toBe(422);
    expect(turnoService.actualizar).not.toHaveBeenCalled();
  });

  test('CP-U24 PATCH /turnos/:id con estado fuera de la lista → 422', async () => {
    const res = await comoProf(request(app).patch(`/api/turnos/${UUID}`).send({ estado: 'borrado' }));

    expect(res.status).toBe(422);
  });

  // DEF-A05: DELETE /turnos/:id no valida el id; "abc" llega a la base (error 22P02 → 500).
  test.failing('CP-U25 DELETE /turnos/:id con id que no es UUID → 422', async () => {
    turnoService.cancelar.mockRejectedValue(new Error('invalid input syntax for type uuid: "abc"'));

    const res = await comoProf(request(app).delete('/api/turnos/abc'));

    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────
// Pacientes
// ─────────────────────────────────────────────────────────────
describe('pacientes: validación y estados', () => {
  const paciente = (extra) => ({ nombre: 'ZZ-TEST', apellido: 'Prueba', dni: '12345678', fecha_nacimiento: '2015-03-10', ...extra });

  test.each([
    ['nombre vacío', { nombre: '  ' }, 'nombre'],
    ['DNI de 6 dígitos (límite inferior - 1)', { dni: '123456' }, 'dni'],
    ['DNI de 9 dígitos (límite superior + 1)', { dni: '123456789' }, 'dni'],
    ['DNI con puntos', { dni: '12.345.678' }, 'dni'],
    ['fecha de nacimiento inválida', { fecha_nacimiento: '2015-13-40' }, 'fecha_nacimiento'],
    ['teléfono de 7 caracteres', { telefono: '1234567' }, 'telefono'],
    ['teléfono de 21 caracteres', { telefono: '1'.repeat(21) }, 'telefono'],
    ['email inválido', { email: 'no-es-email' }, 'email'],
    ['estado fuera de la lista', { estado: 'borrado' }, 'estado']
  ])('CP-U26 POST /pacientes con %s → 422 en el campo correcto', async (_caso, extra, campo) => {
    const res = await comoProf(request(app).post('/api/pacientes').send(paciente(extra)));

    expect(res.status).toBe(422);
    expect(res.body.errors.map((e) => e.path)).toContain(campo);
    expect(pacienteService.crear).not.toHaveBeenCalled();
  });

  test.each([
    ['DNI de 7 dígitos', { dni: '1234567' }],
    ['DNI de 8 dígitos', { dni: '12345678' }],
    ['teléfono de 8 caracteres', { telefono: '11223344' }],
    ['teléfono de 20 caracteres', { telefono: '+54 (11) 1234-567890' }],
    ['fecha en formato dd/mm/aaaa', { fecha_nacimiento: '10/03/2015' }]
  ])('CP-U27 POST /pacientes con %s → 201', async (_caso, extra) => {
    pacienteService.crear.mockResolvedValue({ id: 'pac-1' });

    const res = await comoProf(request(app).post('/api/pacientes').send(paciente(extra)));

    expect(res.status).toBe(201);
  });

  test('CP-U28 la fecha dd/mm/aaaa se convierte a ISO antes de guardar', async () => {
    pacienteService.crear.mockResolvedValue({ id: 'pac-1' });

    await comoProf(request(app).post('/api/pacientes').send(paciente({ fecha_nacimiento: '10/03/2015' })));

    expect(pacienteService.crear.mock.calls[0][1].fecha_nacimiento).toBe('2015-03-10');
  });

  test.each(['activo', 'derivado', 'alta', 'inactivo'])('CP-U29 PATCH /pacientes/:id con estado válido "%s" → 200', async (estado) => {
    pacienteService.actualizar.mockResolvedValue({ id: UUID, estado });

    const res = await comoProf(request(app).patch(`/api/pacientes/${UUID}`).send({ estado }));

    expect(res.status).toBe(200);
  });

  test('CP-U30 DELETE /pacientes/:id hace la baja lógica a través del service (no hay borrado físico en la ruta)', async () => {
    pacienteService.eliminar.mockResolvedValue({ id: UUID, message: 'Paciente Prueba, ZZ-TEST eliminado' });

    const res = await comoProf(request(app).delete(`/api/pacientes/${UUID}`));

    expect(res.status).toBe(200);
    expect(pacienteService.eliminar).toHaveBeenCalledWith({}, UUID);
  });

  test('CP-U31 DELETE /pacientes/:id con id que no es UUID → 422', async () => {
    const res = await comoProf(request(app).delete('/api/pacientes/abc'));

    expect(res.status).toBe(422);
    expect(pacienteService.eliminar).not.toHaveBeenCalled();
  });

  // DEF-A05: GET /pacientes/:id no valida el id y devuelve el error crudo de Postgres con 500.
  test.failing('CP-U32 GET /pacientes/:id con id que no es UUID → 422', async () => {
    pacienteService.obtener.mockRejectedValue(Object.assign(new Error('invalid input syntax for type uuid: "abc"'), { status: 500 }));

    const res = await comoProf(request(app).get('/api/pacientes/abc'));

    expect(res.status).toBe(422);
  });

  // DEF-A07: las rutas de pacientes devuelven err.message tal cual en los 500 (detalles internos de la base).
  test.failing('CP-U33 un error interno en /pacientes no expone el mensaje de la base', async () => {
    pacienteService.listar.mockRejectedValue(new Error('column pacientes.dni_hash does not exist'));

    const res = await comoProf(request(app).get('/api/pacientes'));

    expect(res.status).toBe(500);
    expect(res.body.error).not.toMatch(/column|does not exist|pacientes\./);
  });
});

// ─────────────────────────────────────────────────────────────
// Derivaciones
// ─────────────────────────────────────────────────────────────
describe('derivaciones: validación', () => {
  const derivacion = (extra) => ({ paciente_id: UUID, profesional_destino_id: UUID, motivo: 'Evaluación fonoaudiológica', ...extra });

  test.each([
    ['vacío', ''],
    ['solo espacios', '   '],
    ['de 1001 caracteres (límite + 1)', 'a'.repeat(1001)]
  ])('CP-U34 motivo %s → 422', async (_caso, motivo) => {
    const res = await comoProf(request(app).post('/api/derivaciones').send(derivacion({ motivo })));

    expect(res.status).toBe(422);
    expect(derivacionService.crear).not.toHaveBeenCalled();
  });

  test('CP-U35 motivo de 1000 caracteres (límite exacto) → 201', async () => {
    derivacionService.crear.mockResolvedValue({ id: 'd1' });

    const res = await comoProf(request(app).post('/api/derivaciones').send(derivacion({ motivo: 'a'.repeat(1000) })));

    expect(res.status).toBe(201);
  });

  test.each(['completada', 'pendiente', ''])('CP-U36 responder con estado "%s" → 422 (solo aceptada o rechazada)', async (estado) => {
    const res = await comoProf(request(app).patch(`/api/derivaciones/${UUID}/responder`).send({ estado }));

    expect(res.status).toBe(422);
    expect(derivacionService.responder).not.toHaveBeenCalled();
  });

  test('CP-U37 responder dos veces: el 409 del service llega al cliente', async () => {
    derivacionService.responder.mockRejectedValue(Object.assign(new Error('Esta derivación ya fue respondida'), { status: 409 }));

    const res = await comoProf(request(app).patch(`/api/derivaciones/${UUID}/responder`).send({ estado: 'aceptada' }));

    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────────────────────
// Archivos: tipos y tamaños
// ─────────────────────────────────────────────────────────────
describe('POST /archivos/upload-url: tipos y tamaños', () => {
  const MB10 = 10 * 1024 * 1024;
  const archivo = (extra) => ({ paciente_id: UUID, nombre_original: 'informe.pdf', mime_type: 'application/pdf', tamanio_bytes: 1024, tipo: 'informe', ...extra });

  test.each([
    ['0 bytes', { tamanio_bytes: 0 }],
    ['10 MB + 1 byte', { tamanio_bytes: MB10 + 1 }],
    ['ejecutable', { mime_type: 'application/x-msdownload' }],
    ['SVG (puede llevar scripts)', { mime_type: 'image/svg+xml' }],
    ['HTML', { mime_type: 'text/html' }],
    ['tipo de archivo fuera de la lista', { tipo: 'factura' }]
  ])('CP-U38 %s → 422 y no se firma ninguna URL', async (_caso, extra) => {
    const res = await comoProf(request(app).post('/api/archivos/upload-url').send(archivo(extra)));

    expect(res.status).toBe(422);
    expect(archivoService.generarUrlSubida).not.toHaveBeenCalled();
  });

  test.each([
    ['1 byte', { tamanio_bytes: 1 }],
    ['10 MB exactos', { tamanio_bytes: MB10 }],
    ['PNG', { mime_type: 'image/png' }],
    ['DOCX', { mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }]
  ])('CP-U39 %s → 200', async (_caso, extra) => {
    archivoService.generarUrlSubida.mockResolvedValue({ archivo_id: 'a1', upload_url: 'https://x', token: 't' });

    const res = await comoProf(request(app).post('/api/archivos/upload-url').send(archivo(extra)));

    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────
// Sesiones: duración y consultorio
// ─────────────────────────────────────────────────────────────
describe('POST /sesiones: límites', () => {
  const sesion = (extra) => ({ paciente_id: UUID, fecha: '2026-11-02T13:00:00.000Z', tipo: 'tratamiento', ...extra });

  test.each([0, 481])('CP-U40 duración %p minutos (fuera de 1–480) → 422', async (duracion_minutos) => {
    const res = await comoProf(request(app).post('/api/sesiones').send(sesion({ duracion_minutos })));

    expect(res.status).toBe(422);
    expect(sesionService.crear).not.toHaveBeenCalled();
  });

  test.each([1, 480])('CP-U41 duración %p minutos (límite exacto) → 201', async (duracion_minutos) => {
    sesionService.crear.mockResolvedValue({ id: 's1' });

    const res = await comoProf(request(app).post('/api/sesiones').send(sesion({ duracion_minutos })));

    expect(res.status).toBe(201);
  });
});

// ─────────────────────────────────────────────────────────────
// Formato de error y robustez
// ─────────────────────────────────────────────────────────────
describe('formato de error y robustez', () => {
  test('CP-U42 una ruta inexistente → 404 { error }', async () => {
    const res = await request(app).get('/api/no-existe');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Ruta no encontrada' });
  });

  test('CP-U43 login con email inválido → 422 con mensaje legible', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'sin-arroba', password: 'x' });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].msg).toBe('El email no es válido');
  });

  test('CP-U44 login con credenciales incorrectas → 401 genérico (no dice si el email existe)', async () => {
    authService.login.mockRejectedValue(Object.assign(new Error('Credenciales inválidas'), { status: 401 }));

    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'mala' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Credenciales inválidas' });
  });

  // DEF-A06: un JSON mal formado cae en el manejador genérico y devuelve 500.
  test.failing('CP-U45 body con JSON mal formado → 400, no 500', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email": ');

    expect(res.status).toBe(400);
  });

  // DEF-A06: superar el límite de 200 kb también termina en 500 en vez de 413.
  test.failing('CP-U46 body de más de 200 kb → 413, no 500', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'x'.repeat(210 * 1024) });

    expect(res.status).toBe(413);
  });

  // DEF-A09: /auth/refresh declara la validación pero nunca la consulta.
  test.failing('CP-U47 refresh sin refresh_token → 422 sin consultar a Supabase', async () => {
    authService.refresh.mockResolvedValue({ access_token: 'a' });

    const res = await request(app).post('/api/auth/refresh').send({ refresh_token: '' });

    expect(res.status).toBe(422);
    expect(authService.refresh).not.toHaveBeenCalled();
  });

  test('CP-U266 un 422 de registro no devuelve la contraseña enviada', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email: 'zz@test.com', password: 'ZZclave', nombre: 'ZZ-TEST', apellido: 'X', especialidad: 'otro' });

    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).not.toContain('ZZclave');
  });

  test.each([
    ['POST /auth/signup', (r) => r.post('/api/auth/signup').send({ email: 'zz@test.com', password: 'ZZclave', nombre: '', apellido: 'X', especialidad: 'otro' })],
    ['POST /auth/register (admin)', (r) => comoAdmin(r.post('/api/auth/register')).send({ email: 'mal', password: 'ZZclave', nombre: 'A', apellido: 'B', especialidad: 'otro' })],
    ['PATCH /auth/change-password', (r) => comoProf(r.patch('/api/auth/change-password')).send({ password: 'ZZclave' })],
    ['POST /pacientes', (r) => comoProf(r.post('/api/pacientes')).send({ nombre: 'ZZclave', apellido: '', dni: 'ZZclave' })],
    ['POST /turnos', (r) => comoProf(r.post('/api/turnos')).send({ fecha_inicio: 'ZZclave', fecha_fin: 'x', profesional_id: 'ZZclave' })]
  ])('CP-U296 %s → 422 solo con campo y mensaje, sin el valor enviado', async (_ruta, pedir) => {
    const res = await pedir(request(app));

    expect(res.status).toBe(422);
    res.body.errors.forEach((e) => expect(Object.keys(e).sort()).toEqual(['msg', 'path']));
    expect(JSON.stringify(res.body)).not.toContain('ZZclave');
  });

  test('CP-U49 forgot-password siempre responde lo mismo, exista o no el email', async () => {
    authService.forgotPassword.mockResolvedValue();

    const a = await request(app).post('/api/auth/forgot-password').send({ email: 'existe@x.com' });
    const b = await request(app).post('/api/auth/forgot-password').send({ email: 'no-existe@x.com' });

    expect(a.status).toBe(200);
    expect(a.body).toEqual(b.body);
  });

  test('CP-U50 /health responde sin autenticación', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
