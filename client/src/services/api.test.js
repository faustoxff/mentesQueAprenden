import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { toast } from 'sonner';
import api from './api';
import { useAuthStore } from '../store/authStore';

const respuestaOk = (config) => ({ data: 'ok', status: 200, statusText: 'OK', headers: {}, config });
const error401 = (config, data = {}) =>
  Object.assign(new Error('Request failed with status code 401'), { config, response: { status: 401, data, config } });

// Simula el backend: solo acepta el token vigente
const backendQueAceptaToken = (tokenValido) => (config) =>
  config.headers.Authorization === `Bearer ${tokenValido}`
    ? Promise.resolve(respuestaOk(config))
    : Promise.reject(error401(config));

describe('interceptor de api (renovación de sesión)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('access_token', 'viejo');
    localStorage.setItem('refresh_token', 'refresh-1');
    useAuthStore.setState({ profesional: { id: 1 }, accessToken: 'viejo', refreshToken: 'refresh-1' });
  });

  it('con varios 401 simultáneos hace un solo refresh y reintenta todas con el token nuevo', async () => {
    api.defaults.adapter = backendQueAceptaToken('nuevo');
    const refresh = vi.spyOn(axios, 'post').mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: { access_token: 'nuevo', refresh_token: 'refresh-2' } }), 20))
    );

    const resultados = await Promise.all([api.get('/pacientes'), api.get('/sesiones/1'), api.get('/turnos')]);

    expect(resultados.map((r) => r.data)).toEqual(['ok', 'ok', 'ok']);
    expect(refresh).toHaveBeenCalledTimes(1);
    // mismo baseURL que la instancia api, sin ruta hardcodeada
    expect(refresh).toHaveBeenCalledWith('/auth/refresh', { refresh_token: 'refresh-1' }, { baseURL: api.defaults.baseURL });
  });

  it('un 401 de /auth/login (contraseña incorrecta) no intenta refresh y conserva el mensaje', async () => {
    api.defaults.adapter = (config) => Promise.reject(error401(config, { error: 'Credenciales inválidas' }));
    const refresh = vi.spyOn(axios, 'post');

    const error = await api.post('/auth/login', { email: 'a@b.com', password: 'mala' }).catch((e) => e);

    expect(refresh).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(error.response.data.error).toBe('Credenciales inválidas');
    // la sesión que ya hubiera no se toca
    expect(useAuthStore.getState().profesional).toEqual({ id: 1 });
  });

  it('el store muestra "Credenciales inválidas" y la promesa de login no queda en undefined', async () => {
    api.defaults.adapter = (config) => Promise.reject(error401(config, { error: 'Credenciales inválidas' }));
    vi.spyOn(axios, 'post');

    const resultado = await useAuthStore.getState().login('a@b.com', 'mala');

    expect(resultado).toEqual({ success: false, error: 'Credenciales inválidas' });
    expect(useAuthStore.getState().error).toBe('Credenciales inválidas');
  });

  it('guarda los tokens nuevos en localStorage y en el authStore', async () => {
    api.defaults.adapter = backendQueAceptaToken('nuevo');
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { access_token: 'nuevo', refresh_token: 'refresh-2' } });

    await api.get('/pacientes');

    expect(localStorage.getItem('access_token')).toBe('nuevo');
    expect(localStorage.getItem('refresh_token')).toBe('refresh-2');
    expect(useAuthStore.getState().accessToken).toBe('nuevo');
    expect(useAuthStore.getState().refreshToken).toBe('refresh-2');
  });

  it('si el refresh falla: avisa una sola vez, limpia la sesión y rechaza todas las requests', async () => {
    api.defaults.adapter = (config) => Promise.reject(error401(config));
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh inválido'));

    const resultados = await Promise.allSettled([api.get('/pacientes'), api.get('/turnos')]);

    expect(resultados.every((r) => r.status === 'rejected')).toBe(true);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Tu sesión venció, volvé a iniciar sesión');
    // logout() del store es async (avisa al backend antes de limpiar)
    await vi.waitFor(() => expect(useAuthStore.getState().profesional).toBeNull());
    expect(localStorage.getItem('access_token')).toBeNull();
  });
});
