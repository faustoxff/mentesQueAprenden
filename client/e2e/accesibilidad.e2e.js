import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cuentas, tieneCuenta, SIN_UNO, ingresar } from './helpers';

// Accesibilidad automática con axe-core (WCAG 2.1 A y AA). Solo se exigen 0 violaciones
// serious y critical; el detalle completo queda en testing/evidencias/EV-A11Y-<pagina>.json.
const EVIDENCIAS = path.resolve(process.cwd(), '../testing/evidencias');

async function auditar(page, nombre) {
  await page.waitForLoadState('networkidle');
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const resumen = violations.map((v) => ({ id: v.id, impacto: v.impact, descripcion: v.help, ayuda: v.helpUrl, nodos: v.nodes.length, ejemplo: v.nodes[0]?.target }));
  fs.mkdirSync(EVIDENCIAS, { recursive: true });
  fs.writeFileSync(path.join(EVIDENCIAS, `EV-A11Y-${nombre}.json`), JSON.stringify(resumen, null, 2));
  return resumen.filter((v) => ['serious', 'critical'].includes(v.impacto));
}

test('CP-E13 login sin violaciones serious/critical', async ({ page }) => {
  await page.goto('/login');

  expect(await auditar(page, 'login')).toEqual([]);
});

test.describe('con sesión', () => {
  test.skip(!tieneCuenta(cuentas.uno), SIN_UNO);

  for (const [cp, ruta, nombre] of [['CP-E14', '/', 'inicio'], ['CP-E15', '/pacientes', 'pacientes'], ['CP-E16', '/agenda', 'agenda']]) {
    test(`${cp} ${nombre} sin violaciones serious/critical`, async ({ page }) => {
      await ingresar(page, cuentas.uno);
      await page.goto(ruta);

      expect(await auditar(page, nombre)).toEqual([]);
    });
  }
});
