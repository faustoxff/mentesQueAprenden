const crypto = require('crypto');

// Tokens firmados por el servidor para acciones destructivas pedidas desde el chat.
// El modelo de IA NO puede ejecutarlas: solo puede generar una solicitud de
// confirmación, y la acción se hace cuando la persona aprieta el botón (POST /ia/confirmar)
// con este token. Así una instrucción inyectada en el prompt no alcanza para borrar nada.

const TTL_MS = 5 * 60 * 1000;

const secreto = () => {
  const s = process.env.CONFIRM_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('Falta CONFIRM_SECRET o SUPABASE_SERVICE_ROLE_KEY para firmar confirmaciones');
  return s;
};

const firmarTexto = (texto) => crypto.createHmac('sha256', secreto()).update(texto).digest('base64url');

function crearToken({ accion, profesionalId, recursoId }, ahora = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ accion, profesionalId, recursoId, exp: ahora + TTL_MS })).toString('base64url');
  return `${payload}.${firmarTexto(payload)}`;
}

// Devuelve { accion, profesionalId, recursoId } o lanza un error 400/403.
function verificarToken(token, { accion, profesionalId }, ahora = Date.now()) {
  const invalido = (msg, status = 400) => Object.assign(new Error(msg), { status });
  if (typeof token !== 'string' || !token.includes('.')) throw invalido('Confirmación inválida');

  const [payload, firma] = token.split('.');
  const esperada = firmarTexto(payload);
  const a = Buffer.from(firma || '');
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw invalido('Confirmación inválida');

  let datos;
  try { datos = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { throw invalido('Confirmación inválida'); }

  if (datos.exp < ahora) throw invalido('La confirmación venció, volvé a pedirla');
  if (datos.accion !== accion) throw invalido('Confirmación inválida');
  if (datos.profesionalId !== profesionalId) throw invalido('Esta confirmación no es tuya', 403);
  return datos;
}

module.exports = { crearToken, verificarToken };
