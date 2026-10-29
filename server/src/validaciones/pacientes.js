// Reglas para crear un paciente. Las usan POST /pacientes y el alta desde el chat,
// así las dos entradas rechazan exactamente lo mismo y con los mismos mensajes.
const { body } = require('express-validator');
const { DNI_REGEX, DNI_MENSAJE } = require('../utils/dni');

// Los teléfonos son opcionales, pero si vienen deben ser razonables y entrar
// en la columna (VARCHAR(20)): 8 a 20 caracteres entre dígitos, espacios, + ( ) -.
const MSG_TELEFONO = 'El teléfono debe tener entre 8 y 20 caracteres: solo números, espacios, +, ( ) o -';
const telefonoValido = (v) => v === '' || /^[\d\s()+-]{8,20}$/.test(v);

const reglasCrearPaciente = [
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
];

module.exports = { reglasCrearPaciente, telefonoValido, MSG_TELEFONO };
