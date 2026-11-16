// Los filtros de PostgREST (.or("a.ilike.%x%,b.ilike.%x%")) se arman como texto:
// una coma, un paréntesis o un comodín en la búsqueda del usuario cambia el filtro
// (filter injection). Acá se dejan solo caracteres inofensivos.
function sanitizarBusqueda(texto, max = 100) {
  return String(texto ?? '')
    .replace(/[,()%*\\"'`;:<>{}[\]|&=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

// ─── Búsqueda aproximada ───
// Para cuando la búsqueda exacta no encuentra nada: tolera un error de tipeo por palabra
// ("faisto" → "fausto"), mayúsculas, acentos y el orden de las palabras.

const normalizar = (texto) => String(texto ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Cuántas letras hay que cambiar, agregar, sacar o intercambiar con la de al lado para pasar de a a b.
function distancia(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + costo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// Errores tolerados según el largo de la palabra: las cortas ("ana", "eva") cambian de
// persona con una sola letra, así que no se aproximan.
const erroresTolerados = (palabra) => (palabra.length <= 3 ? 0 : palabra.length <= 7 ? 1 : 2);

// Qué tan lejos está una palabra buscada del paciente (0 = está tal cual), o null si no coincide.
function distanciaAlPaciente(palabra, paciente) {
  if (normalizar(paciente.dni).includes(palabra)) return 0;
  if (/^\d+$/.test(palabra)) return null; // un número es un DNI: no se aproxima
  const partes = normalizar(`${paciente.nombre ?? ''} ${paciente.apellido ?? ''}`).split(/\s+/).filter(Boolean);
  if (partes.some((parte) => parte.includes(palabra))) return 0;
  const mejor = Math.min(...partes.map((parte) => distancia(palabra, parte)));
  return mejor <= erroresTolerados(palabra) ? mejor : null;
}

// Pacientes en los que TODAS las palabras buscadas coinciden (con tolerancia), del más
// parecido al menos parecido.
function buscarParecidos(pacientes, termino) {
  const palabras = normalizar(termino).split(/\s+/).filter(Boolean);
  if (!palabras.length) return [];
  return pacientes
    .map((paciente) => {
      const distancias = palabras.map((palabra) => distanciaAlPaciente(palabra, paciente));
      return distancias.includes(null) ? null : { paciente, total: distancias.reduce((a, b) => a + b, 0) };
    })
    .filter(Boolean)
    .sort((a, b) => a.total - b.total)
    .map(({ paciente }) => paciente);
}

module.exports = { sanitizarBusqueda, buscarParecidos };
