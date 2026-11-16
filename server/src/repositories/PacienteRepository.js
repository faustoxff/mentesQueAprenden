const { supabaseAdmin } = require('../config/supabase');
const { datosDe, datosOpcionales } = require('./errores');

// Filtro por nombre, apellido o DNI. `termino` ya viene saneado (utils/busqueda). Se filtra
// palabra por palabra (cada una tiene que estar en alguna de las tres columnas): con el
// término entero, "fausto zacanti" no coincidía ni con el nombre ni con el apellido.
const filtroDePalabra = (palabra) => `nombre.ilike.%${palabra}%,apellido.ilike.%${palabra}%,dni.ilike.%${palabra}%`;
const filtrarPorTermino = (query, termino) => termino.split(' ').filter(Boolean).reduce((q, palabra) => q.or(filtroDePalabra(palabra)), query);

// Consultas a la tabla `pacientes`. Las que reciben `db` usan el cliente con el token del
// profesional (RLS decide qué pacientes ve); las que terminan en `ComoAdmin` usan el
// cliente de servicio y solo se llaman después de verificar el permiso. "Activo" es que
// no esté dado de baja (`deleted_at` nulo).
class PacienteRepository {
  // Una página de pacientes activos, por apellido: { data, count }.
  async listarActivos(db, { termino, estado, profesionalPrincipalId, desde, hasta }) {
    let query = db
    // GET
      .from('pacientes')
      .select(`
        id, nombre, apellido, dni, fecha_nacimiento, estado,
        telefono, email,
        profesional_principal:profesionales!profesional_principal_id(id, nombre, apellido, especialidad),
        obra_social:obras_sociales(id, nombre),
        created_at
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order('apellido', { ascending: true })
      .range(desde, hasta);

    if (termino) query = filtrarPorTermino(query, termino);
    if (estado) query = query.eq('estado', estado);
    if (profesionalPrincipalId) query = query.eq('profesional_principal_id', profesionalPrincipalId);

    const respuesta = await query;
    return { data: datosDe(respuesta), count: respuesta.count };
  }

  // Columnas pedidas de un paciente activo y visible, o null.
  async obtenerActivo(db, id, campos) {
    return datosOpcionales(await db
      .from('pacientes')
      .select(campos)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle());
  }

  // Pacientes activos que coinciden con el término, o null si no se pudo leer.
  async buscarActivos(db, termino, { limite, campos }) {
    return datosOpcionales(await filtrarPorTermino(db.from('pacientes').select(campos), termino)
      .is('deleted_at', null)
      .limit(limite));
  }

  // Los pacientes activos que la persona puede ver (RLS), para buscar parecidos cuando la
  // búsqueda exacta no encuentra nada. null si no se pudo leer.
  async listarActivosParaComparar(db, { campos, limite }) {
    return datosOpcionales(await db
      .from('pacientes')
      .select(campos)
      .is('deleted_at', null)
      .limit(limite));
  }

  // Ficha completa: titular, obra social y quién lo cargó.
  async obtenerDetalle(db, id) {
    return datosDe(await db
      .from('pacientes')
      .select(`
        *,
        profesional_principal:profesionales!profesional_principal_id(id, nombre, apellido, especialidad, email),
        obra_social:obras_sociales(id, nombre, codigo),
        creado_por:profesionales!created_by(id, nombre, apellido)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single());
  }

  async crear(db, paciente) {
    return datosDe(await db.from('pacientes').insert(paciente).select().single());
  }

  // Para un paciente con otro titular: RLS no deja ver la fila recién creada.
  async crearComoAdmin(paciente) {
    return this.crear(supabaseAdmin, paciente);
  }

  async actualizarActivo(db, id, cambios) {
    return datosDe(await db
      .from('pacientes')
      .update(cambios)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single());
  }

  async darDeBajaComoAdmin(id, fecha) {
    return datosDe(await supabaseAdmin
      .from('pacientes')
      .update({ deleted_at: fecha })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id, nombre, apellido')
      .single());
  }
}

module.exports = new PacienteRepository();
