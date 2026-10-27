import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api', () => ({ default: { post: vi.fn() } }));

import api from '../services/api';
import { useAuthStore } from './authStore';

const sesion = { profesional: { id: 'u1', rol: 'profesional' }, session: { access_token: 'AT', refresh_token: 'RT' } };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuthStore.setState({ profesional: null, accessToken: null, refreshToken: null, isLoading: false, error: null });
});

describe('authStore: sesión, rol y persistencia', () => {
  it('CP-U225 mientras el login está en curso isLoading es true (evita el doble envío)', async () => {
    let resolver;
    api.post.mockReturnValue(new Promise((r) => { resolver = r; }));

    const pendiente = useAuthStore.getState().login('a@b.com', 'x');
    expect(useAuthStore.getState().isLoading).toBe(true);
    resolver({ data: sesion });
    await pendiente;

    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('CP-U226 persiste solo profesional y tokens (no isLoading ni error)', async () => {
    api.post.mockResolvedValue({ data: sesion });

    await useAuthStore.getState().login('a@b.com', 'x');

    const guardado = JSON.parse(localStorage.getItem('auth-storage')).state;
    expect(Object.keys(guardado).sort()).toEqual(['accessToken', 'profesional', 'refreshToken']);
  });

  it('CP-U227 sin access_token en localStorage no se considera autenticado aunque haya perfil', () => {
    useAuthStore.setState({ profesional: { id: 'u1' } });

    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });

  it('CP-U228 un profesional común no es admin', async () => {
    api.post.mockResolvedValue({ data: sesion });

    await useAuthStore.getState().login('a@b.com', 'x');

    expect(useAuthStore.getState().isAdmin()).toBe(false);
  });

  it('CP-U229 logout limpia la sesión aunque el servidor no responda', async () => {
    api.post.mockResolvedValueOnce({ data: sesion }).mockRejectedValueOnce(new Error('Network Error'));
    await useAuthStore.getState().login('a@b.com', 'x');

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().profesional).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('CP-U230 un registro sin sesión automática no autentica (autoLogin false)', async () => {
    api.post.mockResolvedValue({ data: { profesional: { id: 'u2' }, session: null } });

    const res = await useAuthStore.getState().signup({ email: 'n@x.com' });

    expect(res).toEqual({ success: true, autoLogin: false });
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });

  it('CP-U231 con la red caída el login falla con un mensaje legible', async () => {
    api.post.mockRejectedValue(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));

    const res = await useAuthStore.getState().login('a@b.com', 'x');

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/No pudimos conectarnos/);
  });
});
