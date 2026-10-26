import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import ResetPasswordPage, { leerTokenDeRecuperacion } from './ResetPasswordPage';

vi.mock('axios');
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const montar = () => render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);
const conHash = (hash) => { window.location.hash = hash; };

beforeEach(() => { vi.clearAllMocks(); window.location.hash = ''; });

describe('leerTokenDeRecuperacion', () => {
  it('devuelve el access_token solo si es un link de recuperación', () => {
    expect(leerTokenDeRecuperacion('#access_token=abc&type=recovery')).toBe('abc');
    expect(leerTokenDeRecuperacion('#access_token=abc&type=signup')).toBeNull();
    expect(leerTokenDeRecuperacion('#error=access_denied&error_code=otp_expired')).toBeNull();
    expect(leerTokenDeRecuperacion('')).toBeNull();
  });
});

describe('ResetPasswordPage', () => {
  it('sin token válido avisa que el link venció y no muestra el formulario', () => {
    montar();
    expect(screen.getByText(/no es válido o ya venció/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/contraseña nueva/i)).not.toBeInTheDocument();
  });

  it('valida el largo y que coincidan antes de llamar al servidor', async () => {
    conHash('#access_token=tok&type=recovery');
    montar();
    await userEvent.type(screen.getByLabelText(/contraseña nueva/i), 'corta');
    await userEvent.click(screen.getByRole('button', { name: /cambiar contraseña/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/al menos 8/i);

    await userEvent.clear(screen.getByLabelText(/contraseña nueva/i));
    await userEvent.type(screen.getByLabelText(/contraseña nueva/i), 'larga-123');
    await userEvent.type(screen.getByLabelText(/repetila/i), 'distinta-123');
    await userEvent.click(screen.getByRole('button', { name: /cambiar contraseña/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/no coinciden/i);
    expect(axios.patch).not.toHaveBeenCalled();
  });

  it('manda la contraseña con el token de recuperación (no con otra sesión)', async () => {
    axios.patch.mockResolvedValueOnce({ data: {} });
    conHash('#access_token=tok-recuperacion&type=recovery');
    montar();
    await userEvent.type(screen.getByLabelText(/contraseña nueva/i), 'larga-123');
    await userEvent.type(screen.getByLabelText(/repetila/i), 'larga-123');
    await userEvent.click(screen.getByRole('button', { name: /cambiar contraseña/i }));
    await waitFor(() => expect(axios.patch).toHaveBeenCalled());
    const [url, body, config] = axios.patch.mock.calls[0];
    expect(url).toBe('/auth/change-password');
    expect(body).toEqual({ password: 'larga-123' });
    expect(config.headers.Authorization).toBe('Bearer tok-recuperacion');
  });

  it('si el servidor rechaza muestra el motivo', async () => {
    axios.patch.mockRejectedValueOnce({ response: { data: { error: 'Token inválido o expirado' } } });
    conHash('#access_token=vencido&type=recovery');
    montar();
    await userEvent.type(screen.getByLabelText(/contraseña nueva/i), 'larga-123');
    await userEvent.type(screen.getByLabelText(/repetila/i), 'larga-123');
    await userEvent.click(screen.getByRole('button', { name: /cambiar contraseña/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/token inválido o expirado/i);
  });
});
