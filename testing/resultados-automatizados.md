# Resultados de las pruebas automatizadas

Corrida del 2026-10-27 en la máquina de desarrollo (macOS, Node 20+). Sin credenciales de Supabase ni de OpenRouter: todo lo que necesita una base real quedó **Bloqueado** y se explica abajo.

- **Aplicables:** casos diseñados para la suite.
- **Ejecutados** = Pasa + Falla. **% de ejecución** = ejecutados ÷ aplicables. **% de aprobación** = pasan ÷ ejecutados.
- **Falla** incluye las fallas conocidas: tests que describen el comportamiento correcto y hoy no se cumple (`test.failing` / `it.fails` / aserción de Newman). Cada una apunta a un `DEF-A..` de `defectos-automatizados.md`. En la salida de Jest y Vitest aparecen en verde porque la falla es la esperada.

## Estado actual (después de corregir 7 defectos)

Se corrigieron DEF-A01, DEF-A02, DEF-A14, DEF-A17, DEF-A18, DEF-A19 y DEF-A20 (detalle y commits en `defectos-automatizados.md`). Sus tests dejaron de ser fallas conocidas y quedan como regresión. También se sumaron el historial de turnos y la confirmación de contraseña del registro. Las secciones que siguen a esta son la corrida inicial.

| Suite | Aplicables | Pasa | Falla (conocida) | Bloqueado | % ejecución | % aprobación | Evidencia |
|---|---|---|---|---|---|---|---|
| Unitarias del server | 411 | 392 | 19 | 0 | 100 % | 95,4 % | `EV-UNIT-SERVER-2.txt` |
| Unitarias del client | 152 | 151 | 1 | 0 | 100 % | 99,3 % | `EV-UNIT-CLIENT-2.txt` |
| API (Newman), 46 requests | 46 | 8 | 1 | 37 | 19,6 % | 88,9 % | `EV-RUN-2026-10-27-sin-credenciales.json` |
| E2E funcionales | 20 | — | — | — | — | — | no se volvieron a correr; necesitan credenciales |
| Accesibilidad (axe) | 5 | 1 | 0 | 4 | 20 % | 100 % | `EV-A11Y-login.json`, `EV-A11Y-2.txt` |

- **Newman:** se volvió a correr la carpeta sin credenciales: 9 requests, 45 aserciones y 2 fallas, las dos de CP-A04 (DEF-A06, sigue abierto). CP-A42 ya no devuelve la contraseña.
- **Accesibilidad:** CP-E13 (login) pasa sin violaciones serious ni critical; ya no aparece `meta-viewport`. Inicio, pacientes, agenda e historial siguen bloqueados por credenciales.
- **Fallas conocidas abiertas: 20 tests** (19 del server y 1 del client), de 12 defectos: DEF-A03, A04, A05, A06, A07, A09, A10, A11, A12, A13, A15 y A16. Los otros 2 abiertos, DEF-A08 y DEF-A21, no tienen test automatizado.

| Cobertura | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| Server (piso 80/70/84/84) | 82,93 % | 73,63 % | 86,75 % | 86,93 % |
| Client (piso global 30/80/42/30) | 39,67 % | 86,17 % | 45,72 % | 39,67 % |

Lint: 0 errores; 33 avisos en el client y 9 en el server. Los avisos nuevos son de complejidad: `SesionService.obtener` (12, por el manejo de error del log), `RegisterPage` (14) y `TurnoService.listar` (12). Build: ok.

## Resultados por suite

### Unitarias del server (Jest, proyecto `unit`)

| Aplicables | Pasa | Falla | Bloqueado | No ejecutado | % ejecución | % aprobación |
|---|---|---|---|---|---|---|
| 382 | 356 | 26 | 0 | 0 | 100 % | 93,2 % |

111 tests ya existían; se sumaron 271 (CP-U01…CP-U201, CP-U266, CP-U267) en 7 archivos nuevos. Evidencia: `evidencias/EV-UNIT-SERVER-1.txt`.

### Unitarias y de componentes del client (Vitest + Testing Library)

| Aplicables | Pasa | Falla | Bloqueado | No ejecutado | % ejecución | % aprobación |
|---|---|---|---|---|---|---|
| 115 | 114 | 1 | 0 | 0 | 100 % | 99,1 % |

39 tests ya existían; se sumaron 76 (CP-U202…CP-U265) en 9 archivos nuevos. Evidencia: `evidencias/EV-UNIT-CLIENT-1.txt`.

