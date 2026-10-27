import { defineConfig, devices } from '@playwright/test';

// Pruebas de punta a punta: abren un navegador real contra la app ya desplegada.
//   E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e --workspace client
// Por defecto prueban producción; con E2E_BASE_URL se apunta a otra dirección
// (por ejemplo http://localhost:5173 si levantás el proyecto en tu máquina).
// Los tests que crean datos (prefijo ZZ-TEST, se limpian al final) conviene correrlos
// contra un proyecto de test, no contra producción.
const MOVIL = /movil\.e2e\.js/;

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.js',
  timeout: 30_000,
  retries: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/resultados.json' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://mentesqueaprenden.vercel.app',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] }, testIgnore: MOVIL },
    // Móvil: solo el humo y el caso sin red. iPhone 13 corre con el motor Chromium
    // (viewport, touch y user agent de iPhone) para no depender de WebKit.
    { name: 'pixel-5', use: { ...devices['Pixel 5'] }, testMatch: MOVIL },
    { name: 'iphone-13', use: { ...devices['iPhone 13'], browserName: 'chromium' }, testMatch: MOVIL }
  ]
});
