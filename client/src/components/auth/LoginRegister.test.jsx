import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import api from '../../services/api';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import { useAuthStore } from '../../store/authStore';

vi.mock('../../services/api');
vi.mock('../ui/Balatro', () => ({ default: () => null }));

const conRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);
const campo = (nombre) => screen.getByLabelText(nombre, { selector: 'input' });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuthStore.setState({ profesional: null, accessToken: null, refreshToken: null, isLoading: false, error: null });
});

describe('LoginPage', () => {
  it('CP-U239 email y contraseña son obligatorios: con el form vacío no es válido', () => {
    conRouter(<LoginPage />);

    expect(campo(/email/i)).toBeRequired();
    expect(campo(/contraseña/i)).toBeRequired();
    expect(campo(/email/i).closest('form').checkValidity()).toBe(false);
  });

  it.each(['sin-arroba', 'a@', '@b.com'])('CP-U240 un email inválido (%s) no pasa la validación del navegador', async (email) => {
    conRouter(<LoginPage />);

    await userEvent.type(campo(/email/i), email);
    await userEvent.type(campo(/contraseña/i), 'x');

    expect(campo(/email/i).checkValidity()).toBe(false);
  });

  it('CP-U241 durante el envío el botón se deshabilita y dice "Ingresando..." (sin doble envío)', async () => {
    api.post.mockReturnValue(new Promise(() => {}));
    conRouter(<LoginPage />);
    await userEvent.type(campo(/email/i), 'a@b.com');
    await userEvent.type(campo(/contraseña/i), 'secreta123');

    await userEvent.click(screen.getByRole('button', { name: /^ingresar$/i }));
    const boton = await screen.findByRole('button', { name: /ingresando/i });
    await userEvent.click(boton);

    expect(boton).toBeDisabled();
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('CP-U242 con credenciales incorrectas muestra el mensaje del servidor', async () => {
    api.post.mockRejectedValue({ response: { status: 401, data: { error: 'Credenciales inválidas' } } });
    conRouter(<LoginPage />);
    await userEvent.type(campo(/email/i), 'a@b.com');
    await userEvent.type(campo(/contraseña/i), 'mala');

    await userEvent.click(screen.getByRole('button', { name: /^ingresar$/i }));

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
  });

  it('CP-U243 recuperar contraseña muestra la misma respuesta genérica (no revela si el email existe)', async () => {
    api.post.mockResolvedValue({ data: { message: 'ok' } });
    conRouter(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /olvidaste/i }));

    await userEvent.type(screen.getByLabelText('Email'), 'quien@sea.com');
    await userEvent.click(screen.getByRole('button', { name: /enviar link/i }));

    expect(await screen.findByText(/si .*está registrado/i)).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'quien@sea.com' });
  });

  it('CP-U244 si falla el envío del link, avisa con un mensaje entendible', async () => {
    api.post.mockRejectedValue(new Error('Network Error'));
    conRouter(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /olvidaste/i }));

    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.click(screen.getByRole('button', { name: /enviar link/i }));

    expect(await screen.findByText(/No pudimos enviar el link/)).toBeInTheDocument();
  });
});

describe('RegisterPage', () => {
  it('CP-U245 nombre, apellido, email y contraseña son obligatorios', () => {
    conRouter(<RegisterPage />);

    ['Nombre', 'Apellido', 'Email', 'Contraseña'].forEach((n) => expect(campo(n)).toBeRequired());
    expect(campo('Email').closest('form').checkValidity()).toBe(false);
  });

  it('CP-U246 la contraseña exige un mínimo de 8 caracteres (mismo límite que el backend)', () => {
    conRouter(<RegisterPage />);

    // jsdom no calcula tooShort: se verifica la restricción declarada en el input.
    expect(campo('Contraseña')).toHaveAttribute('minLength', '8');
  });

  it('CP-U247 durante el envío el botón dice "Creando cuenta..." y está deshabilitado', async () => {
    api.post.mockReturnValue(new Promise(() => {}));
    conRouter(<RegisterPage />);
    await userEvent.type(campo('Nombre'), 'ZZ-TEST');
    await userEvent.type(campo('Apellido'), 'Prueba');
    await userEvent.type(campo('Email'), 'zz@test.com');
    await userEvent.type(campo('Contraseña'), '12345678');

    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByRole('button', { name: /creando cuenta/i })).toBeDisabled();
  });

  it('CP-U248 un email repetido muestra el mensaje del servidor', async () => {
    api.post.mockRejectedValue({ response: { status: 409, data: { error: 'Ya existe una cuenta con ese email' } } });
    conRouter(<RegisterPage />);
    await userEvent.type(campo('Nombre'), 'ZZ-TEST');
    await userEvent.type(campo('Apellido'), 'Prueba');
    await userEvent.type(campo('Email'), 'zz@test.com');
    await userEvent.type(campo('Contraseña'), '12345678');

    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByText('Ya existe una cuenta con ese email')).toBeInTheDocument();
  });
});
