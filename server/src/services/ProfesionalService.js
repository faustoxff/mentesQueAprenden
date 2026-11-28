const profesionalRepository = require('../repositories/ProfesionalRepository');

const CAMPOS_EDITABLES = ['nombre', 'apellido', 'matricula', 'especialidad', 'telefono'];

class ProfesionalService {
  async listar() {
    return profesionalRepository.listarActivosComoAdmin();
  }

  async actualizar(id, solicitante, body) {
    if (id !== solicitante.id && solicitante.rol !== 'admin') {
      const err = new Error('Sin permiso');
      err.status = 403;
      throw err;
    }

    const updateData = Object.fromEntries(
      Object.entries(body).filter(([k]) => CAMPOS_EDITABLES.includes(k))
    );

    return profesionalRepository.actualizarComoAdmin(id, updateData);
  }

  async desactivar(id) {
    await profesionalRepository.desactivarComoAdmin(id);
  }
}

module.exports = new ProfesionalService();
