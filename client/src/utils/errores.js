import { toast } from 'sonner';

const MENSAJE_GENERICO = 'No se pudo completar la operación. Probá de nuevo.';
const MENSAJE_SIN_CONEXION = 'No pudimos conectarnos con el servidor. Revisá tu conexión y probá de nuevo.';

// Errores de validación del backend (422): { errors: [{ path, msg }] }
const erroresDeCampo = (err) => {
  const lista = err?.response?.data?.errors;
  return Array.isArray(lista) ? lista.filter((e) => e?.msg) : [];
};

const unicos = (mensajes) => [...new Set(mensajes)];

// Devuelve el mensaje más específico que haya: los de validación por campo,
// el "error" del backend, o el genérico si no hay nada mejor.
export function getErrorMessage(err, fallback = MENSAJE_GENERICO) {
  const campos = erroresDeCampo(err);
  if (campos.length) return unicos(campos.map((e) => e.msg)).join('. ');
  // `error` puede ser un string o un objeto { code, message }: siempre devolvemos un string.
  const raw = err?.response?.data?.error;
  if (typeof raw === 'string' && raw) return raw;
  if (typeof raw?.message === 'string' && raw.message) return raw.message;
  if (err && !err.response) return MENSAJE_SIN_CONEXION;
  return fallback;
}

// Muestra el error en un toast y, si se pasa setError de react-hook-form,
// marca cada campo rechazado por el backend con su mensaje.
export function aplicarErroresAlForm(err, { setError, fallback } = {}) {
  const campos = erroresDeCampo(err);
  if (campos.length && setError) {
    const marcados = new Set();
    campos.forEach((e) => {
      const campo = e.path ?? e.param;
      if (!campo || marcados.has(campo)) return;
      setError(campo, { type: 'server', message: e.msg }, { shouldFocus: marcados.size === 0 });
      marcados.add(campo);
    });
  }
  const mensaje = getErrorMessage(err, fallback);
  toast.error(campos.length > 1 ? `Revisá los datos: ${mensaje}` : mensaje);
  return mensaje;
}
