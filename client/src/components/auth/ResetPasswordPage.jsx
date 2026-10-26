import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { getErrorMessage } from '../../utils/errores';

const baseURL = import.meta.env.VITE_API_URL || '/api';

// El mail de "¿Olvidaste tu contraseña?" lleva acá con el token de recuperación de
// Supabase en el fragmento de la URL (#access_token=...&type=recovery).
// Se usa axios "pelado" para mandar ESE token y no el de una sesión que pudiera haber.
export function leerTokenDeRecuperacion(hash) {
  const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  if (params.get('type') !== 'recovery') return null;
  return params.get('access_token') || null;
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const token = useMemo(() => leerTokenDeRecuperacion(window.location.hash), []);
  const [password, setPassword] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres');
    if (password !== repetida) return setError('Las contraseñas no coinciden');

    setEnviando(true);
    try {
      await axios.patch('/auth/change-password', { password }, {
        baseURL,
        headers: { Authorization: `Bearer ${token}` }
      });
      window.history.replaceState(null, '', window.location.pathname);
      toast.success('Contraseña actualizada. Ya podés iniciar sesión.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cambiar la contraseña. Pedí un link nuevo.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f6f0fb' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Nueva contraseña</h1>

        {!token ? (
          <>
            <p className="text-sm text-gray-600 mt-2 mb-5">
              El link no es válido o ya venció. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".
            </p>
            <Link to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              Volver al inicio de sesión
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label htmlFor="nueva" className="text-sm font-medium text-gray-700 block mb-1">Contraseña nueva</label>
              <input
                id="nueva"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="repetida" className="text-sm font-medium text-gray-700 block mb-1">Repetila</label>
              <input
                id="repetida"
                type="password"
                autoComplete="new-password"
                value={repetida}
                onChange={(e) => setRepetida(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={enviando}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl"
            >
              {enviando ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
