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
  it('CP-U245 nombre, apellido, email, contraseña y su repetición son obligatorios', () => {
    conRouter(<RegisterPage />);

    ['Nombre', 'Apellido', 'Email', 'Contraseña', 'Repetir contraseña'].forEach((n) => expect(campo(n)).toBeRequired());
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
    await userEvent.type(campo('Repetir contraseña'), '12345678');

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
    await userEvent.type(campo('Repetir contraseña'), '12345678');

    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByText('Ya existe una cuenta con ese email')).toBeInTheDocument();
  });

  const completarRegistro = async (password, repeticion) => {
    await userEvent.type(campo('Nombre'), 'ZZ-TEST');
    await userEvent.type(campo('Apellido'), 'Prueba');
    await userEvent.type(campo('Email'), 'zz@test.com');
    await userEvent.type(campo('Contraseña'), password);
    await userEvent.type(campo('Repetir contraseña'), repeticion);
  };

  it('CP-U268 con contraseñas distintas no llama al servidor y explica el motivo', async () => {
    conRouter(<RegisterPage />);
    await completarRegistro('12345678', '12345679');

    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Las contraseñas no coinciden. Revisalas antes de crear la cuenta.');
  });

  it('CP-U269 el aviso aparece mientras no coinciden y se va cuando se corrige', async () => {
    conRouter(<RegisterPage />);
    await userEvent.type(campo('Contraseña'), '12345678');

    await userEvent.type(campo('Repetir contraseña'), '1234');
    const repetir = campo('Repetir contraseña');
    expect(screen.getByRole('alert')).toHaveTextContent('Las contraseñas no coinciden');
    expect(repetir).toHaveAttribute('aria-invalid', 'true');
    expect(repetir).toHaveAttribute('aria-describedby', screen.getByRole('alert').id);
    await userEvent.type(repetir, '5678');

    expect(screen.queryByRole('alert')).toBeNull();
    expect(repetir).toHaveAttribute('aria-invalid', 'false');
    expect(repetir).not.toHaveAttribute('aria-describedby');
  });

  it('CP-U270 corregir cualquiera de los dos campos borra el aviso del envío', async () => {
    conRouter(<RegisterPage />);
    await completarRegistro('12345678', '12345679');
    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await userEvent.clear(campo('Contraseña'));
    await userEvent.type(campo('Contraseña'), '12345679');

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('CP-U271 con contraseñas iguales registra y la repetición no viaja en el body', async () => {
    api.post.mockResolvedValue({ data: { profesional: { id: 'u9' }, session: null } });
    conRouter(<RegisterPage />);
    await completarRegistro('12345678', '12345678');

    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    const [ruta, body] = api.post.mock.calls[0];
    expect(ruta).toBe('/auth/signup');
    expect(Object.keys(body).sort()).toEqual(['apellido', 'email', 'especialidad', 'matricula', 'nombre', 'password']);
    expect(JSON.stringify(body)).not.toMatch(/repetir/i);
  });

  it('CP-U272 el botón de mostrar contraseña muestra los dos campos', async () => {
    conRouter(<RegisterPage />);
    expect(campo('Contraseña')).toHaveAttribute('type', 'password');
    expect(campo('Repetir contraseña')).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));

    expect(campo('Contraseña')).toHaveAttribute('type', 'text');
    expect(campo('Repetir contraseña')).toHaveAttribute('type', 'text');
  });

  it('CP-U273 la repetición tiene la misma restricción de largo y autocompletado que la contraseña', () => {
    conRouter(<RegisterPage />);

    expect(campo('Repetir contraseña')).toHaveAttribute('minLength', '8');
    expect(campo('Repetir contraseña')).toHaveAttribute('autoComplete', 'new-password');
  });
});
