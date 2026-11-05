import { describe, it, expect, vi, beforeEach } from 'vitest';
import { anotarPedido } from './api';

// Cada pedido al servidor se anota en la consola del navegador con su código de respuesta.
beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('anotarPedido', () => {
  it.each([
    ['get', '/pacientes', 200],
    ['post', '/pacientes', 201],
    ['patch', '/pacientes/p1', 200],
    ['delete', '/pacientes/p1', 200]
  ])('CP-U347 %s %s → %i sale en verde con método, ruta y código', (metodo, url, status) => {
    anotarPedido({ method: metodo, url }, status);

    expect(console.info).toHaveBeenCalledWith(`%c${metodo.toUpperCase()} ${url} → ${status}`, 'color: #16a34a');
  });

  it('CP-U348 un 4xx sale como advertencia y un 5xx o la falta de respuesta como error', () => {
    anotarPedido({ method: 'post', url: '/pacientes' }, 409);
    anotarPedido({ method: 'get', url: '/pacientes' }, 500);
    anotarPedido({ method: 'delete', url: '/pacientes/p1' }, undefined);

    expect(console.warn).toHaveBeenCalledWith('POST /pacientes → 409');
    expect(console.error).toHaveBeenCalledWith('GET /pacientes → 500');
    expect(console.error).toHaveBeenCalledWith('DELETE /pacientes/p1 → sin respuesta');
  });

  it('CP-U349 incluye la demora del pedido en milisegundos', () => {
    vi.spyOn(performance, 'now').mockReturnValue(1250);

    anotarPedido({ method: 'get', url: '/turnos', inicio: 1000 }, 200);

    expect(console.info).toHaveBeenCalledWith('%cGET /turnos → 200 (250 ms)', 'color: #16a34a');
  });
});
