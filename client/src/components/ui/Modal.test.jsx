import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from './Modal';

function ConBoton({ onClose = () => {} }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => { onClose(); setAbierto(false); };
  return (
    <>
      <button onClick={() => setAbierto(true)}>Abrir turno</button>
      <Modal open={abierto} onClose={cerrar} title="Nuevo turno"><p>contenido</p></Modal>
    </>
  );
}

describe('Modal accesible', () => {
  it('CP-U304 se anuncia como diálogo modal con el título como nombre', async () => {
    render(<ConBoton />);

    await userEvent.click(screen.getByRole('button', { name: 'Abrir turno' }));

    const dialogo = screen.getByRole('dialog', { name: 'Nuevo turno' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveFocus();
  });

  it('CP-U305 Escape lo cierra y el foco vuelve al botón que lo abrió', async () => {
    const onClose = vi.fn();
    render(<ConBoton onClose={onClose} />);
    const boton = screen.getByRole('button', { name: 'Abrir turno' });
    await userEvent.click(boton);

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(boton).toHaveFocus();
  });

  it('CP-U306 el botón Cerrar también devuelve el foco', async () => {
    render(<ConBoton />);
    const boton = screen.getByRole('button', { name: 'Abrir turno' });
    await userEvent.click(boton);

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(boton).toHaveFocus();
  });

  it('CP-U307 cerrado no renderiza nada', () => {
    render(<Modal open={false} onClose={() => {}} title="Nuevo turno"><p>contenido</p></Modal>);

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
