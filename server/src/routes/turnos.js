const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { erroresDeValidacion } = require('../utils/validacion');
const { requireAuth, getAuthenticatedClient } = require('../middleware/auth');
const turnoService = require('../services/TurnoService');
const { reglasCrearTurno } = require('../validaciones/turnos');

const router = express.Router();

function manejarError(res, err, fallback = { status: 500, message: 'Error interno' }) {
  const status = err.status || fallback.status;
  res.status(status).json({ error: err.status ? err.message : fallback.message });
}

// GET /turnos?fecha_inicio=&fecha_fin=&profesional_id=&incluir_cancelados=
router.get('/', requireAuth, [
  query('incluir_cancelados').optional().isIn(['true', 'false']).withMessage('incluir_cancelados debe ser true o false')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: erroresDeValidacion(errors) });

  try {
    const incluirCancelados = req.query.incluir_cancelados === 'true';
    const data = await turnoService.listar(getAuthenticatedClient(req), req.query, req.profesional.id, { incluirSesiones: true, incluirCancelados });
    res.json(data);
  } catch (err) {
    manejarError(res, err);
  }
});

// POST /turnos
router.post('/',
  requireAuth,
  reglasCrearTurno,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: erroresDeValidacion(errors) });

    try {
      const data = await turnoService.crear(getAuthenticatedClient(req), req.profesional.id, req.body);
      res.status(201).json(data);
    } catch (err) {
      manejarError(res, err);
    }
  }
);

// PATCH /turnos/:id
router.patch('/:id',
  requireAuth,
  [
    param('id').isUUID(),
    body('fecha_inicio').optional().isISO8601(),
    body('fecha_fin').optional().isISO8601(),
    body('estado').optional().isIn(['programado', 'confirmado', 'cancelado', 'ausente', 'realizado']),
    body('tipo').optional().isIn(['evaluacion', 'tratamiento', 'seguimiento', 'devolucion', 'reunion_interdisciplinaria']),
    body('paciente_id').optional().isUUID(),
    body('profesional_id').optional().isUUID(),
    body('consultorio').optional().isInt({ min: 1, max: 3 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: erroresDeValidacion(errors) });

    try {
      const data = await turnoService.actualizar(getAuthenticatedClient(req), req.params.id, req.body);
      res.json(data);
    } catch (err) {
      manejarError(res, err);
    }
  }
);

// DELETE /turnos/:id - cancelar
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await turnoService.cancelar(getAuthenticatedClient(req), req.params.id);
    res.json({ message: 'Turno cancelado' });
  } catch (err) {
    manejarError(res, err);
  }
});

module.exports = router;
