import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { toast } from 'sonner';
import api from './api';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../utils/errores';

const respuesta = (config, status = 200, data = 'ok') => ({ data, status, statusText: '', headers: {}, config });
const falla = (config, status, data = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), { config, response: { status, data, config } });

let pedidos;
beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  localStorage.clear();
  pedidos = [];
  useAuthStore.setState({ profesional: { id: 1 }, accessToken: 'tok', refreshToken: 'ref' });
  api.defaults.adapter = (config) => { pedidos.push(config); return Promise.resolve(respuesta(config)); };
});

describe('api: headers y timeouts', () => {
  it('CP-U217 con sesión manda Authorization: Bearer <token>', async () => {
    localStorage.setItem('access_token', 'tok-123');

    await api.get('/pacientes');

    expect(pedidos[0].headers.Authorization).toBe('Bearer tok-123');
  });

  it('CP-U218 sin sesión no manda Authorization', async () => {
    await api.get('/pacientes');

    expect(pedidos[0].headers.Authorization).toBeUndefined();
  });

  it('CP-U219 las rutas de IA tienen 60 s de timeout y el resto 15 s', async () => {
    await api.post('/ia/chat', {});
    await api.get('/pacientes');

    expect(pedidos.map((p) => p.timeout)).toEqual([60000, 15000]);
  });
});

describe('api: errores', () => {
  it('CP-U220 un 500 no intenta renovar la sesión y llega con un mensaje legible', async () => {
    api.defaults.adapter = (config) => Promise.reject(falla(config, 500, { error: 'Error interno' }));
    const refresh = vi.spyOn(axios, 'post');

    const err = await api.get('/pacientes').catch((e) => e);

    expect(refresh).not.toHaveBeenCalled();
    expect(getErrorMessage(err)).toBe('Error interno');
  });

  it('CP-U221 con la red caída el mensaje dice que no hubo conexión', async () => {
    api.defaults.adapter = () => Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));

    const err = await api.get('/pacientes').catch((e) => e);

    expect(getErrorMessage(err)).toMatch(/No pudimos conectarnos con el servidor/);
  });

  it('CP-U222 un 401 sin refresh token cierra la sesión y avisa', async () => {
    localStorage.setItem('access_token', 'vencido');
    api.defaults.adapter = (config) => (config.url === '/auth/logout' ? Promise.resolve(respuesta(config)) : Promise.reject(falla(config, 401)));

    await api.get('/pacientes').catch(() => {});

    expect(toast.error).toHaveBeenCalledWith('Tu sesión venció, volvé a iniciar sesión');
    await vi.waitFor(() => expect(useAuthStore.getState().profesional).toBeNull());
  });

  it('CP-U223 un 401 que ya se reintentó una vez no vuelve a renovar (sin loop infinito)', async () => {
    localStorage.setItem('access_token', 'a');
    localStorage.setItem('refresh_token', 'r');
    api.defaults.adapter = (config) => Promise.reject(falla(config, 401));
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: { access_token: 'b', refresh_token: 'r2' } });

    await api.get('/pacientes').catch(() => {});

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('CP-U224 un 403 no renueva la sesión ni la cierra', async () => {
    api.defaults.adapter = (config) => Promise.reject(falla(config, 403, { error: 'Se requiere rol admin' }));
    const refresh = vi.spyOn(axios, 'post');

    const err = await api.get('/pagos/liquidacion').catch((e) => e);

    expect(refresh).not.toHaveBeenCalled();
    expect(useAuthStore.getState().profesional).toEqual({ id: 1 });
    expect(getErrorMessage(err)).toBe('Se requiere rol admin');
  });
});
