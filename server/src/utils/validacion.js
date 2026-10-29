const { validationResult } = require('express-validator');

// Errores de express-validator para responder al cliente: solo el campo y el mensaje.
// errors.array() también trae `value` (lo que se envió, contraseña incluida), `type`
// y `location`, que no tienen que volver en la respuesta.
const erroresDeValidacion = (resultado) => resultado.array().map(({ path, msg }) => ({ path, msg }));

// Corre las mismas reglas de una ruta sobre datos que no vienen de un pedido HTTP
// (por ejemplo, una acción del chat). Devuelve los datos ya saneados (trim, fechas
// dd/mm/aaaa convertidas, etc.) o lanza un error 422 con los mensajes de cada campo.
async function exigirDatosValidos(reglas, datos) {
  const pedido = { body: { ...datos } };
  for (const regla of reglas) await regla.run(pedido);
  const resultado = validationResult(pedido);
  if (!resultado.isEmpty()) {
    const errores = erroresDeValidacion(resultado);
    throw Object.assign(new Error([...new Set(errores.map((e) => e.msg))].join('. ')), { status: 422, errores });
  }
  return pedido.body;
}

module.exports = { erroresDeValidacion, exigirDatosValidos };
