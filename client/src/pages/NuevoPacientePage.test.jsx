import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from '../services/api';
import NuevoPacientePage from './NuevoPacientePage';

vi.mock('../services/api');
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const PROF_ID = '11111111-1111-4111-8111-111111111111';

const renderizar = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><NuevoPacientePage /></MemoryRouter>
  </QueryClientProvider>
);

// Hay labels repetidos (el responsable también tiene Nombre y Teléfono): se toma el primero, el del paciente.
const porLabel = (texto) => screen.getAllByLabelText(new RegExp(`^${texto}`))[0];

const completarObligatorios = async (extra = {}) => {
  await screen.findByRole('option', { name: /Paz/ });
  const datos = { Nombre: 'ZZ-TEST', Apellido: 'Prueba', DNI: '12345678', ...extra };
  for (const [label, valor] of Object.entries(datos)) {
    if (valor) await userEvent.type(porLabel(label), valor);
  }
  await userEvent.type(porLabel('Fecha de nacimiento'), '2015-03-10');
  await userEvent.selectOptions(await screen.findByLabelText(/^Profesional asignado/), PROF_ID);
};

const guardar = () => userEvent.click(screen.getByRole('button', { name: /crear paciente/i }));

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation((url) => Promise.resolve({ data: url === '/profesionales' ? [{ id: PROF_ID, nombre: 'Ana', apellido: 'Paz' }] : [] }));
});

describe('formulario de nuevo paciente', () => {
  it('CP-U249 con el formulario vacío marca los obligatorios y no llama al servidor', async () => {
    renderizar();

    await guardar();

    expect(await screen.findByText('El nombre es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('El apellido es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('El DNI es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('La fecha de nacimiento es obligatoria')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it.each([
    ['6 dígitos', '123456'],
    ['9 dígitos', '123456789'],
    ['con puntos', '12.345.678'],
    ['con letras', '1234567a']
  ])('CP-U250 DNI con %s muestra el formato esperado y no se envía', async (_caso, dni) => {
    renderizar();
    await completarObligatorios({ DNI: dni });

    await guardar();

    expect(await screen.findByText(/7 u 8 dígitos/)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it.each([
    ['7 caracteres', '1234567'],
    ['21 caracteres', '1'.repeat(21)],
    ['letras', 'once-veinte']
  ])('CP-U251 teléfono con %s se rechaza', async (_caso, telefono) => {
    renderizar();
    await completarObligatorios();
    await userEvent.type(porLabel('Teléfono'), telefono);

    await guardar();

    expect(await screen.findByText(/entre 8 y 20 caracteres/)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('CP-U252 con datos válidos (DNI de 7 dígitos, límite) envía una sola vez', async () => {
    api.post.mockResolvedValue({ data: { id: 'nuevo' } });
    renderizar();
    await completarObligatorios({ DNI: '1234567' });

    await guardar();

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post.mock.calls[0][1]).toMatchObject({ nombre: 'ZZ-TEST', dni: '1234567', estado: 'activo', profesional_principal_id: PROF_ID });
  });

  it('CP-U253 mientras guarda, el botón se deshabilita: un doble clic crea un solo paciente', async () => {
    api.post.mockReturnValue(new Promise(() => {}));
    renderizar();
    await completarObligatorios();

    await guardar();
    const boton = await screen.findByRole('button', { name: /guardando/i });
    await userEvent.click(boton);

    expect(boton).toBeDisabled();
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('CP-U254 un DNI repetido (409) se informa sin perder lo cargado', async () => {
    api.post.mockRejectedValue({ response: { status: 409, data: { error: 'Ya existe un paciente con ese DNI' } } });
    const { toast } = await import('sonner');
    renderizar();
    await completarObligatorios();

    await guardar();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Ya existe un paciente con ese DNI'));
    expect(porLabel('Nombre')).toHaveValue('ZZ-TEST');
  });

  it('CP-U255 un 422 del servidor marca el campo rechazado', async () => {
    api.post.mockRejectedValue({ response: { status: 422, data: { errors: [{ path: 'email', msg: 'El email no es válido' }] } } });
    renderizar();
    await completarObligatorios();

    await guardar();

    expect(await screen.findByText('El email no es válido')).toBeInTheDocument();
  });
});
