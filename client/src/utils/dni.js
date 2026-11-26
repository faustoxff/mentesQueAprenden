// Regla única del DNI en el client: la usan los formularios de alta y edición de
// paciente y el del chat, para avisar al instante. El server vuelve a validar con la
// misma regla (server/src/utils/dni.js); un test compara las dos.
// El DNI es opcional: si viene, tiene que cumplir la regla.
export const DNI_REGEX = /^\d{7,8}$/;
export const DNI_MENSAJE = 'El DNI debe tener 7 u 8 dígitos, sin puntos ni espacios';

// Para formularios con react-hook-form: register('dni', { pattern: PATRON_DNI }).
// react-hook-form no aplica el patrón si el campo está vacío.
export const PATRON_DNI = { value: DNI_REGEX, message: DNI_MENSAJE };

// Para formularios sin react-hook-form: devuelve el mensaje de error, o null si es válido.
// Vacío es válido (el DNI es opcional).
export const validarDni = (valor) => {
  const dni = String(valor ?? '').trim();
  return !dni || DNI_REGEX.test(dni) ? null : DNI_MENSAJE;
};

// Cómo se muestra el DNI de un paciente, tenga o no.
export const textoDni = (dni) => (dni ? `DNI ${dni}` : 'Sin DNI');
