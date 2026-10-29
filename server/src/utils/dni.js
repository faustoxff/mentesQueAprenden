// Regla única del DNI en el server: la usan las rutas de pacientes y el chat.
// El client tiene la misma regla en client/src/utils/dni.js para avisar al instante;
// un test compara las dos para que no se separen.
const DNI_REGEX = /^\d{7,8}$/;
const DNI_MENSAJE = 'El DNI debe tener 7 u 8 dígitos, sin puntos ni espacios';

const esDniValido = (valor) => typeof valor === 'string' && DNI_REGEX.test(valor);

module.exports = { DNI_REGEX, DNI_MENSAJE, esDniValido };
