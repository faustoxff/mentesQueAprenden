// "unit": sin red ni credenciales (Supabase mockeado). Corre siempre, también en CI.
// "integration": pega contra una base Supabase real con cuentas de prueba (ver __tests__/README.md).
module.exports = {
  testTimeout: 20000,
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/unit/**/*.test.js']
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/__tests__/e2e/**/*.test.js',
        '<rootDir>/__tests__/ia/**/*.test.js',
        '<rootDir>/__tests__/seguridad/**/*.test.js',
        '<rootDir>/__tests__/validacion/**/*.test.js'
      ],
      setupFiles: ['dotenv/config']
    }
  ]
};
