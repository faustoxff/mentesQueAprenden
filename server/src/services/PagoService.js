const pagoRepository = require('../repositories/PagoRepository');
const sesionRepository = require('../repositories/SesionRepository');

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

    const sesion = await sesionRepository.obtenerParaCobroComoAdmin(sesion_id);

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

    const pago = await pagoRepository.crear(db, {
      sesion_id,
      paciente_id: sesion.paciente_id,
      profesional_id: sesion.profesional_id,
      monto_total,
      metodo_pago,
      numero_comprobante,
      registrado_por: profesionalId
    });

    await sesionRepository.marcarPagadaComoAdmin(sesion_id, { fechaPago: new Date().toISOString(), metodoPago: metodo_pago });

    return pago;
  }
}

module.exports = new PagoService();
