import { test, expect } from '@playwright/test';
import { cuentas, tieneCuenta, SIN_UNO, ingresar, apiUrl, tokenDe, darDeBaja, dniAlAzar } from './helpers';

// Corre solo en los projects móviles (Pixel 5 e iPhone 13): ver playwright.config.js.

test('CP-E10 humo móvil: login sin desbordes horizontales', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(desborde).toBeLessThanOrEqual(0);
});

test('CP-E11 humo móvil: inicio y agenda cargan con la barra inferior', async ({ page }) => {
  test.skip(!tieneCuenta(cuentas.uno), SIN_UNO);
  await ingresar(page, cuentas.uno);

  await expect(page.getByRole('heading', { name: 'Agenda de hoy' })).toBeVisible();
  await page.goto('/agenda');
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(desborde).toBeLessThanOrEqual(0);
});

test('CP-E12 sin red: enviar el alta de paciente avisa, no pierde lo cargado y no duplica al reintentar', async ({ page, context, request, baseURL }) => {
  test.skip(!tieneCuenta(cuentas.uno), SIN_UNO);
  await ingresar(page, cuentas.uno);
  const creados = [];
  page.on('response', async (r) => {
    if (r.request().method() === 'POST' && r.url().endsWith('/pacientes') && r.status() === 201) creados.push((await r.json()).id);
  });
  await page.goto('/pacientes/nuevo');
  await page.getByLabel(/^Nombre/).first().fill('ZZ-TEST');
  await page.getByLabel(/^Apellido/).fill('Offline');
  await page.getByLabel(/^DNI/).fill(dniAlAzar());
  await page.getByLabel(/^Fecha de nacimiento/).fill('2015-03-10');
  await page.getByLabel(/^Profesional asignado/).selectOption({ index: 1 });

  await context.setOffline(true);
  await page.getByRole('button', { name: 'Crear paciente' }).click();

  await expect(page.getByText(/No pudimos conectarnos con el servidor/)).toBeVisible();
  await expect(page.getByLabel(/^Nombre/).first()).toHaveValue('ZZ-TEST');
  await expect(page).toHaveURL(/\/pacientes\/nuevo$/);

  await context.setOffline(false);
  await page.getByRole('button', { name: 'Crear paciente' }).click();
  await expect(page).toHaveURL(/\/pacientes\/[0-9a-f-]{36}$/);
  expect(creados).toHaveLength(1);

  for (const id of creados) await darDeBaja(request, apiUrl(baseURL), await tokenDe(page), id);
});
