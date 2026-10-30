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

// El chat y las sugerencias esperan como mucho 25 s por respuesta (con 2 reintentos del
// SDK ante errores de red). Los informes y la extracción de documentos usan el tiempo
// por defecto del SDK, porque generan textos largos.
const OPCIONES_RESPUESTA_RAPIDA = { timeout: 25000, maxRetries: 2 };

// Los modelos ":free" de OpenRouter corren en un pool de workers compartido
// entre todos los usuarios de OpenRouter, así que se saturan de forma
// transitoria y ajena a nuestro tráfico. Este patrón detecta esos casos para
// reintentar en vez de mostrarle el error al profesional en el primer intento.
const PATRON_SATURACION = /resourceexhausted|rate.?limit|too many requests|limit reached/i;

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
    const contenido = response?.choices?.[0]?.message?.content;
    if (contenido === undefined) {
      const detalle = response?.error?.message || 'la IA no devolvió una respuesta válida';
      const saturado = PATRON_SATURACION.test(detalle);
      const err = new Error(saturado
        ? 'El modelo de IA está saturado en este momento. Probá de nuevo en unos segundos.'
        : 'Modelo de IA no disponible ahora mismo. Probá de nuevo en unos minutos.');
      err.status = 502;
      err.upstreamDetail = detalle;
      throw err;
    }
    return contenido;
  }
};

module.exports = clienteIA;
