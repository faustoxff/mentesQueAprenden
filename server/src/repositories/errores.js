// Traduce los errores de Supabase/Postgres a tipos que entienden los services, para que
// ninguna capa por encima de los repositorios conozca códigos de PostgREST o de Postgres.
const TIPOS = {
  PGRST116: 'NO_ENCONTRADO', // .single() sin filas (no existe o RLS no la deja ver)
  23505: 'DUPLICADO', // violación de UNIQUE
  '23P01': 'CHOQUE_HORARIO', // violación de la EXCLUDE de consultorios
  PGRST202: 'FUNCION_INEXISTENTE', // la función RPC no existe (migración sin aplicar)
  42883: 'FUNCION_INEXISTENTE'
};

class ErrorDeDatos extends Error {
  constructor(error) {
    super(error.message);
    this.tipo = TIPOS[error.code] || 'OTRO';
  }
}

// Devuelve los datos de una respuesta de Supabase o lanza un ErrorDeDatos.
function datosDe({ data, error }) {
  if (error) throw new ErrorDeDatos(error);
  return data;
}

module.exports = { ErrorDeDatos, datosDe };
