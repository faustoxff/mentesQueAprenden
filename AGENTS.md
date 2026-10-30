# Contexto para asistentes de IA (y para el equipo)

Leé esto **antes de modificar código**. Junta las decisiones de diseño que ya se tomaron y por qué. Muchas cosas que parecen "mal" o "repetidas" están así a propósito; si vas a cambiar una, primero confirmalo con quien te lo pidió.

Más detalle en [docs/GUIA-DEL-CODIGO.md](docs/GUIA-DEL-CODIGO.md) (cómo está armado) y [docs/API.md](docs/API.md) (endpoints).

## Reglas de trabajo

- **No cambies código de producción para que un test pase.** Un bug conocido se deja marcado con `test.failing` (Jest) o `it.fails` (Vitest) y un comentario `// DEF-XX` (ver `testing/defectos-automatizados.md`).
- **Un refactor no cambia comportamiento:** los tests existentes tienen que seguir pasando **sin cambiar lo que esperan**. Si hay que tocar un resultado esperado, cambiaste comportamiento: avisá.
- **Nunca imprimas ni commitees secretos** (`.env`, claves de Supabase u OpenRouter).
- **La base de Supabase es compartida con todo el equipo.** No corras tests de integración, Newman ni E2E, ni scripts que escriban, sin avisar. Si creás datos de prueba, borralos.
- Antes de commitear: `npm test` y `npm run lint` en `server` y `client`. Los tests unitarios no usan red ni credenciales (Supabase falso: `server/__tests__/unit/helpers/fakeDb.js`). No bajes los pisos de cobertura (`server/jest.config.js`, `client/vite.config.js`).
- Tests con IDs `CP-U…` (unitarios), `CP-A…` (API), `CP-E…` (E2E), estilo preparar → ejecutar → verificar, un comportamiento por test. Cada ID nuevo va a `testing/trazabilidad.md`.
- Commits chicos y en español.

## Arquitectura del backend (decisiones)

**Capas:** `routes → services → repositories → Supabase`.
- **Rutas** (`server/src/routes`): validan la entrada y traducen errores a HTTP.
- **Services** (`server/src/services`): reglas de negocio. Lanzan errores con `err.status` (404, 409, 422…).
- **Repositories** (`server/src/repositories`): **solo** las consultas a Supabase (tablas, `rpc`, Storage), una clase por tabla.
- **ESLint falla** si un service o una ruta importa `config/supabase`. Única excepción: `AuthService`, que usa Supabase Auth (login, tokens), no tablas. No agregues más excepciones: creá o usá un repositorio.

**Errores de la base:** los repositorios traducen los códigos de PostgREST/Postgres a `ErrorDeDatos` con un `tipo` (`NO_ENCONTRADO`, `DUPLICADO`, `CHOQUE_HORARIO`, `FUNCION_INEXISTENTE`, `OTRO`) en `repositories/errores.js`. Los services deciden el status según el `tipo`; **ningún service mira `error.code`**. `datosOpcionales` es para lecturas donde "no está" y "no se pudo leer" se tratan igual.

**Cliente de Supabase:**
- Los repositorios reciben `db`, el cliente con el token del profesional, así **RLS decide qué filas ve cada uno**.
- Las funciones que usan el cliente admin (ignora RLS) terminan en `ComoAdmin`, y el service las llama **solo después de verificar el permiso**. No uses el cliente admin para "arreglar" un error de permisos.

**La seguridad vive en la base (a propósito):** las políticas RLS, `puede_acceder_paciente()` (exige paciente activo y acceso), los triggers (choque de consultorio, rol y honorarios) y las funciones `consultorio_libre` / `turnos_ocupacion` están en Postgres (migración 008). Aunque el server tenga un error, la base bloquea el acceso indebido. **No las saques de la base.** Consecuencia aceptada: cambiar Supabase por otra base no es simple (habría que reescribir esas reglas y el login).

