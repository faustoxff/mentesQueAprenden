// Errores de express-validator para responder al cliente: solo el campo y el mensaje.
// errors.array() también trae `value` (lo que se envió, contraseña incluida), `type`
// y `location`, que no tienen que volver en la respuesta.
const erroresDeValidacion = (resultado) => resultado.array().map(({ path, msg }) => ({ path, msg }));

module.exports = { erroresDeValidacion };
