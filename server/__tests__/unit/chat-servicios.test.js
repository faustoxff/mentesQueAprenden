// El chat crea y lee pacientes, sesiones y turnos a través de los mismos services y
// con las mismas reglas de validación que las rutas (separación de responsabilidades).
process.env.OPENROUTER_API_KEY = 'test';
process.env.CONFIRM_SECRET = 'secreto-de-test';

const mockAdmin = { from: jest.fn(), storage: { from: jest.fn() } };
jest.mock('../../src/config/supabase', () => ({ supabaseAdmin: mockAdmin, supabase: {} }));

const chatService = require('../../src/services/ChatService');
const pacienteService = require('../../src/services/PacienteService');
const sesionService = require('../../src/services/SesionService');
const turnoService = require('../../src/services/TurnoService');
const ArchivoService = require('../../src/services/ArchivoService');
const { exigirDatosValidos } = require('../../src/utils/validacion');
const { reglasCrearSesion } = require('../../src/validaciones/sesiones');
const { crearDb } = require('./helpers/fakeDb');

const ok = (data) => ({ data, error: null });
const P1 = '33333333-3333-4333-8333-333333333333';
const PROF = { id: '44444444-4444-4444-8444-444444444444', rol: 'profesional', nombre: 'Ana', apellido: 'Paz', especialidad: 'psicopedagogia' };

beforeEach(() => {
  jest.restoreAllMocks();
  mockAdmin.from.mockReset();
});

describe('registrar_sesion desde el chat', () => {
  const sesion = (extra) => ({ paciente_id: P1, fecha: '2026-10-20T10:00:00', tipo: 'tratamiento', ...extra });

  test.each([
    ['duración 0 (límite inferior - 1)', { duracion_minutos: 0 }, 'La duración debe estar entre 1 y 480 minutos'],
    ['duración 481 (límite superior + 1)', { duracion_minutos: 481 }, 'La duración debe estar entre 1 y 480 minutos'],
    ['monto negativo', { monto: -1 }, 'El monto debe ser un número mayor o igual a 0'],
    ['fecha inválida', { fecha: 'ayer' }, 'La fecha y hora de la sesión no son válidas'],
    ['tipo fuera de la lista', { tipo: 'charla' }, 'El tipo de sesión no es válido'],
    ['sin tipo', { tipo: undefined }, 'El tipo de sesión no es válido']
  ])('CP-U318 con %s rechaza con el mismo mensaje que POST /sesiones y no inserta', async (_caso, extra, mensaje) => {
    const crear = jest.spyOn(sesionService, 'crear');
    const { db, enTabla } = crearDb({ pacientes: ok({ id: P1 }) });

    await expect(chatService.ejecutarTool('registrar_sesion', sesion(extra), PROF, db)).rejects.toMatchObject({ status: 422, message: mensaje });
    expect(crear).not.toHaveBeenCalled();
    expect(enTabla('sesiones', 'insert')).toHaveLength(0);
  });

  test('CP-U319 una sesión válida se crea con SesionService.crear, a nombre del profesional del chat', async () => {
    const crear = jest.spyOn(sesionService, 'crear').mockResolvedValue({ id: 's1' });
    const { db } = crearDb({ pacientes: ok({ id: P1 }) });

    await chatService.ejecutarTool('registrar_sesion', sesion({ duracion_minutos: 60, monto: 5000 }), PROF, db);

    expect(crear).toHaveBeenCalledWith(db, PROF.id, expect.objectContaining({ paciente_id: P1, tipo: 'tratamiento', duracion_minutos: 60, monto: 5000 }));
    expect(crear.mock.calls[0][2]).not.toHaveProperty('consultorio');
  });

  test('CP-U320 el chat corre exactamente las reglas de la ruta (mismo resultado para los mismos datos)', async () => {
    const datos = sesion({ duracion_minutos: 481, monto: -1 });
    const errorRuta = await exigirDatosValidos(reglasCrearSesion, datos).catch((e) => e);
    const { db } = crearDb({ pacientes: ok({ id: P1 }) });

    const errorChat = await chatService.ejecutarTool('registrar_sesion', datos, PROF, db).catch((e) => e);

    expect(errorChat.errores).toEqual(errorRuta.errores);
  });
});

