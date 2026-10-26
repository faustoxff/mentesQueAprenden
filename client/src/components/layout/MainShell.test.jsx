import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MainShell from './MainShell';

// El chat real hace pedidos y usa el store: acá solo importa si se muestra o no.
vi.mock('../chat/ChatSidebar', () => ({
  default: ({ className }) => <div data-testid="chat" className={className} />
}));

const renderShell = (ruta = '/') => render(
  <MemoryRouter initialEntries={[ruta]}>
    <MainShell><p>contenido</p></MainShell>
  </MemoryRouter>
);

describe('MainShell (barra inferior mobile)', () => {
  it('tiene Inicio, Pacientes y Menta; no tiene Agenda', () => {
    renderShell();
    const nav = screen.getByRole('navigation', { name: /navegación principal/i });
    expect(nav).toHaveTextContent('Inicio');
    expect(nav).toHaveTextContent('Pacientes');
    expect(nav).toHaveTextContent('Menta');
    expect(nav).not.toHaveTextContent('Agenda');
  });

  it('el chat arranca oculto en mobile y se muestra al tocar Menta', async () => {
    renderShell();
    expect(screen.getByTestId('chat')).toHaveClass('hidden');
    await userEvent.click(screen.getByRole('button', { name: /abrir chat con menta/i }));
    expect(screen.getByTestId('chat')).not.toHaveClass('hidden');
    expect(screen.getByTestId('chat')).toHaveClass('flex');
  });

  it('navegar a otra sección vuelve al contenido', async () => {
    renderShell();
    await userEvent.click(screen.getByRole('button', { name: /abrir chat con menta/i }));
    await userEvent.click(screen.getByRole('link', { name: /pacientes/i }));
    expect(screen.getByTestId('chat')).toHaveClass('hidden');
  });

  it('renderiza el contenido de la página', () => {
    renderShell();
    expect(screen.getByText('contenido')).toBeInTheDocument();
  });
});
