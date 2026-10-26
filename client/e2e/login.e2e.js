import { test, expect } from '@playwright/test';

// Las credenciales NO van en el código: se pasan por variables de entorno.
// Conviene una cuenta de prueba propia, no la de un usuario real.
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test('con credenciales correctas entra a la app y ve su pantalla de inicio', async ({ page }) => {
  test.skip(!email || !password, 'Faltan E2E_EMAIL y E2E_PASSWORD');

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // Entrar de verdad: llegar a la pantalla de inicio y que cargue con la sesión
  // (si la API devolviera 401 después de loguear, la app volvería al login).
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Agenda de hoy' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tus pacientes' })).toBeVisible();
  await expect(page).toHaveURL(/\/$/); // sigue adentro: no la sacó de vuelta al login
});

test('con una contraseña incorrecta muestra el error y no entra', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('nadie@ejemplo.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('contraseña-incorrecta-123');
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page.getByText(/credenciales inválidas/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