### API (Postman + Newman)

Unidad: request de la colección (46 requests, CP-A01…CP-A42; CP-A41 son las 5 limpiezas).

| Aplicables | Pasa | Falla | Bloqueado | No ejecutado | % ejecución | % aprobación |
|---|---|---|---|---|---|---|
| 46 | 7 | 2 | 37 | 0 | 19,6 % | 77,8 % |

Corrida sin credenciales (carpeta 1) contra el server local con claves de Supabase falsas, de modo que ningún pedido sale de la máquina. Newman informó:

| | Ejecutados | Fallidos |
|---|---|---|
| Requests | 9 | 0 |
| Test-scripts | 18 | 0 |
| Assertions | 45 | 3 |

| Falla | Request | Defecto |
|---|---|---|
| "un 500 nunca es un resultado esperado" | CP-A04 JSON mal formado | DEF-A06 |
| "400 (no 500) ante un JSON mal formado" | CP-A04 | DEF-A06 |
| "el error no repite la contraseña enviada" | CP-A42 | DEF-A18 |

Tiempos: promedio 3 ms, máximo 11 ms (umbral 1000 ms). Evidencia: `evidencias/EV-RUN-2026-10-27-sin-credenciales.json`.

### E2E funcionales (Playwright)

Unidad: test × project (escritorio, Pixel 5, iPhone 13).

| Aplicables | Pasa | Falla | Bloqueado | No ejecutado | % ejecución | % aprobación |
|---|---|---|---|---|---|---|
| 19 | 6 | 0 | 13 | 0 | 31,6 % | 100 % |

Pasaron: CP-E01 (ruta protegida → /login), CP-E06 ×3 (rutas públicas sin errores de consola ni pedidos fallidos) y CP-E10 en Pixel 5 e iPhone 13 (login sin desborde horizontal). Bloqueados: 12 por falta de `E2E_EMAIL`/`E2E_PASSWORD` y el test que ya existía "contraseña incorrecta", que necesita el backend conectado a Supabase. Corrido contra `http://localhost:5173`, nunca contra producción. Evidencia: `evidencias/EV-E2E-1.txt`.

### Accesibilidad automática (axe-core, WCAG 2.1 A/AA)

| Aplicables | Pasa | Falla | Bloqueado | No ejecutado | % ejecución | % aprobación |
|---|---|---|---|---|---|---|
| 4 | 0 | 1 | 3 | 0 | 25 % | 0 % |

| Página | serious | critical | Detalle |
|---|---|---|---|
| Login (CP-E13) | 0 | 1 | `meta-viewport`: zoom bloqueado (DEF-A19) |
| Inicio, Pacientes, Agenda (CP-E14…E16) | — | — | Bloqueado: necesitan sesión |

Como `meta-viewport` sale de `index.html`, la violación va a aparecer en todas las páginas. Evidencia: `evidencias/EV-A11Y-login.json`.

## Cobertura (antes → después)

Server: medida sobre `src/services`, `src/middleware` y `src/utils` (las rutas se cubren con Supertest pero quedan fuera del alcance de medición, igual que antes, para comparar lo mismo).

| | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| Server antes | 42,11 % | 39,20 % | 38,35 % | 44,82 % |
| **Server después** | **82,68 %** | **73,12 %** | **86,30 %** | **86,80 %** |
| Piso nuevo (`jest.config.js`) | 80 | 70 | 84 | 84 |
| Client antes | 20,04 % | 77,06 % | 42,20 % | 20,04 % |
| **Client después** | **31,49 %** | **83,93 %** | **42,94 %** | **31,49 %** |
| Piso nuevo global (`vite.config.js`) | 30 | 80 | 42 | 30 |

En el client el global lo bajan las páginas grandes (agenda, detalle de paciente, chat), que se cubren con E2E. Los módulos críticos tienen un piso propio de 85/75/75/85 y hoy están en: `api.js` 96 %, `authStore.js` 89 %, `errores.js` 100 %, `useDebounce.js` 100 %, `components/auth` 100 % de statements. Fuera de lo crítico: `NuevoPacientePage.jsx` 99,5 %, `App.jsx` 100 %.

