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

module.exports = { sanitizarBusqueda };
