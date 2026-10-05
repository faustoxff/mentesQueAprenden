import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Las rutas de IA pueden tardar más (OpenRouter + múltiples llamadas encadenadas)
api.interceptors.request.use((config) => {
  if (config.url?.startsWith('/ia/')) {
    config.timeout = 60000;
  }
  return config;
});

// Adjuntar token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Rutas donde un 401 no significa "token vencido" (credenciales incorrectas, refresh
// token inválido, etc.): no se intenta renovar la sesión y el error llega tal cual.
const RUTAS_SIN_REFRESH = ['/auth/login', '/auth/signup', '/auth/refresh', '/auth/forgot-password', '/auth/logout'];

// Con rotación de refresh tokens de Supabase, un refresh_token solo sirve una vez:
// si varias requests reciben 401 a la vez tiene que haber un único refresh en curso
// y las demás esperan su resultado.
let refreshEnCurso = null;

const sesionVencida = () => {
  toast.error('Tu sesión venció, volvé a iniciar sesión');
  // Al limpiar el store, ProtectedRoute redirige a /login con React Router.
  useAuthStore.getState().logout();
};

const renovarToken = () => {
  if (!refreshEnCurso) {
    const refreshToken = localStorage.getItem('refresh_token');
    // Se usa axios "pelado" (con la misma baseURL) para no pasar por estos interceptores.
    const pedido = refreshToken
      ? axios.post('/auth/refresh', { refresh_token: refreshToken }, { baseURL })
      : Promise.reject(new Error('Sin refresh token'));
    refreshEnCurso = pedido
      .then(({ data }) => {
        useAuthStore.getState().setTokens(data.access_token, data.refresh_token);
        return data.access_token;
      })
      .catch((err) => {
        sesionVencida();
        throw err;
      })
      .finally(() => {
        refreshEnCurso = null;
      });
  }
  return refreshEnCurso;
};

// Refresh automático en 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const sinRefresh = RUTAS_SIN_REFRESH.some((ruta) => original?.url?.startsWith(ruta));
    if (error.response?.status !== 401 || !original || original._retry || sinRefresh) {
      return Promise.reject(error);
    }
    original._retry = true;

    // Si otra request ya renovó el token mientras esta estaba en vuelo, alcanza con reintentar.
    const tokenUsado = original.headers?.Authorization?.replace('Bearer ', '');
    const tokenActual = localStorage.getItem('access_token');
    if (tokenActual && tokenUsado && tokenActual !== tokenUsado) {
      original.headers.Authorization = `Bearer ${tokenActual}`;
      return api(original);
    }

    try {
      const nuevoToken = await renovarToken();
      original.headers.Authorization = `Bearer ${nuevoToken}`;
      return api(original);
    } catch {
      return Promise.reject(error);
    }
  }
);

export default api;
