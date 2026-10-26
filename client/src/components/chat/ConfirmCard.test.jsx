import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from '../../services/api';
import { ConfirmCard, ToolResultCard } from './ChatToolResults';

vi.mock('../../services/api');
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const solicitud = { type: 'confirm', accion: 'eliminar_paciente', paciente_id: 'p1', descripcion: 'Dar de baja a Gil, Luz', token: 'tok-firmado' };

const conProveedor = (ui) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

beforeEach(() => vi.clearAllMocks());

describe('ConfirmCard (baja pedida por el chat)', () => {
  it('muestra qué se va a hacer y NO llama al servidor hasta que la persona confirma', () => {
    conProveedor(<ConfirmCard result={solicitud} />);
    expect(screen.getByText(/Dar de baja a Gil, Luz/)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('al confirmar manda el token firmado a /ia/confirmar y muestra el resultado', async () => {
    api.post.mockResolvedValueOnce({ data: { message: 'Paciente Gil, Luz eliminado', id: 'p1' } });
    conProveedor(<ConfirmCard result={solicitud} />);
    await userEvent.click(screen.getByRole('button', { name: /sí, confirmar/i }));
    expect(api.post).toHaveBeenCalledWith('/ia/confirmar', { token: 'tok-firmado' });
    expect(await screen.findByText(/Paciente Gil, Luz eliminado/)).toBeInTheDocument();
  });

  it('cancelar no llama al servidor', async () => {
    conProveedor(<ConfirmCard result={solicitud} />);
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByText(/no se hizo ningún cambio/i)).toBeInTheDocument();
  });

  it('si el servidor rechaza (ej: token vencido) vuelve a mostrar los botones', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { error: 'La confirmación venció, volvé a pedirla' } } });
    conProveedor(<ConfirmCard result={solicitud} />);
    await userEvent.click(screen.getByRole('button', { name: /sí, confirmar/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /sí, confirmar/i })).toBeEnabled());
  });

  it('ToolResultCard muestra la tarjeta de confirmación para una solicitud de confirm', () => {
    conProveedor(<ToolResultCard name="eliminar_paciente" result={solicitud} />);
    expect(screen.getByRole('button', { name: /sí, confirmar/i })).toBeInTheDocument();
  });
});
