const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'commonjs', globals: { ...globals.node } },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_|^next$', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Complejidad ciclomática máxima por función (pedido de la cátedra).
      complexity: ['warn', 10]
    }
  },
  {
    // Capas: solo los repositorios (y la autenticación, que usa Supabase Auth) hablan con
    // Supabase. Services y rutas piden los datos a un repositorio.
    files: ['src/services/**', 'src/routes/**'],
    ignores: ['src/services/AuthService.js'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: "CallExpression[callee.name='require'][arguments.0.value=/config\\/supabase$/]",
        message: 'Los services y las rutas no usan Supabase directo: pedí los datos a un repositorio (src/repositories).'
      }]
    }
  },
  { files: ['__tests__/**'], languageOptions: { globals: { ...globals.jest } } }
];
