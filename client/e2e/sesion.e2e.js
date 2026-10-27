import { test, expect } from '@playwright/test';
import { cuentas, tieneCuenta, SIN_UNO, ingresar } from './helpers';

test.describe('sesión', () => {
  test('CP-E01 sin sesión, una ruta protegida manda a /login', async ({ page }) => {
    await page.goto('/pacientes');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
  });

  test('CP-E02 cerrar sesión vuelve al login y Atrás no reabre la app', async ({ page }) => {
    test.skip(!tieneCuenta(cuentas.uno), SIN_UNO);
    await ingresar(page, cuentas.uno);

    await page.getByRole('button', { name: /cerrar sesión/i }).first().click();

    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull();
    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
  });
});
