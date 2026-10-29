// Reglas para crear un turno. Las usan POST /turnos y el alta desde el chat.
const { body } = require('express-validator');
const { TIPOS_SESION } = require('./sesiones');

const reglasCrearTurno = [
  body('fecha_inicio').isISO8601(),
  body('fecha_fin').isISO8601(),
  body('profesional_id').isUUID(),
  body('paciente_id').optional().isUUID(),
  body('tipo').optional().isIn(TIPOS_SESION),
  body('consultorio').optional().isInt({ min: 1, max: 3 })
];

module.exports = { reglasCrearTurno };
