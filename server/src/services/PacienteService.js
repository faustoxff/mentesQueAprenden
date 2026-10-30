const { sanitizarBusqueda } = require('../utils/busqueda');
const pacienteRepository = require('../repositories/PacienteRepository');
const sesionRepository = require('../repositories/SesionRepository');
const turnoRepository = require('../repositories/TurnoRepository');
const derivacionRepository = require('../repositories/DerivacionRepository');
const archivoRepository = require('../repositories/ArchivoRepository');

const CAMPOS_UUID = ['obra_social_id', 'profesional_principal_id'];

class PacienteService {
  // ─────────────────────────────────────────────────────────────
  // Pacientes
  // ─────────────────────────────────────────────────────────────

  async listar(db, { busqueda, estado, profesional_id, page = 1, limit = 20 }, profesionalActualId) {
    const { data, count } = await pacienteRepository.listarActivos(db, {
      termino: sanitizarBusqueda(busqueda),
      estado,
      profesionalPrincipalId: profesional_id,
      desde: (page - 1) * limit,
      hasta: page * limit - 1
    });

    const dataConDerivado = data.map(p => ({
      ...p,
      derivado: p.profesional_principal?.id !== profesionalActualId
    }));

    return {
      data: dataConDerivado,
      pagination: { total: count, page: Number(page), limit: Number(limit), pages: Math.ceil(count / limit) }
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Acceso y lecturas para otros services (archivos, chat, IA)
  // Las reglas de "existe, no está dado de baja y RLS lo deja ver" viven acá.
  // ─────────────────────────────────────────────────────────────

  // Lanza 404 si el paciente no existe, está dado de baja o RLS no lo deja ver
  // (para quien llama, las tres cosas son lo mismo).
  async asegurarAcceso(db, id) {
    const paciente = await this.obtenerDatosBasicos(db, id, 'id');
    if (!paciente) throw Object.assign(new Error('Paciente no encontrado'), { status: 404 });
    return paciente;
  }

  // Columnas pedidas de un paciente activo y visible, o null.
  async obtenerDatosBasicos(db, id, campos = 'id, nombre, apellido') {
    return pacienteRepository.obtenerActivo(db, id, campos);
  }

  // Búsqueda rápida por nombre, apellido o DNI (sin paginar), para el chat.
  async buscar(db, busqueda, { limite = 5, campos = 'id, nombre, apellido, dni' } = {}) {
    const termino = sanitizarBusqueda(busqueda);
    if (!termino) return [];
    return (await pacienteRepository.buscarActivos(db, termino, { limite, campos })) || [];
  }

  async obtener(db, id) {
    try {
      return await pacienteRepository.obtenerDetalle(db, id);
    } catch (error) {
      error.status = error.tipo === 'NO_ENCONTRADO' ? 404 : 500;
      throw error;
    }
  }

  async crear(db, body, profesional) {
    const CAMPOS_CREABLES = [
      'nombre', 'apellido', 'dni', 'fecha_nacimiento', 'genero', 'telefono',
      'telefono_alternativo', 'email', 'direccion', 'localidad', 'provincia',
      'motivo_consulta', 'obra_social_id', 'numero_afiliado',
      'profesional_principal_id', 'responsable_nombre', 'responsable_vinculo',
      'responsable_telefono'
    ];
    // Un <select> sin elegir llega como "": en una columna UUID eso rompe el insert.
    const insertData = Object.fromEntries(
      Object.entries(body).filter(([k, v]) => CAMPOS_CREABLES.includes(k) && !(CAMPOS_UUID.includes(k) && v === ''))
    );

    // Asignar el paciente a otro profesional es cosa de admin.
    const principal = insertData.profesional_principal_id || profesional.id;
    if (principal !== profesional.id && profesional.rol !== 'admin') {
      const err = new Error('Solo un administrador puede asignar el paciente a otro profesional');
      err.status = 403;
      throw err;
    }
    // Con otro titular el insert pasa (es admin) pero el .select() posterior no, porque
    // RLS no deja ver pacientes ajenos ("new row violates row-level security policy"):
    // ese caso va con el cliente admin, ya autorizado arriba.
    const paciente = { ...insertData, profesional_principal_id: principal, created_by: profesional.id };

    try {
      return principal === profesional.id
        ? await pacienteRepository.crear(db, paciente)
        : await pacienteRepository.crearComoAdmin(paciente);
    } catch (error) {
      if (error.tipo === 'DUPLICADO') {
        const err = new Error('Ya existe un paciente con ese DNI');
        err.status = 409;
        throw err;
      }
      error.status = 500;
      throw error;
    }
  }

  async actualizar(db, id, body, profesional) {
    // Allowlist explícita de campos editables
    const CAMPOS_EDITABLES = [
      'nombre', 'apellido', 'dni', 'fecha_nacimiento', 'genero', 'telefono',
      'telefono_alternativo', 'email', 'direccion', 'localidad', 'provincia',
      'estado', 'motivo_consulta', 'obra_social_id', 'numero_afiliado',
      'profesional_principal_id', 'responsable_nombre', 'responsable_vinculo',
      'responsable_telefono'
    ];
    const updateData = Object.fromEntries(
      Object.entries(body).filter(([k]) => CAMPOS_EDITABLES.includes(k))
    );
    // "" en una columna UUID: sin obra social se guarda null; sin profesional se deja el actual.
    if (updateData.obra_social_id === '') updateData.obra_social_id = null;
    if (updateData.profesional_principal_id === '') delete updateData.profesional_principal_id;
    // Reasignar la titularidad: solo admin (la base también lo impide con un trigger).
    if (profesional?.rol !== 'admin') delete updateData.profesional_principal_id;

    try {
      return await pacienteRepository.actualizarActivo(db, id, updateData);
    } catch (error) {
      error.status = error.tipo === 'NO_ENCONTRADO' ? 404 : 500;
      throw error;
    }
  }

  async eliminar(db, id) {
    // Verificación manual de permiso (RLS de UPDATE sobre esta tabla da falso
    // negativo en este entorno) antes de usar el cliente admin.
    const paciente = await pacienteRepository.obtenerActivo(db, id, 'id, nombre, apellido');

    if (!paciente) {
      const err = new Error('Paciente no encontrado');
      err.status = 404;
      throw err;
    }

    const data = await pacienteRepository.darDeBajaComoAdmin(id, new Date().toISOString());
    return { message: `Paciente ${data.apellido}, ${data.nombre} eliminado`, id: data.id };
  }

  // ─────────────────────────────────────────────────────────────
  // Sub-recursos
  // ─────────────────────────────────────────────────────────────

  async listarSesiones(db, pacienteId, { page = 1, limit = 20 }) {
    const { data, count } = await sesionRepository.listarDePaciente(db, pacienteId, { desde: (page - 1) * limit, hasta: page * limit - 1 });
    return { data, pagination: { total: count, page: Number(page), limit: Number(limit) } };
  }

  async listarTurnos(db, pacienteId) {
    return turnoRepository.listarDePaciente(db, pacienteId);
  }

  async listarDerivaciones(db, pacienteId) {
    return derivacionRepository.listarDePaciente(db, pacienteId);
  }

  async listarArchivos(db, pacienteId) {
    return archivoRepository.listarDePaciente(db, pacienteId);
  }
}

module.exports = new PacienteService();
