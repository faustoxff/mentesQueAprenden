import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mentes que Aprenden - Gestión Clínica',
        short_name: 'Mentes que Aprenden',
        description: 'Sistema de gestión clínica interdisciplinaria',
        theme_color: '#7c5cbf',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'es',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/test/**', 'src/main.jsx'],
      // Piso: si baja de esto, el CI falla. Subirlo a medida que se agreguen tests.
      // El global lo bajan las páginas grandes (agenda, detalle de paciente); lo crítico
      // (sesión, API, errores, rutas de auth) tiene su propio piso.
      thresholds: {
        statements: 30, branches: 80, functions: 42, lines: 30,
        'src/{services,store,utils,hooks,components/auth}/**': { statements: 85, branches: 75, functions: 75, lines: 85 }
      }
    }
  }
});
