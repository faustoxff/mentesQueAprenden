import { test, expect } from '@playwright/test';
import { cuentas, tieneCuenta, SIN_UNO, ingresar, apiUrl, tokenDe, crearPacienteZZ, darDeBaja } from './helpers';

// Junta errores de consola, excepciones y pedidos fallidos de la página.
function vigilar(page, { permitidos = [] } = {}) {
  const problemas = [];
  page.on('console', (m) => { if (m.type() === 'error') problemas.push(`consola: ${m.text()}`); });
  page.on('pageerror', (e) => problemas.push(`excepción: ${e.message}`));
  page.on('requestfailed', (r) => problemas.push(`falló: ${r.method()} ${r.url()} (${r.failure()?.errorText})`));
  page.on('response', (r) => {
    if (r.status() >= 400 && !permitidos.some((p) => r.url().includes(p))) problemas.push(`HTTP ${r.status()}: ${r.request().method()} ${r.url()}`);
  });
  return problemas;
}

test.describe('navegabilidad: rutas públicas', () => {
  for (const ruta of ['/login', '/register', '/reset-password']) {
    test(`CP-E06 ${ruta} carga sin errores de consola ni pedidos fallidos`, async ({ page }) => {
      const problemas = vigilar(page);

      const res = await page.goto(ruta);

      expect(res.status()).toBeLessThan(400);
      await expect(page.locator('body')).not.toBeEmpty();
      await page.waitForLoadState('networkidle');
      expect(problemas).toEqual([]);
    });
  }
});

test.describe('navegabilidad: rutas de App.jsx con sesión', () => {
  test.skip(!tieneCuenta(cuentas.uno), SIN_UNO);

  const estaticas = ['/', '/pacientes', '/pacientes/nuevo', '/agenda', '/historial', '/sesiones/nueva', '/evaluaciones/nueva', '/derivaciones', '/pagos'];

  test('CP-E07 todas las rutas cargan sin 404, sin errores de consola y sin pedidos fallidos', async ({ page, request, baseURL }) => {
    await ingresar(page, cuentas.uno);
    const paciente = await crearPacienteZZ(request, apiUrl(baseURL), await tokenDe(page));
    const problemas = vigilar(page);

    try {
      for (const ruta of [...estaticas, `/pacientes/${paciente.id}`, `/pacientes/${paciente.id}/editar`]) {
        await test.step(ruta, async () => {
          const res = await page.goto(ruta);
          expect(res.status(), ruta).toBeLessThan(400);
          await page.waitForLoadState('networkidle');
          await expect(page, `${ruta} no debe sacarte al login`).not.toHaveURL(/\/login$/);
        });
      }
      expect(problemas).toEqual([]);
    } finally {
      await darDeBaja(request, apiUrl(baseURL), await tokenDe(page), paciente.id);
    }
  });

  test('CP-E17 el historial se abre desde el menú y no muestra la ocupación de otros profesionales', async ({ page }) => {
    await ingresar(page, cuentas.uno);
    const problemas = vigilar(page);

    await page.getByRole('button', { name: 'Más opciones' }).first().click();
    await page.getByRole('link', { name: 'Historial' }).click();

    await expect(page).toHaveURL(/\/historial$/);
    await expect(page.getByRole('heading', { name: 'Historial de turnos', level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Ocupado por otro profesional/)).toHaveCount(0);
    expect(problemas).toEqual([]);
  });

  test('CP-E08 Atrás y F5 mantienen la ruta y la sesión', async ({ page }) => {
    await ingresar(page, cuentas.uno);
    await page.goto('/pacientes');
    await page.goto('/agenda');

    await page.goBack();
    await expect(page).toHaveURL(/\/pacientes$/);
    await page.reload();

    await expect(page).toHaveURL(/\/pacientes$/);
    await expect(page.getByPlaceholder('Buscar por nombre, apellido o DNI...')).toBeVisible();
  });

  test('CP-E09 F5 después de crear un paciente no reenvía el formulario', async ({ page, request, baseURL }) => {
    await ingresar(page, cuentas.uno);
    const posts = [];
    page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/pacientes')) posts.push(r); });
    await page.goto('/pacientes/nuevo');
    await page.getByLabel(/^Nombre/).first().fill('ZZ-TEST');
    await page.getByLabel(/^Apellido/).fill('F5');
    await page.getByLabel(/^DNI/).fill(String(Math.floor(90000000 + Math.random() * 9999999)));
    await page.getByLabel(/^Fecha de nacimiento/).fill('2015-03-10');
    await page.getByLabel(/^Profesional asignado/).selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Crear paciente' }).click();
    await expect(page).toHaveURL(/\/pacientes\/[0-9a-f-]{36}$/);
    const id = page.url().split('/').pop();

    await page.reload();
    await page.goBack();

    expect(posts).toHaveLength(1);
    await darDeBaja(request, apiUrl(baseURL), await tokenDe(page), id);
  });
});
