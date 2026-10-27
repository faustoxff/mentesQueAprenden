const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { erroresDeValidacion } = require('../utils/validacion');
const { requireAuth, getAuthenticatedClient } = require('../middleware/auth');
const sesionService = require('../services/SesionService');

const router = express.Router();

function manejarError(res, err, fallback = { status: 500, message: 'Error interno' }) {
  const status = err.status || fallback.status;
  res.status(status).json({ error: err.status ? err.message : fallback.message });
}

// GET /sesiones/:id
router.get('/:id',
  requireAuth,
  async (req, res) => {
    try {
      const data = await sesionService.obtener(getAuthenticatedClient(req), req.params.id, req.profesional.id, req);
      res.json(data);
    } catch (err) {
      manejarError(res, err);
    }
  }
);

// POST /sesiones
router.post('/',
  requireAuth,
  [
    body('paciente_id').isUUID().withMessage('Elegí un paciente'),
    body('fecha').isISO8601().withMessage('La fecha y hora de la sesión no son válidas'),
    body('tipo').isIn(['evaluacion', 'tratamiento', 'seguimiento', 'devolucion', 'reunion_interdisciplinaria']).withMessage('El tipo de sesión no es válido'),
    body('duracion_minutos').optional().isInt({ min: 1, max: 480 }).withMessage('La duración debe estar entre 1 y 480 minutos'),
    body('notas_libres').optional().isString().withMessage('Las notas deben ser texto'),
    body('notas_estructuradas').optional().isObject().withMessage('Las notas estructuradas no tienen el formato correcto'),
    body('monto').optional().isFloat({ min: 0 }).withMessage('El monto debe ser un número mayor o igual a 0'),
    body('turno_id').optional().isUUID().withMessage('El turno no es válido'),
    body('consultorio').optional({ nullable: true }).isInt({ min: 1, max: 3 }).withMessage('El consultorio debe ser 1, 2 o 3').toInt()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: erroresDeValidacion(errors) });

    try {
      const data = await sesionService.crear(getAuthenticatedClient(req), req.profesional.id, req.body);
      res.status(201).json(data);
    } catch (err) {
      manejarError(res, err);
    }
  }
);

// PATCH /sesiones/:id
router.patch('/:id',
  requireAuth,
  [
    param('id').isUUID().withMessage('El identificador de la sesión no es válido'),
    body('fecha').optional().isISO8601().withMessage('La fecha y hora de la sesión no son válidas'),
    body('tipo').optional().isIn(['evaluacion', 'tratamiento', 'seguimiento', 'devolucion', 'reunion_interdisciplinaria']).withMessage('El tipo de sesión no es válido'),
    body('duracion_minutos').optional().isInt({ min: 1, max: 480 }).withMessage('La duración debe estar entre 1 y 480 minutos'),
    body('consultorio').optional({ nullable: true }).isInt({ min: 1, max: 3 }).withMessage('El consultorio debe ser 1, 2 o 3').toInt(),
    body('notas_libres').optional().isString().withMessage('Las notas deben ser texto'),
    body('notas_estructuradas').optional().isObject().withMessage('Las notas estructuradas no tienen el formato correcto'),
    body('resumen_ia').optional().isString().withMessage('El resumen debe ser texto'),
    body('monto').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('El monto debe ser un número mayor o igual a 0'),
    body('pagado').optional().isBoolean().withMessage('El estado de pago no es válido'),
    body('fecha_pago').optional().isISO8601().withMessage('La fecha de pago no es válida')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: erroresDeValidacion(errors) });

    try {
      const data = await sesionService.actualizar(getAuthenticatedClient(req), req.params.id, req.body);
      res.json(data);
    } catch (err) {
      manejarError(res, err);
    }
  }
);

// GET /sesiones/:id/versiones
router.get('/:id/versiones',
  requireAuth,
  async (req, res) => {
    try {
      const data = await sesionService.listarVersiones(getAuthenticatedClient(req), req.params.id);
      res.json(data);
    } catch (err) {
      manejarError(res, err);
    }
  }
);

module.exports = router;
