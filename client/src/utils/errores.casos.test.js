import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { toast } from 'sonner';
import { getErrorMessage, aplicarErroresAlForm } from './errores';

const conRespuesta = (status, data) => ({ response: { status, data } });

describe('getErrorMessage: partición de los errores posibles', () => {
  it('CP-U207 un 500 con { error } muestra ese mensaje', () => {
    expect(getErrorMessage(conRespuesta(500, { error: 'Error interno' }))).toBe('Error interno');
  });

  it('CP-U208 un error { code, message } devuelve el message como texto', () => {
    expect(getErrorMessage(conRespuesta(400, { error: { code: 'x', message: 'Token inválido' } }))).toBe('Token inválido');
  });

  it('CP-U209 un timeout (sin respuesta) avisa que no hubo conexión', () => {
    expect(getErrorMessage({ code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' })).toMatch(/No pudimos conectarnos/);
  });

  it('CP-U210 sin error (undefined) usa el mensaje de respaldo', () => {
    expect(getErrorMessage(undefined, 'Respaldo')).toBe('Respaldo');
  });

  it('CP-U211 un 422 con items sin msg los ignora y usa el resto', () => {
    expect(getErrorMessage(conRespuesta(422, { errors: [{ path: 'dni' }, { path: 'nombre', msg: 'El nombre es obligatorio' }] }))).toBe('El nombre es obligatorio');
  });

  it('CP-U212 un error vacío ("") del backend no se muestra: cae al respaldo', () => {
    expect(getErrorMessage(conRespuesta(500, { error: '' }), 'Respaldo')).toBe('Respaldo');
  });

  it('CP-U213 el mensaje nunca es un objeto (no se ve "[object Object]")', () => {
    expect(typeof getErrorMessage(conRespuesta(500, { error: { code: 1 } }))).toBe('string');
  });
});

describe('aplicarErroresAlForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('CP-U214 acepta el formato viejo de express-validator (param en vez de path)', () => {
    const setError = vi.fn();

    aplicarErroresAlForm(conRespuesta(422, { errors: [{ param: 'dni', msg: 'DNI inválido' }] }), { setError });

    expect(setError).toHaveBeenCalledWith('dni', { type: 'server', message: 'DNI inválido' }, { shouldFocus: true });
  });

  it('CP-U215 dos errores del mismo campo marcan el campo una sola vez', () => {
    const setError = vi.fn();

    aplicarErroresAlForm(conRespuesta(422, { errors: [{ path: 'dni', msg: 'a' }, { path: 'dni', msg: 'b' }] }), { setError });

    expect(setError).toHaveBeenCalledTimes(1);
  });

  it('CP-U216 sin setError igual muestra el toast con el mensaje', () => {
    const msg = aplicarErroresAlForm(conRespuesta(409, { error: 'Ya existe un paciente con ese DNI' }));

    expect(msg).toBe('Ya existe un paciente con ese DNI');
    expect(toast.error).toHaveBeenCalledWith('Ya existe un paciente con ese DNI');
  });
});
