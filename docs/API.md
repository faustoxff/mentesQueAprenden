# Documentación de APIs

Este documento cubre las dos caras de las APIs del proyecto:

1. [API REST propia](#1-api-rest-propia) (Express, `server/src/routes`)
2. [APIs externas que consume el backend](#2-apis-externas) (Supabase y OpenRouter)

---

## 1. API REST propia

### Convenciones

| Tema | Detalle |
|---|---|
| Base URL | `/api` (dev: `http://localhost:3001/api`, configurable con `VITE_API_URL` en el cliente) |
| Formato | JSON (`Content-Type: application/json`), body máximo **200 kb** |
| Auth | `Authorization: Bearer <access_token de Supabase>` en todas las rutas salvo las marcadas como públicas |
| Roles | `profesional` y `admin`. Las rutas marcadas *admin* devuelven `403` si el rol no es admin |
| Validación | `express-validator`. Error de validación → `422 { errors: [...] }` |
| Errores | `{ "error": "mensaje" }` con el status correspondiente (`401`, `403`, `404`, `422`, `429`, `500`, `502`) |
| CORS | Origen = `FRONTEND_URL`; métodos `GET, POST, PATCH, DELETE, OPTIONS` (no hay `PUT`) |
| Health check | `GET /health` → `{ status: "ok", timestamp }` (sin auth, fuera de `/api`) |
| Seguridad | `helmet`, RLS de Supabase (el backend usa un cliente autenticado como el profesional) |

### Rate limiting

| Alcance | Límite |
|---|---|
| Global (por IP) | `RATE_LIMIT_MAX` (def. **1000**) cada `RATE_LIMIT_WINDOW_MS` (def. 15 min) |
| `/api/auth/*` | **20** intentos fallidos / 15 min (los exitosos no cuentan) |

Superado el límite → `429`.

### Autenticación — `/api/auth`

| Método | Ruta | Acceso | Body | Respuesta |
|---|---|---|---|---|
| POST | `/register` | admin | `email`, `password` (≥8), `nombre`, `apellido`, `especialidad`, `rol?`, `matricula?`, `porcentaje_honorarios?` (0–100) | `201` |
| POST | `/signup` | público | `email`, `password` (≥8), `nombre`, `apellido`, `especialidad`, `matricula?`, `telefono?` | `201` |
| POST | `/login` | público | `email`, `password` | tokens + profesional |
| POST | `/logout` | auth | — | `{ message }` |
| POST | `/forgot-password` | público | `email` | Siempre `{ message }` genérico (no revela si el email existe) |
| POST | `/refresh` | público | `refresh_token` | nuevos tokens |
| GET | `/me` | auth | — | `{ profesional }` |
| PATCH | `/change-password` | auth | `password` (≥8) | `{ message }` |

`especialidad`: `psicopedagogia` · `psicologia` · `fonoaudiologia` · `otro`.

> Los refresh tokens de Supabase rotan: cada uno sirve **una sola vez**. El cliente (`client/src/services/api.js`) serializa el refresh para que varias requests con `401` simultáneas compartan un único `POST /auth/refresh`.

> **Solo desarrollo:** con `NODE_ENV=development`, el token `dev-token` autentica como el primer admin activo. En cualquier otro entorno se rechaza con `401`.

### Pacientes — `/api/pacientes`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista paginada. Query: `busqueda` (nombre/apellido/DNI), `estado`, `profesional_id`, `page` (def. 1), `limit` (def. 20) |
| GET | `/:id` | Detalle (registra acceso en `logs_acceso`) |
| POST | `/` | Crea. Obligatorios: `nombre`, `apellido`, `dni`. Opcionales: `fecha_nacimiento`, `profesional_principal_id`, `obra_social_id`, `estado`, `telefono`, `responsable_telefono`, `email`, `motivo_consulta` |
| PATCH | `/:id` | Actualiza parcial (DNI: 7–8 dígitos sin puntos) |
| DELETE | `/:id` | Baja lógica (`deleted_at`) |
| GET | `/:pacienteId/sesiones` | Sesiones del paciente (`page`, `limit`) |
| GET | `/:pacienteId/turnos` | Turnos del paciente |
| GET | `/:pacienteId/derivaciones` | Derivaciones del paciente |
| GET | `/:pacienteId/archivos` | Archivos adjuntos |

`estado`: `activo` · `derivado` · `alta` · `inactivo`.

### Turnos — `/api/turnos`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista (filtros por query, incluye sesiones asociadas) |
| POST | `/` | `fecha_inicio`, `fecha_fin` (ISO 8601), `profesional_id` obligatorios; `paciente_id?`, `tipo?`, `consultorio?` (1–3) |
| PATCH | `/:id` | Cualquier campo anterior + `estado` |
| DELETE | `/:id` | Cancela el turno (`estado = cancelado`) |

`estado`: `programado` · `confirmado` · `cancelado` · `ausente` · `realizado`.

### Sesiones — `/api/sesiones`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/:id` | Detalle |
| POST | `/` | `paciente_id`, `fecha`, `tipo` obligatorios; `duracion_minutos` (1–480), `notas_libres`, `notas_estructuradas` (objeto), `monto` (≥0), `turno_id`, `consultorio` (1–3) |
| PATCH | `/:id` | Anteriores + `resumen_ia`, `pagado` (bool), `fecha_pago` |
| GET | `/:id/versiones` | Historial de versiones de las notas |

`tipo` (sesiones y turnos): `evaluacion` · `tratamiento` · `seguimiento` · `devolucion` · `reunion_interdisciplinaria`.

### Evaluaciones — `/api/evaluaciones`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/:id` | Evaluación con paciente, profesional y pruebas |
| GET | `/paciente/:pacienteId` | Evaluaciones de un paciente |
| POST | `/` | `paciente_id`, `fecha_evaluacion`; textos opcionales: `motivo_consulta`, `antecedentes`, `observacion_conducta`, `conclusiones`, `sugerencias` |
| PATCH | `/:id` | Mismos campos + `estado` (`borrador` · `finalizado`) |
| POST | `/:id/pruebas` | `nombre_prueba` (≤150), `resultados_texto?`, `observaciones?` |
| PATCH | `/pruebas/:pruebaId` | Idem, parcial |
| DELETE | `/pruebas/:pruebaId` | Elimina la prueba |
| POST | `/:id/generar-informe` | **IA**: redacta el informe completo. Error upstream → `502` |

### Derivaciones — `/api/derivaciones`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Derivaciones del profesional |
| GET | `/pendientes` | Pendientes de respuesta (el cliente las consulta cada ~20 s) |
| POST | `/` | `paciente_id`, `profesional_destino_id`, `motivo` (≤1000) |
| PATCH | `/:id/responder` | `estado`: `aceptada` \| `rechazada`; `observaciones?` |
| PATCH | `/:id/completar` | Marca la derivación como completada |

### Archivos — `/api/archivos`

Flujo de **URLs firmadas**: los archivos no pasan por el backend, el cliente sube/descarga directo a Supabase Storage (bucket privado `historias-clinicas`).

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/upload-url` | Body: `paciente_id`, `nombre_original`, `mime_type`, `tamanio_bytes` (1 – 10 MB), `tipo`. Devuelve URL firmada de subida |
| GET | `/:id/download-url` | URL firmada de descarga (5 min). Registra IP y user-agent |
| DELETE | `/:id` | Solo quien lo subió o admin |

- `mime_type` permitidos: PDF, JPEG, PNG, WebP, DOC, DOCX.
- `tipo`: `informe` · `estudio` · `consentimiento` · `otro`.

### Pagos — `/api/pagos`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/` | auth | Pagos. Query: `mes` (`YYYY-MM`), `profesional_id` |
| GET | `/sesiones-pendientes` | auth | Sesiones sin pagar |
| POST | `/` | auth | `sesion_id`, `monto_total` (>0), `metodo_pago` (`efectivo` · `transferencia` · `debito` · `credito` · `obra_social`) |
| GET | `/liquidacion?mes=YYYY-MM` | **admin** | Resumen por profesional (el mes se interpreta en UTC-3) |

### Profesionales y obras sociales

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/profesionales` | auth | Lista |
| PATCH | `/api/profesionales/:id` | auth | `telefono?`, `porcentaje_honorarios?` (0–100) |
| DELETE | `/api/profesionales/:id` | **admin** | Baja |
| GET | `/api/obras-sociales` | auth | Lista |

### IA — `/api/ia`

Todas requieren auth. Errores del proveedor → `502`. El cliente usa **timeout de 60 s** para rutas `/ia/*` (15 s para el resto).

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| POST | `/sugerir-notas` | `notas_parciales`, `paciente_id`, `tipo_sesion`, `especialidad` | `{ sugerencia }` |
| POST | `/resumir-sesion` | `sesion_id`, `notas_libres` | `{ resumen }` (3 oraciones, máx. 200 tokens) |
| POST | `/sugerir-derivacion` | `paciente_id` | `{ sugerencia }` |
| POST | `/analizar-pdf` | `archivo_id`, `pregunta?` (≤500) | `{ analisis, texto_extraido, modelo }`. `404` archivo inexistente, `422` tipo no soportado |
| POST | `/chat` | `messages` (array ≥1, formato OpenAI) | `{ message, tool_results }` |

#### Chat con function calling manual

El modelo no usa `tools` nativas: responde un bloque ` ```json {"action": "...", "params": {...}} ``` `, el backend lo parsea, ejecuta la acción con el cliente autenticado del profesional (respeta RLS) y le devuelve el resultado. Máximo **5 acciones encadenadas** por mensaje.

| Acción | Tipo |
|---|---|
| `listar_mis_pacientes`, `buscar_pacientes`, `ver_paciente` | Consulta |
| `ver_agenda`, `listar_mis_sesiones`, `listar_profesionales` | Consulta |
| `mostrar_formulario_paciente`, `mostrar_formulario_turno` | Abre formulario en el cliente (corta el loop, sin texto) |
| `crear_paciente`, `crear_turno`, `registrar_sesion` | Escritura |
| `eliminar_paciente` | Escritura (el prompt exige confirmación explícita) |

`tool_results` es `[{ name, result }]`; el cliente lo usa para renderizar tarjetas (`ChatToolResults.jsx`).

---

## 2. APIs externas

### 2.1 Supabase

| Uso | Dónde | Cliente |
|---|---|---|
| Auth (login, refresh, reset de contraseña) | `AuthService.js` | `supabase` (anon) |
| Verificación de JWT en cada request | `middleware/auth.js` → `supabase.auth.getUser(token)` | `supabase` (anon) |
| Datos con RLS | Todos los services | Cliente **autenticado como el usuario** (`getAuthenticatedClient(req)`: anon key + `Authorization: Bearer <token>`) |
| Operaciones que saltan RLS | Búsquedas del chat, perfil del profesional, Storage, `logs_acceso` | `supabaseAdmin` (service role) |
| Storage | `ArchivoService.js`, `IAService.analizarPDF` | `createSignedUploadUrl` / `createSignedUrl` (300 s) |

Los dos clientes se crean en `server/src/config/supabase.js`. El backend **no arranca** si faltan `SUPABASE_URL`, `SUPABASE_ANON_KEY` o `SUPABASE_SERVICE_ROLE_KEY`.

> La `SUPABASE_SERVICE_ROLE_KEY` es secreta: nunca debe llegar al frontend. El cliente solo recibe `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

**Auditoría:** el middleware `registrarAcceso` inserta en `logs_acceso` (profesional, paciente, acción, recurso, IP, user-agent) cada vez que se accede a una historia clínica (Ley 25.326). El insert es asíncrono y no bloquea la respuesta.

### 2.2 OpenRouter (IA)

API compatible con OpenAI, consumida con el SDK `openai` apuntando a `https://openrouter.ai/api/v1`. Auth con `OPENROUTER_API_KEY`; se envían los headers `HTTP-Referer` (= `FRONTEND_URL`) y `X-Title`.

| Función | Archivo | Modelo | `max_tokens` |
|---|---|---|---|
| Sugerir notas | `IAService.js` | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | 500 |
| Resumir sesión | `IAService.js` | ídem | 200 |
| Sugerir derivación | `IAService.js` | ídem | 300 |
| Análisis de PDF (etapa 2) | `IAService.js` | ídem | 600 |
| Chat | `IAService.js` | ídem | 500 (400 para el resumen final) |
| Informe de evaluación | `informeGenerator.js` | ídem | 3500 |
| OCR de PDF escaneado / imagen | `geminiExtractor.js` | `google/gemma-4-26b-a4b-it:free` → `google/gemma-4-31b-it:free` (alternados) | 2000 |

#### Pipeline de `analizar-pdf`

1. Se genera una URL firmada del archivo en Supabase Storage (5 min).
2. **PDF con texto nativo** → se extrae localmente con `pdf-parse` (sin IA). Si da menos de 40 caracteres se considera escaneado.
3. **PDF escaneado o imagen** → OCR por IA. Las imágenes PNG/JPEG/WebP/GIF viajan por URL; los PDF se envían como `data:` URL en base64.
4. El texto extraído se pasa al modelo de texto para resumirlo o responder la `pregunta`.
5. El análisis se guarda en `archivos_adjuntos.descripcion` como `[Análisis IA]…` **solo si no tenía descripción previa**.

#### Manejo de errores y saturación

Los modelos `:free` comparten pool entre todos los usuarios de OpenRouter y se saturan seguido.

| Mecanismo | Detalle |
|---|---|
| Cliente de `IAService` | `timeout: 25000`, `maxRetries: 2` del SDK |
| Error embebido en HTTP 200 | OpenRouter a veces devuelve `200` con `error` en el body, que el SDK no reintenta. `crearCompletion` reintenta hasta **3 veces** (espera 700 ms × intento) si el mensaje coincide con `resourceexhausted`, `rate limit`, `too many requests` o `limit reached` |
| OCR | Hasta **3 intentos** ante `429`, esperando 3 s y alternando modelo |
| Respuesta al usuario | `502` con mensaje genérico ("modelo saturado" / "no disponible"). El detalle crudo del proveedor queda en `err.upstreamDetail` solo para logs, nunca se envía a la UI |

#### Datos sensibles

Los prompts incluyen datos clínicos de pacientes (notas, motivo de consulta, textos de documentos). Con modelos `:free` el proveedor upstream puede registrar prompts: conviene revisar sus términos antes de usar datos reales en producción.

---

## 3. Variables de entorno relacionadas

| Variable | Dónde | Uso |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | server / client (`VITE_*`) | Proyecto de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Cliente admin (secreta) |
| `SUPABASE_JWT_SECRET` | server | JWT secret del proyecto |
| `OPENROUTER_API_KEY` | server | IA |
| `FRONTEND_URL` | server | CORS y header `HTTP-Referer` |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` | server | Rate limit global |
| `VITE_API_URL` | client | Base URL de esta API |

## 4. Despliegue (Vercel)

`api/index.js` re-exporta la app de Express (`server/src/index.js`) como función serverless; las rutas conservan el prefijo `/api/...`.
