import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import api from './services/api';
import App from './App';
import { useAuthStore } from './store/authStore';

vi.mock('./services/api');
vi.mock('./components/ui/Balatro', () => ({ default: () => null }));

const sesion = {
  profesional: { id: 'u1', nombre: 'Admin', apellido: 'User', rol: 'admin', especialidad: 'otro' },
  session: { access_token: 'AT', refresh_token: 'RT' }
};

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/login');
  useAuthStore.setState({ profesional: null, accessToken: null, refreshToken: null, isLoading: false, error: null });
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: [] });
  Element.prototype.scrollIntoView = vi.fn(); // jsdom no lo implementa
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

describe('humo: login → inicio (render real de la app)', () => {
  it('con credenciales correctas entra a la pantalla de inicio sin romperse', async () => {
    api.post.mockResolvedValueOnce({ data: sesion });
    const errores = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<App />);
    await userEvent.type(await screen.findByLabelText(/email/i), 'adminuser@gmail.com');
    await userEvent.type(screen.getByLabelText(/contraseña/i, { selector: 'input' }), 'pepito1234');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(await screen.findByText(/Hola, Admin/)).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'adminuser@gmail.com', password: 'pepito1234' });
    expect(errores.mock.calls.filter(([m]) => String(m).includes('Error:') || String(m).includes('Uncaught'))).toHaveLength(0);
  });

  it('con credenciales malas muestra el mensaje en el formulario', async () => {
    api.post.mockRejectedValueOnce({ response: { status: 401, data: { error: 'Credenciales inválidas' } } });
    render(<App />);
    await userEvent.type(await screen.findByLabelText(/email/i), 'x@y.com');
    await userEvent.type(screen.getByLabelText(/contraseña/i, { selector: 'input' }), 'mala');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));
    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });
});
