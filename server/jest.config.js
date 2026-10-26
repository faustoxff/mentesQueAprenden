// "unit": sin red ni credenciales (Supabase mockeado). Corre siempre, también en CI.
// "integration": pega contra una base Supabase real con cuentas de prueba (ver __tests__/README.md).
module.exports = {
  testTimeout: 20000,
  // Cobertura de los tests unitarios (npm run test:coverage). Se mide solo sobre
  // la lógica de negocio y el middleware; las rutas se cubren con integración.
  collectCoverageFrom: ['src/services/**/*.js', 'src/middleware/**/*.js', 'src/utils/**/*.js'],
  // Piso: si la cobertura baja de esto, el CI falla. Subirlo a medida que se agreguen tests.
  coverageThreshold: { global: { statements: 38, branches: 34, functions: 31, lines: 40 } },
  coverageReporters: ['text-summary', 'text', 'lcov'],
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
