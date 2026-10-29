# Defectos encontrados por las pruebas automatizadas

Relevamiento del 2026-10-27 sobre `master` (commit `a6d110b` más los tests de esta entrega). Cada defecto tiene un test que describe el comportamiento correcto y está marcado como falla conocida (`test.failing` en Jest, `it.fails` en Vitest, aserción que falla en Newman) con su `DEF-A..`. Cuando se arregla el código, se le saca la marca y queda como test de regresión. El 2026-10-28 se corrigieron 7 (ver la columna Estado).

**Matriz de prioridad (probabilidad × impacto)**

| | Impacto bajo | Impacto medio | Impacto alto |
|---|---|---|---|
| **Probabilidad alta** | media | alta | alta |
| **Probabilidad media** | baja | media | alta |
| **Probabilidad baja** | baja | baja | media |

## Resumen

| ID | Título | Prioridad | Seguridad | Estado |
|---|---|---|---|---|
| DEF-A01 | Un 0 % de honorarios se guarda como 70 % | **Alta** | No | **Corregido** (`b0f0c5f`) |
| DEF-A02 | La descarga de archivos y la vista de sesiones no quedan en el log de accesos | **Alta** | **Sí** | **Corregido** (`4cdc62f`) |
| DEF-A17 | Cualquier profesional ve el porcentaje de honorarios de todos | **Alta** | **Sí** | **Corregido** (`6d9047f`) |
| DEF-A19 | El zoom está bloqueado en móvil (`maximum-scale=1.0`) | **Alta** | No (accesibilidad) | **Corregido** (`70600f0`) |
| DEF-A20 | Formulario de turno sin labels asociados y modales sin `role="dialog"` | **Alta** | No (accesibilidad) | **Corregido** (`bbea9f1`) |
| DEF-A03 | Se acepta un turno que termina antes de empezar | Media | No | Abierto |
| DEF-A14 | El reparto de honorarios no se redondea: se crean o pierden centavos | Media | No | **Corregido** (`fb6adda`) |
| DEF-A18 | Los errores 422 devuelven la contraseña enviada | Media | **Sí** | **Corregido** (`cb82e1d`) |
| DEF-A04 | Cancelar un turno ajeno responde "Turno cancelado" sin cancelar nada | Baja | No | Abierto |
| DEF-A05 | Un id que no es UUID termina en 500 | Baja | No | Abierto |
| DEF-A06 | JSON mal formado o body > 200 kb devuelven 500 | Baja | No | Abierto |
| DEF-A07 | `/pacientes` expone el mensaje interno de la base en los 500 | Baja | **Sí** | Abierto |
| DEF-A08 | `/auth/logout` y `/auth/forgot-password` quedan colgados si Supabase falla | Baja | No | Abierto |
| DEF-A09 | `/auth/refresh` ignora su propia validación | Baja | No | Abierto |
| DEF-A10 | Un `mes` mal formado en pagos/liquidación da 500 | Baja | No | Abierto |
| DEF-A11 | Paginado de pacientes sin normalizar `page` ni tope para `limit` | Baja | Sí (bajo) | Abierto |
| DEF-A12 | Si el modelo devuelve `content: null`, la IA falla con TypeError | Baja | No | Abierto |
| DEF-A13 | Una fecha inexistente (30/02) pasa la validación y da 500 | Baja | No | Abierto |
| DEF-A15 | La edad del paciente suma el año un día antes (zona horaria) | Baja | No | Abierto |
| DEF-A16 | `/admin` no tiene guarda de rol en el cliente | Baja | No (el backend bloquea) | Abierto |
| DEF-A21 | `docs/API.md` no coincide con el código | Baja | No | Abierto |
| DEF-A22 | Se puede pedir una URL para subir un archivo a un paciente dado de baja | Baja | Sí (bajo) | **Corregido** (sin commitear) |

Totales: 22 defectos (5 alta, 3 media, 14 baja), 7 con impacto en seguridad. **Corregidos: 8** (las 5 de prioridad alta, DEF-A14, DEF-A18 y DEF-A22). **Abiertos: 14** (DEF-A03 de prioridad media y 13 de prioridad baja).

---

