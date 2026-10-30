const OpenAI = require('openai');

// Única conexión a OpenRouter, compartida por el chat, las funciones clínicas, los
// informes y la extracción de texto de documentos. Si cambia el proveedor, la clave o
// los encabezados, se toca solo acá.
const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
    'X-Title': 'Centro de Salud Interdisciplinario'
  }
});

// El chat y las sugerencias esperan como mucho 25 s por intento, con 1 reintento del SDK
// ante errores de red: así un pedido nunca pasa los 60 s que esperan el navegador y
// Vercel (con 2 reintentos podían ser 75 s y el usuario veía "sin conexión"). Los informes
// y la extracción de documentos usan el tiempo por defecto del SDK (textos largos).
const OPCIONES_RESPUESTA_RAPIDA = { timeout: 25000, maxRetries: 1 };

// El modelo es "de razonamiento": piensa antes de responder y ese razonamiento cuenta
// dentro de max_tokens. Por eso los límites de quien llama son holgados: el largo de la
// respuesta lo marcan las instrucciones del prompt, no max_tokens.

// Los modelos ":free" de OpenRouter corren en un pool de workers compartido
// entre todos los usuarios de OpenRouter, así que se saturan de forma
// transitoria y ajena a nuestro tráfico. Este patrón detecta esos casos para
// reintentar en vez de mostrarle el error al profesional en el primer intento.
const PATRON_SATURACION = /resourceexhausted|rate.?limit|too many requests|limit reached/i;

const MENSAJE_SATURADO = 'El modelo de IA está saturado en este momento. Probá de nuevo en unos segundos.';
const MENSAJE_NO_DISPONIBLE = 'Modelo de IA no disponible ahora mismo. Probá de nuevo en unos minutos.';
const MENSAJE_INCOMPLETO = 'La IA no llegó a completar la respuesta. Probá de nuevo.';

// Error 502 para el usuario; el detalle técnico queda solo para los logs del servidor.
const errorDeIA = (mensaje, detalle) => Object.assign(new Error(mensaje), { status: 502, upstreamDetail: detalle });

// Si el razonamiento se come todo max_tokens, el modelo corta (finish_reason "length") y
// devuelve content null o un texto a medias: no se usa ni se guarda una respuesta así.
function respuestaIncompleta(eleccion) {
  const contenido = eleccion.message?.content;
  return typeof contenido !== 'string' || !contenido.trim() || eleccion.finish_reason === 'length';
}

const clienteIA = {
  openrouter,

  async completar(modelo, mensajes, maxTokens = 500) {
    const res = await clienteIA.crearCompletion({ model: modelo, max_tokens: maxTokens, messages: mensajes });
    return clienteIA.extraerContenido(res).trim();
  },

  // OpenRouter a veces responde HTTP 200 con un error embebido en vez de tirar
  // una excepción (ej: el worker del modelo gratuito está saturado). El SDK de
  // OpenAI no lo detecta como error porque el status HTTP es 2xx, así que su
  // maxRetries no se activa acá: por eso reintentamos nosotros a mano cuando
  // el error embebido es de saturación transitoria del pool gratuito.
  async crearCompletion(params, intentos = 3) {
    let ultimaResponse;
    for (let i = 0; i < intentos; i++) {
      ultimaResponse = await openrouter.chat.completions.create(params, OPCIONES_RESPUESTA_RAPIDA);
      const detalle = ultimaResponse?.error?.message;
      if (!detalle || !PATRON_SATURACION.test(detalle) || i === intentos - 1) return ultimaResponse;
      await new Promise(r => setTimeout(r, 700 * (i + 1)));
    }
    return ultimaResponse;
  },

  // El texto de "detalle" es el error crudo del proveedor upstream (ej: "Upstream
  // error from Nvidia: ResourceExhausted..."), un detalle de implementación (qué
  // proveedor sirve el modelo gratuito por debajo de OpenRouter) que no debe
  // filtrarse a la UI. Se guarda en err.upstreamDetail solo para logs de servidor.
  extraerContenido(response) {
    const eleccion = response?.choices?.[0];
    if (!eleccion) {
      const detalle = response?.error?.message || 'la IA no devolvió una respuesta válida';
      throw errorDeIA(PATRON_SATURACION.test(detalle) ? MENSAJE_SATURADO : MENSAJE_NO_DISPONIBLE, detalle);
    }
    if (respuestaIncompleta(eleccion)) {
      throw errorDeIA(MENSAJE_INCOMPLETO, `finish_reason=${eleccion.finish_reason}, content=${String(eleccion.message?.content).slice(0, 20)}`);
    }
    return eleccion.message.content;
  }
};

module.exports = clienteIA;
