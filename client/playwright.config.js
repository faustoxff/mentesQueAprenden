import { defineConfig } from '@playwright/test';

// Pruebas de punta a punta: abren un navegador real contra la app ya desplegada.
//   E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e --workspace client
// Por defecto prueban producción; con E2E_BASE_URL se apunta a otra dirección
// (por ejemplo http://localhost:5173 si levantás el proyecto en tu máquina).
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.js',
  timeout: 30_000,
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://mentesqueaprenden.vercel.app',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  }
});
