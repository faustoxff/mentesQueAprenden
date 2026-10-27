const PORCENTAJE_POR_DEFECTO = 70;

// Porcentaje de honorarios del profesional: 70 solo si no viene el dato. Un 0 es un
// porcentaje válido (antes `|| 70` lo pisaba). Acepta números o texto ("0", "62.5").
function porcentajeHonorarios(valor) {
  if (valor === null || valor === undefined || valor === '') return PORCENTAJE_POR_DEFECTO;
  const porcentaje = Number(valor);
  if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) {
    const err = new Error('El porcentaje de honorarios debe estar entre 0 y 100');
    err.status = 422;
    throw err;
  }
  return porcentaje;
}

module.exports = { porcentajeHonorarios, PORCENTAJE_POR_DEFECTO };