## DEF-A01 — Un 0 % de honorarios se guarda como 70 %
- **Estado:** **Corregido** en `b0f0c5f`: `porcentajeHonorarios` (`server/src/utils/honorarios.js`): 70 solo si no viene el dato, `"0"` cuenta como 0 y fuera de 0–100 da 422. Tests de regresión: CP-U53, CP-U131, CP-U300.
- **Dónde:** `server/src/services/PagoService.js:80` (`porcentaje_honorarios || 70`) y `server/src/services/AuthService.js:57` (`porcentaje_honorarios || 70.00`).
- **Pasos:** 1) Un admin registra un profesional con `porcentaje_honorarios: 0` (la ruta acepta 0–100). 2) Se cobra una sesión de ese profesional.
- **Esperado:** el profesional cobra $0 y el espacio el 100 %; el alta guarda 0 %.
- **Obtenido:** `0 || 70` da 70: el alta se guarda con 70 % y el cobro reparte 70/30.
- **Evidencia:** CP-U53, CP-U131 (`EV-UNIT-SERVER-1.txt`).
- **Probabilidad:** media · **Impacto:** alto (liquidaciones incorrectas) · **Prioridad:** alta · **Seguridad:** no.

## DEF-A02 — La descarga de archivos y la vista de sesiones no quedan en el log de accesos
- **Estado:** **Corregido** en `4cdc62f`: el insert en `logs_acceso` se espera; si falla, la descarga o la sesión se devuelven igual y queda un `console.error`. No había otros logs sin esperar. Tests de regresión: CP-U145, CP-U149, CP-U298.
- **Dónde:** `server/src/services/ArchivoService.js:86` y `server/src/services/SesionService.js:44`.
- **Pasos:** descargar un adjunto (`GET /archivos/:id/download-url`) o abrir una sesión (`GET /sesiones/:id`) y mirar `logs_acceso`.
- **Esperado:** una fila `descargar_archivo` / `ver sesion` por cada acceso (Ley 25.326; así lo dice `docs/API.md`).
- **Obtenido:** no se registra nada. El `insert` no se espera ni se encadena, y el builder de Supabase es perezoso: la consulta solo se envía al hacer `then`/`await` (verificado en `@supabase/postgrest-js`, `PostgrestBuilder.then`). El middleware `registrarAcceso` sí hace `await` y funciona.
- **Evidencia:** CP-U145, CP-U149; CP-U146 muestra el caso que sí funciona.
- **Probabilidad:** alta (pasa siempre) · **Impacto:** alto (se pierde la trazabilidad de accesos a historias clínicas) · **Prioridad:** alta · **Seguridad:** sí.

## DEF-A03 — Se acepta un turno que termina antes de empezar
- **Dónde:** `server/src/routes/turnos.js:27` (POST y PATCH validan cada fecha por separado); la tabla `turnos` no tiene `CHECK (fecha_fin > fecha_inicio)`.
- **Pasos:** `POST /api/turnos` con `fecha_fin` una hora antes que `fecha_inicio` (o igual).
- **Esperado:** 422.
- **Obtenido:** 201: el turno se guarda con duración negativa o cero, y el control de choque de consultorio (que compara rangos) deja de tener sentido para ese turno.
- **Evidencia:** CP-U21 (dos valores); CP-A24 en Newman (bloqueado por credenciales).
- **Probabilidad:** baja (la UI calcula el fin con la duración) · **Impacto:** alto · **Prioridad:** media · **Seguridad:** no.

## DEF-A04 — Cancelar un turno ajeno responde "Turno cancelado" sin cancelar nada
- **Dónde:** `server/src/services/TurnoService.js:165` (`cancelar`).
- **Pasos:** el profesional B hace `DELETE /api/turnos/<id de un turno de A>`.
- **Esperado:** 404 (como `actualizar`, o como `ArchivoService.eliminar`, que sí verifica las filas afectadas).
- **Obtenido:** RLS impide el UPDATE (0 filas, sin error) y la ruta responde 200 "Turno cancelado". El turno sigue vigente.
- **Evidencia:** CP-U81.
- **Probabilidad:** baja · **Impacto:** medio (la persona cree que liberó el consultorio) · **Prioridad:** baja · **Seguridad:** no (RLS protege el dato).

