import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from '../../services/api';
import { ToolResultCard } from './ChatToolResults';

vi.mock('../../services/api');
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const solicitud = { type: 'confirm', accion: 'eliminar_paciente', paciente_id: 'p1', descripcion: 'Dar de baja a Gil, Luz', token: 'tok-firmado' };
const conProveedor = (ui) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

beforeEach(() => vi.clearAllMocks());

describe('baja de paciente pedida por el chat', () => {
  it('CP-U263 un doble clic en "Sí, confirmar" manda una sola confirmación', async () => {
    api.post.mockReturnValue(new Promise(() => {}));
    conProveedor(<ToolResultCard name="eliminar_paciente" result={solicitud} />);

    const boton = screen.getByRole('button', { name: /sí, confirmar/i });
    await userEvent.dblClick(boton);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /procesando/i })).toBeDisabled();
  });

  it('CP-U264 un resultado de eliminar_paciente sin type "confirm" no muestra el botón de baja', () => {
    conProveedor(<ToolResultCard name="eliminar_paciente" result={{ error: 'Paciente no encontrado' }} />);

    expect(screen.queryByRole('button', { name: /confirmar/i })).toBeNull();
    expect(screen.getByText(/Paciente no encontrado/)).toBeInTheDocument();
  });

  it('CP-U265 la tarjeta advierte que la acción no se puede deshacer', () => {
    conProveedor(<ToolResultCard name="eliminar_paciente" result={solicitud} />);

    expect(screen.getByText(/no se puede deshacer/)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});
