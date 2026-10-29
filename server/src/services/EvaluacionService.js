const { generarInformeTexto } = require('./informeGenerator');
const evaluacionRepository = require('../repositories/EvaluacionRepository');

const CAMPOS_EVALUACION = ['paciente_id', 'fecha_evaluacion', 'motivo_consulta', 'antecedentes', 'observacion_conducta', 'conclusiones', 'sugerencias'];
const CAMPOS_EVALUACION_UPDATE = [...CAMPOS_EVALUACION.filter(c => c !== 'paciente_id'), 'estado'];

// Lo que la base no encuentra (o RLS no deja ver) es 404; cualquier otro error, 500.
const conStatusDeBusqueda = (error) => {
  error.status = error.tipo === 'NO_ENCONTRADO' ? 404 : 500;
  return error;
};

class EvaluacionService {
  // db es el cliente de Supabase autenticado con el JWT del usuario (respeta RLS).
  // Cada método lo recibe como parámetro porque depende de la request.

  async obtener(db, id) {
    try {
      return await evaluacionRepository.obtener(db, id);
    } catch (error) {
      throw conStatusDeBusqueda(error);
    }
  }

  async crear(db, profesionalId, body) {
    const payload = Object.fromEntries(Object.entries(body).filter(([k]) => CAMPOS_EVALUACION.includes(k)));

    return evaluacionRepository.crear(db, {
      ...payload,
      profesional_id: profesionalId,
      created_by: profesionalId
    });
  }

  async actualizar(db, id, body) {
    const updateData = Object.fromEntries(Object.entries(body).filter(([k]) => CAMPOS_EVALUACION_UPDATE.includes(k)));

    try {
      return await evaluacionRepository.actualizar(db, id, updateData);
    } catch (error) {
      throw conStatusDeBusqueda(error);
    }
  }

  async listarPorPaciente(db, pacienteId) {
    return evaluacionRepository.listarPorPaciente(db, pacienteId);
  }

  async agregarPrueba(db, evaluacionId, { nombre_prueba, resultados_texto, observaciones }) {
    const count = await evaluacionRepository.contarPruebas(db, evaluacionId);

    return evaluacionRepository.crearPrueba(db, {
      evaluacion_id: evaluacionId,
      nombre_prueba,
      resultados: { texto: resultados_texto || '' },
      observaciones,
      orden: count || 0
    });
  }

  async actualizarPrueba(db, pruebaId, body) {
    const updateData = {};
    if (body.nombre_prueba !== undefined) updateData.nombre_prueba = body.nombre_prueba;
    if (body.observaciones !== undefined) updateData.observaciones = body.observaciones;
    if (body.resultados_texto !== undefined) updateData.resultados = { texto: body.resultados_texto };

    try {
      return await evaluacionRepository.actualizarPrueba(db, pruebaId, updateData);
    } catch (error) {
      throw conStatusDeBusqueda(error);
    }
  }

  async eliminarPrueba(db, pruebaId) {
    await evaluacionRepository.eliminarPrueba(db, pruebaId);
  }

  async generarInforme(db, id) {
    const evaluacion = await evaluacionRepository.obtenerParaInforme(db, id);

    if (!evaluacion) {
      const err = new Error('Evaluación no encontrada');
      err.status = 404;
      throw err;
    }

    const informe = await generarInformeTexto(evaluacion);

    return evaluacionRepository.actualizar(db, id, { informe_generado: informe });
  }
}

module.exports = new EvaluacionService();
