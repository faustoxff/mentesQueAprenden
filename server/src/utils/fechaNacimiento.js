// Regla única de la fecha de nacimiento en el server: la usan las rutas de pacientes y el
// chat. El client tiene la misma regla en client/src/utils/fechaNacimiento.js para avisar
// al instante; un test compara las dos para que no se separen.
const { hoyArgentina } = require('./fechas');

const EDAD_MAXIMA = 150;
const FECHA_NACIMIENTO_MENSAJE = `La fecha de nacimiento no puede ser futura ni de hace más de ${EDAD_MAXIMA} años`;

// Rango permitido como 'YYYY-MM-DD' (hoy en Argentina y la misma fecha EDAD_MAXIMA años antes).
function rangoFechaNacimiento(hoy = hoyArgentina()) {
  const minimo = `${String(Number(hoy.slice(0, 4)) - EDAD_MAXIMA).padStart(4, '0')}${hoy.slice(4)}`;
  return { minimo, maximo: hoy };
}

// Las fechas 'YYYY-MM-DD' se comparan como texto; de un valor con hora se usa solo la fecha.
function esFechaNacimientoValida(valor, hoy = hoyArgentina()) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(valor)) return false;
  const fecha = valor.slice(0, 10);
  const { minimo, maximo } = rangoFechaNacimiento(hoy);
  return fecha >= minimo && fecha <= maximo;
}

module.exports = { EDAD_MAXIMA, FECHA_NACIMIENTO_MENSAJE, rangoFechaNacimiento, esFechaNacimientoValida };
