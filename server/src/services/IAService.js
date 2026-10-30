const clienteIA = require('./clienteIA');
const { extraerTextoDocumento } = require('./geminiExtractor');
const pacienteService = require('./PacienteService');
const { calcularEdad } = require('../utils/fechas');
const sesionRepository = require('../repositories/SesionRepository');
const archivoRepository = require('../repositories/ArchivoRepository');
const almacenamientoRepository = require('../repositories/AlmacenamientoRepository');

// Funciones clínicas con IA: sugerir notas, resumir una sesión, sugerir derivación y
// analizar un documento. El chat está en ChatService.

const MODELO_TEXTO = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';

class IAService {
  // Todo lo que se lee o escribe en nombre de la persona va con SU cliente (`db`,
  // autenticado con su JWT), así RLS aplica la regla de acceso: titular del paciente
  // o derivación aceptada. Estos helpers dan un 404 (no un 403) para no revelar si el
  // id existe.
  async asegurarAccesoPaciente(db, pacienteId) {
    await pacienteService.asegurarAcceso(db, pacienteId);
  }

  // ─────────────────────────────────────────────────────────────
  // Sugerencias con IA de texto
  // ─────────────────────────────────────────────────────────────

  async sugerirNotas({ notas_parciales, paciente_id, tipo_sesion, especialidad }, db) {
    await this.asegurarAccesoPaciente(db, paciente_id);
    const [paciente, anteriores] = await Promise.all([
      pacienteService.obtenerDatosBasicos(db, paciente_id, 'fecha_nacimiento, motivo_consulta'),
      sesionRepository.ultimasDePaciente(db, paciente_id, { campos: 'fecha, tipo, resumen_ia, notas_libres', limite: 3 })
    ]);

    const edad = calcularEdad(paciente?.fecha_nacimiento);
    const esPrimeraSesion = !anteriores?.length;
    const historial = esPrimeraSesion
      ? '(No hay sesiones anteriores registradas: esta es la primera sesión del paciente.)'
      : anteriores.map(s => `- ${new Date(s.fecha).toLocaleDateString('es-AR')} (YA ocurrida): ${s.resumen_ia || s.notas_libres?.slice(0, 150) || 'sin notas'}`).join('\n');

    const prompt = `Sos un asistente especializado en ${especialidad} para profesionales de la salud en Argentina.

Paciente: ${edad} años. Motivo: ${paciente?.motivo_consulta || 'no registrado'}.

=== HISTORIAL (sesiones PASADAS, ya terminadas — solo como contexto de fondo) ===
${historial}

=== SESIÓN DE HOY (tipo "${tipo_sesion}") — esto es lo que hay que redactar ===
Notas parciales que el profesional escribió sobre la sesión de HOY:
"${notas_parciales}"

Reglas, en orden de importancia:
1. Todo lo que está arriba en "HISTORIAL" ya sucedió en el pasado. NUNCA lo presentes como si fuera parte de la sesión de hoy, ni reuses sus frases (por ejemplo "es la primera sesión", "vamos a empezar con...") para describir la sesión de hoy si en realidad describían una sesión anterior. Usalo solo como trasfondo (ej. "el paciente ya venía presentando..."), nunca como el contenido de la nota de hoy.
2. La nota que tenés que redactar es EXCLUSIVAMENTE sobre "SESIÓN DE HOY", usando SOLO lo que dicen sus notas parciales (más el historial como trasfondo si aporta contexto real). NO inventes observaciones clínicas, intervenciones, reacciones del paciente ni datos que no estén explícitamente escritos en la sesión de hoy.
3. Nunca redactes como si hubieras presenciado la sesión si las notas de hoy no lo describen.
4. Si las notas parciales de hoy son un plan o intención (ej. "voy a preguntar por...", "la idea es explorar...") y no una descripción de algo que ya ocurrió, mantené esa misma naturaleza de plan — no la conviertas en un relato de hechos ya sucedidos.
5. Si hay muy poco contenido real para trabajar, escribí una nota breve y honesta con lo poco que hay, sin rellenar con contenido inventado. Si directamente no hay nada aprovechable en las notas de hoy, respondé únicamente: "No hay información suficiente en las notas para generar una sugerencia. Registrá al menos algunas observaciones u datos de la sesión."

Redactá en primera persona del profesional. Máximo 300 palabras, lenguaje clínico de ${especialidad} en Argentina. Solo las notas (o el mensaje de falta de información), sin títulos.`;

    return clienteIA.completar(MODELO_TEXTO, [{ role: 'user', content: prompt }]);
  }

