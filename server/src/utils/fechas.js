const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

// Edad en años cumplidos, o '?' si no hay fecha de nacimiento.
function calcularEdad(fechaNac) {
  if (!fechaNac) return '?';
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  if (hoy.getMonth() < nac.getMonth() ||
     (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

// Fecha de hoy en Argentina como YYYY-MM-DD. toISOString() daría la fecha UTC,
// que a partir de las 21 hs ya es "mañana".
function hoyArgentina() {
  return new Date().toLocaleDateString('en-CA', { timeZone: ZONA_HORARIA });
}

// Los turnos se guardan en UTC; al modelo se los damos ya en hora local y
// legibles, para que no tenga que convertir zonas horarias (se equivoca).
function formatearFechaHora(iso) {
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: ZONA_HORARIA, weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
}

module.exports = { calcularEdad, hoyArgentina, formatearFechaHora };
