import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from '../services/api';
import AgendaPage from './AgendaPage';
import { useAuthStore } from '../store/authStore';

vi.mock('../services/api');
// El calendario no es lo que se prueba acá (y no corre bien en jsdom): se reemplaza por un vacío.
vi.mock('@fullcalendar/react', () => ({ default: () => null }));

const renderizar = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><AgendaPage /></MemoryRouter>
  </QueryClientProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: [] });
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

describe('AgendaPage: formulario de turno accesible', () => {
  it.each([
    ['profesional', { rol: 'profesional' }, ['Fecha *', 'Hora *', 'Duración (minutos)', 'Consultorio *', 'Paciente', 'Tipo de sesión', 'Notas']],
    ['admin', { rol: 'admin' }, ['Fecha *', 'Hora *', 'Duración (minutos)', 'Consultorio *', 'Profesional *', 'Paciente', 'Tipo de sesión', 'Notas']]
  ])('CP-U308 como %s, "Nuevo turno" abre un diálogo y cada campo se encuentra por su label', async (_rol, extra, labels) => {
    useAuthStore.setState({ profesional: { id: 'u1', nombre: 'Ana', apellido: 'Paz', ...extra } });
    renderizar();

    await userEvent.click(screen.getByRole('button', { name: /nuevo turno/i }));

    const dialogo = screen.getByRole('dialog', { name: 'Nuevo turno' });
    labels.forEach((label) => expect(within(dialogo).getByLabelText(label)).toBeInTheDocument());
    expect(within(dialogo).getByLabelText('Consultorio *').tagName).toBe('SELECT');
  });
});
