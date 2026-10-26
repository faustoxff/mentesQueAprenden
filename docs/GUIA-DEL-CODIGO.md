# Guía para entender el código

Para quien llega al proyecto y quiere saber **cómo está armado, por dónde entra un pedido y dónde tocar** para cambiar algo. El README explica qué hace la app y cómo levantarla; [API.md](API.md) lista los endpoints. Esto explica el *porqué*.

## 1. Vista general

```
Navegador (React, PWA)
   │  axios + token en cada pedido
   ▼
/api/*  ── Express (server/src) ── Supabase (Postgres + Auth + Storage)
                │                         ▲
                └── OpenRouter (IA) ──────┘ (el chat consulta datos con herramientas)
```

- **Monorepo** con npm workspaces: `client/` (React + Vite + Tailwind) y `server/` (Express).
- **Producción en Vercel como un solo proyecto**: el front sale de `client/dist` y el backend corre como función serverless. [api/index.js](../api/index.js) solo exporta la app de Express, y [vercel.json](../vercel.json) manda `/api/*` ahí y todo lo demás a `index.html`.
- **La base de datos es la que manda en seguridad**: las reglas de quién ve qué viven en Postgres (RLS), no solo en el código.

## 2. Backend: capas

Cada pedido atraviesa siempre lo mismo:

```
index.js ─► routes/X.js ─► middleware ─► services/XService.js ─► Supabase
 (helmet,    (valida la      (requireAuth,    (reglas de negocio,
  CORS,       entrada con     requireAdmin,    arma las consultas)
  rate limit) express-        registrarAcceso)
              validator)
```

| Capa | Carpeta | Qué hace | Qué NO debería hacer |
|---|---|---|---|
| App | `src/index.js` | Seguridad global, rate limit, monta las rutas bajo `/api/...` | Lógica de negocio |
| Rutas | `src/routes/` | Validan el body/params y traducen errores a códigos HTTP | Hablar con la base directo |
| Middleware | `src/middleware/` | Autenticación, rol admin, auditoría | — |
| Servicios | `src/services/` | **Toda la lógica**: reglas, consultas, errores con `status` | Conocer `req`/`res` |

Convención de errores: un servicio lanza `new Error(msg)` con `err.status` (404, 409, 422…) y la ruta responde `res.status(err.status || 500)`. Por eso los servicios se testean sin levantar Express.

### Los dos clientes de Supabase (importante)

Definidos en [config/supabase.js](../server/src/config/supabase.js):

- **`supabase` / cliente autenticado** (`getAuthenticatedClient(req)`): lleva el JWT del usuario, así que **respeta RLS**. Es el que usan casi todos los servicios (se pasa como parámetro `db`).
- **`supabaseAdmin`** (service role): **ignora RLS**. Solo para casos puntuales (validar el token, leer el profesional, escribir logs, algunas operaciones del chat). Usarlo de más rompe el aislamiento entre profesionales.

### Autenticación

`requireAuth` ([middleware/auth.js](../server/src/middleware/auth.js)): lee `Authorization: Bearer`, valida el token con Supabase, carga el profesional (`req.profesional`) y rechaza cuentas desactivadas (403). Con `NODE_ENV=development` existe un `dev-token` de atajo; en cualquier otro entorno se rechaza.

### Privacidad: quién ve qué

Definido en `server/migrations/` (SQL, 001 → 007), en este orden de importancia:

1. Un profesional ve **solo sus pacientes** (`profesional_principal_id = auth.uid()`) **o los que le derivaron y aceptó** (`tiene_acceso_por_derivacion`). Desde la migración 004 **ni el admin** ve pacientes ajenos.
2. Las derivaciones tienen estados (`pendiente → aceptada/rechazada → completada`). Completar o rechazar cierra el acceso.
3. `registrarAcceso` (auditoría) deja un registro en `logs_acceso` cada vez que alguien abre una historia clínica (Ley 25.326).

Trampa conocida: al crear con `insert(...).select()` la fila tiene que pasar la política de **insert y la de select**. Un admin que crea un paciente asignado a otro profesional pasa la primera y falla la segunda ("violates row-level security policy").

## 3. El asistente de IA (Menta)

Todo en [services/IAService.js](../server/src/services/IAService.js), expuesto por `routes/ia.js`.

- **Chat** (`chat()`): manda a OpenRouter el `SYSTEM_PROMPT_BASE` más el historial. El modelo responde con texto y, si hace falta, un bloque JSON `{"action": "...", "params": {...}}`. El servidor lo detecta, ejecuta la herramienta con `ejecutarTool()` (por ejemplo `ver_agenda`, `buscar_pacientes`) y devuelve el texto más `tool_results`, que el front dibuja como tarjetas ([ChatToolResults.jsx](../client/src/components/chat/ChatToolResults.jsx)).
- Las acciones que escriben datos (crear paciente o turno) **no se ejecutan directo**: el chat abre un formulario y el usuario confirma.
- **Funciones sueltas**: sugerir notas, resumir una sesión, sugerir derivación, analizar PDF.
- **Archivos**: [geminiExtractor.js](../server/src/services/geminiExtractor.js) saca el texto de PDFs e imágenes. `pdf-parse` se carga bajo demanda porque en Vercel no existe `DOMMatrix` y al cargarlo al inicio tiraba abajo toda la API; si no carga, se usa la IA.
- **Informes**: [informeGenerator.js](../server/src/services/informeGenerator.js) redacta con IA a partir de datos provistos, sin inventar puntajes. El front los exporta a PDF ([exportarInformePdf.js](../client/src/utils/exportarInformePdf.js)).

