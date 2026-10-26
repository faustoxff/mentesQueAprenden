# Tests del server

## Unit (`npm test`)
Sin red ni credenciales: Supabase está mockeado. Es lo que corre siempre, en local y en CI.

## Integration (`npm run test:integration`)
Pegan contra una base Supabase real, así que **usá un proyecto de Supabase solo para tests**,
no el de producción. Necesitan en `server/.env` (o como secrets de CI):

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENROUTER_API_KEY=...

TEST_ADMIN1_EMAIL=...   TEST_ADMIN1_PASSWORD=...   # admin
TEST_ADMIN2_EMAIL=...   TEST_ADMIN2_PASSWORD=...   # admin
TEST_PROF_EMAIL=...     TEST_PROF_PASSWORD=...     # profesional sin pacientes propios
```

Las tres cuentas tienen que existir en `profesionales` con esos roles.
