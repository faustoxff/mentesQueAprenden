import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToolResultCard } from './ChatToolResults';

vi.mock('../../services/api');

const mostrar = (result) => render(
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter><ToolResultCard name="ver_agenda" result={result} /></MemoryRouter>
  </QueryClientProvider>
);

// Mismo formato que devuelve ChatService.ejecutarTool('ver_agenda') en el server.
const turno = (extra = {}) => ({
  id: 't1', inicio: 'lunes, 16/11/2026, 14:00', fin: 'lunes, 16/11/2026, 14:50', estado: 'confirmado',
  tipo: 'tratamiento', consultorio: 2, paciente: { id: 'p1', nombre: 'Luz Gil' }, ...extra
});

describe('Tarjeta de agenda del chat (ver_agenda)', () => {
  it('CP-U367 sin turnos dice para qué día no hay', () => {
    mostrar({ desde: '2026-11-16', hasta: '2026-11-16', total: 0, turnos: [] });

    expect(screen.getByText('Sin turnos para el 16/11/2026.')).toBeInTheDocument();
  });

  it('CP-U368 sin turnos en un rango dice entre qué días', () => {
    mostrar({ desde: '2026-11-16', hasta: '2026-11-20', total: 0, turnos: [] });

    expect(screen.getByText('Sin turnos entre el 16/11/2026 y el 20/11/2026.')).toBeInTheDocument();
  });

  it('CP-U369 con turnos muestra la hora, el paciente, el tipo y el estado', () => {
    mostrar({ desde: '2026-11-16', hasta: '2026-11-16', total: 1, turnos: [turno()] });

    expect(screen.getByText('14:00')).toBeInTheDocument();
    expect(screen.getByText('Luz Gil')).toBeInTheDocument();
    expect(screen.getByText(/tratamiento · confirmado/)).toBeInTheDocument();
  });

  it('CP-U370 en un rango de varios días cada turno muestra también el día', () => {
    mostrar({ desde: '2026-11-16', hasta: '2026-11-20', total: 1, turnos: [turno({ paciente: null })] });

    expect(screen.getByText('lunes, 16/11/2026, 14:00')).toBeInTheDocument();
    expect(screen.getByText('Sin paciente')).toBeInTheDocument();
  });
});
