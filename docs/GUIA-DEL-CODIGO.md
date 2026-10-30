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
index.js ─► routes/X.js ─► middleware ─► services/XService.js ─► repositories/XRepository.js ─► Supabase
 (helmet,    (valida la      (requireAuth,    (reglas de           (arma las consultas,
  CORS,       entrada con     requireAdmin,    negocio, decide      traduce los errores
  rate limit) express-        registrarAcceso) 404/409/422)         de la base)
              validator)
```

| Capa | Carpeta | Qué hace | Qué NO debería hacer |
|---|---|---|---|
| App | `src/index.js` | Seguridad global, rate limit, monta las rutas bajo `/api/...` | Lógica de negocio |
| Rutas | `src/routes/` | Validan el body/params y traducen errores a códigos HTTP | Hablar con la base directo |
| Middleware | `src/middleware/` | Autenticación, rol admin, auditoría | — |
| Servicios | `src/services/` | **Las reglas de negocio** y los errores con `status` | Conocer `req`/`res` o usar Supabase directo |
| Repositorios | `src/repositories/` | **Las consultas** a Supabase (tablas, `rpc`, Storage), una clase por tabla | Decidir reglas o códigos HTTP |

Convención de errores: un repositorio lanza un `ErrorDeDatos` ([repositories/errores.js](../server/src/repositories/errores.js)) con un `tipo` propio (`NO_ENCONTRADO`, `DUPLICADO`, `CHOQUE_HORARIO`, `FUNCION_INEXISTENTE`, `OTRO`), así nadie por encima conoce códigos de PostgREST o Postgres. El servicio decide qué significa (por ejemplo `NO_ENCONTRADO` → 404) y lanza el error con `err.status`; la ruta responde `res.status(err.status || 500)`. Por eso los servicios se testean sin levantar Express.

ESLint hace cumplir la separación: un service o una ruta que importe `config/supabase` falla el lint. La excepción es `AuthService`, que usa Supabase Auth (login, sesiones, contraseñas) y no tablas.

**Qué no resuelve:** las reglas de quién ve qué siguen en la base (RLS), igual que las funciones `consultorio_libre` y `turnos_ocupacion`. Cambiar de base sería reescribir los repositorios **y** esas reglas.

### Los dos clientes de Supabase (importante)

Definidos en [config/supabase.js](../server/src/config/supabase.js):

- **`supabase` / cliente autenticado** (`getAuthenticatedClient(req)`): lleva el JWT del usuario, así que **respeta RLS**. La ruta lo crea y lo pasa como parámetro `db` al servicio, que lo pasa al repositorio.
- **`supabaseAdmin`** (service role): **ignora RLS**. Solo para casos puntuales (validar el token, leer el profesional, escribir logs, algunas operaciones del chat). En los repositorios, las funciones que lo usan terminan en `ComoAdmin`, y el servicio las llama después de verificar el permiso. Usarlo de más rompe el aislamiento entre profesionales.

### Autenticación

`requireAuth` ([middleware/auth.js](../server/src/middleware/auth.js)): lee `Authorization: Bearer`, valida el token con Supabase, carga el profesional (`req.profesional`) y rechaza cuentas desactivadas (403). No hay tokens de atajo: si Supabase falla, responde `503`.

### Privacidad: quién ve qué

Definido en `server/migrations/` (SQL, 001 → 007), en este orden de importancia:

1. Un profesional ve **solo sus pacientes** (`profesional_principal_id = auth.uid()`) **o los que le derivaron y aceptó** (`tiene_acceso_por_derivacion`). Desde la migración 004 **ni el admin** ve pacientes ajenos.
2. Las derivaciones tienen estados (`pendiente → aceptada/rechazada → completada`). Completar o rechazar cierra el acceso.
3. `registrarAcceso` (auditoría) deja un registro en `logs_acceso` cada vez que alguien abre una historia clínica (Ley 25.326).

Migración **008** (la más reciente): RLS en todas las tablas, `puede_acceder_paciente()` como condición de los INSERT, protección de rol/honorarios y de la titularidad con triggers, y dos funciones (`turnos_ocupacion`, `consultorio_libre`) para el calendario compartido, que devuelven solo ocupación y nunca `paciente_id` ni `notas`.

Trampa conocida: al crear con `insert(...).select()` la fila tiene que pasar la política de **insert y la de select**. Un admin que crea un paciente asignado a otro profesional pasa la primera y falla la segunda ("violates row-level security policy"): por eso ese caso puntual se inserta con el cliente admin, ya autorizado.

## 3. El asistente de IA (Menta)

Todo en [services/IAService.js](../server/src/services/IAService.js), expuesto por `routes/ia.js`.

- **Chat** (`chat()`): manda a OpenRouter el `SYSTEM_PROMPT_BASE` más el historial. El modelo responde con texto y, si hace falta, un bloque JSON `{"action": "...", "params": {...}}`. El servidor lo detecta, ejecuta la herramienta con `ejecutarTool()` (por ejemplo `ver_agenda`, `buscar_pacientes`) y devuelve el texto más `tool_results`, que el front dibuja como tarjetas ([ChatToolResults.jsx](../client/src/components/chat/ChatToolResults.jsx)).
- Las acciones que escriben datos (crear paciente o turno) **no se ejecutan directo**: el chat abre un formulario y el usuario confirma. La baja de un paciente funciona igual: la herramienta solo devuelve una solicitud con un **token firmado** ([utils/confirmacion.js](../server/src/utils/confirmacion.js), vence a los 5 minutos y es de esa persona) y la baja la ejecuta el botón de la tarjeta (`POST /ia/confirmar`). El modelo no puede borrar aunque alguien le inyecte instrucciones.
- **Todo con el cliente del usuario:** las herramientas y los endpoints de IA leen y escriben con el `db` del profesional (RLS aplica). `supabaseAdmin` solo queda para pasos ya autorizados (firmar una URL, crear un paciente asignado a otro siendo admin). El historial que manda el navegador se filtra: solo roles `user` y `assistant`.
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

1. **Consulta** en `repositories/XRepository.js`: recibe `db` primero y devuelve `datosDe(await ...)`.
2. **Regla de negocio** en un método de `services/XService.js`: recibe `db` primero, le pide los datos al repositorio y lanza errores con `status`.
3. **Ruta** en `routes/X.js`: `requireAuth`, validaciones con `express-validator` (422 con mensajes en español), llamada al servicio con `getAuthenticatedClient(req)`.
4. Si toca historias clínicas, sumá `registrarAcceso('ver'|'editar', 'recurso')`.
5. Si la tabla es nueva, **política RLS en una migración nueva** (`008_...sql`); sin política, nadie puede leer.
6. **Test unitario** del servicio con `crearDb({...})`: casos felices y cada error.
7. En el front, una función con `useQuery`/`useMutation` y errores con `getErrorMessage`.

## 7. Por dónde empezar a leer

1. `server/src/index.js` y `routes/pacientes.js` (el patrón se repite en todas las rutas).
2. `services/PacienteService.js`, `repositories/PacienteRepository.js` y `migrations/002_rls_policies.sql` + `004_pacientes_privados.sql`.
3. `client/src/App.jsx`, `MainShell.jsx` y `store/authStore.js`.
4. `IAService.js` (es el archivo más grande, 600 líneas): primero `SYSTEM_PROMPT_BASE`, `chat()` y `ejecutarTool()`.
