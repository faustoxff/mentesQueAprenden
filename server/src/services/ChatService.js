const clienteIA = require('./clienteIA');
const pacienteService = require('./PacienteService');
const turnoService = require('./TurnoService');
const sesionService = require('./SesionService');
const sesionRepository = require('../repositories/SesionRepository');
const profesionalRepository = require('../repositories/ProfesionalRepository');
const { crearToken, verificarToken } = require('../utils/confirmacion');
const { exigirDatosValidos } = require('../utils/validacion');
const { hoyArgentina, formatearFechaHora } = require('../utils/fechas');
const { reglasCrearPaciente } = require('../validaciones/pacientes');
const { reglasCrearSesion } = require('../validaciones/sesiones');
const { reglasCrearTurno } = require('../validaciones/turnos');

// Chat con Menta: la conversación (prompt, mensajes, acciones que pide el modelo) y las
// herramientas que puede usar, que delegan en los mismos services que las rutas REST.
// Las funciones clínicas (sugerir notas, resumir, derivación, PDF) están en IAService.

const MODELO_CHAT = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const SYSTEM_PROMPT_BASE = `Te llamás Menta. Sos el asistente de un centro de salud interdisciplinario argentino, y trabajás codo a codo con los profesionales como un colega de confianza.

PERSONALIDAD Y TONO:
- Sos cálido, simpático y cercano, con la calidez de una psicopedagoga con experiencia: escuchás, acompañás y explicás con claridad, sin perder el rigor profesional.
- Usá el nombre del profesional con naturalidad (sin repetirlo en cada mensaje) y hablá siempre en voseo argentino (vos tenés, avisame, contame, leé), sin mezclar tuteo ("tú", "contigo", "avísame"), de forma amable y relajada.
- Si te preguntan cómo te llamás, decí que sos Menta. Si el profesional te saluda, bromea o charla un poco, respondé con simpatía y naturalidad como lo haría una persona, y después ofrecé tu ayuda. Nunca respondas de forma seca ni uses una frase armada.
- Respondé siempre a lo que la persona acaba de decir, no a lo anterior. Una vez que dijiste tu nombre en la conversación, NO lo repitas ni vuelvas a presentarte: seguí la charla. Nunca contestes dos veces seguidas con la misma frase.
- Nunca seas cortante, frío ni condescendiente. Si no podés hacer algo, explicalo con buena onda y proponé una alternativa.
- En consultas profesionales (estrategias, tests, intervenciones) priorizá 3 a 5 ideas claras y bien explicadas en vez de listas larguísimas.

Ejemplos del tono (no los copies textual, usalos como guía):
- Si te dicen "me encantaría que tengas nombre" → "¡Qué lindo, gracias, Juan! Me puso contento tener nombre: soy Menta. Cuando quieras me contás esa duda que te daba vueltas."
- Si te dicen "hay que ponerte un nombre" y ya sos Menta → "¡Jaja, por suerte ya tengo nombre! Soy Menta, así que podés llamarme así. ¿Qué era lo que te daba vueltas?"

Cuando el usuario pide una acción, respondé con un bloque JSON seguido de tu texto:

\`\`\`json
{"action": "NOMBRE_ACCION", "params": { ... }}
\`\`\`

Acciones disponibles:
- listar_mis_pacientes: params: {} — Devuelve TODOS los pacientes del profesional (propios y derivados). Usala cuando pidan "mis pacientes", "todos los pacientes", "cuántos pacientes tengo", o cuando se refieran a un paciente sin decir el nombre ("mi único paciente", "mi paciente").
- buscar_pacientes: params: { busqueda: string } — Solo cuando el usuario dice un nombre, apellido o DNI concreto.
- ver_paciente: params: { paciente_id: string }
- mostrar_formulario_paciente: params: { nombre?, apellido?, dni?, fecha_nacimiento?, telefono?, email?, motivo_consulta? } — Usar INMEDIATAMENTE cuando el usuario quiera crear/registrar/agendar un PACIENTE nuevo (persona que todavía no existe en el sistema), sin pedir datos primero. El usuario los completa en el formulario. Ejemplos que van acá: "agendame un paciente nuevo", "quiero cargar un paciente", "registrar un paciente".
- mostrar_formulario_turno: params: { paciente_id?, paciente_nombre?, fecha_inicio?, tipo?, duracion_minutos? } — Usar INMEDIATAMENTE cuando el usuario quiera agendar un TURNO (una cita/sesión) para un paciente que YA EXISTE en el sistema. El usuario completa los datos en el formulario. Si no está claro si el paciente ya existe, usá buscar_pacientes primero; si no aparece, ofrecé mostrar_formulario_paciente en su lugar.
- crear_paciente: NO usar directamente; solo se invoca desde el formulario.
- ver_agenda: params: { fecha?: "YYYY-MM-DD", fecha_hasta?: "YYYY-MM-DD" } — Turnos del profesional. Sin fecha: hoy. Con fecha_hasta: el rango completo (ej: "esta semana"). Las horas ya vienen en hora argentina.
- listar_mis_sesiones: params: { paciente_id?: string } — Sesiones del profesional separadas en "futuras" (turnos agendados) y "pasadas" (sesiones ya hechas; las que tienen registrada=false son turnos que pasaron sin que se cargue la sesión). Usala cuando pidan "mis sesiones", "sesiones pasadas", "próximas sesiones", "historial de sesiones". Con paciente_id, solo las de ese paciente. Mostrá siempre los dos grupos por separado.
- crear_turno: NO usar directamente; solo se invoca desde el formulario.
- registrar_sesion: NO usar para listar ni consultar sesiones; solo para CARGAR una sesión ya realizada. params: { paciente_id, fecha: "YYYY-MM-DDTHH:MM:00", tipo, duracion_minutos?, notas_libres?, monto? }
- listar_profesionales: params: {}
- eliminar_paciente: params: { paciente_id: string } — Pide DAR DE BAJA a un paciente (no borra su historial clínico, solo lo oculta de los listados). Vos NO la ejecutás: genera una tarjeta con un botón de confirmación y la persona decide con ese botón. Primero usá buscar_pacientes para encontrar el paciente_id real (si no hay resultados, avisá que no existe, no inventes que preguntaste un ID). Después llamá a eliminar_paciente con ese id y no pidas confirmación por texto ni la vuelvas a llamar.

Si no necesitás ejecutar ninguna acción, respondé solo con texto plano.
Respondé siempre en español, en pocas líneas pero con calidez (conciso no quiere decir seco).

También sos un apoyo clínico/técnico para el profesional: si te preguntan algo de índole psicopedagógica, psicológica o fonoaudiológica (tests, criterios diagnósticos, estrategias de intervención, interpretación de resultados, bibliografía, etc), respondé con el conocimiento profesional que tengas, como lo haría un colega con experiencia.

REGLAS CRÍTICAS SOBRE PRECISIÓN (tenés modelo de lenguaje chico, propenso a inventar — seguí esto estricto):
- Respondé con confianza cuando el conocimiento es general o conceptual (para qué sirve un test, qué mide, cómo se usa un criterio diagnóstico, estrategias de intervención). No te abstengas de estas preguntas.
- Pero NUNCA inventes datos técnicos EXACTOS de tests o instrumentos psicométricos (ej: Test de Caras-R, WISC, ENI, etc.) si no estás realmente seguro: cantidad exacta de ítems, tiempos de aplicación en minutos, puntos de corte numéricos, normas de baremación, fórmulas de corrección. Estos son los datos donde más te equivocás. Si no tenés certeza alta de un número o dato preciso así, decilo explícitamente ("no tengo la certeza del dato exacto, verificalo en el manual del test") en vez de inventar un número que suene plausible. La diferencia es: explicaciones y criterio SÍ, números/cifras exactas dudosas NO.
- NUNCA inventes datos clínicos de un paciente particular (diagnósticos, resultados de evaluaciones, fechas, historial) que no vengan de una tool ejecutada en esta conversación (buscar_pacientes, ver_paciente, ver_agenda, etc). Si no tenés el dato porque no lo consultaste, ejecutá la acción correspondiente o decí que no lo sabés. Esto no aplica al conocimiento técnico general, solo a datos específicos de pacientes reales del sistema.`;

