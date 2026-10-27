import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce (con fake timers)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('CP-U202 devuelve el valor inicial de entrada, sin esperar', () => {
    const { result } = renderHook(() => useDebounce('ana'));

    expect(result.current).toBe('ana');
  });

  it('CP-U203 a los 399 ms todavía no cambió (límite - 1)', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v), { initialProps: { v: 'a' } });

    rerender({ v: 'ab' });
    act(() => vi.advanceTimersByTime(399));

    expect(result.current).toBe('a');
  });

  it('CP-U204 a los 400 ms exactos toma el valor nuevo (límite)', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v), { initialProps: { v: 'a' } });

    rerender({ v: 'ab' });
    act(() => vi.advanceTimersByTime(400));

    expect(result.current).toBe('ab');
  });

  it('CP-U205 si se sigue escribiendo, solo se queda con el último valor', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), { initialProps: { v: 'G' } });

    rerender({ v: 'Gi' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ v: 'Gil' });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('G');
    act(() => vi.advanceTimersByTime(100));

    expect(result.current).toBe('Gil');
  });

  it('CP-U206 al desmontar cancela el temporizador pendiente', () => {
    const { rerender, unmount } = renderHook(({ v }) => useDebounce(v), { initialProps: { v: 'a' } });

    rerender({ v: 'b' });
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
