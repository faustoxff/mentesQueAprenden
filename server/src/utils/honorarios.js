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

// Reparte el monto entre profesional y espacio en centavos enteros: el honorario se
// redondea y el espacio es la diferencia, así las dos partes suman siempre el total.
// (Antes se redondeaba cada parte por separado en la base: $10,05 al 70 % daba 7,04 + 3,02.)
function repartirHonorarios(montoTotal, porcentaje) {
  const centavos = Math.round(Number(montoTotal) * 100);
  const centavosProfesional = Math.round((centavos * porcentaje) / 100);
  return {
    monto_total: centavos / 100,
    monto_profesional: centavosProfesional / 100,
    monto_espacio: (centavos - centavosProfesional) / 100
  };
}

module.exports = { porcentajeHonorarios, repartirHonorarios, PORCENTAJE_POR_DEFECTO };
