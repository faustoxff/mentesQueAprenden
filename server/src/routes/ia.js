const express = require('express');
const { body, validationResult } = require('express-validator');
const { erroresDeValidacion } = require('../utils/validacion');
const { requireAuth, getAuthenticatedClient } = require('../middleware/auth');
const iaService = require('../services/IAService');
const chatService = require('../services/ChatService');

const router = express.Router();

// Errores con status < 500 (404 por falta de acceso, 422, etc.) se devuelven tal cual;
// el resto se enmascara con el mensaje genérico de la ruta.
const responderError = (res, err, mensajeGenerico, statusPorDefecto = 502) => {
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error('IA error:', err.message, err.upstreamDetail || '');
  return res.status(statusPorDefecto).json({ error: err.status ? err.message : mensajeGenerico });
};

// POST /ia/sugerir-notas — completa notas parciales del profesional con contexto del paciente
router.post('/sugerir-notas',
  requireAuth,
  [
    body('notas_parciales').isString().notEmpty(),
    body('paciente_id').isUUID(),
    body('tipo_sesion').isString(),
    body('especialidad').isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: erroresDeValidacion(errors) });

    try {
      const sugerencia = await iaService.sugerirNotas(req.body, getAuthenticatedClient(req));
      res.json({ sugerencia });
    } catch (err) {
      responderError(res, err, 'Error al conectar con la IA de texto');
    }
  }
);

// POST /ia/resumir-sesion — genera resumen de 3 oraciones para el historial
router.post('/resumir-sesion',
  requireAuth,
  [
    body('sesion_id').isUUID(),
    body('notas_libres').isString().notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: erroresDeValidacion(errors) });

    try {
      const resumen = await iaService.resumirSesion(req.body, getAuthenticatedClient(req), req.profesional);
      res.json({ resumen });
    } catch (err) {
      console.error('OpenRouter error:', err.message);
      res.status(502).json({ error: 'Error al generar el resumen' });
    }
  }
);

// POST /ia/sugerir-derivacion — analiza el caso y sugiere si conviene derivar y a quién
router.post('/sugerir-derivacion',
  requireAuth,
  [body('paciente_id').isUUID()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: erroresDeValidacion(errors) });

    try {
      const sugerencia = await iaService.sugerirDerivacion(req.body, getAuthenticatedClient(req));
      res.json({ sugerencia });
    } catch (err) {
      responderError(res, err, 'Error al analizar el caso');
    }
  }
);

// POST /ia/analizar-pdf — lee un archivo PDF del paciente y extrae información clínica relevante
router.post('/analizar-pdf',
  requireAuth,
  [
    body('archivo_id').isUUID(),
    body('pregunta').optional().isString().isLength({ max: 500 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: erroresDeValidacion(errors) });

    try {
      const resultado = await iaService.analizarPDF(req.body, getAuthenticatedClient(req));
      res.json(resultado);
    } catch (err) {
      responderError(res, err, 'Error al analizar el archivo con IA');
    }
  }
);

// POST /ia/chat — chatbot con function calling manual
router.post('/chat',
  requireAuth,
  [body('messages').isArray({ min: 1, max: 100 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: erroresDeValidacion(errors) });

    try {
      const resultado = await chatService.chat({ messages: req.body.messages, profesional: req.profesional, db: getAuthenticatedClient(req) });
      res.json(resultado);
    } catch (err) {
      responderError(res, err, 'Error al conectar con la IA');
    }
  }
);

// POST /ia/confirmar — ejecuta una acción destructiva que el chat solicitó, con el
// token firmado que devolvió el servidor. La IA no puede llamar a esto: lo hace la
// persona con el botón de confirmación.
router.post('/confirmar',
  requireAuth,
  [body('token').isString().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: erroresDeValidacion(errors) });

    try {
      const resultado = await chatService.confirmarEliminacion(req.body.token, req.profesional, getAuthenticatedClient(req));
      res.json(resultado);
    } catch (err) {
      responderError(res, err, 'No se pudo completar la acción', 500);
    }
  }
);

module.exports = router;
