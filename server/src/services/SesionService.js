const sesionRepository = require('../repositories/SesionRepository');
const turnoRepository = require('../repositories/TurnoRepository');
const logAccesoRepository = require('../repositories/LogAccesoRepository');
const pacienteService = require('./PacienteService');

// Un turno de una sesión futura todavía no ocurrió.
const estadoSegunFecha = (fecha) => (new Date(fecha) > new Date() ? 'confirmado' : 'realizado');

function errorDeTurno(error) {
  const choque = error.tipo === 'CHOQUE_HORARIO';
  const err = new Error(choque
    ? `${error.message}. No se guardaron los cambios: elegí otro horario u otro consultorio.`
    : 'No se pudo actualizar el turno de la agenda');
  err.status = choque ? 409 : 500;
  return err;
}

const CAMPOS_EDITABLES = ['fecha', 'tipo', 'duracion_minutos', 'notas_libres', 'notas_estructuradas', 'resumen_ia', 'monto', 'pagado', 'fecha_pago', 'metodo_pago'];

class SesionService {
  async obtener(db, id, profesionalId, req) {
    let data;
    try {
      data = await sesionRepository.obtenerDetalle(db, id);
    } catch (error) {
      error.status = error.tipo === 'NO_ENCONTRADO' ? 404 : 500;
      throw error;
    }

    // El consultorio de la sesión es el de su turno activo (si tiene).
    const turno = (data.turnos || []).find(t => t.estado !== 'cancelado');
    data.consultorio = turno?.consultorio ?? null;
    data.turno_id = turno?.id ?? null;
    delete data.turnos;

    // Log del acceso (Ley 25.326). Si el log falla, la sesión se devuelve igual.
    if (data?.paciente_id) {
      await logAccesoRepository.registrarComoAdmin({
        profesional_id: profesionalId,
        paciente_id: data.paciente_id,
        accion: 'ver',
        recurso: 'sesion',
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
    }

    return data;
  }

  // Sesiones registradas por el profesional, de la más reciente a la más vieja.
  async listarDelProfesional(db, profesionalId, { paciente_id, hasta, limit = 20 } = {}) {
    return sesionRepository.listarDelProfesional(db, profesionalId, { pacienteId: paciente_id, hasta, limite: limit });
  }

  async crear(db, profesionalId, body) {
    // turno_id y consultorio no son columnas de "sesiones": el consultorio se
    // reserva a través del turno vinculado (turnos.sesion_id), que es lo que
    // usan la agenda y el control de choques de la base.
    const { turno_id, consultorio, ...datosSesion } = body;
    const inicio = new Date(datosSesion.fecha);
    const fin = new Date(inicio.getTime() + (datosSesion.duracion_minutos || 50) * 60000);

    // El paciente tiene que existir, estar activo y ser visible: 404 claro, igual venga
    // del formulario o del chat. La base también lo impide (RLS).
    await pacienteService.asegurarAcceso(db, datosSesion.paciente_id);
    if (consultorio) await this.verificarConsultorioLibre(db, consultorio, inicio, fin, turno_id);

    const data = await sesionRepository.crear(db, {
      ...datosSesion,
      profesional_id: profesionalId,
      created_by: profesionalId
    });

    try {
      if (turno_id) {
        // El turno de origen queda con los datos con que se registró la sesión.
        await this.actualizarTurno(db, turno_id, consultorio === null
          ? { sesion_id: data.id, estado: 'cancelado' }
          : {
              sesion_id: data.id,
              estado: estadoSegunFecha(inicio),
              fecha_inicio: inicio.toISOString(),
              fecha_fin: fin.toISOString(),
              tipo: data.tipo,
              ...(consultorio && { consultorio })
            });
      } else if (consultorio) {
        await this.crearTurnoParaSesion(db, data, consultorio, inicio, fin);
      }
    } catch (err) {
      // Sin turno la sesión quedaría sin el consultorio que se pidió: se deshace.
      await sesionRepository.eliminarComoAdmin(data.id);
      throw err;
    }

    return data;
  }

  async actualizar(db, id, body) {
    // Allowlist explícita: solo campos que el profesional puede editar post-creación
    const updateData = Object.fromEntries(
      Object.entries(body).filter(([k]) => CAMPOS_EDITABLES.includes(k))
    );

    // El turno se sincroniza ANTES que la sesión: si no se puede mover
    // (consultorio ocupado), se aborta todo en vez de dejar la sesión y la
    // agenda mostrando datos distintos.
    if (['fecha', 'duracion_minutos', 'tipo'].some(k => k in updateData) || 'consultorio' in body) {
      await this.sincronizarTurno(db, id, updateData, body.consultorio);
    }

    try {
      return Object.keys(updateData).length
        ? await sesionRepository.actualizar(db, id, updateData)
        : await sesionRepository.obtener(db, id);
    } catch (error) {
      error.status = error.tipo === 'NO_ENCONTRADO' ? 404 : 500;
      throw error;
    }
  }

  // El turno vinculado guarda su propia copia de fecha, duración, tipo y
  // consultorio; si no se actualiza junto con la sesión, la agenda y las
  // barras de consultorios siguen mostrando los datos viejos.
  // consultorioNuevo: undefined = no cambia, null = sin consultorio, 1-3.
  async sincronizarTurno(db, id, cambios, consultorioNuevo) {
    let previa;
    try {
      previa = await sesionRepository.obtener(db, id, 'id, fecha, duracion_minutos, tipo, paciente_id, profesional_id');
    } catch (error) {
      const noEncontrada = error.tipo === 'NO_ENCONTRADO';
      const err = new Error(noEncontrada ? 'Sesión no encontrada' : error.message);
      err.status = noEncontrada ? 404 : 500;
      throw err;
    }

    const inicioNuevo = cambios.fecha ? new Date(cambios.fecha) : new Date(previa.fecha);
    const duracion = Number(cambios.duracion_minutos ?? previa.duracion_minutos ?? 50);
    const cambiaFecha = inicioNuevo.getTime() !== new Date(previa.fecha).getTime();
    const cambiaDuracion = duracion !== previa.duracion_minutos;
    const cambiaTipo = cambios.tipo && cambios.tipo !== previa.tipo;

    const { turno, recienVinculado } = await this.buscarTurnoVinculado(db, id, previa);
    const cambiaConsultorio = consultorioNuevo !== undefined && consultorioNuevo !== (turno?.consultorio ?? null);
    if (!cambiaFecha && !cambiaDuracion && !cambiaTipo && !cambiaConsultorio) return;

    if (!turno) {
      if (consultorioNuevo) {
        const fin = new Date(inicioNuevo.getTime() + duracion * 60000);
        await this.crearTurnoParaSesion(db, { ...previa, tipo: cambios.tipo ?? previa.tipo }, consultorioNuevo, inicioNuevo, fin);
      }
      return;
    }

    if (consultorioNuevo === null) {
      // "Sin consultorio": la sesión deja de reservar sala.
      await this.actualizarTurno(db, turno.id, { sesion_id: id, estado: 'cancelado' });
      return;
    }

    const actualizacion = recienVinculado ? { sesion_id: id, estado: estadoSegunFecha(inicioNuevo) } : {};
    if (cambiaFecha || cambiaDuracion) {
      const inicio = cambiaFecha ? inicioNuevo : new Date(turno.fecha_inicio);
      actualizacion.fecha_inicio = inicio.toISOString();
      actualizacion.fecha_fin = new Date(inicio.getTime() + duracion * 60000).toISOString();
    }
    if (cambiaTipo) actualizacion.tipo = cambios.tipo;
    if (cambiaConsultorio) actualizacion.consultorio = consultorioNuevo;

    if (Object.keys(actualizacion).length) await this.actualizarTurno(db, turno.id, actualizacion);
  }

  async crearTurnoParaSesion(db, sesion, consultorio, inicio, fin) {
    try {
      await turnoRepository.insertarSinDevolver(db, {
        paciente_id: sesion.paciente_id,
        profesional_id: sesion.profesional_id,
        created_by: sesion.profesional_id,
        fecha_inicio: inicio.toISOString(),
        fecha_fin: fin.toISOString(),
        tipo: sesion.tipo,
        consultorio,
        estado: estadoSegunFecha(inicio),
        sesion_id: sesion.id
      });
    } catch (error) {
      throw errorDeTurno(error);
    }
  }

  async actualizarTurno(db, turnoId, cambios) {
    try {
      await turnoRepository.actualizarSinDevolver(db, turnoId, cambios);
    } catch (error) {
      throw errorDeTurno(error);
    }
  }

  // Chequeo previo a crear la sesión, para no insertarla si el consultorio
  // está tomado. La base igual lo impide (trigger), esto solo da el aviso antes.
  async verificarConsultorioLibre(db, consultorio, inicio, fin, excluirTurnoId) {
    // Función de la base: ve los turnos de todos (RLS no deja a un profesional ver los
    // ajenos) pero solo responde si el consultorio está libre.
    let libre;
    try {
      libre = await turnoRepository.consultorioLibre(db, { consultorio, desde: inicio.toISOString(), hasta: fin.toISOString(), excluirTurnoId });
    } catch (error) {
      if (error.tipo === 'FUNCION_INEXISTENTE') return this.verificarConsultorioLibreSinFuncion(db, consultorio, inicio, fin, excluirTurnoId);
      throw error;
    }
    if (libre === false) {
      const err = new Error(`Consultorio ${consultorio} ocupado en ese horario. Elegí otro horario u otro consultorio.`);
      err.status = 409;
      throw err;
    }
  }

  // Camino anterior a la migración 008 (backend desplegado antes que la migración).
  async verificarConsultorioLibreSinFuncion(db, consultorio, inicio, fin, excluirTurnoId) {
    const data = await turnoRepository.superpuestosSinFuncion(db, { consultorio, desde: inicio.toISOString(), hasta: fin.toISOString(), excluirTurnoId });
    if (data?.length) {
      const err = new Error(`Consultorio ${consultorio} ocupado en ese horario. Elegí otro horario u otro consultorio.`);
      err.status = 409;
      throw err;
    }
  }

  async buscarTurnoVinculado(db, id, previa) {
    const vinculados = await turnoRepository.activosDeSesion(db, id);
    if (vinculados?.length) return { turno: vinculados[0], recienVinculado: false };

    // Sesiones creadas antes de que existiera el vínculo turno↔sesión nunca
    // quedaron conectadas a su turno. Si hay un único turno sin sesión, del
    // mismo paciente y profesional, a menos de 12 h de la fecha que tenía la
    // sesión, es el turno del que salió — se lo vincula. Con más de un
    // candidato no se adivina.
    const referencia = new Date(previa.fecha).getTime();
    const margen = 12 * 60 * 60 * 1000;
    const candidatos = await turnoRepository.sinSesionEnRango(db, {
      pacienteId: previa.paciente_id,
      profesionalId: previa.profesional_id,
      desde: new Date(referencia - margen).toISOString(),
      hasta: new Date(referencia + margen).toISOString()
    });

    return candidatos?.length === 1
      ? { turno: candidatos[0], recienVinculado: true }
      : { turno: null, recienVinculado: false };
  }

  async listarVersiones(db, sesionId) {
    return sesionRepository.listarVersionesDeNotas(db, sesionId);
  }
}

module.exports = new SesionService();