class ChatService {
  // `db` es el cliente autenticado como el profesional (respeta RLS). Las tools
  // de lectura nuevas delegan en los mismos services que usan las rutas REST,
  // así el chat ve exactamente lo que el profesional ve en la app.
  async ejecutarTool(nombre, args, profesional, db) {
    switch (nombre) {
      case 'listar_mis_pacientes': {
        const { data, pagination } = await pacienteService.listar(db, { limit: 100 }, profesional.id);
        return {
          total: pagination.total,
          pacientes: data.map(p => ({
            id: p.id,
            nombre: p.nombre,
            apellido: p.apellido,
            dni: p.dni,
            estado: p.estado,
            derivado: p.derivado
          }))
        };
      }

      case 'buscar_pacientes':
        // Con el cliente del usuario, RLS ya limita a sus pacientes y a los derivados.
        return pacienteService.buscar(db, args.busqueda, {
          limite: 5,
          campos: 'id, nombre, apellido, dni, fecha_nacimiento, estado, telefono, motivo_consulta'
        });

      case 'ver_paciente': {
        const pac = await pacienteService.obtenerDatosBasicos(db, args.paciente_id,
          'id, nombre, apellido, dni, fecha_nacimiento, genero, telefono, email, motivo_consulta, estado, obra_social_id, profesional_principal_id');
        if (!pac) return { error: 'Paciente no encontrado' };

        const sesiones = await sesionRepository.ultimasDePaciente(db, args.paciente_id, {
          campos: 'id, fecha, tipo, resumen_ia, notas_libres, monto, pagado',
          limite: 5
        });
        return { paciente: pac, sesiones_recientes: sesiones };
      }

      case 'mostrar_formulario_paciente':
        return { type: 'form', form: 'crear_paciente', prefill: args };

      case 'mostrar_formulario_turno':
        return { type: 'form', form: 'crear_turno', prefill: args };

      case 'crear_paciente': {
        // Mismas reglas y misma lógica que POST /pacientes (incluido quién puede asignarlo a otro).
        const datos = await exigirDatosValidos(reglasCrearPaciente, args);
        return pacienteService.crear(db, datos, profesional);
      }

      case 'ver_agenda': {
        const desde = args.fecha || hoyArgentina();
        const hasta = args.fecha_hasta || desde;
        if (!PATRON_FECHA.test(desde) || !PATRON_FECHA.test(hasta)) {
          throw new Error('fecha inválida: usar formato YYYY-MM-DD');
        }
        // Solo la agenda propia: los turnos de otros profesionales no le sirven
        // al usuario del chat (y el service igual los devolvería sin datos clínicos).
        const turnos = await turnoService.listar(db, {
          fecha_inicio: `${desde}T00:00:00-03:00`,
          fecha_fin: `${hasta}T23:59:59-03:00`,
          profesional_id: profesional.id
        }, profesional.id, { incluirSesiones: true });
        return {
          desde,
          hasta,
          total: turnos.length,
          turnos: turnos.map(t => ({
            id: t.id,
            inicio: formatearFechaHora(t.fecha_inicio),
            fin: formatearFechaHora(t.fecha_fin),
            estado: t.estado,
            tipo: t.tipo,
            consultorio: t.consultorio,
            paciente: t.paciente ? { id: t.paciente.id, nombre: `${t.paciente.nombre} ${t.paciente.apellido}` } : null
          }))
        };
      }

      case 'listar_mis_sesiones': {
        const ahora = new Date().toISOString();
        const filtroPaciente = args.paciente_id || undefined;

        const [sesiones, turnosFuturos, turnosPasados] = await Promise.all([
          sesionService.listarDelProfesional(db, profesional.id, { paciente_id: filtroPaciente, hasta: ahora }),
          turnoService.listar(db, { fecha_inicio: ahora, profesional_id: profesional.id }, profesional.id),
          turnoService.listar(db, { fecha_fin: ahora, profesional_id: profesional.id }, profesional.id)
        ]);
        const delPaciente = t => !filtroPaciente || t.paciente_id === filtroPaciente;
        const nombrePaciente = p => (p ? `${p.nombre} ${p.apellido}` : null);

        // Un turno pasado con sesión cargada ya aparece como sesión; solo
        // agregamos los que quedaron sin registrar para que no se pierdan.
        const pasadas = [
          ...sesiones.map(s => ({
            id: s.id, fecha: s.fecha, tipo: s.tipo, paciente: nombrePaciente(s.paciente),
            registrada: true, pagado: s.pagado
          })),
          ...turnosPasados.filter(t => delPaciente(t) && !t.sesion).map(t => ({
            id: t.id, fecha: t.fecha_inicio, tipo: t.tipo, paciente: nombrePaciente(t.paciente),
            registrada: false, estado_turno: t.estado
          }))
        ]
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
          .slice(0, 20)
          .map(s => ({ ...s, fecha: formatearFechaHora(s.fecha) }));

        const futuras = turnosFuturos.filter(delPaciente).map(t => ({
          id: t.id, fecha: formatearFechaHora(t.fecha_inicio), tipo: t.tipo,
          paciente: nombrePaciente(t.paciente), estado_turno: t.estado, consultorio: t.consultorio
        }));

        return { futuras, pasadas };
      }

      case 'crear_turno': {
        // Mismas reglas y misma lógica que POST /turnos. El turno es siempre del profesional del chat.
        const inicio = new Date(args.fecha_inicio);
        const fin = new Date(inicio.getTime() + (args.duracion_minutos || 50) * 60000);
        const datos = await exigirDatosValidos(reglasCrearTurno, {
          fecha_inicio: args.fecha_inicio,
          fecha_fin: Number.isNaN(fin.getTime()) ? undefined : fin.toISOString(),
          profesional_id: profesional.id,
          paciente_id: args.paciente_id,
          tipo: args.tipo || 'tratamiento',
          consultorio: args.consultorio,
          notas: args.notas
        });
        return turnoService.crear(db, profesional.id, datos);
      }

      case 'listar_profesionales': {
        return (await profesionalRepository.listarActivos(db)) || [];
      }

      case 'registrar_sesion': {
        // Mismas reglas y misma lógica que POST /sesiones. Desde el chat se carga rápido,
        // sin consultorio ni turno: después se completa desde la pantalla de la sesión.
        const datos = await exigirDatosValidos(reglasCrearSesion, {
          paciente_id: args.paciente_id,
          fecha: args.fecha,
          tipo: args.tipo,
          duracion_minutos: args.duracion_minutos,
          notas_libres: args.notas_libres,
          monto: args.monto
        });
        return sesionService.crear(db, profesional.id, datos);
      }

      case 'eliminar_paciente': {
        // El modelo NO borra: solo genera una solicitud de confirmación firmada por el
        // servidor. El borrado se hace cuando la persona aprieta el botón (confirmarEliminacion).
        if (!args.paciente_id) throw new Error('paciente_id es obligatorio');
        const pac = await pacienteService.obtenerDatosBasicos(db, args.paciente_id, 'id, nombre, apellido');
        if (!pac) throw new Error('Paciente no encontrado');
        return {
          type: 'confirm',
          accion: 'eliminar_paciente',
          paciente_id: pac.id,
          descripcion: `Dar de baja a ${pac.apellido}, ${pac.nombre}`,
          token: crearToken({ accion: 'eliminar_paciente', profesionalId: profesional.id, recursoId: pac.id })
        };
      }

      default:
        throw new Error(`Tool desconocida: ${nombre}`);
    }
  }

