import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from '../../services/api';
import ChatSidebar from './ChatSidebar';
import { useAuthStore } from '../../store/authStore';

vi.mock('../../services/api');

const renderizar = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={['/']}>
      <ChatSidebar />
      <Routes>
        <Route path="/" element={<p>inicio</p>} />
        <Route path="/historial" element={<p>página de historial</p>} />
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  api.get.mockResolvedValue({ data: [] });
  Element.prototype.scrollIntoView = vi.fn();
  useAuthStore.setState({ profesional: { id: 'u1', nombre: 'Ana', apellido: 'Paz', rol: 'profesional', especialidad: 'psicopedagogia' } });
});

describe('ChatSidebar: menú', () => {
  it('CP-U294 un profesional ve "Historial" entre Derivaciones y Cerrar sesión, y lo lleva a /historial', async () => {
    renderizar();

    await userEvent.click(screen.getByRole('button', { name: 'Más opciones' }));
    const opciones = screen.getAllByRole('link').map((l) => l.textContent.trim());
    expect(opciones.indexOf('Historial')).toBe(opciones.indexOf('Derivaciones') + 1);
    await userEvent.click(screen.getByRole('link', { name: 'Historial' }));

    expect(screen.getByText('página de historial')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Historial' })).toBeNull();
  });

  it('CP-U295 para un admin, "Historial" queda antes de "Administración"', async () => {
    useAuthStore.setState({ profesional: { id: 'u2', nombre: 'Eva', apellido: 'Sol', rol: 'admin', especialidad: 'otro' } });
    renderizar();

    await userEvent.click(screen.getByRole('button', { name: 'Más opciones' }));

    const opciones = screen.getAllByRole('link').map((l) => l.textContent.trim());
    expect(opciones.slice(-2)).toEqual(['Historial', 'Administración']);
  });
});
