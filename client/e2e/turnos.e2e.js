import { test, expect } from '@playwright/test';
import { cuentas, tieneCuenta, SIN_UNO, ingresar, apiUrl, tokenDe } from './helpers';

// Un día lejano y al azar de 2031 para no chocar con turnos reales.
const fecha = () => {
  const d = new Date(Date.UTC(2031, 0, 1) + Math.floor(Math.random() * 300) * 86400000);
  return d.toISOString().slice(0, 10);
};

async function pedirTurno(page, dia) {
  await page.getByRole('button', { name: 'Nuevo turno' }).click();
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: /crear turno/i }) });
  await form.locator('input[type="date"]').fill(dia);
  await form.locator('input[type="time"]').fill('10:00');
  await form.locator('select').first().selectOption('3'); // consultorio 3
  await form.locator('textarea').fill('ZZ-TEST');
  await form.getByRole('button', { name: /crear turno/i }).click();
}

test('CP-E04 un turno en el consultorio 3 se crea; el mismo consultorio y horario se rechaza', async ({ page, request, baseURL }) => {
  test.skip(!tieneCuenta(cuentas.uno), SIN_UNO);
  const dia = fecha();
  const creados = [];
  page.on('response', async (r) => {
    if (r.url().endsWith('/turnos') && r.request().method() === 'POST' && r.status() === 201) creados.push((await r.json()).id);
  });
  await ingresar(page, cuentas.uno);
  await page.goto('/agenda');

  await pedirTurno(page, dia);
  await expect(page.getByText('Turno creado')).toBeVisible();
  await pedirTurno(page, dia);

  await expect(page.getByText(/Consultorio 3 ocupado/)).toBeVisible();
  expect(creados).toHaveLength(1);

  // Limpieza: cancelar lo creado
  const token = await tokenDe(page);
  for (const id of creados) {
    await request.delete(`${apiUrl(baseURL)}/turnos/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  }
});
