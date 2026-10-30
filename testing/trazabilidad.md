# Trazabilidad

Generada a partir de los nombres de los tests (2026-10-27). Un mismo ID puede agrupar varios valores de una partición (`test.each`).

| ID | Caso de prueba | Funcionalidad / requerimiento | Nivel de la pirámide | Archivo | Falla conocida |
|---|---|---|---|---|---|
| CP-U01 | sin header Authorization → 401 con { error } | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U02 | header malformado (%s) → 401 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U03 | token vencido o que Supabase no reconoce → 401  | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U04 | token válido de una cuenta desactivada → 403 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U05 | GET /auth/me devuelve el perfil sin contraseña ni claves | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U06 | un profesional en /pagos/liquidacion → 403 y no se calcula nada | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U07 | un admin en /pagos/liquidacion con mes válido → 200 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U08 | un admin en /pagos/liquidacion sin mes → 422 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U09 | un admin en /pagos/liquidacion con mes mal formado (%s) → 422 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` | DEF-A10 |
| CP-U10 | un profesional no puede registrar profesionales (POST /auth/register → 403) | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U11 | un profesional no puede desactivar profesionales (DELETE /profesionales/:id → 403) | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U12 | monto %s → 422 y no se registra el pago | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U13 | monto válido %p → 201 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U14 | método de pago fuera de la lista → 422 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U15 | sesion_id que no es UUID → 422 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U16 | sesión ya pagada: el 409 del service llega con su mensaje | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U17 | un error inesperado se enmascara: 500  | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U18 | consultorio inválido (%p) → 422 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U19 | consultorio válido (%p) → 201 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U20 | fecha mal formada (%s) → 422 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U21 | %s → 422 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` | DEF-A03 |
| CP-U22 | choque de consultorio: el 409 del service llega al cliente | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U23 | PATCH /turnos/:id con id que no es UUID → 422 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U24 | PATCH /turnos/:id con estado fuera de la lista → 422 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U25 | DELETE /turnos/:id con id que no es UUID → 422 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` | DEF-A05 |
| CP-U26 | POST /pacientes con %s → 422 en el campo correcto | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U27 | POST /pacientes con %s → 201 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U28 | la fecha dd/mm/aaaa se convierte a ISO antes de guardar | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U29 | PATCH /pacientes/:id con estado válido  | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U30 | DELETE /pacientes/:id hace la baja lógica a través del service (no hay borrado físico en la ruta) | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U31 | DELETE /pacientes/:id con id que no es UUID → 422 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U32 | GET /pacientes/:id con id que no es UUID → 422 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` | DEF-A05 |
| CP-U33 | un error interno en /pacientes no expone el mensaje de la base | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` | DEF-A07 |
| CP-U34 | motivo %s → 422 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U35 | motivo de 1000 caracteres (límite exacto) → 201 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U36 | responder con estado  | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U37 | responder dos veces: el 409 del service llega al cliente | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U38 | %s → 422 y no se firma ninguna URL | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U39 | %s → 200 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U40 | duración %p minutos (fuera de 1–480) → 422 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U41 | duración %p minutos (límite exacto) → 201 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U42 | una ruta inexistente → 404 { error } | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U43 | login con email inválido → 422 con mensaje legible | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U44 | login con credenciales incorrectas → 401 genérico (no dice si el email existe) | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U45 | body con JSON mal formado → 400, no 500 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` | DEF-A06 |
| CP-U46 | body de más de 200 kb → 413, no 500 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` | DEF-A06 |
| CP-U47 | refresh sin refresh_token → 422 sin consultar a Supabase | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` | DEF-A09 |
| CP-U49 | forgot-password siempre responde lo mismo, exista o no el email | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U50 | /health responde sin autenticación | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U51 | fecha de calendario inexistente (30/02) → 422 | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` | DEF-A13 |
| CP-U52 | con 100 % el espacio no se queda con nada | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` |  |
| CP-U53 | con 0 % todo el monto queda para el espacio | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` | DEF-A01 |
| CP-U54 | con un porcentaje decimal (62,5 %) el reparto es exacto | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` |  |
| CP-U55 | con monto %p y %p %% las dos partes suman exactamente el total | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` |  |
| CP-U56 | los montos repartidos se guardan redondeados a centavos | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` | DEF-A14 |
| CP-U57 | sin porcentaje cargado (undefined) usa el 70 % por defecto | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` |  |
| CP-U58 | pide solo sesiones no pagadas y con monto cargado, de la más nueva a la más vieja | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` |  |
| CP-U59 | un error de la base se propaga | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` |  |
| CP-U60 | con mes filtra desde el 1° a las 00:00 (UTC-3) hasta el 1° del mes siguiente | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` |  |
| CP-U61 | diciembre cierra en enero del año siguiente | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` |  |
| CP-U62 | sin mes ni profesional no aplica filtros | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` |  |
| CP-U63 | con profesional_id filtra por ese profesional | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` |  |
| CP-U64 | con un mes mal formado responde un error de validación (422) | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` | DEF-A10 |
| CP-U65 | agrupa por profesional y suma totales y cantidad de sesiones | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` |  |
| CP-U66 | los totales generales suman lo de todos los profesionales | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` |  |
| CP-U67 | los montos que vienen como texto (numeric de Postgres) se suman como números | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` |  |
| CP-U68 | un mes sin pagos devuelve totales en cero, no un error | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` |  |
| CP-U69 | se calcula con el cliente admin (ve los pagos de todos) en el rango del mes | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` |  |
| CP-U70 | un error de la base se propaga | Pagos: honorarios y liquidación | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` |  |
| CP-U71 | compara con desigualdades estrictas: un turno que empieza justo cuando termina otro NO choca | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U72 | solo compara turnos del mismo consultorio que no estén cancelados | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U73 | el choque se informa con el código 23P01 que el backend traduce a 409 | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U74 | la columna consultorio solo admite 1, 2 o 3 | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U75 | busca choques con < y > estrictos (borde fin = inicio permitido) | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U76 | con un turno superpuesto (aunque sea 1 minuto) → 409 | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U77 | al editar, excluye el propio turno de la búsqueda de choques | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U78 | con la función de la base, manda el rango exacto y el consultorio | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U79 | editar un turno ajeno (RLS no devuelve la fila: PGRST116) → 404 | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U80 | mover un turno a un horario ocupado (23P01) → 409 con el mensaje de la base | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U81 | cancelar un turno ajeno o inexistente → 404 (no  | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` | DEF-A04 |
| CP-U82 | un turno ajeno en el calendario no trae paciente, notas ni tipo | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U83 | las sesiones sin turno aparecen en la agenda con fin = inicio + duración (50 min por defecto) | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U84 | una sesión que ya tiene un turno activo no se duplica en la agenda | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U85 | si el consultorio está ocupado no se inserta la sesión | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U86 | si no se puede crear el turno, la sesión recién insertada se deshace | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U87 | sin duración, el turno creado dura 50 minutos | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U88 | la sesión se registra a nombre de quien la crea, aunque el body diga otro profesional | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U89 | actualizar ignora campos fuera de la lista editable (paciente, profesional) | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U90 | la primera página (por defecto) pide las filas 0 a 19 | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U91 | la última página con 45 pacientes pide 40–59 y la paginación informa 3 páginas | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U92 | page y limit que llegan como texto desde la query se interpretan como números | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U93 | sin pacientes la paginación da 0 páginas | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U94 | page=%p se trata como la página 1 | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` | DEF-A11 |
| CP-U95 | limit se acota a un máximo razonable (100) | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` | DEF-A11 |
| CP-U96 | solo lista pacientes sin baja lógica (deleted_at null) | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U97 | filtra por estado  | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U98 | la búsqueda filtra por nombre, apellido o DNI | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U99 | una búsqueda vacía o de solo símbolos no agrega filtro | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U100 | listar usa siempre el cliente del usuario (RLS), nunca el admin, aunque sea admin | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U101 | obtener un paciente que RLS no deja ver (PGRST116) → 404 | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U102 | obtener no devuelve pacientes dados de baja | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U103 | actualizar un paciente ajeno (PGRST116) → 404 | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U104 | actualizar con obra social vacía la guarda como null | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U105 | actualizar no permite tocar deleted_at ni created_by desde el body | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U106 | marca deleted_at y nunca hace un DELETE | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U107 | un paciente que RLS no deja ver → 404 y no se toca el cliente admin | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U108 | dar de baja dos veces: la segunda vez da 404 (ya no está activo) | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U109 | %s filtra por el paciente pedido | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U110 | listarSesiones pagina igual que el listado de pacientes | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U111 | %s propaga un error de la base | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U112 | pendiente → aceptada deja la derivación activa (da acceso al paciente) y registra la fecha | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U113 | pendiente → rechazada no da acceso al paciente (activa = false) | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U114 | responder una derivación ya %s → 409 | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U115 | rechazada → completada no está permitido (409) | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U116 | completar dos veces → 409 la segunda | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U117 | aceptada → completada cierra el acceso (activa = false) | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U118 | derivarse a uno mismo → 422 sin consultar la base | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U119 | listar trae las enviadas y las recibidas del profesional | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U120 | listarPendientes trae solo las recibidas en estado pendiente | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U121 | %s propaga un error de la base | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U122 | la regla de acceso exige estado aceptada y derivación activa | Pacientes (paginado, baja lógica, aislamiento) y derivaciones | Unitaria | `server/__tests__/unit/pacientes-derivaciones.test.js` |  |
| CP-U123 | credenciales incorrectas → 401 genérico, sin el mensaje de Supabase | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U124 | login correcto devuelve solo los tokens necesarios y el perfil | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U125 | el perfil del login no pide columnas sensibles | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U126 | el registro público siempre crea rol profesional, aunque el body pida admin | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U127 | si falla el alta en profesionales se borra el usuario de Auth (rollback) | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U128 | email repetido → 409 con mensaje claro (y rollback) | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U129 | si Supabase Auth rechaza el usuario → 400 y no se inserta nada | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U130 | si el login automático tras el registro falla, devuelve el perfil sin sesión | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U131 | un admin puede registrar un profesional con 0 % de honorarios | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` | DEF-A01 |
| CP-U132 | refresh con un token inválido → 401 | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U133 | refresh correcto devuelve los nuevos tokens | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U134 | logout revoca el token del usuario | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U135 | logout sin token no llama a Supabase | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U136 | el link de recuperación apunta a /reset-password del frontend | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U137 | cambiar la contraseña con error de Supabase → 400 | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U138 | cambiar la contraseña correctamente no lanza | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U139 | sin acceso al paciente → 403 y no se firma ninguna URL | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U140 | la extensión sale del mime_type, no del nombre que manda el cliente | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U141 | un mime desconocido se guarda como .bin (nunca con la extensión del cliente) | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U142 | devuelve la URL de subida y registra la metadata a nombre de quien sube | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U143 | la URL de descarga dura como máximo 5 minutos (300 s) | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U144 | descargar un archivo que RLS no deja ver → 404 sin firmar URL | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U145 | descargar un archivo deja registro en logs_acceso | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` | DEF-A02 |
| CP-U146 | registrarAcceso inserta y espera el log antes de seguir | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U147 | sin paciente en la ruta no registra nada y sigue | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U148 | si falla el log, el pedido sigue igual | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U149 | ver el detalle de una sesión deja registro en logs_acceso | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` | DEF-A02 |
| CP-U150 | un profesional no puede editar a otro (403) | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U151 | un profesional no puede cambiarse su propio porcentaje de honorarios | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U152 | un admin sí puede cambiar el porcentaje de otro | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U153 | nadie puede cambiarse el rol ni el estado activo por PATCH | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U154 | desactivar es una baja lógica (activo = false), no un borrado | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U155 | listar devuelve solo profesionales activos | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U156 | crear descarta campos fuera de la allowlist y firma con el profesional actual | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U157 | actualizar no permite mover la evaluación a otro paciente | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U158 | obtener una evaluación ajena (PGRST116) → 404 | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U159 | la primera prueba se agrega con orden 0 y la siguiente con el orden siguiente | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U160 | actualizar una prueba solo cambia los campos enviados | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U161 | generar el informe de una evaluación inexistente → 404 sin llamar a la IA | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U162 | el informe generado se guarda en la evaluación | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U163 | si la IA falla, no se pisa el informe anterior | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U164 | un bloque  | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U165 | un JSON suelto con  | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U166 | %s → no es una acción (null), no rompe | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U167 | el formato nativo <longcat_tool_call> se interpreta con sus argumentos | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U168 | limpiarTexto saca los bloques de acción del texto que ve la persona | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U169 | un error embebido de saturación → 502 con mensaje amable, sin el detalle del proveedor | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U170 | sin choices ni error → 502  | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U171 | contenido nulo del modelo → error 502 claro, no un TypeError | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` | DEF-A12 |
| CP-U172 | ante saturación (límite de uso) reintenta hasta 3 veces y usa la respuesta buena | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U173 | un error que no es de saturación no se reintenta | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U174 | si sigue saturado después de 3 intentos, se rinde con 502 | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U175 | con JSON mal formado del modelo no se ejecuta ninguna acción | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U176 | encadena como máximo 5 acciones y después pide un resumen en texto | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U177 | si una acción falla, el error queda en tool_results y el chat sigue | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U178 | un formulario corta el loop sin texto del modelo | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U179 | el nombre del profesional no puede inyectar instrucciones en el prompt de sistema | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U180 | el prompt prohíbe inventar datos clínicos de pacientes | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U181 | un token vencido (más de 5 minutos) se rechaza y no da de baja a nadie | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U182 | un token creado para otra acción no sirve para dar de baja | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U183 | aunque el modelo pida la baja 5 veces seguidas, nunca se ejecuta sin el botón | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U184 | %s | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U185 | si faltan datos, el prompt los marca como no especificados en vez de dejarlos vacíos | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U186 | una prueba sin resultados se marca  | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U187 | el prompt prohíbe inventar puntajes, percentiles y diagnósticos | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U188 | las pruebas van en el orden en que las cargó la profesional | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U189 | un PDF con texto nativo se lee localmente, sin llamar a la IA | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U190 | un PDF escaneado (menos de 40 caracteres) cae al OCR por IA | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U191 | ante un 429 (límite de uso) prueba el segundo modelo | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U192 | un error que no es 429 no se reintenta | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U193 | si no se puede descargar el PDF, el error lo dice | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U194 | el día anterior al cumpleaños todavía no los cumplió | IA con modelo mockeado (acciones, confirmación, informe) | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` | DEF-A15 |
| CP-U195 | cambiar la hora mueve el turno conservando la duración | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U196 |  | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U197 | si no cambia nada de la agenda, no se toca el turno | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U198 | una sesión sin turno que pasa a tener consultorio crea su turno | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U199 | si el nuevo horario choca (23P01) → 409 y la sesión NO se modifica | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U200 | una sesión vieja sin vínculo se asocia al único turno candidato a menos de 12 h | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U201 | actualizar una sesión ajena (PGRST116) → 404 | Turnos, consultorios y sesiones | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U202 | devuelve el valor inicial de entrada, sin esperar | Búsqueda con debounce | Unitaria | `client/src/hooks/useDebounce.test.js` |  |
| CP-U203 | a los 399 ms todavía no cambió (límite - 1) | Búsqueda con debounce | Unitaria | `client/src/hooks/useDebounce.test.js` |  |
| CP-U204 | a los 400 ms exactos toma el valor nuevo (límite) | Búsqueda con debounce | Unitaria | `client/src/hooks/useDebounce.test.js` |  |
| CP-U205 | si se sigue escribiendo, solo se queda con el último valor | Búsqueda con debounce | Unitaria | `client/src/hooks/useDebounce.test.js` |  |
| CP-U206 | al desmontar cancela el temporizador pendiente | Búsqueda con debounce | Unitaria | `client/src/hooks/useDebounce.test.js` |  |
| CP-U207 | un 500 con { error } muestra ese mensaje | Mensajes de error | Unitaria | `client/src/utils/errores.casos.test.js` |  |
| CP-U208 | un error { code, message } devuelve el message como texto | Mensajes de error | Unitaria | `client/src/utils/errores.casos.test.js` |  |
| CP-U209 | un timeout (sin respuesta) avisa que no hubo conexión | Mensajes de error | Unitaria | `client/src/utils/errores.casos.test.js` |  |
| CP-U210 | sin error (undefined) usa el mensaje de respaldo | Mensajes de error | Unitaria | `client/src/utils/errores.casos.test.js` |  |
| CP-U211 | un 422 con items sin msg los ignora y usa el resto | Mensajes de error | Unitaria | `client/src/utils/errores.casos.test.js` |  |
| CP-U212 | un error vacío ( | Mensajes de error | Unitaria | `client/src/utils/errores.casos.test.js` |  |
| CP-U213 | el mensaje nunca es un objeto (no se ve  | Mensajes de error | Unitaria | `client/src/utils/errores.casos.test.js` |  |
| CP-U214 | acepta el formato viejo de express-validator (param en vez de path) | Mensajes de error | Unitaria | `client/src/utils/errores.casos.test.js` |  |
| CP-U215 | dos errores del mismo campo marcan el campo una sola vez | Mensajes de error | Unitaria | `client/src/utils/errores.casos.test.js` |  |
| CP-U216 | sin setError igual muestra el toast con el mensaje | Mensajes de error | Unitaria | `client/src/utils/errores.casos.test.js` |  |
| CP-U217 | con sesión manda Authorization: Bearer <token> | Cliente HTTP (token, 401, red) | Unitaria | `client/src/services/api.casos.test.js` |  |
| CP-U218 | sin sesión no manda Authorization | Cliente HTTP (token, 401, red) | Unitaria | `client/src/services/api.casos.test.js` |  |
| CP-U219 | las rutas de IA tienen 60 s de timeout y el resto 15 s | Cliente HTTP (token, 401, red) | Unitaria | `client/src/services/api.casos.test.js` |  |
| CP-U220 | un 500 no intenta renovar la sesión y llega con un mensaje legible | Cliente HTTP (token, 401, red) | Unitaria | `client/src/services/api.casos.test.js` |  |
| CP-U221 | con la red caída el mensaje dice que no hubo conexión | Cliente HTTP (token, 401, red) | Unitaria | `client/src/services/api.casos.test.js` |  |
| CP-U222 | un 401 sin refresh token cierra la sesión y avisa | Cliente HTTP (token, 401, red) | Unitaria | `client/src/services/api.casos.test.js` |  |
| CP-U223 | un 401 que ya se reintentó una vez no vuelve a renovar (sin loop infinito) | Cliente HTTP (token, 401, red) | Unitaria | `client/src/services/api.casos.test.js` |  |
| CP-U224 | un 403 no renueva la sesión ni la cierra | Cliente HTTP (token, 401, red) | Unitaria | `client/src/services/api.casos.test.js` |  |
| CP-U225 | mientras el login está en curso isLoading es true (evita el doble envío) | Sesión en el cliente | Unitaria | `client/src/store/authStore.casos.test.js` |  |
| CP-U226 | persiste solo profesional y tokens (no isLoading ni error) | Sesión en el cliente | Unitaria | `client/src/store/authStore.casos.test.js` |  |
| CP-U227 | sin access_token en localStorage no se considera autenticado aunque haya perfil | Sesión en el cliente | Unitaria | `client/src/store/authStore.casos.test.js` |  |
| CP-U228 | un profesional común no es admin | Sesión en el cliente | Unitaria | `client/src/store/authStore.casos.test.js` |  |
| CP-U229 | logout limpia la sesión aunque el servidor no responda | Sesión en el cliente | Unitaria | `client/src/store/authStore.casos.test.js` |  |
| CP-U230 | un registro sin sesión automática no autentica (autoLogin false) | Sesión en el cliente | Unitaria | `client/src/store/authStore.casos.test.js` |  |
| CP-U231 | con la red caída el login falla con un mensaje legible | Sesión en el cliente | Unitaria | `client/src/store/authStore.casos.test.js` |  |
| CP-U232 | sin sesión, %s redirige a /login | Rutas protegidas y por rol | Unitaria (componente) | `client/src/App.rutas.test.jsx` |  |
| CP-U233 | con perfil guardado pero sin token en localStorage también redirige a /login | Rutas protegidas y por rol | Unitaria (componente) | `client/src/App.rutas.test.jsx` |  |
| CP-U234 | con sesión, %s redirige al inicio | Rutas protegidas y por rol | Unitaria (componente) | `client/src/App.rutas.test.jsx` |  |
| CP-U235 | /reset-password se puede abrir sin sesión | Rutas protegidas y por rol | Unitaria (componente) | `client/src/App.rutas.test.jsx` |  |
| CP-U236 | una ruta inexistente con sesión vuelve al inicio | Rutas protegidas y por rol | Unitaria (componente) | `client/src/App.rutas.test.jsx` |  |
| CP-U237 | un admin puede entrar a /admin | Rutas protegidas y por rol | Unitaria (componente) | `client/src/App.rutas.test.jsx` |  |
| CP-U238 | un profesional que entra a /admin es redirigido al inicio | Rutas protegidas y por rol | Unitaria (componente) | `client/src/App.rutas.test.jsx` | DEF-A16 |
| CP-U239 | email y contraseña son obligatorios: con el form vacío no es válido | Login y registro | Unitaria (componente) | `client/src/components/auth/LoginRegister.test.jsx` |  |
| CP-U240 | un email inválido (%s) no pasa la validación del navegador | Login y registro | Unitaria (componente) | `client/src/components/auth/LoginRegister.test.jsx` |  |
| CP-U241 | durante el envío el botón se deshabilita y dice  | Login y registro | Unitaria (componente) | `client/src/components/auth/LoginRegister.test.jsx` |  |
| CP-U242 | con credenciales incorrectas muestra el mensaje del servidor | Login y registro | Unitaria (componente) | `client/src/components/auth/LoginRegister.test.jsx` |  |
| CP-U243 | recuperar contraseña muestra la misma respuesta genérica (no revela si el email existe) | Login y registro | Unitaria (componente) | `client/src/components/auth/LoginRegister.test.jsx` |  |
| CP-U244 | si falla el envío del link, avisa con un mensaje entendible | Login y registro | Unitaria (componente) | `client/src/components/auth/LoginRegister.test.jsx` |  |
| CP-U245 | nombre, apellido, email, contraseña y su repetición son obligatorios | Login y registro | Unitaria (componente) | `client/src/components/auth/LoginRegister.test.jsx` |  |
| CP-U246 | la contraseña exige un mínimo de 8 caracteres (mismo límite que el backend) | Login y registro | Unitaria (componente) | `client/src/components/auth/LoginRegister.test.jsx` |  |
| CP-U247 | durante el envío el botón dice "Creando cuenta..." y está deshabilitado | Login y registro | Unitaria (componente) | `client/src/components/auth/LoginRegister.test.jsx` |  |
| CP-U248 | un email repetido muestra el mensaje del servidor | Login y registro | Unitaria (componente) | `client/src/components/auth/LoginRegister.test.jsx` |  |
| CP-U249 | con el formulario vacío marca los obligatorios y no llama al servidor | Formulario de paciente | Unitaria (componente) | `client/src/pages/NuevoPacientePage.test.jsx` |  |
| CP-U250 | DNI con %s muestra el formato esperado y no se envía | Formulario de paciente | Unitaria (componente) | `client/src/pages/NuevoPacientePage.test.jsx` |  |
| CP-U251 | teléfono con %s se rechaza | Formulario de paciente | Unitaria (componente) | `client/src/pages/NuevoPacientePage.test.jsx` |  |
| CP-U252 | con datos válidos (DNI de 7 dígitos, límite) envía una sola vez | Formulario de paciente | Unitaria (componente) | `client/src/pages/NuevoPacientePage.test.jsx` |  |
| CP-U253 | mientras guarda, el botón se deshabilita: un doble clic crea un solo paciente | Formulario de paciente | Unitaria (componente) | `client/src/pages/NuevoPacientePage.test.jsx` |  |
| CP-U254 | un DNI repetido (409) se informa sin perder lo cargado | Formulario de paciente | Unitaria (componente) | `client/src/pages/NuevoPacientePage.test.jsx` |  |
| CP-U255 | un 422 del servidor marca el campo rechazado | Formulario de paciente | Unitaria (componente) | `client/src/pages/NuevoPacientePage.test.jsx` |  |
| CP-U257 | con datos completos guarda el PDF con un nombre de archivo legible | Exportar informe a PDF | Unitaria | `client/src/utils/exportarInformePdf.test.js` |  |
| CP-U258 | sin informe generado no revienta y guarda igual | Exportar informe a PDF | Unitaria | `client/src/utils/exportarInformePdf.test.js` |  |
| CP-U259 | sin matrícula no imprime la línea  | Exportar informe a PDF | Unitaria | `client/src/utils/exportarInformePdf.test.js` |  |
| CP-U260 | un informe largo agrega páginas en vez de salirse de la hoja | Exportar informe a PDF | Unitaria | `client/src/utils/exportarInformePdf.test.js` |  |
| CP-U261 | con fecha de evaluación nula no revienta | Exportar informe a PDF | Unitaria | `client/src/utils/exportarInformePdf.test.js` |  |
| CP-U262 | sin paciente ni profesional cargados no revienta y guarda el archivo | Exportar informe a PDF | Unitaria | `client/src/utils/exportarInformePdf.test.js` |  |
| CP-U263 | un doble clic en  | Confirmación de baja desde el chat | Unitaria (componente) | `client/src/components/chat/ConfirmCard.casos.test.jsx` |  |
| CP-U264 | un resultado de eliminar_paciente sin type  | Confirmación de baja desde el chat | Unitaria (componente) | `client/src/components/chat/ConfirmCard.casos.test.jsx` |  |
| CP-U265 | la tarjeta advierte que la acción no se puede deshacer | Confirmación de baja desde el chat | Unitaria (componente) | `client/src/components/chat/ConfirmCard.casos.test.jsx` |  |
| CP-U266 | un 422 de registro no devuelve la contraseña enviada | Capa HTTP: auth, roles, validación y formato de error | Unitaria | `server/__tests__/unit/rutas-api.test.js` | DEF-A18 |
| CP-U267 | el listado general no expone el porcentaje de honorarios de los demás | Auth, archivos, auditoría, profesionales y evaluaciones | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` | DEF-A17 |
| CP-U268 | con contraseñas distintas no llama al servidor y explica el motivo | Registro: confirmación de contraseña | Unitaria (componente) | `client/src/components/auth/LoginRegister.test.jsx` |  |
| CP-U269 | el aviso aparece mientras no coinciden y se va cuando se corrige | Registro: confirmación de contraseña | Unitaria (componente) | `client/src/components/auth/LoginRegister.test.jsx` |  |
| CP-U270 | corregir cualquiera de los dos campos borra el aviso del envío | Registro: confirmación de contraseña | Unitaria (componente) | `client/src/components/auth/LoginRegister.test.jsx` |  |
| CP-U271 | con contraseñas iguales registra y la repetición no viaja en el body | Registro: confirmación de contraseña | Unitaria (componente) | `client/src/components/auth/LoginRegister.test.jsx` |  |
| CP-U272 | el botón de mostrar contraseña muestra los dos campos | Registro: confirmación de contraseña | Unitaria (componente) | `client/src/components/auth/LoginRegister.test.jsx` |  |
| CP-U273 | la repetición tiene la misma restricción de largo y autocompletado que la contraseña | Registro: confirmación de contraseña | Unitaria (componente) | `client/src/components/auth/LoginRegister.test.jsx` |  |
| CP-U274 | por defecto (agenda) excluye los turnos cancelados | Historial: turnos cancelados | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U275 | con incluirCancelados los propios cancelados también vienen | Historial: turnos cancelados | Unitaria | `server/__tests__/unit/turnos-consultorios.test.js` |  |
| CP-U276 | GET /turnos: incluir_cancelados acepta true/false y rechaza otro valor | Historial: turnos cancelados | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U277 | urlRegistrarSesion arma el link a Nueva sesión con el turno vinculado y su duración | Registrar sesión desde un turno | Unitaria | `client/src/utils/turnos.test.js` |  |
| CP-U278 | sin tipo ni consultorio usa tratamiento y consultorio 1 | Registrar sesión desde un turno | Unitaria | `client/src/utils/turnos.test.js` |  |
| CP-U279 | cada estado de turno tiene color y nombre | Colores de estado compartidos | Unitaria | `client/src/utils/turnos.test.js` |  |
| CP-U280 | descarta la ocupación ajena y lista de lo más reciente a lo más viejo, agrupado por mes | Historial de turnos | Unitaria (componente) | `client/src/pages/HistorialPage.test.jsx` |  |
| CP-U281 | el período por defecto es el último mes hasta ahora, con cancelados | Historial de turnos | Unitaria (componente) | `client/src/pages/HistorialPage.test.jsx` |  |
| CP-U282 | con 3 y 12 meses pide desde la fecha correcta | Historial de turnos | Unitaria (componente) | `client/src/pages/HistorialPage.test.jsx` |  |
| CP-U283 | el período no ofrece más de 12 meses | Historial de turnos | Unitaria (componente) | `client/src/pages/HistorialPage.test.jsx` |  |
| CP-U284 | el filtro de estado (realizado, ausente, cancelado, sin cerrar) muestra solo esos | Historial de turnos | Unitaria (componente) | `client/src/pages/HistorialPage.test.jsx` |  |
| CP-U285 | el filtro de tipo muestra solo ese tipo | Historial de turnos | Unitaria (componente) | `client/src/pages/HistorialPage.test.jsx` |  |
| CP-U286 | la búsqueda por paciente ignora mayúsculas y tildes | Historial de turnos | Unitaria (componente) | `client/src/pages/HistorialPage.test.jsx` |  |
| CP-U287 | "solo sin sesión registrada" saca los que ya tienen sesión | Historial de turnos | Unitaria (componente) | `client/src/pages/HistorialPage.test.jsx` |  |
| CP-U288 | sin turnos en el período muestra el estado vacío | Historial de turnos | Unitaria (componente) | `client/src/pages/HistorialPage.test.jsx` |  |
| CP-U289 | si los filtros no dejan nada, también muestra el estado vacío | Historial de turnos | Unitaria (componente) | `client/src/pages/HistorialPage.test.jsx` |  |
| CP-U290 | si falla el pedido muestra un error entendible | Historial de turnos | Unitaria (componente) | `client/src/pages/HistorialPage.test.jsx` |  |
| CP-U291 | cada acción lleva a la ruta correcta | Historial de turnos | Unitaria (componente) | `client/src/pages/HistorialPage.test.jsx` |  |
| CP-U292 | el paciente enlaza a su ficha y se ven tipo, consultorio y estado | Historial de turnos | Unitaria (componente) | `client/src/pages/HistorialPage.test.jsx` |  |
| CP-U293 | mientras carga muestra el esqueleto | Historial de turnos | Unitaria (componente) | `client/src/pages/HistorialPage.test.jsx` |  |
| CP-U294 | un profesional ve "Historial" en el menú y lo lleva a /historial | Historial: acceso desde el menú | Unitaria (componente) | `client/src/components/chat/ChatSidebar.test.jsx` |  |
| CP-U295 | para un admin, "Historial" queda antes de "Administración" | Historial: acceso desde el menú | Unitaria (componente) | `client/src/components/chat/ChatSidebar.test.jsx` |  |
| CP-U296 | los 422 de signup, register, change-password, pacientes y turnos traen solo campo y mensaje, sin el valor enviado | Errores de validación (DEF-A18) | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U297 | erroresDeValidacion devuelve solo path y msg | Errores de validación (DEF-A18) | Unitaria | `server/__tests__/unit/validacion.test.js` |  |
| CP-U298 | si falla el log de la descarga, la descarga sigue y queda el error en consola | Auditoría de accesos (DEF-A02) | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U299 | el admin ve el porcentaje de honorarios de todos | Porcentaje de honorarios (DEF-A17) | Unitaria | `server/__tests__/unit/auth-archivos-auditoria.test.js` |  |
| CP-U300 | porcentajeHonorarios: 0, 100, decimales, texto y sin valor → 70; fuera de 0–100 → 422 | Honorarios (DEF-A01) | Unitaria | `server/__tests__/unit/honorarios.test.js` |  |
| CP-U301 | el reparto en centavos suma exactamente el total ($10,05, $0,01, $100,01, 0 % y 100 %) | Honorarios (DEF-A14) | Unitaria | `server/__tests__/unit/pago-honorarios.test.js` |  |
| CP-U302 | el meta viewport no bloquea el zoom | Zoom en móvil (DEF-A19) | Unitaria | `client/src/viewport.test.js` |  |
| CP-U303 | en pantallas chicas los campos usan al menos 16 px | Zoom en móvil (DEF-A19) | Unitaria | `client/src/viewport.test.js` |  |
| CP-U304 | el modal se anuncia como diálogo con el título como nombre | Modal accesible (DEF-A20) | Unitaria (componente) | `client/src/components/ui/Modal.test.jsx` |  |
| CP-U305 | Escape cierra el modal y el foco vuelve al botón que lo abrió | Modal accesible (DEF-A20) | Unitaria (componente) | `client/src/components/ui/Modal.test.jsx` |  |
| CP-U306 | el botón Cerrar también devuelve el foco | Modal accesible (DEF-A20) | Unitaria (componente) | `client/src/components/ui/Modal.test.jsx` |  |
| CP-U307 | cerrado no renderiza nada | Modal accesible (DEF-A20) | Unitaria (componente) | `client/src/components/ui/Modal.test.jsx` |  |
| CP-U308 | "Nuevo turno" abre un diálogo y cada campo se encuentra por su label | Formulario de turno accesible (DEF-A20) | Unitaria (componente) | `client/src/pages/AgendaPage.test.jsx` |  |
| CP-U309 | la regla del DNI acepta 7 y 8 dígitos y rechaza 6, 9, puntos, espacios, letras y vacío | Regla única del DNI | Unitaria | `server/__tests__/unit/dni.test.js` |  |
| CP-U310 | el mensaje dice el formato esperado y la expresión no tiene flags | Regla única del DNI | Unitaria | `server/__tests__/unit/dni.test.js` |  |
| CP-U311 | POST y PATCH /pacientes con DNI inválido responden el mensaje de la regla única | Regla única del DNI | Unitaria | `server/__tests__/unit/rutas-api.test.js` |  |
| CP-U312 | crear_paciente desde el chat con DNI inválido no inserta y responde el mensaje de la regla única | Regla única del DNI | Unitaria | `server/__tests__/unit/ia-modelo-mockeado.test.js` |  |
| CP-U313 | validarDni acepta 7 y 8 dígitos y devuelve el mensaje en los demás casos | Regla única del DNI | Unitaria | `client/src/utils/dni.test.js` |  |
| CP-U314 | el patrón para react-hook-form usa la misma expresión y mensaje | Regla única del DNI | Unitaria | `client/src/utils/dni.test.js` |  |
| CP-U315 | client y server tienen exactamente la misma regla y el mismo mensaje | Regla única del DNI (contrato client–server) | Unitaria | `client/src/utils/dni.test.js` |  |
| CP-U316 | el formulario del chat con DNI inválido avisa con el mensaje de la regla única y no envía | Regla única del DNI | Unitaria (componente) | `client/src/components/chat/PacienteFormCard.test.jsx` |  |
| CP-U317 | el formulario del chat con un DNI válido envía el alta | Regla única del DNI | Unitaria (componente) | `client/src/components/chat/PacienteFormCard.test.jsx` |  |
| CP-U318 | registrar_sesion del chat con duración, monto, fecha o tipo inválidos rechaza con el mismo mensaje que POST /sesiones | Chat y formularios por el mismo camino (SoC) | Unitaria | `server/__tests__/unit/chat-servicios.test.js` |  |
| CP-U319 | una sesión válida del chat se crea con SesionService.crear, sin consultorio | Chat y formularios por el mismo camino (SoC) | Unitaria | `server/__tests__/unit/chat-servicios.test.js` |  |
| CP-U320 | el chat corre exactamente las reglas de la ruta | Chat y formularios por el mismo camino (SoC) | Unitaria | `server/__tests__/unit/chat-servicios.test.js` |  |
| CP-U321 | crear_paciente del chat usa PacienteService.crear con los datos saneados | Chat y formularios por el mismo camino (SoC) | Unitaria | `server/__tests__/unit/chat-servicios.test.js` |  |
| CP-U322 | crear_paciente sin fecha de nacimiento → 422 con el mensaje del formulario | Chat y formularios por el mismo camino (SoC) | Unitaria | `server/__tests__/unit/chat-servicios.test.js` |  |
| CP-U323 | crear_turno del chat usa TurnoService.crear con fin = inicio + duración | Chat y formularios por el mismo camino (SoC) | Unitaria | `server/__tests__/unit/chat-servicios.test.js` |  |
| CP-U324 | crear_turno del chat con consultorio 4 → 422 | Chat y formularios por el mismo camino (SoC) | Unitaria | `server/__tests__/unit/chat-servicios.test.js` |  |
| CP-U325 | asegurarAcceso: ajeno o dado de baja → 404 | Acceso a pacientes centralizado | Unitaria | `server/__tests__/unit/chat-servicios.test.js` |  |
| CP-U326 | buscar no filtra con un término vacío o de solo símbolos | Acceso a pacientes centralizado | Unitaria | `server/__tests__/unit/chat-servicios.test.js` |  |
| CP-U327 | ver_paciente y buscar_pacientes del chat leen a través de PacienteService | Acceso a pacientes centralizado | Unitaria | `server/__tests__/unit/chat-servicios.test.js` |  |
| CP-U328 | no se firma una URL de subida para un paciente dado de baja | Archivos (DEF-A22) | Unitaria | `server/__tests__/unit/chat-servicios.test.js` |  |
| CP-U329 | los códigos de Supabase/Postgres se traducen a tipos propios | Capa de repositorios | Unitaria | `server/__tests__/unit/repositorios.test.js` |  |
| CP-U330 | datosDe devuelve los datos cuando no hay error | Capa de repositorios | Unitaria | `server/__tests__/unit/repositorios.test.js` |  |
| CP-U331 | un choque de consultorio al crear llega como CHOQUE_HORARIO | Capa de repositorios | Unitaria | `server/__tests__/unit/repositorios.test.js` |  |
| CP-U332 | la ocupación pide el rango a la función de la base | Capa de repositorios | Unitaria | `server/__tests__/unit/repositorios.test.js` |  |
| CP-U333 | obras sociales: solo activas, por nombre, con el cliente de servicio | Capa de repositorios | Unitaria | `server/__tests__/unit/repositorios.test.js` |  |
| CP-U334 | un error de la base llega como ErrorDeDatos con el mensaje original | Capa de repositorios | Unitaria | `server/__tests__/unit/repositorios.test.js` |  |
| CP-A01 | GET /health responde ok | Sin credenciales (no llegan a Supabase) | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A02 | POST /auth/login como profesional | Autenticación (necesita credenciales de un proyecto de test) | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A03 | POST /auth/login con email inválido → 422 | Sin credenciales (no llegan a Supabase) | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A04 | POST /auth/login con JSON mal formado → 400 | Sin credenciales (no llegan a Supabase) | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` | DEF-A06 |
| CP-A05 | POST /auth/login con contraseña incorrecta → 401 genérico | Autenticación (necesita credenciales de un proyecto de test) | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A06 | POST /auth/signup vacío → 422 con todos los obligatorios | Sin credenciales (no llegan a Supabase) | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A07 | POST /auth/forgot-password con email inválido → 422 | Sin credenciales (no llegan a Supabase) | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A08 | POST /auth/refresh con token inválido → 401 | Autenticación (necesita credenciales de un proyecto de test) | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A09 | GET /auth/me sin token → 401 | Sin credenciales (no llegan a Supabase) | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A10 | GET /pacientes con esquema Basic → 401 | Sin credenciales (no llegan a Supabase) | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A11 | GET /auth/me con token inválido → 401 | Autenticación (necesita credenciales de un proyecto de test) | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A12 | GET /pacientes (contrato del listado) | Pacientes y aislamiento | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A13 | POST /pacientes crea ZZ-TEST | Pacientes y aislamiento | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A14 | POST /pacientes con el mismo DNI → 409 | Pacientes y aislamiento | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A15 | GET paciente de A pedido por el profesional B → 404 | Pacientes y aislamiento | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A16 | GET paciente de un profesional pedido por un admin → 404 | Pacientes y aislamiento | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A17 | GET /pacientes/abc (id no UUID) → 422 | Pacientes y aislamiento | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` | DEF-A05 |
| CP-A18 | GET /pacientes?busqueda=DNI → el duplicado no se creó | Pacientes y aislamiento | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A19 | PATCH /pacientes/:id con estado inválido → 422 | Pacientes y aislamiento | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A20 | GET /turnos: los turnos ajenos no traen datos clínicos | Turnos y consultorios | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A21 | POST /turnos reserva el consultorio 3 | Turnos y consultorios | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A22 | POST /turnos mismo consultorio y horario → 409 | Turnos y consultorios | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A23 | POST /turnos con consultorio 4 → 422 | Turnos y consultorios | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A24 | POST /turnos con fin anterior al inicio → 422 | Turnos y consultorios | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` | DEF-A03 |
| CP-A25 | POST /turnos que empieza justo cuando termina el otro → 201 | Turnos y consultorios | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A26 | GET /derivaciones (contrato) | Permisos, pagos y archivos | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A27 | POST /archivos/upload-url de 10 MB + 1 byte → 422 | Permisos, pagos y archivos | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A28 | POST /pagos con monto 0 → 422 | Permisos, pagos y archivos | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A29 | GET /pagos/liquidacion como profesional → 403 | Permisos, pagos y archivos | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A30 | DELETE /pacientes/:id hace la baja lógica | Limpieza | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A31 | POST /turnos con 1 minuto de solape → 409 | Turnos y consultorios | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A32 | GET /pagos/liquidacion como admin (contrato) | Permisos, pagos y archivos | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A33 | GET /pagos/liquidacion con mes inválido → 422 | Permisos, pagos y archivos | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` | DEF-A10 |
| CP-A34 | GET /profesionales (contrato, sin datos sensibles) | Permisos, pagos y archivos | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` | DEF-A17 |
| CP-A35 | DELETE /profesionales/:id como profesional → 403 | Permisos, pagos y archivos | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A36 | POST /ia/confirmar con un token inventado → 400 | Permisos, pagos y archivos | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A37 | GET ruta inexistente → 404 | Sin credenciales (no llegan a Supabase) | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A38 | POST /auth/login como admin | Autenticación (necesita credenciales de un proyecto de test) | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A39 | POST /auth/login como segundo profesional | Autenticación (necesita credenciales de un proyecto de test) | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A40 | GET del paciente dado de baja → 404 | Limpieza | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A41 | Limpieza: cancelar turnoZZ | Limpieza | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` |  |
| CP-A42 | POST /auth/signup con contraseña corta → 422 sin devolverla | Sin credenciales (no llegan a Supabase) | API (Newman) | `testing/api/MentesQueAprenden.postman_collection.json` | DEF-A18 |
| CP-E01 | sin sesión, una ruta protegida manda a /login | Sesión (E2E) | E2E | `client/e2e/sesion.e2e.js` |  |
| CP-E02 | cerrar sesión vuelve al login y Atrás no reabre la app | Sesión (E2E) | E2E | `client/e2e/sesion.e2e.js` |  |
| CP-E03 | crear paciente → aparece en el listado → baja lógica | Pacientes (E2E) | E2E | `client/e2e/pacientes.e2e.js` |  |
| CP-E04 | un turno en el consultorio 3 se crea; el mismo consultorio y horario se rechaza | Turnos (E2E) | E2E | `client/e2e/turnos.e2e.js` |  |
| CP-E05 | el profesional 2 no ve el paciente del 1; con la derivación aceptada sí | Aislamiento y derivación (E2E) | E2E | `client/e2e/aislamiento.e2e.js` |  |
| CP-E06 | ${ruta} carga sin errores de consola ni pedidos fallidos | Navegabilidad | E2E | `client/e2e/navegabilidad.e2e.js` |  |
| CP-E07 | todas las rutas cargan sin 404, sin errores de consola y sin pedidos fallidos | Navegabilidad | E2E | `client/e2e/navegabilidad.e2e.js` |  |
| CP-E08 | Atrás y F5 mantienen la ruta y la sesión | Navegabilidad | E2E | `client/e2e/navegabilidad.e2e.js` |  |
| CP-E09 | F5 después de crear un paciente no reenvía el formulario | Navegabilidad | E2E | `client/e2e/navegabilidad.e2e.js` |  |
| CP-E10 | humo móvil: login sin desbordes horizontales | Móvil y sin red | E2E | `client/e2e/movil.e2e.js` |  |
| CP-E11 | humo móvil: inicio y agenda cargan con la barra inferior | Móvil y sin red | E2E | `client/e2e/movil.e2e.js` |  |
| CP-E12 | sin red: enviar el alta de paciente avisa, no pierde lo cargado y no duplica al reintentar | Móvil y sin red | E2E | `client/e2e/movil.e2e.js` |  |
| CP-E13 | login sin violaciones serious/critical | Accesibilidad automática | E2E (accesibilidad) | `client/e2e/accesibilidad.e2e.js` |  |
| CP-E14 | inicio sin violaciones serious/critical | Accesibilidad automática | E2E (accesibilidad) | `client/e2e/accesibilidad.e2e.js` |  |
| CP-E15 | pacientes sin violaciones serious/critical | Accesibilidad automática | E2E (accesibilidad) | `client/e2e/accesibilidad.e2e.js` |  |
| CP-E16 | agenda sin violaciones serious/critical | Accesibilidad automática | E2E (accesibilidad) | `client/e2e/accesibilidad.e2e.js` |  |
| CP-E17 | el historial se abre desde el menú y no muestra la ocupación de otros profesionales | Historial de turnos | E2E | `client/e2e/navegabilidad.e2e.js` |  |
| CP-E18 | historial sin violaciones serious/critical | Accesibilidad automática | E2E (accesibilidad) | `client/e2e/accesibilidad.e2e.js` |  |

Totales: 332 IDs unitarios, 42 de API y 18 E2E.
