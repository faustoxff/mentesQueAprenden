import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from '../services/api';
import HistorialPage from './HistorialPage';

vi.mock('../services/api');

const AHORA = new Date('2026-10-27T15:00:00.000Z');
const pac = (nombre, apellido, id) => ({ paciente_id: id, paciente: { id, nombre, apellido } });

const TURNOS = [
  { id: 't-ausente', fecha_inicio: '2026-10-15T13:00:00.000Z', fecha_fin: '2026-10-15T13:50:00.000Z', estado: 'ausente', tipo: 'seguimiento', consultorio: 2, ...pac('Lucía', 'Gil', 'p1') },
  { id: 't-ajeno', fecha_inicio: '2026-10-21T13:00:00.000Z', fecha_fin: '2026-10-21T13:50:00.000Z', estado: 'programado', consultorio: 1, ocupado: true, profesional: { id: 'otro', nombre: 'Otra', apellido: 'Persona' } },
  { id: 't-realizado', fecha_inicio: '2026-10-20T13:00:00.000Z', fecha_fin: '2026-10-20T13:50:00.000Z', estado: 'realizado', tipo: 'tratamiento', consultorio: 1, sesion: { id: 's1' }, ...pac('Martín', 'Pérez', 'p2') },
  { id: 't-cancelado', fecha_inicio: '2026-10-10T13:00:00.000Z', fecha_fin: '2026-10-10T13:50:00.000Z', estado: 'cancelado', tipo: 'evaluacion', consultorio: 3, ...pac('Ana', 'Ruiz', 'p3') },
  { id: 't-abierto', fecha_inicio: '2026-10-05T13:00:00.000Z', fecha_fin: '2026-10-05T14:00:00.000Z', estado: 'confirmado', tipo: 'evaluacion', consultorio: 3, ...pac('José', 'Álvarez', 'p4') },
  { id: 'sesion-s2', es_sesion: true, fecha_inicio: '2026-09-30T13:00:00.000Z', fecha_fin: '2026-09-30T13:50:00.000Z', estado: 'realizado', tipo: 'devolucion', consultorio: null, sesion: { id: 's2' }, ...pac('Lucía', 'Gil', 'p1') }
];

const renderizar = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><HistorialPage /></MemoryRouter>
  </QueryClientProvider>
);
const items = () => screen.queryAllByRole('listitem');
const pacientesListados = () => items().map((li) => within(li).queryByRole('link', { name: /,/ })?.textContent ?? 'Sin paciente');
const cargado = async () => { await screen.findAllByRole('listitem'); };

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(AHORA);
  api.get.mockResolvedValue({ data: TURNOS });
});
afterEach(() => vi.useRealTimers());