  async resumirSesion({ sesion_id, notas_libres }, db, profesional) {
    const sesion = await sesionRepository.obtenerSiExiste(db, sesion_id,
      'tipo, profesional_id, paciente:pacientes(fecha_nacimiento), profesional:profesionales!profesional_id(especialidad)');
    // Solo la autora de la sesión (o un admin) puede escribirle el resumen.
    if (!sesion || (sesion.profesional_id !== profesional.id && profesional.rol !== 'admin')) {
      throw Object.assign(new Error('Sesión no encontrada'), { status: 404 });
    }

    const edad = calcularEdad(sesion?.paciente?.fecha_nacimiento);
    const especialidad = sesion?.profesional?.especialidad || 'salud';

    const prompt = `Resumí en máximo 3 oraciones esta sesión clínica de ${especialidad} con un paciente de ${edad} años. En tercera persona, capturando los puntos clínicos más relevantes. Usá únicamente lo que dicen las notas de abajo, sin agregar observaciones, síntomas o datos que no estén escritos ahí. Si las notas son muy breves, el resumen puede ser igual de breve. Solo el resumen.

Notas:\n${notas_libres}`;

    const resumen = await clienteIA.completar(MODELO_TEXTO, [{ role: 'user', content: prompt }], 200);
    await sesionRepository.actualizarSinDevolver(db, sesion_id, { resumen_ia: resumen, ia_utilizada: true });
    return resumen;
  }

  async sugerirDerivacion({ paciente_id, contexto_adicional }, db) {
    await this.asegurarAccesoPaciente(db, paciente_id);
    const [paciente, sesiones] = await Promise.all([
      pacienteService.obtenerDatosBasicos(db, paciente_id, 'motivo_consulta, fecha_nacimiento'),
      sesionRepository.ultimasDePaciente(db, paciente_id, { campos: 'tipo, resumen_ia, notas_libres', limite: 5 })
    ]);

    const historial = sesiones?.map(s => s.resumen_ia || s.notas_libres?.slice(0, 200)).filter(Boolean).join('\n\n') || 'Sin historial.';

    const prompt = `Analizá este caso clínico de un paciente de ${calcularEdad(paciente?.fecha_nacimiento)} años.

Motivo: ${paciente?.motivo_consulta || 'no registrado'}
Historial reciente:\n${historial}
${contexto_adicional ? `\nContexto adicional: ${contexto_adicional}` : ''}

IMPORTANTE: Si el motivo no está registrado, el historial está vacío, y/o el "contexto adicional" no es información clínica real (es una broma, un texto sin sentido, o no corresponde a ningún cuadro reconocible), NO inventes un diagnóstico ni un análisis clínico. En ese caso respondé únicamente: "No hay información clínica suficiente para sugerir una derivación. Cargá el motivo de consulta y/o notas de sesión para poder analizar el caso." No completes esta falta de datos con suposiciones.

Si SÍ hay información clínica real y coherente, indicá brevemente:
1. ¿Se beneficiaría de una derivación? (Sí/No y por qué)
2. Si sí, ¿a qué especialidad (psicopedagogía, psicología, fonoaudiología)?
3. Objetivos sugeridos para la derivación

Respondé en 4-6 oraciones, lenguaje clínico profesional.`;

    return clienteIA.completar(MODELO_TEXTO, [{ role: 'user', content: prompt }], 300);
  }

  async analizarPDF({ archivo_id, pregunta }, db) {
    const archivo = await archivoRepository.obtener(db, archivo_id, 'storage_path, nombre_original, mime_type, paciente_id, tipo');

    if (!archivo) {
      const notFound = new Error('Archivo no encontrado');
      notFound.status = 404;
      throw notFound;
    }
    await this.asegurarAccesoPaciente(db, archivo.paciente_id);

    const mimesSoportados = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!mimesSoportados.includes(archivo.mime_type)) {
      const invalidType = new Error('El archivo debe ser PDF o imagen para ser analizado por IA');
      invalidType.status = 422;
      throw invalidType;
    }

    let urlFirmada;
    try {
      urlFirmada = await almacenamientoRepository.urlDeDescarga(archivo.storage_path, 300);
    } catch {
      const storageError = new Error('No se pudo acceder al archivo');
      storageError.status = 500;
      throw storageError;
    }

    const instruccion = pregunta
      ? `El profesional pregunta: "${pregunta}". Respondé basándote en el texto del documento.`
      : 'Resumí la información clínica más relevante: diagnósticos, resultados, recomendaciones y fechas importantes. Usá viñetas. Máximo 400 palabras.';

    // Etapa 1 — extracción: Gemini transcribe el documento sin interpretarlo.
    const textoExtraido = await extraerTextoDocumento(urlFirmada, archivo.nombre_original, archivo.mime_type);

    // Etapa 2 — análisis: el modelo de texto interpreta el contenido ya transcripto.
    const prompt = `Sos un asistente médico. A continuación el texto transcripto de un documento (${archivo.nombre_original}, tipo: ${archivo.tipo}).\n\n"""\n${textoExtraido}\n"""\n\n${instruccion}`;
    const analisis = await clienteIA.completar(MODELO_TEXTO, [{ role: 'user', content: prompt }], 600);

    // Guardar el análisis como metadata del archivo (solo si no tenía descripción previa)
    await archivoRepository.describirSiNoTieneComoAdmin(archivo_id, `[Análisis IA]\n${analisis}`);

    return { analisis, texto_extraido: textoExtraido, modelo: MODELO_TEXTO };
  }
}

module.exports = new IAService();
