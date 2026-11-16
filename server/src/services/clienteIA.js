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
const ESPERA_POR_INTENTO_MS = 25000;
const OPCIONES_RESPUESTA_RAPIDA = { timeout: ESPERA_POR_INTENTO_MS, maxRetries: 1 };

// Con un `limite` (el momento en que el chat tiene que haber terminado), cada intento espera
// lo que queda hasta ese momento, y solo reintenta si todavía entra otro intento completo.
function opcionesHasta(limite) {
  if (!limite) return OPCIONES_RESPUESTA_RAPIDA;
  const restante = limite - Date.now();
  if (restante < 1000) throw errorDeIA(MENSAJE_LENTO, 'se acabó el tiempo total del pedido');
  return { timeout: Math.min(ESPERA_POR_INTENTO_MS, restante), maxRetries: restante >= 2 * ESPERA_POR_INTENTO_MS ? 1 : 0 };
}

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
const MENSAJE_LIMITE_DIARIO = 'Menta llegó al límite diario de consultas. Vuelve a estar disponible a las 21 hs.';
const MENSAJE_LENTO = 'La IA tardó demasiado en responder. Probá de nuevo en un momento.';
const MENSAJE_INCOMPLETO = 'La IA no llegó a completar la respuesta. Probá de nuevo.';

// Error 502 para el usuario; el detalle técnico queda solo para los logs del servidor.
const errorDeIA = (mensaje, detalle) => Object.assign(new Error(mensaje), { status: 502, upstreamDetail: detalle });

// Si el razonamiento se come todo max_tokens, el modelo corta (finish_reason "length") y
// devuelve content null o un texto a medias: no se usa ni se guarda una respuesta así.
function respuestaIncompleta(eleccion) {
  const contenido = eleccion.message?.content;
  return typeof contenido !== 'string' || !contenido.trim() || eleccion.finish_reason === 'length';
}

// ─── Proveedor de respaldo (Groq) ───
// Se usa solo cuando OpenRouter no da más. Es opcional: sin GROQ_API_KEY no hay respaldo y
// todo funciona como antes. La conexión se crea recién la primera vez que hace falta.
const MODELO_RESPALDO = 'openai/gpt-oss-120b';
const PAUSA_TRAS_LIMITE_DIARIO_MS = 10 * 60 * 1000;

const hayRespaldo = () => Boolean(process.env.GROQ_API_KEY);

let groq = null;
function conexionDeRespaldo() {
  if (!groq) groq = new OpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY });
  return groq;
}

// Mismo pedido, con el modelo del respaldo (los nombres de modelo de OpenRouter no existen en Groq).
async function pedirAlRespaldo(params, limite) {
  try {
    return await conexionDeRespaldo().chat.completions.create({ ...params, model: process.env.GROQ_MODELO || MODELO_RESPALDO }, opcionesHasta(limite));
  } catch (err) {
    if (err?.name === 'APIConnectionTimeoutError') throw errorDeIA(MENSAJE_LENTO, err.message);
    if (err?.status === 429) throw errorDeIA(MENSAJE_LIMITE_DIARIO, `respaldo: ${err.message}`);
    throw err;
  }
}

const clienteIA = {
  openrouter,

  async completar(modelo, mensajes, maxTokens = 500) {
    const res = await clienteIA.crearCompletion({ model: modelo, max_tokens: maxTokens, messages: mensajes });
    return clienteIA.extraerContenido(res).trim();
  },

  // Hasta cuándo se saltea OpenRouter porque avisó que se agotó el límite diario (0 = no se saltea).
  openrouterAgotadoHasta: 0,

  // OpenRouter a veces responde HTTP 200 con un error embebido en vez de tirar
  // una excepción (ej: el worker del modelo gratuito está saturado). El SDK de
  // OpenAI no lo detecta como error porque el status HTTP es 2xx, así que su
  // maxRetries no se activa acá: por eso reintentamos nosotros a mano cuando
  // el error embebido es de saturación transitoria del pool gratuito.
  // Si OpenRouter no da más (límite de uso o saturado después de los reintentos) y hay un
  // proveedor de respaldo configurado, responde el respaldo.
  async crearCompletion(params, intentos = 3, { limite } = {}) {
    if (Date.now() < clienteIA.openrouterAgotadoHasta && hayRespaldo()) return pedirAlRespaldo(params, limite);

    let ultimaResponse;
    for (let i = 0; i < intentos; i++) {
      try {
        ultimaResponse = await openrouter.chat.completions.create(params, opcionesHasta(limite));
      } catch (err) {
        // El proveedor no contestó a tiempo: no es "sin conexión", es que tardó.
        if (err?.name === 'APIConnectionTimeoutError') throw errorDeIA(MENSAJE_LENTO, err.message);
        if (err?.status !== 429) throw err;
        // Límite de uso del proveedor: el mensaje original (en inglés, con el link para
        // comprar créditos) queda solo en los logs.
        const diario = /per-day|daily/i.test(err.message);
        if (diario) clienteIA.openrouterAgotadoHasta = Date.now() + PAUSA_TRAS_LIMITE_DIARIO_MS;
        if (hayRespaldo()) return pedirAlRespaldo(params, limite);
        throw errorDeIA(diario ? MENSAJE_LIMITE_DIARIO : MENSAJE_SATURADO, err.message);
      }
      const detalle = ultimaResponse?.error?.message;
      if (!detalle || !PATRON_SATURACION.test(detalle)) return ultimaResponse;
      if (i < intentos - 1) await new Promise(r => setTimeout(r, 700 * (i + 1)));
    }
    return hayRespaldo() ? pedirAlRespaldo(params, limite) : ultimaResponse;
  },

  // Cuánto se usó hoy de la cuota gratuita de OpenRouter, según OpenRouter (cuenta todos
  // los pedidos hechos con la clave, no solo los de este server; el día es el de UTC).
  // Consultarlo no gasta cuota. `openrouter` es null si no se pudo saber.
  async usoDelDia() {
    let uso = null;
    try {
      const res = await fetch('https://openrouter.ai/api/v1/key', {
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
        signal: AbortSignal.timeout(5000)
      });
      const diario = res.ok ? (await res.json())?.data?.free_model_daily_requests : null;
      if (diario && Number.isFinite(diario.used) && Number.isFinite(diario.limit)) {
        uso = { usados: diario.used, limite: diario.limit, restantes: diario.remaining ?? Math.max(0, diario.limit - diario.used) };
      }
    } catch (err) {
      console.error('No se pudo consultar el uso de IA:', err.message);
    }
    return { openrouter: uso, respaldo_configurado: hayRespaldo() };
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
      // `incompleta` le permite a quien llama pedir de nuevo con más margen.
      throw Object.assign(errorDeIA(MENSAJE_INCOMPLETO, `finish_reason=${eleccion.finish_reason}, content=${String(eleccion.message?.content).slice(0, 20)}`), { incompleta: true });
    }
    return eleccion.message.content;
  }
};

module.exports = clienteIA;
