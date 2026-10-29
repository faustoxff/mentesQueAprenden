// Reglas para registrar una sesión. Las usan POST /sesiones y el registro desde el chat.
const { body } = require('express-validator');

const TIPOS_SESION = ['evaluacion', 'tratamiento', 'seguimiento', 'devolucion', 'reunion_interdisciplinaria'];

const reglasCrearSesion = [
  body('paciente_id').isUUID().withMessage('Elegí un paciente'),
  body('fecha').isISO8601().withMessage('La fecha y hora de la sesión no son válidas'),
  body('tipo').isIn(TIPOS_SESION).withMessage('El tipo de sesión no es válido'),
  body('duracion_minutos').optional().isInt({ min: 1, max: 480 }).withMessage('La duración debe estar entre 1 y 480 minutos'),
  body('notas_libres').optional().isString().withMessage('Las notas deben ser texto'),
  body('notas_estructuradas').optional().isObject().withMessage('Las notas estructuradas no tienen el formato correcto'),
  body('monto').optional().isFloat({ min: 0 }).withMessage('El monto debe ser un número mayor o igual a 0'),
  body('turno_id').optional().isUUID().withMessage('El turno no es válido'),
  body('consultorio').optional({ nullable: true }).isInt({ min: 1, max: 3 }).withMessage('El consultorio debe ser 1, 2 o 3').toInt()
];

module.exports = { reglasCrearSesion, TIPOS_SESION };