Archivos del server que más subieron: `AuthService` 0 → 100 %, `ProfesionalService` 0 → 86 %, `EvaluacionService` 0 → 68 %, `PagoService` 41 → 98 %, `PacienteService` 60 → 95 %, `SesionService` 17 → 82 %, `auditLog` 0 → 92 %, `geminiExtractor` 17 → 94 %. Los más bajos: `IAService` (63 %: las funciones de sugerencias y análisis de PDF) y `EvaluacionService` (68 %).

## Complejidad y estilo

ESLint con `complexity: ['warn', 10]` en client y server (`eslint.config.js`).

| | Funciones | Complejidad promedio | > 10 | Avisos de lint | Errores de lint |
|---|---|---|---|---|---|
| Client + server (`src`) | 378 | 4,58 | 27 | 32 client · 7 server | 0 |

Antes de esta entrega `npm run lint --prefix client` fallaba porque no había `eslint.config.js` (`evidencias/EV-BASE-LINT-1.txt`).

### Las 10 funciones más complejas y qué refactorizar (sin tocarlas)

| # | Función | Archivo | CC | Propuesta |
|---|---|---|---|---|
| 1 | `PacienteDetallePage` | `client/src/pages/PacienteDetallePage.jsx:41` | 52 | Separar en un componente por pestaña (sesiones, turnos, archivos, IA) y sacar las queries a un hook `usePaciente(id)`. |
| 2 | `ejecutarTool` | `server/src/services/IAService.js:314` | 39 | Reemplazar el `switch` por un mapa `{ nombre: handler }` con un archivo por herramienta; cada handler se testea solo. |
| 3 | `AgendaPage` | `client/src/pages/AgendaPage.jsx:52` | 29 | Extraer el modal de turno nuevo y el de detalle a componentes, y el armado de eventos de FullCalendar a una función pura. |
| 4 | `SesionDetallePage` | `client/src/pages/SesionDetallePage.jsx:21` | 28 | Separar vista y edición; mover el formulario a un componente con `react-hook-form`. |
| 5 | `DerivacionesPage` | `client/src/pages/DerivacionesPage.jsx:19` | 28 | Un componente para recibidas y otro para enviadas; el modal de respuesta aparte. |
| 6 | `PagosPage` | `client/src/pages/PagosPage.jsx:16` | 27 | Separar la pestaña de liquidación (admin) de la de cobros; los cálculos de totales a funciones puras testeables. |
| 7 | `sincronizarTurno` | `server/src/services/SesionService.js:151` | 26 | Dividir en "calcular cambios" (pura) y "aplicar cambios" (con la base); hoy mezcla las dos. |
| 8 | `ToolResultCard` | `client/src/components/chat/ChatToolResults.jsx:346` | 26 | Un registro `{ nombreHerramienta: Componente }` en vez de la cadena de `if`. |
| 9 | `generarInformeTexto` | `server/src/services/informeGenerator.js:29` | 24 | Extraer el armado del prompt a una función pura (`armarPromptInforme`), con valores por defecto para cada sección. |
| 10 | `ChatSidebar` | `client/src/components/chat/ChatSidebar.jsx:40` | 23 | Separar la lista de mensajes, el input y el envío (hook `useChat`). |

## Lo que no se pudo correr y por qué

| Qué | Por qué | Qué hace falta |
|---|---|---|
| Newman carpetas 2 a 6 (37 requests) | Necesitan tres cuentas (profesional A, profesional B, admin) en un proyecto de Supabase **de test**; no corrí nada contra producción. | Proyecto de test + `API_EMAIL`, `API_PASSWORD`, `API_EMAIL_2`, `API_PASSWORD_2`, `API_ADMIN_EMAIL`, `API_ADMIN_PASSWORD`. |
| E2E con sesión (12 casos) y "contraseña incorrecta" | Igual: credenciales y backend conectado a Supabase de test. | `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_EMAIL_2`, `E2E_PASSWORD_2` y el server levantado. |
| axe en inicio, pacientes y agenda | Necesitan sesión. | Lo mismo que E2E. |
| Proyecto `integration` de Jest (ya existía) | Pega contra Supabase real. | Variables `TEST_*` de `server/__tests__/README.md`. |
| Script de latencia (k6) | Era opcional; k6 no está instalado y el free tier tiene cold starts que distorsionan la medición. Newman ya mide el tiempo de cada request con umbral configurable (`API_UMBRAL_MS`). | — |
| DEF-A08 automatizado | Un rechazo no manejado en Express se escapa del test. | Se documentó por revisión de código. |
