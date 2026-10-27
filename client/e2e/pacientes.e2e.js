import { test, expect } from '@playwright/test';
import { cuentas, tieneCuenta, SIN_UNO, ingresar, dniAlAzar } from './helpers';

test('CP-E03 crear paciente → aparece en el listado → baja lógica', async ({ page }) => {
  test.skip(!tieneCuenta(cuentas.uno), SIN_UNO);
  const dni = dniAlAzar();
  await ingresar(page, cuentas.uno);

  // Alta por la UI
  await page.goto('/pacientes/nuevo');
  await page.getByLabel(/^Nombre/).first().fill('ZZ-TEST');
  await page.getByLabel(/^Apellido/).fill('E2E');
  await page.getByLabel(/^DNI/).fill(dni);
  await page.getByLabel(/^Fecha de nacimiento/).fill('2015-03-10');
  const profesional = page.getByLabel(/^Profesional asignado/);
  await expect(profesional.locator('option').nth(1)).toBeAttached();
  await profesional.selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Crear paciente' }).click();
  await expect(page).toHaveURL(/\/pacientes\/[0-9a-f-]{36}$/);

  // Aparece en el listado
  await page.goto('/pacientes');
  await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill(dni);
  await expect(page.getByText('ZZ-TEST').first()).toBeVisible();

  // Baja lógica desde el detalle
  await page.getByText('ZZ-TEST').first().click();
  await page.getByRole('button', { name: 'Eliminar paciente' }).click();
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await page.goto('/pacientes');
  await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill(dni);
  await expect(page.getByText('ZZ-TEST')).toHaveCount(0);
});
