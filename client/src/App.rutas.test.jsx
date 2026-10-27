import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import api from './services/api';
import App from './App';
import { useAuthStore } from './store/authStore';

vi.mock('./services/api');
vi.mock('./components/ui/Balatro', () => ({ default: () => null }));

const PROF = { id: 'u1', nombre: 'Ana', apellido: 'Paz', rol: 'profesional', especialidad: 'psicopedagogia' };
const ADMIN = { ...PROF, id: 'u2', nombre: 'Eva', rol: 'admin' };

const entrarComo = (profesional) => {
  localStorage.setItem('access_token', 'AT');
  useAuthStore.setState({ profesional, accessToken: 'AT', refreshToken: 'RT' });
};
const ir = (ruta) => { window.history.pushState({}, '', ruta); render(<App />); };

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ profesional: null, accessToken: null, refreshToken: null, isLoading: false, error: null });
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: [] });
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

describe('ProtectedRoute y PublicOnlyRoute', () => {
  it.each(['/', '/pacientes', '/agenda', '/pagos', '/admin', '/pacientes/123'])('CP-U232 sin sesión, %s redirige a /login', async (ruta) => {
    ir(ruta);

    await waitFor(() => expect(window.location.pathname).toBe('/login'));
  });

  it('CP-U233 con perfil guardado pero sin token en localStorage también redirige a /login', async () => {
    useAuthStore.setState({ profesional: PROF });

    ir('/pacientes');

    await waitFor(() => expect(window.location.pathname).toBe('/login'));
  });

  it.each(['/login', '/register'])('CP-U234 con sesión, %s redirige al inicio', async (ruta) => {
    entrarComo(PROF);

    ir(ruta);

    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });

  it('CP-U235 /reset-password se puede abrir sin sesión', async () => {
    ir('/reset-password');

    expect(await screen.findByText(/link|enlace/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/reset-password');
  });

  it('CP-U236 una ruta inexistente con sesión vuelve al inicio', async () => {
    entrarComo(PROF);

    ir('/no-existe');

    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });

  it('CP-U237 un admin puede entrar a /admin', async () => {
    entrarComo(ADMIN);

    ir('/admin');

    await waitFor(() => expect(window.location.pathname).toBe('/admin'));
  });

  // DEF-A17: /admin no tiene guarda de rol en el cliente: un profesional ve el panel de administración
  // (el backend sí rechaza las acciones con 403).
  it.fails('CP-U238 un profesional que entra a /admin es redirigido al inicio', async () => {
    entrarComo(PROF);

    ir('/admin');

    await waitFor(() => expect(window.location.pathname).toBe('/'), { timeout: 1500 });
  });
});
