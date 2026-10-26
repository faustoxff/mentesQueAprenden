const request = require('supertest');
const app = require('../../src/index');

// Cuentas de prueba para los tests de integración. Las credenciales vienen del
// entorno (server/.env o secrets de CI), nunca del código. Ver __tests__/README.md.
// fausto y stefano deben ser admin; juanCruz, un profesional sin pacientes propios
// (sirve para testear que NO ve los pacientes ajenos).
const cuentaDesdeEnv = (prefijo) => ({
  email: process.env[`${prefijo}_EMAIL`],
  password: process.env[`${prefijo}_PASSWORD`]
});

const CUENTAS = {
  fausto: cuentaDesdeEnv('TEST_ADMIN1'),
  stefano: cuentaDesdeEnv('TEST_ADMIN2'),
  juanCruz: cuentaDesdeEnv('TEST_PROF')
};

async function loginComo(nombreCuenta) {
  const cuenta = CUENTAS[nombreCuenta];
  if (!cuenta) throw new Error(`Cuenta de prueba desconocida: ${nombreCuenta}`);
  if (!cuenta.email || !cuenta.password) {
    throw new Error(`Faltan las variables TEST_* de la cuenta "${nombreCuenta}" (ver __tests__/README.md)`);
  }

  const res = await request(app).post('/api/auth/login').send(cuenta);
  if (res.status !== 200) {
    throw new Error(`Login falló para ${nombreCuenta}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return {
    token: res.body.session.access_token,
    profesional: res.body.profesional
  };
}

module.exports = { loginComo, CUENTAS };
