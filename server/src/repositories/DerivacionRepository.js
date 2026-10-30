const { datosDe, datosOpcionales } = require('./errores');

// Consultas a la tabla `derivaciones`. Reciben `db`, el cliente con el token del
// profesional, así que RLS decide qué filas se ven.
class DerivacionRepository {
  // Solo las columnas pedidas, o null si no está (o RLS no la deja ver).
  async obtenerCampos(db, id, campos) {
    return datosOpcionales(await db.from('derivaciones').select(campos).eq('id', id).single());
  }

  async crear(db, derivacion) {
    return datosDe(await db
      .from('derivaciones')
      .insert(derivacion)
      .select(`
        *,
        paciente:pacientes(id, nombre, apellido),
        origen:profesionales!profesional_origen_id(id, nombre, apellido, especialidad),
        destino:profesionales!profesional_destino_id(id, nombre, apellido, especialidad)
      `)
      .single());
  }

  async actualizar(db, id, cambios) {
    return datosDe(await db.from('derivaciones').update(cambios).eq('id', id).select().single());
  }

  // Las que el profesional mandó o recibió, de la más nueva a la más vieja.
  async listarDelProfesional(db, profesionalId) {
    return datosDe(await db
      .from('derivaciones')
      .select(`
        *,
        paciente:pacientes(id, nombre, apellido, dni),
        origen:profesionales!profesional_origen_id(id, nombre, apellido, especialidad),
        destino:profesionales!profesional_destino_id(id, nombre, apellido, especialidad)
      `)
      .or(`profesional_origen_id.eq.${profesionalId},profesional_destino_id.eq.${profesionalId}`)
      .order('created_at', { ascending: false }));
  }

  async listarDePaciente(db, pacienteId) {
    return datosDe(await db
      .from('derivaciones')
      .select(`
        *,
        origen:profesionales!profesional_origen_id(id, nombre, apellido, especialidad),
        destino:profesionales!profesional_destino_id(id, nombre, apellido, especialidad)
      `)
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false }));
  }

  async listarPendientesDe(db, profesionalDestinoId) {
    return datosDe(await db
      .from('derivaciones')
      .select(`
        *,
        paciente:pacientes(id, nombre, apellido, dni, fecha_nacimiento),
        origen:profesionales!profesional_origen_id(id, nombre, apellido, especialidad)
      `)
      .eq('profesional_destino_id', profesionalDestinoId)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false }));
  }
}

module.exports = new DerivacionRepository();
