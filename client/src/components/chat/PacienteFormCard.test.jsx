import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from '../../services/api';
import { PacienteFormCard } from './ChatToolResults';
import { DNI_MENSAJE } from '../../utils/dni';

vi.mock('../../services/api');
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const datos = { nombre: 'ZZ-TEST', apellido: 'Chat', fecha_nacimiento: '2015-03-10' };
const renderizar = (prefill) => render(
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter><PacienteFormCard prefill={prefill} /></MemoryRouter>
  </QueryClientProvider>
);

beforeEach(() => vi.clearAllMocks());

describe('formulario de paciente del chat', () => {
  it.each(['123456', '123456789', '12.345.678'])('CP-U316 con DNI %s avisa con el mensaje de la regla única y no envía', async (dni) => {
    const { toast } = await import('sonner');
    renderizar({ ...datos, dni });

    await userEvent.click(screen.getByRole('button', { name: 'Guardar paciente' }));

    expect(toast.error).toHaveBeenCalledWith(DNI_MENSAJE);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('CP-U317 con un DNI válido envía el alta', async () => {
    api.post.mockResolvedValue({ data: { id: 'p1', ...datos, dni: '1234567' } });
    renderizar({ ...datos, dni: '1234567' });

    await userEvent.click(screen.getByRole('button', { name: 'Guardar paciente' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/pacientes', expect.objectContaining({ dni: '1234567' })));
  });
});
