import { test, expect } from '@playwright/test';
import { cuentas, tieneCuenta, SIN_UNO, SIN_DOS, ingresar, apiUrl, tokenDe, crearPacienteZZ, darDeBaja } from './helpers';

test('CP-E05 el profesional 2 no ve el paciente del 1; con la derivación aceptada sí', async ({ browser, baseURL }) => {
  test.skip(!tieneCuenta(cuentas.uno), SIN_UNO);
  test.skip(!tieneCuenta(cuentas.dos), SIN_DOS);
  const api = apiUrl(baseURL);
  const uno = await (await browser.newContext()).newPage();
  const dos = await (await browser.newContext()).newPage();
  await ingresar(uno, cuentas.uno);
  await ingresar(dos, cuentas.dos);
  const [t1, t2] = [await tokenDe(uno), await tokenDe(dos)];
  const yo2 = await (await dos.request.get(`${api}/auth/me`, { headers: { Authorization: `Bearer ${t2}` } })).json();
  const paciente = await crearPacienteZZ(uno.request, api, t1);

  try {
    // Sin derivación: no lo ve
    await dos.goto(`/pacientes/${paciente.id}`);
    await expect(dos.getByText('Paciente no encontrado')).toBeVisible();
    await expect(dos.getByText(paciente.apellido)).toHaveCount(0);

    // Derivación pendiente: todavía no lo ve
    const deriv = await (await uno.request.post(`${api}/derivaciones`, {
      headers: { Authorization: `Bearer ${t1}` },
      data: { paciente_id: paciente.id, profesional_destino_id: yo2.profesional.id, motivo: 'ZZ-TEST derivación E2E' }
    })).json();
    await dos.reload();
    await expect(dos.getByText('Paciente no encontrado')).toBeVisible();

    // Aceptada por el profesional 2 desde la UI: ahora sí
    await dos.goto('/derivaciones');
    await dos.getByRole('button', { name: /aceptar/i }).first().click();
    await dos.getByRole('button', { name: 'Confirmar aceptación' }).click();
    await dos.goto(`/pacientes/${paciente.id}`);
    await expect(dos.getByText(paciente.apellido).first()).toBeVisible();

    await uno.request.patch(`${api}/derivaciones/${deriv.id}/completar`, { headers: { Authorization: `Bearer ${t1}` } });
  } finally {
    await darDeBaja(uno.request, api, t1, paciente.id);
  }
});