  // Ejecuta la baja que antes pidió el chat, solo con un token válido, vigente y de esta persona.
  async confirmarEliminacion(token, profesional, db) {
    const { recursoId } = verificarToken(token, { accion: 'eliminar_paciente', profesionalId: profesional.id });
    return pacienteService.eliminar(db, recursoId);
  }

  // El cliente manda el historial completo: solo se aceptan mensajes de usuario y de
  // asistente. Un { role: 'system' } enviado a mano se descarta (si no, se procesaba
  // como instrucción del sistema).
  filtrarMensajes(messages) {
    const limpios = (Array.isArray(messages) ? messages : [])
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-30)
      .map(m => ({ role: m.role, content: m.content.slice(0, 8000) }));
    if (!limpios.length) throw Object.assign(new Error('No hay mensajes válidos'), { status: 422 });
    return limpios;
  }

  parsearAccion(texto) {
    // Formato nativo de owl-alpha: <longcat_tool_call>nombre\n<longcat_arg_key>k</longcat_arg_key>\n<longcat_arg_value>v</longcat_arg_value>\n</longcat_tool_call>
    const longcatMatch = texto.match(/<longcat_tool_call>([\s\S]*?)<\/longcat_tool_call>/i);
    if (longcatMatch) {
      const inner = longcatMatch[1];
      const nameMatch = inner.match(/^([^\n<]+)/);
      if (!nameMatch) return null;
      const action = nameMatch[1].trim();
      const keys = [...inner.matchAll(/<longcat_arg_key>([\s\S]*?)<\/longcat_arg_key>/gi)].map(m => m[1].trim());
      const vals = [...inner.matchAll(/<longcat_arg_value>([\s\S]*?)<\/longcat_arg_value>/gi)].map(m => m[1].trim());
      const params = {};
      keys.forEach((k, i) => { params[k] = vals[i] ?? ''; });
      return { action, params };
    }

    // Fallback: bloque ```json
    const jsonMatch = texto.match(/```json\s*([\s\S]*?)```/i) || texto.match(/\{[\s\S]*"action"[\s\S]*\}/);
    if (!jsonMatch) return null;
    try {
      const json = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      if (json.action && json.params !== undefined) return json;
      return null;
    } catch {
      return null;
    }
  }

  limpiarTexto(texto) {
    return texto
      .replace(/<longcat_tool_call>[\s\S]*?<\/longcat_tool_call>/gi, '')
      .replace(/```json[\s\S]*?```/gi, '')
      .trim();
  }

  construirSystemPrompt(profesional) {
    const hoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const sanitizar = (s) => String(s || '').replace(/[`<>{}[\]]/g, '').slice(0, 100);
    const profNombre = sanitizar(profesional.nombre);
    const profApellido = sanitizar(profesional.apellido);
    const profEspecialidad = sanitizar(profesional.especialidad);
    const profRol = sanitizar(profesional.rol);

    return `${SYSTEM_PROMPT_BASE}\n\nHoy es ${hoy}. Profesional activo: ${profNombre} ${profApellido} (${profEspecialidad}, ${profRol}).`;
  }

  async chat({ messages, profesional, db }) {
    const chatMessages = [
      { role: 'system', content: this.construirSystemPrompt(profesional) },
      ...this.filtrarMensajes(messages)
    ];

    const historial = [...chatMessages];
    const toolResults = [];
    let mensajeFinal = '';
    let sinMensaje = false;

    // Hasta 5 acciones encadenadas por mensaje
    for (let i = 0; i < 5; i++) {
      const response = await clienteIA.crearCompletion({
        model: MODELO_CHAT,
        messages: historial,
        max_tokens: 500
      });

      const rawText = clienteIA.extraerContenido(response).trim();
      const accion = this.parsearAccion(rawText);

      if (!accion) {
        mensajeFinal = this.limpiarTexto(rawText);
        break;
      }

      let toolResult;
      try {
        const resultado = await this.ejecutarTool(accion.action, accion.params || {}, profesional, db);
        toolResult = { name: accion.action, result: resultado };
      } catch (err) {
        toolResult = { name: accion.action, result: { error: err.message } };
      }
      toolResults.push(toolResult);

      // Formularios interactivos: el formulario ya explica qué datos pide,
      // así que no hace falta (ni conviene, por latencia) que el modelo
      // también lo describa en texto — se descarta el texto y se corta acá.
      if (accion.action === 'mostrar_formulario_paciente' || accion.action === 'mostrar_formulario_turno' || toolResult.result?.type === 'confirm') {
        mensajeFinal = '';
        sinMensaje = true;
        break;
      }

      historial.push({ role: 'assistant', content: rawText });
      historial.push({
        role: 'user',
        content: `Resultado de "${accion.action}":\n${JSON.stringify(toolResult.result, null, 2)}\n\nSi tenés más acciones pendientes, ejecutalas. Si terminaste, respondé en lenguaje natural resumiendo todo lo que hiciste.`
      });
    }

    if (!mensajeFinal && !sinMensaje) {
      const resumenResp = await clienteIA.crearCompletion({
        model: MODELO_CHAT,
        messages: [...historial, { role: 'user', content: 'Resumí en lenguaje natural todo lo que hiciste, sin JSON.' }],
        max_tokens: 400
      });
      mensajeFinal = this.limpiarTexto(clienteIA.extraerContenido(resumenResp).trim());
    }

    return { message: mensajeFinal, tool_results: toolResults };
  }
}

module.exports = new ChatService();