**Pacientes:**
- Todo lo que aplica **reglas de pacientes** (existe, no está dado de baja, RLS lo deja ver) pasa por `PacienteService`: `asegurarAcceso`, `obtenerDatosBasicos`, `buscar`.
- **Trade-off:** las consultas que traen datos básicos del paciente *junto con* un turno, una sesión, un pago, etc. (joins como `paciente:pacientes(...)`) se quedan como **una sola consulta en su repositorio**. Pasarlas por `PacienteService` obligaría a hacer más consultas y escribir más código, sin ganar nada (no aplican reglas y RLS ya controla el acceso).
- Un service puede usar el repositorio de otra tabla para **lecturas simples** (por ejemplo, la IA lee sesiones con `SesionRepository`). Las escrituras y las reglas van por el service dueño.
- Crear un turno o una sesión verifica el acceso al paciente adentro de `TurnoService.crear` / `SesionService.crear` (404), venga del formulario o del chat.

**Respuestas que parecen inconsistentes pero son a propósito:**
- Subir un archivo a un paciente ajeno o dado de baja responde **403** "Sin acceso a este paciente", no 404. El equipo prefiere saber que es un problema de acceso.
- Asignar un paciente a otro profesional es solo de admin: **403** tanto desde el formulario como desde el chat.

**Sesiones y consultorios:** `sesiones` no tiene columna de consultorio. El consultorio de una sesión es el de su **turno vinculado** (`turnos.sesion_id`), así la agenda, las barras de ocupación y el control de choques de la base tienen una sola fuente. Si crear el turno falla, la sesión recién creada se deshace.

## Validaciones

- **El front y el back validan las mismas cosas a propósito:** el front da una respuesta rápida sin esperar al servidor; el back vuelve a validar todo antes de guardar. No borres ninguna de las dos.
- La **regla del DNI** (7 u 8 dígitos) vive en `server/src/utils/dni.js` y `client/src/utils/dni.js`. Un test (`client/src/utils/dni.test.js`) verifica que las dos digan lo mismo: si cambiás una, cambiá la otra.
- Las reglas de crear paciente, sesión y turno están en `server/src/validaciones/`. Las usan **las rutas y el chat** (con `exigirDatosValidos`), así los dos dan los mismos errores.

## Asistente de IA (Menta)

| Archivo | Qué hace |
|---|---|
| `services/ChatService.js` | El chat: prompt de Menta (`SYSTEM_PROMPT_BASE`), conversación y las 12 herramientas (`ejecutarTool`) |
| `services/IAService.js` | Funciones clínicas: sugerir notas, resumir sesión, sugerir derivación, analizar documento. El nombre quedó así por ahora (se pensó `AsistenteClinicoService`) |
| `services/clienteIA.js` | La **única** conexión a OpenRouter y los reintentos por saturación. No crees otra conexión |
| `utils/fechas.js` | `calcularEdad`, `hoyArgentina`, `formatearFechaHora` |

- **El chat hace lo mismo que la app:** sus herramientas llaman a los mismos services y validaciones que los formularios. No metas lógica de negocio ni consultas en una herramienta.
- **El chat no borra:** `eliminar_paciente` solo devuelve una solicitud con un token firmado (`utils/confirmacion.js`, vence a los 5 minutos). La baja la ejecuta el botón (`POST /ia/confirmar`). Así nadie puede hacer borrar algo inyectándole instrucciones al modelo.
- **Una sesión creada desde el chat no lleva consultorio ni turno** a propósito: es para agendar rápido; después se completa desde la pantalla de la sesión.
- **Tiempos:** el chat y las funciones clínicas esperan como mucho 25 s por respuesta. Los informes y la lectura de documentos usan el tiempo por defecto (textos largos), y cada uno conserva su propia lógica de reintentos.
- **Regla fija para los prompts clínicos:** todo prompt que le pida al modelo texto clínico sobre un paciente (notas, resúmenes, informes, sugerencias) tiene que prohibir explícitamente inventar datos que no estén en lo que se le pasa, y separar claramente lo pasado (historial) de lo que hay que redactar. El modelo gratuito es chico e inventa con facilidad.

## Pendientes conocidos (no son errores de diseño)

- Cobertura baja en las funciones clínicas de `IAService`.
- `ChatService.ejecutarTool` es un `switch` largo; el lint lo marca por complejidad.
- Defectos abiertos y su prioridad: `testing/defectos-automatizados.md`.
