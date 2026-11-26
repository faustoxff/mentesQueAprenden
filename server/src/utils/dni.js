// Regla única del DNI en el server: la usan las rutas de pacientes y el chat.
// El client tiene la misma regla en client/src/utils/dni.js para avisar al instante;
// un test (client/src/utils/dni.test.js) verifica que las dos digan lo mismo.
// El DNI es opcional (migración 009): si viene, tiene que cumplir la regla.
const DNI_REGEX = /^\d{7,8}$/;
const DNI_MENSAJE = 'El DNI debe tener 7 u 8 dígitos, sin puntos ni espacios';

const esDniValido = (valor) => typeof valor === 'string' && DNI_REGEX.test(valor);

// "Sin DNI" se guarda como null: '' chocaría con el UNIQUE de la columna.
const normalizarDni = (valor) => (valor == null ? '' : String(valor).trim()) || null;

// Vacío vale (es opcional); si hay algo, tiene que cumplir la regla.
const esDniOpcionalValido = (valor) => {
  const dni = normalizarDni(valor);
  return dni === null || esDniValido(dni);
};

module.exports = { DNI_REGEX, DNI_MENSAJE, esDniValido, normalizarDni, esDniOpcionalValido };