describe('crear_paciente y crear_turno desde el chat', () => {
  test('CP-U321 crear_paciente usa PacienteService.crear con los datos ya saneados (fecha dd/mm/aaaa → ISO)', async () => {
    const crear = jest.spyOn(pacienteService, 'crear').mockResolvedValue({ id: 'p9' });
    const { db } = crearDb({});

    await chatService.ejecutarTool('crear_paciente', { nombre: ' ZZ-TEST ', apellido: 'Chat', dni: '1234567', fecha_nacimiento: '10/03/2015' }, PROF, db);

    expect(crear).toHaveBeenCalledWith(db, expect.objectContaining({ nombre: 'ZZ-TEST', fecha_nacimiento: '2015-03-10' }), PROF);
  });

  test('CP-U322 crear_paciente sin fecha de nacimiento → 422 con el mensaje del formulario', async () => {
    const { db, enTabla } = crearDb({});

    await expect(chatService.ejecutarTool('crear_paciente', { nombre: 'A', apellido: 'B', dni: '1234567' }, PROF, db))
      .rejects.toMatchObject({ status: 422, message: 'La fecha de nacimiento es obligatoria y debe ser una fecha válida' });
    expect(enTabla('pacientes', 'insert')).toHaveLength(0);
  });

  test('CP-U323 crear_turno usa TurnoService.crear con el profesional del chat y fin = inicio + duración', async () => {
    const crear = jest.spyOn(turnoService, 'crear').mockResolvedValue({ id: 't1' });
    const { db } = crearDb({ pacientes: ok({ id: P1 }) });

    await chatService.ejecutarTool('crear_turno', { paciente_id: P1, fecha_inicio: '2026-11-02T13:00:00.000Z', duracion_minutos: 50 }, PROF, db);

    expect(crear).toHaveBeenCalledWith(db, PROF.id, expect.objectContaining({
      profesional_id: PROF.id, paciente_id: P1, fecha_inicio: '2026-11-02T13:00:00.000Z', fecha_fin: '2026-11-02T13:50:00.000Z', tipo: 'tratamiento'
    }));
  });

  test('CP-U324 crear_turno con consultorio 4 → 422 sin crear nada', async () => {
    const crear = jest.spyOn(turnoService, 'crear');
    const { db } = crearDb({ pacientes: ok({ id: P1 }) });

    await expect(chatService.ejecutarTool('crear_turno', { paciente_id: P1, fecha_inicio: '2026-11-02T13:00:00.000Z', consultorio: 4 }, PROF, db))
      .rejects.toMatchObject({ status: 422 });
    expect(crear).not.toHaveBeenCalled();
  });
});

describe('lecturas de pacientes desde otros services', () => {
  test('CP-U325 asegurarAcceso: un paciente ajeno o dado de baja → 404, y la consulta excluye los dados de baja', async () => {
    const { db, enTabla } = crearDb({ pacientes: ok(null) });

    await expect(pacienteService.asegurarAcceso(db, P1)).rejects.toMatchObject({ status: 404, message: 'Paciente no encontrado' });
    expect(enTabla('pacientes', 'is')).toContainEqual(['deleted_at', null]);
  });

  test('CP-U326 buscar no agrega filtro con un término vacío o de solo símbolos', async () => {
    const { db, llamadas } = crearDb({});

    await expect(pacienteService.buscar(db, ',()%')).resolves.toEqual([]);
    expect(llamadas).toHaveLength(0);
  });

  test('CP-U327 ver_paciente y buscar_pacientes del chat leen a través de PacienteService', async () => {
    const obtener = jest.spyOn(pacienteService, 'obtenerDatosBasicos').mockResolvedValue(null);
    const buscar = jest.spyOn(pacienteService, 'buscar').mockResolvedValue([]);
    const { db } = crearDb({});

    await chatService.ejecutarTool('ver_paciente', { paciente_id: P1 }, PROF, db);
    await chatService.ejecutarTool('buscar_pacientes', { busqueda: 'Gil' }, PROF, db);

    expect(obtener).toHaveBeenCalledWith(db, P1, expect.stringContaining('motivo_consulta'));
    expect(buscar).toHaveBeenCalledWith(db, 'Gil', expect.objectContaining({ limite: 5 }));
  });
});

describe('DEF-A22: archivos de un paciente dado de baja', () => {
  test('CP-U328 no se firma una URL de subida para un paciente dado de baja (403, como siempre en esta ruta)', async () => {
    const firmador = { createSignedUploadUrl: jest.fn() };
    mockAdmin.storage.from.mockReturnValue(firmador);
    // RLS lo ve, pero tiene deleted_at: la consulta con el filtro de baja no lo devuelve.
    const { db, enTabla } = crearDb({ pacientes: ok(null) });

    await expect(ArchivoService.generarUrlSubida(db, PROF.id, { paciente_id: P1, mime_type: 'application/pdf' }))
      .rejects.toMatchObject({ status: 403, message: 'Sin acceso a este paciente' });
    expect(enTabla('pacientes', 'is')).toContainEqual(['deleted_at', null]);
    expect(firmador.createSignedUploadUrl).not.toHaveBeenCalled();
  });
});

describe('crear turno o sesión para un paciente dado de baja (formulario o chat)', () => {
  test('CP-U338 TurnoService.crear con un paciente dado de baja → 404 y no inserta el turno', async () => {
    const { db, enTabla } = crearDb({ pacientes: ok(null) });

    await expect(turnoService.crear(db, PROF.id, { paciente_id: P1, fecha_inicio: '2026-11-02T13:00:00.000Z' }))
      .rejects.toMatchObject({ status: 404, message: 'Paciente no encontrado' });
    expect(enTabla('pacientes', 'is')).toContainEqual(['deleted_at', null]);
    expect(enTabla('turnos', 'insert')).toHaveLength(0);
  });

  test('CP-U339 un turno sin paciente no consulta pacientes', async () => {
    const { db, enTabla } = crearDb({ turnos: ok({ id: 't1' }) });

    await turnoService.crear(db, PROF.id, { fecha_inicio: '2026-11-02T13:00:00.000Z' });

    expect(enTabla('pacientes', 'select')).toHaveLength(0);
    expect(enTabla('turnos', 'insert')).toHaveLength(1);
  });

  test('CP-U340 SesionService.crear con un paciente dado de baja → 404 y no inserta la sesión', async () => {
    const { db, enTabla } = crearDb({ pacientes: ok(null) });

    await expect(sesionService.crear(db, PROF.id, { paciente_id: P1, fecha: '2026-11-02T13:00:00.000Z', tipo: 'tratamiento' }))
      .rejects.toMatchObject({ status: 404, message: 'Paciente no encontrado' });
    expect(enTabla('sesiones', 'insert')).toHaveLength(0);
  });
});
