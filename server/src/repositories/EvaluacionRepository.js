const { datosDe, datosOpcionales } = require('./errores');

// Consultas a `evaluaciones` y `pruebas_aplicadas`. Reciben `db`, el cliente con el token
// del profesional, así que RLS decide qué filas se ven.
class EvaluacionRepository {
  async obtener(db, id) {
    return datosDe(await db
      .from('evaluaciones')
      .select(`
        *,
        paciente:pacientes(id, nombre, apellido, dni, fecha_nacimiento, genero),
        profesional:profesionales!profesional_id(id, nombre, apellido, especialidad, matricula),
        pruebas:pruebas_aplicadas(id, nombre_prueba, resultados, observaciones, orden)
      `)
      .eq('id', id)
      .order('orden', { referencedTable: 'pruebas_aplicadas', ascending: true })
      .single());
  }

  // Lo que necesita el informe: datos del paciente, del profesional y las pruebas.
  async obtenerParaInforme(db, id) {
    return datosOpcionales(await db
      .from('evaluaciones')
      .select(`
        *,
        paciente:pacientes(nombre, apellido, dni, fecha_nacimiento, genero),
        profesional:profesionales!profesional_id(nombre, apellido, especialidad, matricula),
        pruebas:pruebas_aplicadas(nombre_prueba, resultados, observaciones, orden)
      `)
      .eq('id', id)
      .single());
  }

  async crear(db, evaluacion) {
    return datosDe(await db.from('evaluaciones').insert(evaluacion).select().single());
  }

  async actualizar(db, id, cambios) {
    return datosDe(await db.from('evaluaciones').update(cambios).eq('id', id).select().single());
  }

  async listarPorPaciente(db, pacienteId) {
    return datosDe(await db
      .from('evaluaciones')
      .select('id, fecha_evaluacion, estado, motivo_consulta, created_at')
      .eq('paciente_id', pacienteId)
      .order('fecha_evaluacion', { ascending: false }));
  }

  async contarPruebas(db, evaluacionId) {
    const { count } = await db
      .from('pruebas_aplicadas')
      .select('id', { count: 'exact', head: true })
      .eq('evaluacion_id', evaluacionId);
    return count;
  }

  async crearPrueba(db, prueba) {
    return datosDe(await db.from('pruebas_aplicadas').insert(prueba).select().single());
  }

  async actualizarPrueba(db, pruebaId, cambios) {
    return datosDe(await db.from('pruebas_aplicadas').update(cambios).eq('id', pruebaId).select().single());
  }

  async eliminarPrueba(db, pruebaId) {
    datosDe(await db.from('pruebas_aplicadas').delete().eq('id', pruebaId));
  }
}

module.exports = new EvaluacionRepository();
