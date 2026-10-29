const pagoRepository = require('../repositories/PagoRepository');
const sesionRepository = require('../repositories/SesionRepository');
const { porcentajeHonorarios, repartirHonorarios } = require('../utils/honorarios');

function rangoDelMes(mes) {
  const inicio = `${mes}-01T00:00:00-03:00`;
  const fin = new Date(`${mes}-01T00:00:00-03:00`);
  fin.setMonth(fin.getMonth() + 1);
  return { inicio, fin: fin.toISOString() };
}

class PagoService {
  async listar(db, { mes, profesional_id }) {
    const { inicio, fin } = mes ? rangoDelMes(mes) : {};
    return pagoRepository.listar(db, { desde: inicio, hasta: fin, profesionalId: profesional_id });
  }

  async listarSesionesPendientes(db) {
    return sesionRepository.listarPendientesDeCobro(db);
  }

  async crear(db, profesionalId, { sesion_id, monto_total, metodo_pago, numero_comprobante }, rol) {
    // Antes de usar el cliente admin: la sesión tiene que ser visible para quien cobra
    // (RLS) y ser suya, salvo que sea admin. Si no, 404 (no se revela si existe).
    const propia = await sesionRepository.obtenerTitular(db, sesion_id);
    if (!propia || (propia.profesional_id !== profesionalId && rol !== 'admin')) {
      const err = new Error('Sesión no encontrada');
      err.status = 404;
      throw err;
    }

    const sesion = await sesionRepository.obtenerConHonorariosComoAdmin(sesion_id);

    if (!sesion) {
      const err = new Error('Sesión no encontrada');
      err.status = 404;
      throw err;
    }
    if (sesion.pagado) {
      const err = new Error('Esta sesión ya fue pagada');
      err.status = 409;
      throw err;
    }

    const porcentaje = porcentajeHonorarios(sesion.profesional?.porcentaje_honorarios);
    const montos = repartirHonorarios(monto_total, porcentaje);

    const pago = await pagoRepository.crear(db, {
      sesion_id,
      paciente_id: sesion.paciente_id,
      profesional_id: sesion.profesional_id,
      ...montos,
      porcentaje_profesional: porcentaje,
      metodo_pago,
      numero_comprobante,
      registrado_por: profesionalId
    });

    await sesionRepository.marcarPagadaComoAdmin(sesion_id, { fechaPago: new Date().toISOString(), metodoPago: metodo_pago });

    return pago;
  }

  async liquidacion(mes) {
    const { inicio, fin } = rangoDelMes(mes);

    const data = await pagoRepository.listarMontosComoAdmin({ desde: inicio, hasta: fin });

    const resumen = data.reduce((acc, p) => {
      const key = p.profesional_id;
      if (!acc[key]) {
        acc[key] = {
          profesional: p.profesional,
          total_facturado: 0,
          total_profesional: 0,
          total_espacio: 0,
          cantidad_sesiones: 0
        };
      }
      acc[key].total_facturado += Number(p.monto_total);
      acc[key].total_profesional += Number(p.monto_profesional);
      acc[key].total_espacio += Number(p.monto_espacio);
      acc[key].cantidad_sesiones++;
      return acc;
    }, {});

    return {
      mes,
      profesionales: Object.values(resumen),
      total_espacio: Object.values(resumen).reduce((s, p) => s + p.total_espacio, 0),
      total_facturado: Object.values(resumen).reduce((s, p) => s + p.total_facturado, 0)
    };
  }
}

module.exports = new PagoService();
