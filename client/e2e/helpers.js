import { expect } from '@playwright/test';

// Credenciales SOLO por variables de entorno. Usá cuentas de un proyecto de test.
export const cuentas = {
  uno: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD },
  dos: { email: process.env.E2E_EMAIL_2, password: process.env.E2E_PASSWORD_2 }
};
export const tieneCuenta = (c) => Boolean(c.email && c.password);
export const SIN_UNO = 'Faltan E2E_EMAIL y E2E_PASSWORD';
export const SIN_DOS = 'Faltan E2E_EMAIL_2 y E2E_PASSWORD_2';

// URL de la API para preparar y limpiar datos (por defecto, /api del mismo origen).
export const apiUrl = (baseURL) => process.env.E2E_API_URL || new URL('/api', baseURL).toString();

export async function ingresar(page, { email, password }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/$/);
}

// Token de la sesión del navegador, para llamar a la API en la preparación y la limpieza.
export const tokenDe = (page) => page.evaluate(() => localStorage.getItem('access_token'));

export const dniAlAzar = () => String(Math.floor(90000000 + Math.random() * 9999999));

// Crea un paciente ZZ-TEST por la API (más rápido y estable que la UI cuando el paciente no es lo que se prueba).
export async function crearPacienteZZ(request, api, token, extra = {}) {
  const res = await request.post(`${api}/pacientes`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nombre: 'ZZ-TEST', apellido: `E2E-${Date.now()}`, dni: dniAlAzar(), fecha_nacimiento: '2015-03-10', ...extra }
  });
  expect(res.status(), await res.text()).toBe(201);
  return res.json();
}

export const darDeBaja = (request, api, token, id) =>
  request.delete(`${api}/pacientes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
