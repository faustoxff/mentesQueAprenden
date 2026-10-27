#!/bin/sh
# Corre la colección de la API con Newman y guarda la evidencia en testing/evidencias.
# Credenciales SOLO por variables de entorno (nunca en archivos):
#   API_EMAIL / API_PASSWORD        profesional A
#   API_EMAIL_2 / API_PASSWORD_2    profesional B (para aislamiento)
#   API_ADMIN_EMAIL / API_ADMIN_PASSWORD
# Opcionales: API_BASE_URL (def. http://localhost:3001/api), API_SERVER_URL, API_UMBRAL_MS (def. 1000),
#             API_FOLDER (para correr una sola carpeta, ej. "1. Sin credenciales (no llegan a Supabase)").
# Usá un proyecto de Supabase de TEST: la colección crea y da de baja datos ZZ-TEST.
set -e
cd "$(dirname "$0")/../.."
FECHA=$(date +%Y-%m-%d)
SALIDA="testing/evidencias/EV-RUN-${FECHA}${API_SUFIJO:+-$API_SUFIJO}.json"
BASE="${API_BASE_URL:-http://localhost:3001/api}"

set -- run testing/api/MentesQueAprenden.postman_collection.json \
  -e testing/api/local.postman_environment.json \
  --env-var "baseUrl=$BASE" \
  --env-var "serverUrl=${API_SERVER_URL:-${BASE%/api}}" \
  --env-var "umbralMs=${API_UMBRAL_MS:-1000}" \
  --env-var "emailProfesional=${API_EMAIL:-}" --env-var "passwordProfesional=${API_PASSWORD:-}" \
  --env-var "emailProfesional2=${API_EMAIL_2:-}" --env-var "passwordProfesional2=${API_PASSWORD_2:-}" \
  --env-var "emailAdmin=${API_ADMIN_EMAIL:-}" --env-var "passwordAdmin=${API_ADMIN_PASSWORD:-}" \
  --reporters cli,json --reporter-json-export "$SALIDA"
[ -n "$API_FOLDER" ] && set -- "$@" --folder "$API_FOLDER"

npx newman "$@"