## DEF-A05 — Un id que no es UUID termina en 500
- **Dónde:** `server/src/routes/pacientes.js:29` (`GET /:id`), `server/src/routes/turnos.js:74` (`DELETE /:id`), `server/src/routes/sesiones.js:14` (`GET /:id`): no validan el parámetro, a diferencia de PATCH/DELETE de pacientes.
- **Pasos:** `GET /api/pacientes/abc`.
- **Esperado:** 422.
- **Obtenido:** Postgres rechaza el valor (22P02) y la API responde 500.
- **Evidencia:** CP-U25, CP-U32; CP-A17 (bloqueado por credenciales).
- **Probabilidad:** baja · **Impacto:** medio · **Prioridad:** baja · **Seguridad:** no.

## DEF-A06 — JSON mal formado o body de más de 200 kb devuelven 500
- **Dónde:** `server/src/index.js:105` (el manejador de errores responde 500 a todo, incluidos los errores 400/413 de `express.json`).
- **Pasos:** `POST /api/auth/login` con el body `{"email": ` (o con más de 200 kb).
- **Esperado:** 400 (o 413) con `{ error }`.
- **Obtenido:** 500 "Error interno del servidor".
- **Evidencia:** CP-U45, CP-U46; **CP-A04 ejecutado** contra el server real (`EV-RUN-2026-10-27-sin-credenciales.json`).
- **Probabilidad:** baja · **Impacto:** medio · **Prioridad:** baja · **Seguridad:** no.

## DEF-A07 — `/pacientes` expone el mensaje interno de la base en los 500
- **Dónde:** `server/src/routes/pacientes.js:23` y siguientes (`res.status(err.status || 500).json({ error: err.message })`). Las demás rutas usan `manejarError`, que enmascara.
- **Pasos:** provocar un error de la base en `GET /api/pacientes` (por ejemplo, el de DEF-A05).
- **Esperado:** 500 con un mensaje genérico.
- **Obtenido:** el mensaje de Postgres llega al cliente (`invalid input syntax for type uuid…`, nombres de columnas).
- **Evidencia:** CP-U33.
- **Probabilidad:** baja · **Impacto:** medio (revela la estructura interna) · **Prioridad:** baja · **Seguridad:** sí.

## DEF-A08 — `/auth/logout` y `/auth/forgot-password` quedan colgados si Supabase falla
- **Dónde:** `server/src/routes/auth.js:84` y `:90`: son `async` sin `try/catch`. Express 4 no captura el rechazo.
- **Pasos:** cortar la conexión con Supabase y llamar a `POST /api/auth/logout`.
- **Esperado:** una respuesta (503, como `requireAuth`).
- **Obtenido:** el pedido no recibe respuesta hasta el timeout del cliente.
- **Evidencia:** revisión de código. No se automatizó: el rechazo no manejado se escapa del test y Jest lo atribuye a otro caso.
- **Probabilidad:** baja · **Impacto:** medio · **Prioridad:** baja · **Seguridad:** no.

## DEF-A09 — `/auth/refresh` ignora su propia validación
- **Dónde:** `server/src/routes/auth.js:103`: declara `body('refresh_token').notEmpty()` pero nunca llama a `validationResult`.
- **Pasos:** `POST /api/auth/refresh` con `refresh_token: ""`.
- **Esperado:** 422 sin consultar a Supabase.
- **Obtenido:** se consulta a Supabase y responde 401.
- **Evidencia:** CP-U47.
- **Probabilidad:** baja · **Impacto:** bajo · **Prioridad:** baja · **Seguridad:** no.

## DEF-A10 — Un `mes` mal formado en pagos o liquidación da 500
- **Dónde:** `server/src/routes/pagos.js:57` solo verifica que `mes` exista; `rangoDelMes` (`PagoService.js:3`) llama a `toISOString()` sobre una fecha inválida y lanza `RangeError`.
- **Pasos:** `GET /api/pagos/liquidacion?mes=2026-13` como admin.
- **Esperado:** 422 "mes con formato AAAA-MM".
- **Obtenido:** 500.
- **Evidencia:** CP-U09 (3 valores), CP-U64; CP-A33 (bloqueado).
- **Probabilidad:** baja (la UI usa un selector de mes) · **Impacto:** medio · **Prioridad:** baja · **Seguridad:** no.

