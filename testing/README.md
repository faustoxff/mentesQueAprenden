# Pruebas automatizadas — Mentes que Aprenden

Entrega de las Unidades 5 y 6 (*Metodología de pruebas de sistemas*, ETNA 3°A): todo lo que se prueba con código. Los tests manuales (usabilidad, exploratorio, móvil e IA a mano) van por separado.

| Archivo | Qué tiene |
|---|---|
| `resultados-automatizados.md` | Resultados por suite, cobertura antes/después, complejidad y lo que quedó sin correr |
| `defectos-automatizados.md` | DEF-A01…DEF-A21 con pasos, evidencia y prioridad |
| `trazabilidad.md` | ID de test ↔ funcionalidad ↔ nivel de la pirámide |
| `api/inventario-endpoints.md` | Todos los endpoints con su riesgo y el caso que los cubre |
| `api/MentesQueAprenden.postman_collection.json` | Colección Postman (se importa tal cual) |
| `api/local.postman_environment.json` | Environment sin valores ni secretos |
| `evidencias/` | Salidas de Jest, Vitest, Newman, Playwright, axe y lint (`EV-…`) |

## Cómo correr cada suite

Todo desde la raíz del repo, después de `npm ci`.

### 1. Unitarias del server (sin red ni credenciales)

```bash
npm test --prefix server
```

```bash
npm run test:coverage --prefix server
```

Supabase y OpenRouter están mockeados. La cobertura falla si baja de 80/70/84/84 (`server/jest.config.js`).

### 2. Unitarias y de componentes del client (sin red ni credenciales)

```bash
npm test --prefix client
```

```bash
npm run test:coverage --prefix client
```

### 3. Lint y complejidad

```bash
npm run lint --prefix client
```

```bash
npm run lint --prefix server
```

### 4. API con Newman

Necesita el backend levantado (`npm run dev:server`, puerto 3001) apuntando a un proyecto de Supabase **de test**: la colección crea un paciente y turnos `ZZ-TEST` y los limpia al final. Las credenciales van solo por variables de entorno:

| Variable | Para qué |
|---|---|
| `API_EMAIL`, `API_PASSWORD` | Profesional A |
| `API_EMAIL_2`, `API_PASSWORD_2` | Profesional B (aislamiento) |
| `API_ADMIN_EMAIL`, `API_ADMIN_PASSWORD` | Admin |
| `API_BASE_URL` | Opcional, por defecto `http://localhost:3001/api` |
| `API_UMBRAL_MS` | Opcional, tiempo máximo por request (por defecto 1000; subilo con cold starts del free tier) |
| `API_FOLDER` | Opcional, corre una sola carpeta |

```bash
npm run test:api
```

La salida queda en `testing/evidencias/EV-RUN-AAAA-MM-DD.json`. Para correr solo lo que no necesita credenciales (carpeta 1) sin tocar ninguna base, levantá el server con claves falsas (configuración `api-sin-supabase` de `.claude/launch.json`, puerto 3011) y:

```bash
API_BASE_URL=http://localhost:3011/api API_SUFIJO=sin-credenciales API_FOLDER="1. Sin credenciales (no llegan a Supabase)" npm run test:api
```

### 5. E2E, móvil y accesibilidad con Playwright

La primera vez:

```bash
npx playwright install chromium
```

Por defecto `client/playwright.config.js` apunta a producción: para estos tests usá siempre `E2E_BASE_URL` con un entorno de test o local.

| Variable | Para qué |
|---|---|
| `E2E_BASE_URL` | URL de la app (por ejemplo `http://localhost:5173`) |
| `E2E_EMAIL`, `E2E_PASSWORD` | Profesional 1 |
| `E2E_EMAIL_2`, `E2E_PASSWORD_2` | Profesional 2 (aislamiento y derivación) |
| `E2E_API_URL` | Opcional, API para preparar y limpiar datos (por defecto `/api` del mismo origen) |

```bash
E2E_BASE_URL=http://localhost:5173 npm run test:e2e --prefix client
```

Sin credenciales, los casos que las necesitan se saltean solos (`skipped`). Projects: `escritorio`, `pixel-5` e `iphone-13` (los dos móviles corren solo `movil.e2e.js`; el iPhone usa el motor Chromium con viewport, touch y user agent de iPhone). axe-core escribe el detalle en `testing/evidencias/EV-A11Y-<página>.json`.

### 6. CI

`.github/workflows/tests.yml` corre en cada push y PR: install, lint, unitarias con cobertura y build. El job `api-y-e2e` se dispara a mano (*Run workflow*) y usa estos secrets del repo: `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, `TEST_SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_EMAIL_2`, `E2E_PASSWORD_2`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`. `.github/workflows/codeql.yml` corre el análisis de seguridad de CodeQL para JavaScript.

## Cómo están escritos los tests

- **IDs:** `CP-U..` unitarios (incluye Supertest y componentes), `CP-A..` API, `CP-E..` E2E. El nombre del test es el caso de prueba.
- **AAA:** preparar, ejecutar, verificar (separados por una línea en blanco), un solo comportamiento por test.
- **Técnicas:** partición de equivalencia, valores límite (DNI 6/7/8/9 dígitos, consultorio 0/1/3/4, monto 0/0,01, 10 MB ± 1 byte, 399/400 ms de debounce, borde fin = inicio de un turno) y casos negativos.
- **Fallas conocidas:** si un test encuentra un bug, describe el comportamiento correcto y se marca `test.failing` (Jest) / `it.fails` (Vitest) con un comentario `// DEF-A..`. No se tocó código de producción.
- **IA:** el modelo siempre está mockeado; ningún test llama a OpenRouter.

## Qué automatizamos y qué no

Automatizamos lo que se repite en cada cambio y da siempre el mismo resultado: reglas de negocio (honorarios, consultorios, derivaciones, baja lógica), validaciones con valores límite, autenticación y permisos, contrato de la API, regresión de los defectos encontrados, humo de los flujos críticos y la parte de accesibilidad que una herramienta puede medir (contraste, nombres accesibles, zoom).

Queda manual lo que necesita criterio humano: la usabilidad (¿se entiende el flujo?, ¿el lenguaje es claro para una psicopedagoga?), la accesibilidad con personas y lectores de pantalla reales, las pruebas exploratorias, el uso en celulares físicos y la calidad de las respuestas de la IA (tono, utilidad clínica, alucinaciones), que no se puede afirmar con un `expect`.
