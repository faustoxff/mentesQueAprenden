import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';

export default [
  { ignores: ['dist/**', 'coverage/**', 'dev-dist/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser }
    },
    plugins: { react },
    settings: { react: { version: 'detect' } },
    rules: {
      // Sin esto ESLint no ve que un componente importado se usa en el JSX.
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Complejidad ciclomática máxima por función (pedido de la cátedra).
      complexity: ['warn', 10]
    }
  },
  {
    files: ['**/*.test.{js,jsx}', 'src/test/**', 'e2e/**', '*.config.js'],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } }
  }
];
