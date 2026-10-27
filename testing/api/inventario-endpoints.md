# Inventario de endpoints

Fuente: `docs/API.md` y `server/src/routes/*.js` (relevado el 2026-10-27). Base: `/api` (salvo `/health`).

- **Exponemos**: la API REST propia (Express).
- **Consumimos**: Supabase (Auth, PostgREST con RLS, Storage) y OpenRouter (modelos de IA).
- **Riesgo** = probabilidad × impacto. Alto: datos clínicos de otro profesional, plata, autenticación, bajas. Medio: escrituras sin impacto económico ni de privacidad. Bajo: lecturas de catálogos.
- **CP-A**: casos de la colección Postman que lo cubren (ver `MentesQueAprenden.postman_collection.json`).

## API propia (exponemos)

| Método | Ruta | Qué hace | Acceso | Consume | Riesgo | CP-A |
|---|---|---|---|---|---|---|
| GET | `/health` | Estado del servicio | público | — | Bajo | CP-A01 |
| POST | `/auth/login` | Inicia sesión, devuelve tokens y perfil | público | Supabase Auth | **Alto** | CP-A02, CP-A03, CP-A04, CP-A05 |
| POST | `/auth/signup` | Registro público (siempre rol profesional) | público | Supabase Auth | **Alto** | CP-A06 |
| POST | `/auth/register` | Alta de profesional con rol elegible | admin | Supabase Auth | **Alto** | — (escribe usuarios reales) |
| POST | `/auth/logout` | Revoca el token | auth | Supabase Auth | Medio | — |
| POST | `/auth/forgot-password` | Manda link de recuperación (respuesta genérica) | público | Supabase Auth | Medio | CP-A07 |
| POST | `/auth/refresh` | Renueva tokens | público | Supabase Auth | **Alto** | CP-A08 |
| GET | `/auth/me` | Perfil del usuario actual | auth | Supabase Auth | **Alto** | CP-A09, CP-A10, CP-A11 |
| PATCH | `/auth/change-password` | Cambia la contraseña | auth | Supabase Auth | **Alto** | — (cambia credenciales reales) |
| GET | `/pacientes` | Lista paginada con búsqueda | auth | Supabase (RLS) | **Alto** | CP-A12 |
| GET | `/pacientes/:id` | Detalle + log de acceso | auth | Supabase (RLS) | **Alto** | CP-A15, CP-A16, CP-A17 |
| POST | `/pacientes` | Alta de paciente | auth | Supabase (RLS) | **Alto** | CP-A13, CP-A14, CP-A18 |
| PATCH | `/pacientes/:id` | Edición parcial | auth | Supabase (RLS) | **Alto** | CP-A19 |
| DELETE | `/pacientes/:id` | Baja lógica (`deleted_at`) | auth | Supabase (RLS + admin) | **Alto** | CP-A30 |
| GET | `/pacientes/:id/sesiones` | Sesiones del paciente | auth | Supabase (RLS) | **Alto** | — |
| GET | `/pacientes/:id/turnos` | Turnos del paciente | auth | Supabase (RLS) | Medio | — |
| GET | `/pacientes/:id/derivaciones` | Derivaciones del paciente | auth | Supabase (RLS) | Medio | — |
| GET | `/pacientes/:id/archivos` | Archivos adjuntos | auth | Supabase (RLS) | **Alto** | — |
| GET | `/turnos` | Agenda (propios completos, ajenos solo ocupación) | auth | Supabase (RLS + función) | **Alto** | CP-A20 |
| POST | `/turnos` | Reserva turno y consultorio | auth | Supabase (trigger anti-choque) | **Alto** | CP-A21, CP-A22, CP-A23, CP-A24 |
| PATCH | `/turnos/:id` | Edita / cambia estado | auth | Supabase (RLS) | **Alto** | — |
| DELETE | `/turnos/:id` | Cancela (estado `cancelado`) | auth | Supabase (RLS) | **Alto** | CP-A25, CP-A31 |
| GET | `/sesiones/:id` | Detalle de sesión | auth | Supabase (RLS) | **Alto** | — |
| POST | `/sesiones` | Registra sesión (y su turno) | auth | Supabase (RLS) | **Alto** | — |
| PATCH | `/sesiones/:id` | Edita sesión y sincroniza turno | auth | Supabase (RLS) | **Alto** | — |
| GET | `/sesiones/:id/versiones` | Historial de notas | auth | Supabase (RLS) | Medio | — |
| GET | `/evaluaciones/:id` | Evaluación con pruebas | auth | Supabase (RLS) | **Alto** | — |
| GET | `/evaluaciones/paciente/:id` | Evaluaciones de un paciente | auth | Supabase (RLS) | **Alto** | — |
| POST | `/evaluaciones` | Crea evaluación | auth | Supabase (RLS) | Medio | — |
| PATCH | `/evaluaciones/:id` | Edita / finaliza | auth | Supabase (RLS) | Medio | — |
| POST | `/evaluaciones/:id/pruebas` | Agrega prueba | auth | Supabase (RLS) | Medio | — |
| PATCH | `/evaluaciones/pruebas/:id` | Edita prueba | auth | Supabase (RLS) | Medio | — |
| DELETE | `/evaluaciones/pruebas/:id` | Borra prueba (borrado físico) | auth | Supabase (RLS) | Medio | — |
| POST | `/evaluaciones/:id/generar-informe` | Redacta el informe con IA | auth | OpenRouter + Supabase | **Alto** | — (gasta cuota de IA) |
| GET | `/derivaciones` | Enviadas y recibidas | auth | Supabase (RLS) | **Alto** | CP-A26 |
| GET | `/derivaciones/pendientes` | Recibidas pendientes | auth | Supabase (RLS) | Medio | — |
| POST | `/derivaciones` | Deriva un paciente | auth | Supabase (RLS) | **Alto** | — |
| PATCH | `/derivaciones/:id/responder` | Acepta / rechaza (da o no acceso) | auth | Supabase (RLS) | **Alto** | — |
| PATCH | `/derivaciones/:id/completar` | Cierra el acceso | auth | Supabase (RLS) | **Alto** | — |
| POST | `/archivos/upload-url` | URL firmada de subida | auth | Supabase Storage | **Alto** | CP-A27 |
| GET | `/archivos/:id/download-url` | URL firmada de descarga (300 s) | auth | Supabase Storage | **Alto** | — |
| DELETE | `/archivos/:id` | Borra archivo (quien lo subió o admin) | auth | Supabase Storage | **Alto** | — |
| GET | `/pagos` | Pagos (filtro por mes / profesional) | auth | Supabase (RLS) | **Alto** | — |
| GET | `/pagos/sesiones-pendientes` | Sesiones sin cobrar | auth | Supabase (RLS) | **Alto** | — |
| POST | `/pagos` | Registra cobro y reparte honorarios | auth | Supabase (RLS + admin) | **Alto** | CP-A28 |
| GET | `/pagos/liquidacion` | Resumen mensual por profesional | admin | Supabase (admin) | **Alto** | CP-A29, CP-A32, CP-A33 |
| GET | `/profesionales` | Profesionales activos | auth | Supabase (admin) | Medio | CP-A34 |
| PATCH | `/profesionales/:id` | Edita datos (porcentaje solo admin) | auth | Supabase (admin) | **Alto** | — |
| DELETE | `/profesionales/:id` | Baja lógica (`activo = false`) | admin | Supabase (admin) | **Alto** | CP-A35 |
| GET | `/obras-sociales` | Catálogo | auth | Supabase | Bajo | — |
| POST | `/ia/sugerir-notas` | Completa notas | auth | OpenRouter | Medio | — |
| POST | `/ia/resumir-sesion` | Resume una sesión | auth | OpenRouter | Medio | — |
| POST | `/ia/sugerir-derivacion` | Sugiere derivación | auth | OpenRouter | Medio | — |
| POST | `/ia/analizar-pdf` | Extrae y analiza un PDF | auth | OpenRouter + Storage | Medio | — |
| POST | `/ia/chat` | Chat con acciones | auth | OpenRouter + Supabase | **Alto** | — |
| POST | `/ia/confirmar` | Ejecuta la baja pedida por el chat | auth | Supabase | **Alto** | CP-A36 |

Los marcados con "—" se cubren a nivel unitario (Supertest con mocks, `server/__tests__/unit/rutas-api.test.js`) o se dejaron fuera de Newman porque escriben datos difíciles de limpiar (usuarios de Auth, contraseñas) o gastan cuota de IA.

## APIs externas (consumimos)

| Proveedor | Uso | Riesgo | Cómo se prueba |
|---|---|---|---|
| Supabase Auth | login, refresh, getUser en cada request, alta de usuarios | **Alto** | Unitario con mock; Newman CP-A02…A11 contra un proyecto de test |
| Supabase PostgREST + RLS | todos los datos clínicos | **Alto** | Unitario (consultas armadas); Newman CP-A15/A16 (aislamiento real) |
| Supabase Storage | URLs firmadas de subida/descarga | **Alto** | Unitario (300 s, extensión por mime) |
| OpenRouter | chat, resúmenes, informes, OCR | Medio | Siempre mockeado (`ia-modelo-mockeado.test.js`); nunca en Newman |