describe('HistorialPage', () => {
  it('CP-U280 descarta la ocupación ajena y lista de lo más reciente a lo más viejo, agrupado por mes', async () => {
    renderizar();
    await cargado();

    expect(pacientesListados()).toEqual(['Pérez, Martín', 'Gil, Lucía', 'Ruiz, Ana', 'Álvarez, José', 'Gil, Lucía']);
    expect(screen.queryByText(/Persona/)).toBeNull();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['octubre 2026', 'septiembre 2026']);
  });

  it('CP-U281 el período por defecto es el último mes hasta ahora, con cancelados', async () => {
    renderizar();
    await cargado();

    expect(api.get).toHaveBeenCalledWith('/turnos', {
      params: { fecha_inicio: '2026-09-27T15:00:00.000Z', fecha_fin: '2026-10-27T15:00:00.000Z', incluir_cancelados: 'true' }
    });
  });

  it.each([
    ['Últimos 3 meses', '2026-07-27T15:00:00.000Z'],
    ['Últimos 12 meses', '2025-10-27T15:00:00.000Z']
  ])('CP-U282 con "%s" pide desde %s', async (periodo, desde) => {
    renderizar();
    await cargado();

    await userEvent.selectOptions(screen.getByLabelText('Período'), periodo);

    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/turnos', {
      params: { fecha_inicio: desde, fecha_fin: AHORA.toISOString(), incluir_cancelados: 'true' }
    }));
  });

  it('CP-U283 el período no ofrece más de 12 meses', () => {
    renderizar();

    const opciones = within(screen.getByLabelText('Período')).getAllByRole('option').map((o) => Number(o.value));
    expect(opciones).toEqual([1, 3, 6, 12]);
  });

  it.each([
    ['realizado', ['Pérez, Martín', 'Gil, Lucía']],
    ['ausente', ['Gil, Lucía']],
    ['cancelado', ['Ruiz, Ana']],
    ['sin_cerrar', ['Álvarez, José']]
  ])('CP-U284 el filtro de estado "%s" muestra solo esos', async (estado, esperados) => {
    renderizar();
    await cargado();

    await userEvent.selectOptions(screen.getByLabelText('Estado'), estado);

    expect(pacientesListados()).toEqual(esperados);
  });

  it('CP-U285 el filtro de tipo muestra solo ese tipo', async () => {
    renderizar();
    await cargado();

    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'evaluacion');

    expect(pacientesListados()).toEqual(['Ruiz, Ana', 'Álvarez, José']);
  });

  it('CP-U286 la búsqueda por paciente ignora mayúsculas y tildes', async () => {
    renderizar();
    await cargado();

    await userEvent.type(screen.getByLabelText('Buscar paciente'), 'alvarez');

    expect(pacientesListados()).toEqual(['Álvarez, José']);
  });

  it('CP-U287 "solo sin sesión registrada" saca los que ya tienen sesión', async () => {
    renderizar();
    await cargado();

    await userEvent.click(screen.getByLabelText('Solo sin sesión registrada'));

    expect(pacientesListados()).toEqual(['Gil, Lucía', 'Ruiz, Ana', 'Álvarez, José']);
  });

  it('CP-U288 sin turnos en el período muestra el estado vacío', async () => {
    api.get.mockResolvedValue({ data: [TURNOS[1]] });
    renderizar();

    expect(await screen.findByText('No hay turnos en este período')).toBeInTheDocument();
    expect(items()).toHaveLength(0);
  });

  it('CP-U289 si los filtros no dejan nada, también muestra el estado vacío', async () => {
    renderizar();
    await cargado();

    await userEvent.type(screen.getByLabelText('Buscar paciente'), 'nadie');

    expect(screen.getByText('No hay turnos en este período')).toBeInTheDocument();
  });

  it('CP-U290 si falla el pedido muestra un error entendible', async () => {
    api.get.mockRejectedValue({ response: { status: 500, data: { error: 'Error interno' } } });
    renderizar();

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno');
  });

  it('CP-U291 cada acción lleva a la ruta correcta', async () => {
    renderizar();
    await cargado();
    const [realizado, ausente, cancelado, abierto, sesionSinTurno] = items();

    expect(within(realizado).getByRole('link', { name: 'Ver sesión' })).toHaveAttribute('href', '/sesiones/s1');
    expect(within(sesionSinTurno).getByRole('link', { name: 'Ver sesión' })).toHaveAttribute('href', '/sesiones/s2');
    expect(within(cancelado).queryByRole('link', { name: /sesión/ })).toBeNull();
    const registrar = within(abierto).getByRole('link', { name: 'Registrar sesión' }).getAttribute('href');
    expect(registrar.split('?')[0]).toBe('/sesiones/nueva');
    expect(Object.fromEntries(new URLSearchParams(registrar.split('?')[1]))).toMatchObject({ turno_id: 't-abierto', paciente_id: 'p4', duracion: '60', consultorio: '3' });
    expect(within(ausente).getByRole('link', { name: 'Registrar sesión' })).toBeInTheDocument();
  });

  it('CP-U292 el paciente enlaza a su ficha y se ven tipo, consultorio y estado', async () => {
    renderizar();
    await cargado();
    const [realizado, , , , sesionSinTurno] = items();

    expect(within(realizado).getByRole('link', { name: 'Pérez, Martín' })).toHaveAttribute('href', '/pacientes/p2');
    expect(within(realizado).getByText('Tratamiento')).toBeInTheDocument();
    expect(within(realizado).getByText('Consultorio 1')).toBeInTheDocument();
    expect(within(realizado).getByText('Realizado')).toBeInTheDocument();
    expect(within(sesionSinTurno).getByText('Sin consultorio')).toBeInTheDocument();
  });

  it('CP-U293 mientras carga muestra el esqueleto', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderizar();

    expect(screen.getByRole('status', { name: 'Cargando historial' })).toBeInTheDocument();
  });
});