## DEF-A11 — Paginado de pacientes sin normalizar `page` ni tope para `limit`
- **Dónde:** `PacienteService.listar` (`.range((page - 1) * limit, page * limit - 1)`) y la ruta, que no valida `page` ni `limit`.
- **Pasos:** `GET /api/pacientes?page=0` o `?limit=100000`.
- **Esperado:** `page` ≤ 0 se trata como 1 y `limit` se acota (por ejemplo a 100).
- **Obtenido:** `page=0` pide el rango (−20, −1); `limit=100000` trae toda la tabla en una consulta.
- **Evidencia:** CP-U94 (2 valores), CP-U95.
- **Probabilidad:** baja · **Impacto:** medio (carga innecesaria; solo pacientes propios por RLS) · **Prioridad:** baja · **Seguridad:** sí, bajo (abuso de recursos).

## DEF-A12 — Si el modelo devuelve `content: null`, la IA falla con TypeError
- **Dónde:** `server/src/services/IAService.js:137` solo contempla `undefined`; `completar` (`:112`) y `chat` hacen `.trim()` sobre `null`. `informeGenerator.js` sí lo maneja.
- **Pasos:** el modelo responde `{ choices: [{ message: { content: null } }] }` (pasa con modelos de razonamiento gratuitos).
- **Esperado:** 502 con el mensaje de "modelo no disponible".
- **Obtenido:** `TypeError`; la ruta lo convierte en el 502 genérico, sin el mensaje específico ni el detalle para los logs.
- **Evidencia:** CP-U171.
- **Probabilidad:** media · **Impacto:** bajo · **Prioridad:** baja · **Seguridad:** no.

## DEF-A13 — Una fecha inexistente (30/02) pasa la validación y da 500
- **Dónde:** `server/src/routes/turnos.js:27` (`isISO8601()` sin `{ strict: true }`); se repite en sesiones y evaluaciones.
- **Pasos:** `POST /api/turnos` con `fecha_inicio: "2026-02-30T10:00:00Z"`.
- **Esperado:** 422.
- **Obtenido:** pasa la validación y Postgres la rechaza → 500.
- **Evidencia:** CP-U51.
- **Probabilidad:** baja · **Impacto:** medio · **Prioridad:** baja · **Seguridad:** no.

## DEF-A14 — El reparto de honorarios no se redondea: se crean o pierden centavos
- **Estado:** **Corregido** en `fb6adda`: el reparto se calcula en centavos enteros (`repartirHonorarios`): se redondea el honorario y el espacio se queda con la diferencia. $10,05 al 70 % ahora da 7,04 + 3,01. Tests de regresión: CP-U56, CP-U301.
- **Pagos ya guardados:** el arreglo no corrige los registros viejos. Para detectarlos, con consultas de solo lectura:
  ```sql
  -- Pagos cuyas partes no suman el total (DEF-A14)
  SELECT id, fecha_pago, monto_total, monto_profesional, monto_espacio
  FROM pagos WHERE monto_profesional + monto_espacio <> monto_total;

  -- Pagos cobrados con un porcentaje distinto del que tiene hoy el profesional (incluye DEF-A01;
  -- puede dar falsos positivos si el porcentaje del profesional cambió con el tiempo)
  SELECT pg.id, pg.fecha_pago, pg.porcentaje_profesional, pr.porcentaje_honorarios
  FROM pagos pg JOIN profesionales pr ON pr.id = pg.profesional_id
  WHERE pg.porcentaje_profesional <> pr.porcentaje_honorarios;
  ```
- **Dónde:** `server/src/services/PagoService.js:81`.
- **Pasos:** cobrar $10,05 a un profesional con 70 %.
- **Esperado:** profesional + espacio = $10,05 exactos (redondear una parte y calcular la otra por diferencia).
- **Obtenido:** se envían 7,035 y 3,0150000000000006; las columnas `DECIMAL(10,2)` redondean cada una por separado → 7,04 + 3,02 = **$10,06**. La liquidación suma un centavo que nadie cobró.
- **Evidencia:** CP-U56 (con $100,01; el caso de $10,05 se verificó aparte con Node).
- **Probabilidad:** media (cualquier monto que no dé centavos exactos) · **Impacto:** medio · **Prioridad:** media · **Seguridad:** no.

