// Regla única de la fecha de nacimiento en el client: la usan los formularios de alta y
// edición de paciente y el del chat, para avisar al instante. El server vuelve a validar con
// la misma regla (server/src/utils/fechaNacimiento.js); un test compara las dos.
export const EDAD_MAXIMA = 150;
export const FECHA_NACIMIENTO_MENSAJE = `La fecha de nacimiento no puede ser futura ni de hace más de ${EDAD_MAXIMA} años`;

// Hoy en Argentina como 'YYYY-MM-DD' (igual que el server, sin depender de la zona de la compu).
const hoyArgentina = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

// Rango permitido, también para los atributos min/max del <input type="date">.
export function rangoFechaNacimiento(hoy = hoyArgentina()) {
  const minimo = `${String(Number(hoy.slice(0, 4)) - EDAD_MAXIMA).padStart(4, '0')}${hoy.slice(4)}`;
  return { minimo, maximo: hoy };
}

// Devuelve el mensaje de error, o null si la fecha está en el rango. Vacía no se valida acá
// (de eso se ocupa "obligatoria").
export function validarFechaNacimiento(valor, hoy = hoyArgentina()) {
  if (!valor) return null;
  const { minimo, maximo } = rangoFechaNacimiento(hoy);
  const fecha = String(valor).slice(0, 10);
  return fecha >= minimo && fecha <= maximo ? null : FECHA_NACIMIENTO_MENSAJE;
}
