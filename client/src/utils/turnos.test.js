import { describe, it, expect } from 'vitest';
import { urlRegistrarSesion, COLORES_ESTADO, ESTADO_LABEL } from './turnos';

describe('utils/turnos', () => {
  it('CP-U277 urlRegistrarSesion arma el link a Nueva sesión con el turno vinculado y su duración', () => {
    const url = urlRegistrarSesion({
      id: 't1', paciente_id: 'p1', tipo: 'evaluacion', consultorio: 2,
      fecha_inicio: '2026-10-01T13:00:00.000Z', fecha_fin: '2026-10-01T13:50:00.000Z'
    });

    const [ruta, query] = url.split('?');
    expect(ruta).toBe('/sesiones/nueva');
    expect(Object.fromEntries(new URLSearchParams(query))).toEqual({
      paciente_id: 'p1', turno_id: 't1', fecha: '2026-10-01T13:00:00.000Z', tipo: 'evaluacion', consultorio: '2', duracion: '50'
    });
  });

  it('CP-U278 sin tipo ni consultorio usa tratamiento y consultorio 1', () => {
    const query = new URLSearchParams(urlRegistrarSesion({ id: 't1', paciente_id: 'p1', fecha_inicio: '2026-10-01T13:00:00Z', fecha_fin: '2026-10-01T14:00:00Z' }).split('?')[1]);

    expect(query.get('tipo')).toBe('tratamiento');
    expect(query.get('consultorio')).toBe('1');
    expect(query.get('duracion')).toBe('60');
  });

  it('CP-U279 cada estado de turno tiene color y nombre', () => {
    expect(Object.keys(ESTADO_LABEL).sort()).toEqual(Object.keys(COLORES_ESTADO).sort());
  });
});