## DEF-A15 — La edad del paciente suma el año un día antes (zona horaria)
- **Dónde:** `server/src/services/IAService.js:100` y `server/src/services/informeGenerator.js:14` (`calcularEdad`).
- **Pasos:** con el servidor en hora argentina, pedir un informe de un paciente que cumple años mañana.
- **Esperado:** la edad actual.
- **Obtenido:** `new Date('AAAA-MM-DD')` se interpreta en UTC y se compara con `getDate()` local: ya suma el año. En Vercel (UTC) pasa entre las 21 y las 24 h de Argentina.
- **Evidencia:** CP-U194 (con `TZ=America/Argentina/Buenos_Aires`).
- **Probabilidad:** baja · **Impacto:** medio (dato en un informe clínico) · **Prioridad:** baja · **Seguridad:** no.

## DEF-A16 — `/admin` no tiene guarda de rol en el cliente
- **Dónde:** `client/src/App.jsx:67`.
- **Pasos:** iniciar sesión como profesional y escribir `/admin` en la barra.
- **Esperado:** redirección al inicio.
- **Obtenido:** se muestra el panel de administración; las acciones fallan con 403 porque el backend sí controla el rol.
- **Evidencia:** CP-U238.
- **Probabilidad:** media · **Impacto:** bajo · **Prioridad:** baja · **Seguridad:** no (defensa en profundidad).

## DEF-A17 — Cualquier profesional ve el porcentaje de honorarios de todos
- **Estado:** **Corregido** en `6d9047f`: `GET /profesionales` devuelve el porcentaje de todos solo al admin; un profesional ve únicamente el propio. Las otras pantallas que usan la lista solo leen nombre e id. Tests de regresión: CP-U267, CP-U299.
- **Dónde:** `server/src/services/ProfesionalService.js:9`; `GET /api/profesionales` lo usa cualquier profesional (por ejemplo, el alta de paciente y la agenda).
- **Pasos:** iniciar sesión como profesional y mirar la respuesta de `GET /api/profesionales`.
- **Esperado:** el porcentaje solo para admin (o solo el propio).
- **Obtenido:** viene `porcentaje_honorarios` de todos los profesionales.
- **Evidencia:** CP-U267; CP-A34 (bloqueado por credenciales).
- **Probabilidad:** alta · **Impacto:** medio (dato económico confidencial) · **Prioridad:** alta · **Seguridad:** sí.

## DEF-A18 — Los errores 422 devuelven la contraseña enviada
- **Estado:** **Corregido** en `cb82e1d`: helper `erroresDeValidacion` (`server/src/utils/validacion.js`) en las 33 respuestas 422 de todas las rutas: cada error trae solo `path` y `msg`. Tests de regresión: CP-U266, CP-U296, CP-U297; CP-A42 en Newman.
- **Dónde:** `server/src/routes/auth.js:19`, `:44` y `:123`: `errors.array()` de express-validator incluye `value`.
- **Pasos:** `POST /api/auth/signup` con `password: "1234567"`.
- **Esperado:** el error indica el campo y el motivo, sin repetir el valor.
- **Obtenido:** `{"errors":[{"type":"field","value":"1234567","msg":"La contraseña debe tener al menos 8 caracteres","path":"password",...}]}`.
- **Evidencia:** CP-U266; **CP-A42 ejecutado** contra el server real (`EV-RUN-2026-10-27-sin-credenciales.json`).
- **Probabilidad:** alta · **Impacto:** bajo (es la propia contraseña, sobre HTTPS, pero puede quedar en logs o herramientas de monitoreo) · **Prioridad:** media · **Seguridad:** sí.

## DEF-A19 — El zoom está bloqueado en móvil (`maximum-scale=1.0`)
- **Estado:** **Corregido** en `70600f0`: el viewport ya no tiene `maximum-scale`, y en pantallas de hasta 767 px los campos van con 16 px para que iOS no haga zoom al enfocarlos. Tests de regresión: CP-U302, CP-U303, CP-E13 (pasa: `EV-A11Y-login.json` sin violaciones).
- **Dónde:** `client/index.html:5`.
- **Pasos:** abrir la app en un celular e intentar ampliar con dos dedos.
- **Esperado:** se puede ampliar hasta 200 % (WCAG 1.4.4).
- **Obtenido:** axe-core lo informa como violación **critical** (`meta-viewport`).
- **Evidencia:** CP-E13, `EV-A11Y-login.json` (está en todas las páginas porque es el `index.html`).
- **Probabilidad:** alta · **Impacto:** medio (personas con baja visión) · **Prioridad:** alta · **Seguridad:** no.

