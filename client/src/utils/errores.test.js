import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { toast } from 'sonner';
import { getErrorMessage, aplicarErroresAlForm } from './errores';

const respuesta = (data) => ({ response: { status: 422, data } });

describe('getErrorMessage', () => {
  it('junta los mensajes de validación por campo sin repetirlos', () => {
    const err = respuesta({
      errors: [
        { path: 'dni', msg: 'El DNI debe tener 7 u 8 dígitos' },
        { path: 'dni', msg: 'El DNI debe tener 7 u 8 dígitos' },
        { path: 'email', msg: 'El email no es válido' }
      ]
    });
    expect(getErrorMessage(err)).toBe('El DNI debe tener 7 u 8 dígitos. El email no es válido');
  });

  it('usa el "error" del backend si no hay errores por campo', () => {
    expect(getErrorMessage(respuesta({ error: 'Ya existe un paciente con ese DNI' }))).toBe('Ya existe un paciente con ese DNI');
  });

  it('avisa si no hubo respuesta del servidor', () => {
    expect(getErrorMessage(new Error('Network Error'))).toMatch(/conectarnos/);
  });

  it('cae al mensaje de respaldo cuando no hay nada mejor', () => {
    expect(getErrorMessage({ response: { status: 500, data: {} } }, 'Error al guardar')).toBe('Error al guardar');
  });
});

describe('aplicarErroresAlForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marca cada campo con setError y enfoca solo el primero', () => {
    const setError = vi.fn();
    const err = respuesta({
      errors: [
        { path: 'dni', msg: 'DNI inválido' },
        { path: 'telefono', msg: 'Teléfono inválido' }
      ]
    });
    aplicarErroresAlForm(err, { setError });
    expect(setError).toHaveBeenNthCalledWith(1, 'dni', { type: 'server', message: 'DNI inválido' }, { shouldFocus: true });
    expect(setError).toHaveBeenNthCalledWith(2, 'telefono', { type: 'server', message: 'Teléfono inválido' }, { shouldFocus: false });
    expect(toast.error).toHaveBeenCalledWith('Revisá los datos: DNI inválido. Teléfono inválido');
  });

  it('con un solo error muestra el mensaje tal cual', () => {
    aplicarErroresAlForm(respuesta({ errors: [{ path: 'dni', msg: 'DNI inválido' }] }), { setError: vi.fn() });
    expect(toast.error).toHaveBeenCalledWith('DNI inválido');
  });

  it('muestra el "error" del backend sin tocar el formulario', () => {
    const setError = vi.fn();
    aplicarErroresAlForm(respuesta({ error: 'Consultorio 2 ocupado' }), { setError, fallback: 'x' });
    expect(setError).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Consultorio 2 ocupado');
  });

  it('usa el mensaje genérico cuando la respuesta no trae detalle', () => {
    aplicarErroresAlForm({ response: { status: 500, data: {} } }, { fallback: 'Error al guardar la sesión' });
    expect(toast.error).toHaveBeenCalledWith('Error al guardar la sesión');
  });
});
