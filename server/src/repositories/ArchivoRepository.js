const { datosDe, datosOpcionales } = require('./errores');

// Metadata de los archivos adjuntos (tabla `archivos_adjuntos`). Reciben `db`, el cliente
// con el token del profesional, así que RLS decide qué filas se ven.
class ArchivoRepository {
  async crear(db, archivo) {
    return datosDe(await db.from('archivos_adjuntos').insert(archivo).select().single());
  }

  // El archivo con las columnas pedidas, o null si no está (o RLS no lo deja ver).
  async obtener(db, id, campos) {
    return datosOpcionales(await db.from('archivos_adjuntos').select(campos).eq('id', id).single());
  }

  // Devuelve las filas borradas: sin policy de DELETE, RLS borra 0 filas sin error.
  async eliminar(db, id) {
    return datosDe(await db.from('archivos_adjuntos').delete().eq('id', id).select('id'));
  }
}

module.exports = new ArchivoRepository();
