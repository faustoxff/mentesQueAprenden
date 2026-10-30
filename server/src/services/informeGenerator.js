const { openrouter } = require('./clienteIA');
const { calcularEdad } = require('../utils/fechas');

const MODELO = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';

// Redacta el informe psicopedagógico completo a partir de los datos cargados
// por la profesional (motivo, antecedentes, pruebas con resultados en texto
// libre, observación de conducta, conclusiones, sugerencias). El modelo NO
// inventa puntajes ni datos que no estén en la evaluación — solo redacta y
// organiza en el formato profesional estándar lo que ya se le proveyó.
async function generarInformeTexto(evaluacion) {
  const edad = calcularEdad(evaluacion.paciente?.fecha_nacimiento);
  const pruebasTexto = (evaluacion.pruebas || [])
    .sort((a, b) => (a.orden || 0) - (b.orden || 0))
    .map(p => `- ${p.nombre_prueba}: ${p.resultados?.texto || 'sin resultados cargados'}${p.observaciones ? `\n  Observaciones: ${p.observaciones}` : ''}`)
    .join('\n');

  const prompt = `Sos un asistente de redacción para informes psicopedagógicos/psicológicos/fonoaudiológicos en Argentina. Tu tarea es redactar un informe profesional completo, con el mismo tono y estructura que usan estos informes clínicos reales, ORGANIZANDO Y REDACTANDO ÚNICAMENTE la información que te paso a continuación. No inventes puntajes, porcentiles, diagnósticos ni datos que no estén explícitamente provistos.

DATOS DEL PACIENTE
Nombre: ${evaluacion.paciente?.apellido}, ${evaluacion.paciente?.nombre}
Edad: ${edad} años
Fecha de nacimiento: ${evaluacion.paciente?.fecha_nacimiento || 'no especificada'}
Fecha de evaluación: ${evaluacion.fecha_evaluacion}

PROFESIONAL
${evaluacion.profesional?.apellido}, ${evaluacion.profesional?.nombre} — ${evaluacion.profesional?.especialidad}${evaluacion.profesional?.matricula ? ` (M.P. ${evaluacion.profesional.matricula})` : ''}

MOTIVO DE CONSULTA
${evaluacion.motivo_consulta || 'No especificado por la profesional.'}

ANTECEDENTES
${evaluacion.antecedentes || 'No especificados por la profesional.'}

PRUEBAS APLICADAS Y RESULTADOS (tal como los cargó la profesional)
${pruebasTexto || 'No se cargaron pruebas.'}

OBSERVACIÓN DE LA CONDUCTA DURANTE LA EVALUACIÓN
${evaluacion.observacion_conducta || 'No especificada por la profesional.'}

CONCLUSIONES (según la profesional)
${evaluacion.conclusiones || 'No especificadas por la profesional.'}

SUGERENCIAS (según la profesional)
${evaluacion.sugerencias || 'No especificadas por la profesional.'}

INSTRUCCIONES DE REDACCIÓN:
1. Estructurá el informe con estos títulos, en este orden: "Motivo de consulta", "Antecedentes significativos", "Pruebas aplicadas" (listá los nombres), "Observación de la conducta durante la evaluación", "Resultados y análisis de pruebas" (desarrollá en prosa profesional lo que la profesional cargó de cada prueba, sin inventar números que no te dieron), "Conclusiones", "Sugerencias".
2. Redactá en tercera persona, tono clínico-profesional, tal como lo haría un/a psicopedagogo/a experimentado/a.
3. Si alguna sección no tiene datos ("No especificado..."), escribí esa sección de forma breve indicando que no se registró información, no la inventes ni la completes con datos genéricos.
4. No uses markdown con asteriscos para negrita — usá los títulos de sección en mayúscula o con guion simple.
5. Extensión moderada, similar a un informe real (no un resumen de una línea por sección).`;

  const res = await openrouter.chat.completions.create({
    model: MODELO,
    max_tokens: 3500,
    messages: [{ role: 'user', content: prompt }]
  });

  const texto = res?.choices?.[0]?.message?.content;
  if (typeof texto !== 'string' || !texto.trim()) {
    // OpenRouter puede devolver 200 con un error embebido o con contenido vacío.
    const err = new Error('La IA no devolvió un informe válido. Probá de nuevo.');
    err.status = 502;
    throw err;
  }
  return texto.trim();
}

module.exports = { generarInformeTexto };