## 4. Frontend

```
client/src/
├── App.jsx            Rutas. Todo lo privado va dentro de ProtectedRoute > MainShell
├── components/
│   ├── layout/MainShell.jsx   Marco: chat (Menta) + contenido + barra inferior en mobile
│   ├── chat/                  ChatSidebar y tarjetas de resultados
│   ├── auth/                  Login, registro, ProtectedRoute
│   └── ui/                    Modal, subida de archivos, MiniMarkdown…
├── pages/             Una por pantalla (Inicio, Pacientes, Agenda, Sesiones…)
├── services/api.js    Cliente HTTP (axios) con interceptores
├── store/authStore.js Sesión y usuario (Zustand, persistido)
└── utils/errores.js   getErrorMessage / aplicarErroresAlForm
```

- **Datos del servidor**: React Query (`useQuery`/`useMutation`) en cada página; cachea 2 minutos.
- **Sesión**: `authStore` guarda tokens y profesional. [api.js](../client/src/services/api.js) agrega el token a cada pedido y, ante un 401, **renueva una sola vez** (un `refreshEnCurso` compartido, porque Supabase rota el refresh token y solo sirve una vez). Si no puede, avisa y cierra sesión. `/auth/login` y similares no intentan renovar.
- **Errores**: el backend puede devolver `error` como texto u objeto `{code, message}`. **Siempre** mostralos con `getErrorMessage(err, 'mensaje por defecto')`; renderizar el objeto directo rompe React (error #31).
- **Mobile**: `MainShell` muestra una sola cosa a la vez (contenido o chat) con una barra inferior (Inicio, Pacientes, Menta). En escritorio ve las dos. `ChatSidebar` queda siempre montado para no perder la conversación.
- **Agenda**: FullCalendar. Los props que le pasás (`headerToolbar`, `businessHours`…) tienen que ser **objetos estables a nivel de módulo**; si se recrean en cada render, el calendario se reinicia y entra en un bucle infinito.

## 5. Tests, cobertura y CI/CD

| Qué | Comando | Necesita base real |
|---|---|---|
| Server, unitarios | `npm test --workspace server` | No (Supabase falso: `__tests__/unit/helpers/fakeDb.js`) |
| Server, integración | `npm run test:integration --workspace server` | Sí, **una base de pruebas** y cuentas `TEST_*` |
| Client | `npm test --workspace client` | No |
| Cobertura | `npm run test:coverage --workspace server` / `--workspace client` | No |

- **Cobertura actual**: server ~15%, client ~5%. Está alta en `DerivacionService` y `auth`, y en cero en IA, sesiones y archivos. Cada config fija un **piso** apenas por debajo del nivel actual: si baja, el CI falla. Al agregar tests, subí el piso (`server/jest.config.js`, `client/vite.config.js`).
- **CI** ([.github/workflows/ci.yml](../.github/workflows/ci.yml)), en cada push y PR a master:
  1. tests unitarios del server con cobertura,
  2. tests del client con cobertura y build,
  3. integración (solo si están los secrets `TEST_*`),
  4. deploy a Vercel (solo en master, si pasó todo y están los secrets de Vercel).
  Los informes de cobertura quedan como *artifact* descargable en cada ejecución.

## 6. Receta: agregar un endpoint

1. **Regla de negocio** en un método de `services/XService.js`: recibe `db` primero, lanza errores con `status`.
2. **Ruta** en `routes/X.js`: `requireAuth`, validaciones con `express-validator` (422 con mensajes en español), llamada al servicio con `getAuthenticatedClient(req)`.
3. Si toca historias clínicas, sumá `registrarAcceso('ver'|'editar', 'recurso')`.
4. Si la tabla es nueva, **política RLS en una migración nueva** (`008_...sql`); sin política, nadie puede leer.
5. **Test unitario** del servicio con `crearDb({...})`: casos felices y cada error.
6. En el front, una función con `useQuery`/`useMutation` y errores con `getErrorMessage`.

## 7. Por dónde empezar a leer

1. `server/src/index.js` y `routes/pacientes.js` (el patrón se repite en todas las rutas).
2. `services/PacienteService.js` y `migrations/002_rls_policies.sql` + `004_pacientes_privados.sql`.
3. `client/src/App.jsx`, `MainShell.jsx` y `store/authStore.js`.
4. `IAService.js` (es el archivo más grande, 600 líneas): primero `SYSTEM_PROMPT_BASE`, `chat()` y `ejecutarTool()`.
