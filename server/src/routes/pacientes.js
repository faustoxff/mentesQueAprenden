const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { erroresDeValidacion } = require('../utils/validacion');
const { requireAuth } = require('../middleware/auth');
const { registrarAcceso } = require('../middleware/auditLog');
const { getAuthenticatedClient } = require('../middleware/auth');
const pacienteService = require('../services/PacienteService');
const { DNI_REGEX, DNI_MENSAJE } = require('../utils/dni');

const router = express.Router();

// Los teléfonos son opcionales, pero si vienen deben ser razonables y entrar
// en la columna (VARCHAR(20)): 8 a 20 caracteres entre dígitos, espacios, + ( ) -.
const MSG_TELEFONO = 'El teléfono debe tener entre 8 y 20 caracteres: solo números, espacios, +, ( ) o -';
const telefonoValido = (v) => v === '' || /^[\d\s()+-]{8,20}$/.test(v);

// GET /pacientes
router.get('/',
  requireAuth,
  async (req, res) => {
    try {
      const resultado = await pacienteService.listar(getAuthenticatedClient(req), req.query, req.profesional.id);
      res.json(resultado);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// GET /pacientes/:id
router.get('/:id',
  requireAuth,
  registrarAcceso('ver', 'paciente'),
  async (req, res) => {
    try {
      const data = await pacienteService.obtener(getAuthenticatedClient(req), req.params.id);
      res.json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// POST /pacientes
router.post('/',
  requireAuth,
  [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
    body('apellido').trim().notEmpty().withMessage('El apellido es obligatorio'),
    body('dni').trim().notEmpty().withMessage('El DNI es obligatorio').bail()
      .matches(DNI_REGEX).withMessage(DNI_MENSAJE),
    body('fecha_nacimiento').customSanitizer(v => {
      // Convertir dd/MM/yyyy → yyyy-MM-dd si viene del browser en español
      if (v && /^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
        const [d, m, y] = v.split('/');
        return `${y}-${m}-${d}`;
      }
      return v;
    }).isISO8601().withMessage('La fecha de nacimiento es obligatoria y debe ser una fecha válida'),
    body('profesional_principal_id').optional({ checkFalsy: true }).isUUID().withMessage('El profesional asignado no es válido'),
    body('obra_social_id').optional({ checkFalsy: true }).isUUID().withMessage('La obra social no es válida'),
    body('estado').optional().isIn(['activo', 'derivado', 'alta', 'inactivo']).withMessage('El estado no es válido'),
    body('telefono').optional().trim().custom(telefonoValido).withMessage(MSG_TELEFONO),
    body('responsable_telefono').optional().trim().custom(telefonoValido).withMessage(MSG_TELEFONO),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('El email no es válido').normalizeEmail()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: erroresDeValidacion(errors) });

    try {
      const data = await pacienteService.crear(getAuthenticatedClient(req), req.body, req.profesional);
      res.status(201).json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// PATCH /pacientes/:id
router.patch('/:id',
  requireAuth,
  registrarAcceso('editar', 'paciente'),
  [
    param('id').isUUID().withMessage('El identificador del paciente no es válido'),
    body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede quedar vacío'),
    body('apellido').optional().trim().notEmpty().withMessage('El apellido no puede quedar vacío'),
    body('dni').optional().matches(DNI_REGEX).withMessage(DNI_MENSAJE),
    body('fecha_nacimiento').optional().isISO8601().withMessage('La fecha de nacimiento no es válida'),
    body('estado').optional().isIn(['activo', 'derivado', 'alta', 'inactivo']).withMessage('El estado no es válido'),
    body('profesional_principal_id').optional({ checkFalsy: true }).isUUID().withMessage('El profesional asignado no es válido'),
    body('obra_social_id').optional({ checkFalsy: true }).isUUID().withMessage('La obra social no es válida'),
    body('telefono').optional().trim().custom(telefonoValido).withMessage(MSG_TELEFONO),
    body('responsable_telefono').optional().trim().custom(telefonoValido).withMessage(MSG_TELEFONO),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('El email no es válido').normalizeEmail()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: erroresDeValidacion(errors) });

    try {
      const data = await pacienteService.actualizar(getAuthenticatedClient(req), req.params.id, req.body, req.profesional);
      res.json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// DELETE /pacientes/:id (soft delete — el historial clínico nunca se borra, Ley 25.326)
router.delete('/:id',
  requireAuth,
  registrarAcceso('editar', 'paciente'),
  [param('id').isUUID()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: erroresDeValidacion(errors) });

    try {
      const resultado = await pacienteService.eliminar(getAuthenticatedClient(req), req.params.id);
      res.json(resultado);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// GET /pacientes/:id/sesiones
router.get('/:pacienteId/sesiones',
  requireAuth,
  registrarAcceso('ver', 'sesiones_paciente'),
  async (req, res) => {
    try {
      const resultado = await pacienteService.listarSesiones(getAuthenticatedClient(req), req.params.pacienteId, req.query);
      res.json(resultado);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// GET /pacientes/:id/turnos
router.get('/:pacienteId/turnos',
  requireAuth,
  async (req, res) => {
    try {
      const data = await pacienteService.listarTurnos(getAuthenticatedClient(req), req.params.pacienteId);
      res.json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// GET /pacientes/:id/derivaciones
router.get('/:pacienteId/derivaciones',
  requireAuth,
  async (req, res) => {
    try {
      const data = await pacienteService.listarDerivaciones(getAuthenticatedClient(req), req.params.pacienteId);
      res.json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

// GET /pacientes/:id/archivos
router.get('/:pacienteId/archivos',
  requireAuth,
  registrarAcceso('ver', 'archivos_paciente'),
  async (req, res) => {
    try {
      const data = await pacienteService.listarArchivos(getAuthenticatedClient(req), req.params.pacienteId);
      res.json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

module.exports = router;
