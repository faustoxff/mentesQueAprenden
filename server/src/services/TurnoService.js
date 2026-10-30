const turnoRepository = require('../repositories/TurnoRepository');
const sesionRepository = require('../repositories/SesionRepository');
const pacienteService = require('./PacienteService');

class TurnoService {
  // Trae los turnos propios (o accesibles por derivación) con todos los
  // datos, y los de otros profesionales reducidos a "consultorio ocupado"
  // sin paciente ni notas — así se puede armar un calendario compartido
  // sin filtrar datos clínicos ajenos.
  // incluirCancelados: el historial los muestra; la agenda no (es el comportamiento por defecto).
  async listar(db, { fecha_inicio, fecha_fin, profesional_id }, profesionalActualId, { incluirSesiones = false, incluirCancelados = false } = {}) {
    const data = await turnoRepository.listar(db, { desde: fecha_inicio, hasta: fecha_fin, profesionalId: profesional_id, incluirCancelados });

    const turnos = data.map(t => {
      const esPropio = t.profesional?.id === profesionalActualId;
      if (esPropio) return t;
      // Turno ajeno: solo señal de ocupación del consultorio, sin datos clínicos.
      return {
        id: t.id,
        fecha_inicio: t.fecha_inicio,
        fecha_fin: t.fecha_fin,
        estado: t.estado,
        consultorio: t.consultorio,
        ocupado: true,
        profesional: t.profesional ? { id: t.profesional.id, nombre: t.profesional.nombre, apellido: t.profesional.apellido } : null
      };
    });

    // RLS ya no deja ver los turnos ajenos: la ocupación de los consultorios viene de
    // una función de la base que devuelve solo fecha/hora, consultorio y profesional.
    const ocupados = await this.ocupacionAjena(db, { fecha_inicio, fecha_fin, profesional_id }, new Set(turnos.map(t => t.id)));
    turnos.push(...ocupados);
    turnos.sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));

    if (!incluirSesiones || (profesional_id && profesional_id !== profesionalActualId)) return turnos;

    const sesiones = await this.sesionesSinTurno(db, profesionalActualId, fecha_inicio, fecha_fin);
    return [...turnos, ...sesiones].sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
  }

  async ocupacionAjena(db, { fecha_inicio, fecha_fin, profesional_id }, idsYaIncluidos) {
    let data;
    try {
      data = await turnoRepository.ocupacion(db, { desde: fecha_inicio, hasta: fecha_fin });
    } catch (error) {
      if (error.tipo === 'FUNCION_INEXISTENTE') return this.ocupacionAjenaSinFuncion(db, { fecha_inicio, fecha_fin, profesional_id }, idsYaIncluidos);
      throw error;
    }

    return (data || [])
      .filter(t => !idsYaIncluidos.has(t.id) && (!profesional_id || t.profesional_id === profesional_id))
      .map(t => ({
        id: t.id,
        fecha_inicio: t.fecha_inicio,
        fecha_fin: t.fecha_fin,
        estado: t.estado,
        consultorio: t.consultorio,
        ocupado: true,
        profesional: { id: t.profesional_id, nombre: t.profesional_nombre, apellido: t.profesional_apellido }
      }));
  }

  // Backend desplegado antes que la migración 008: se usa el camino anterior para no
  // romper el calendario.
  async ocupacionAjenaSinFuncion(db, { fecha_inicio, fecha_fin, profesional_id }, idsYaIncluidos) {
    const data = await turnoRepository.ocupacionSinFuncion(db, { desde: fecha_inicio, hasta: fecha_fin, profesionalId: profesional_id });
    return (data || [])
      .filter(t => !idsYaIncluidos.has(t.id))
      .map(t => ({ ...t, ocupado: true }));
  }

  // Una sesión cargada desde "Nueva sesión" (sin pasar por un turno) no tiene
  // turno en la agenda, pero igual es un encuentro con el paciente ese día:
  // se la devuelve con la misma forma que un turno para que la agenda la
  // muestre. No ocupa consultorio (consultorio null).
  async sesionesSinTurno(db, profesionalId, desde, hasta) {
    const data = await sesionRepository.listarDelProfesionalConTurnos(db, profesionalId, { desde, hasta });

    return data
      .filter(s => !(s.turnos || []).some(t => t.estado !== 'cancelado'))
      .map(s => ({
        id: `sesion-${s.id}`,
        es_sesion: true,
        fecha_inicio: s.fecha,
        fecha_fin: new Date(new Date(s.fecha).getTime() + (s.duracion_minutos || 50) * 60000).toISOString(),
        estado: 'realizado',
        tipo: s.tipo,
        consultorio: null,
        paciente_id: s.paciente_id,
        paciente: s.paciente,
        sesion: { id: s.id }
      }));
  }

  async crear(db, profesionalId, body) {
    // El paciente (si el turno tiene uno) tiene que existir, estar activo y ser visible:
    // 404 claro, igual venga del formulario o del chat. La base también lo impide (RLS).
    if (body.paciente_id) await pacienteService.asegurarAcceso(db, body.paciente_id);

    try {
      return await turnoRepository.crear(db, { ...body, created_by: profesionalId });
    } catch (error) {
      if (error.tipo === 'CHOQUE_HORARIO') error.status = 409;
      throw error;
    }
  }

  async actualizar(db, id, body) {
    const { created_by, created_at, id: _id, ...updateData } = body;

    try {
      return await turnoRepository.actualizar(db, id, updateData);
    } catch (error) {
      const choque = error.tipo === 'CHOQUE_HORARIO';
      const err = new Error(choque ? error.message : 'Error al actualizar el turno');
      err.status = error.tipo === 'NO_ENCONTRADO' ? 404 : choque ? 409 : 500;
      throw err;
    }
  }

  async cancelar(db, id) {
    await turnoRepository.cancelar(db, id);
  }
}

module.exports = new TurnoService();