## DEF-A20 — Formulario de turno sin labels asociados y modales sin `role="dialog"`
- **Estado:** **Corregido** en `bbea9f1`: los 8 labels del modal "Nuevo turno" quedan asociados con `useId`; el "Estado" del detalle es un grupo con nombre. `Modal` es `role="dialog"` con `aria-modal` y `aria-labelledby`, y devuelve el foco al cerrarse. Tests de regresión: CP-U304…CP-U308; CP-E04 ubica los campos por nombre.
- **Dónde:** `client/src/pages/AgendaPage.jsx` (9 `<label>` sin `htmlFor` ni input anidado en el modal "Nuevo turno") y `client/src/components/ui/Modal.jsx` (sin `role="dialog"`, `aria-modal` ni `aria-labelledby`).
- **Pasos:** recorrer el formulario de turno con un lector de pantalla.
- **Esperado:** cada campo anuncia su nombre ("Fecha", "Consultorio"…) y el modal se anuncia como diálogo.
- **Obtenido:** los campos se anuncian sin nombre.
- **Evidencia:** revisión de código; se va a confirmar con CP-E16 (axe en agenda) cuando haya credenciales. Los E2E de turnos tuvieron que ubicar los campos por tipo porque no tienen nombre accesible.
- **Probabilidad:** alta · **Impacto:** medio · **Prioridad:** alta · **Seguridad:** no.

## DEF-A21 — `docs/API.md` no coincide con el código
- **Dónde:** `docs/API.md`.
- **Detalle:** dice 20 intentos fallidos de login cada 15 min, pero el default de `RATE_LIMIT_AUTH_MAX` en `server/src/index.js` es 100; dice que `fecha_nacimiento` es opcional al crear un paciente, pero la ruta la exige; dice que el log de auditoría "es asíncrono y no bloquea", pero el middleware hace `await` a propósito.
- **Evidencia:** revisión de código contra CP-U26/CP-U27 y `auditLog.js`.
- **Probabilidad:** alta · **Impacto:** bajo · **Prioridad:** baja · **Seguridad:** no.

---

## DEF-A22 — Se puede pedir una URL para subir un archivo a un paciente dado de baja
- **Estado:** **Corregido** (cambio sin commitear todavía): la verificación de acceso de archivos ahora usa `PacienteService.asegurarAcceso`, que excluye los dados de baja. Se mantiene la respuesta 403 de esta ruta. Test de regresión: CP-U328.
- **Dónde:** `server/src/services/ArchivoService.js` (`generarUrlSubida`): verificaba el acceso al paciente con su propia consulta, sin el filtro de baja que sí usan el resto de las verificaciones.
- **Pasos:** dar de baja un paciente y, con su id, pedir `POST /api/archivos/upload-url`.
- **Esperado:** 403 "Sin acceso a este paciente", sin firmar ninguna URL.
- **Obtenido:** se firmaba la URL y se registraba el archivo de un paciente que ya no aparece en el sistema.
- **Evidencia:** revisión de código al analizar el acoplamiento con la tabla de pacientes; CP-U328.
- **Probabilidad:** baja (hace falta el id del paciente) · **Impacto:** medio · **Prioridad:** baja · **Seguridad:** sí, bajo.

## Observaciones (no son defectos, quedan para decidir)
- **Turnos con fecha pasada — decisión tomada: se permiten y se consultan en `/historial`.** `SesionService` los usa para registrar sesiones ya hechas. El historial los muestra con los cancelados (`GET /turnos?incluir_cancelados=true`) y permite registrar la sesión de los que quedaron sin cerrar (CP-U274…CP-U276, CP-U280…CP-U295).
- **Confirmación de contraseña en el registro — resuelta:** el registro ahora tiene el campo "Repetir contraseña", que avisa en vivo si no coincide y no deja enviar el formulario. El caso "confirmación distinta" ya aplica y lo cubren CP-U268…CP-U273.
- **Duración de la URL firmada de subida:** el comentario de `ArchivoService` dice 5 minutos, pero `createSignedUploadUrl` no recibe duración y usa la de Supabase (2 h según su documentación). Conviene confirmarlo en el proyecto real; la de descarga sí es de 300 s (CP-U143).
- **Formulario de turno en jsdom:** la agenda usa FullCalendar y no se probó con Testing Library; se cubre en el server (CP-U18…CP-U25) y en E2E (CP-E04).
