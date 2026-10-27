import { describe, it, expect, vi, beforeEach } from 'vitest';

const doc = { text: vi.fn(), setFont: vi.fn(), setFontSize: vi.fn(), addPage: vi.fn(), save: vi.fn(), splitTextToSize: vi.fn((t) => t.split('\n')) };
vi.mock('jspdf', () => ({ jsPDF: vi.fn(() => doc) }));

import { exportarInformePdf } from './exportarInformePdf';

const completa = {
  paciente: { nombre: 'Luz', apellido: 'Gil' },
  profesional: { nombre: 'Ana', apellido: 'Paz', especialidad: 'psicopedagogia', matricula: '123' },
  fecha_evaluacion: '2026-10-01T12:00:00',
  informe_generado: 'MOTIVO DE CONSULTA\nDificultades de lectura.\n\nCONCLUSIONES\nSe sugiere seguimiento.'
};
const textos = () => doc.text.mock.calls.map(([t]) => (Array.isArray(t) ? t.join(' ') : t)).join('\n');

beforeEach(() => vi.clearAllMocks());

describe('exportarInformePdf (jsPDF mockeado)', () => {
  it('CP-U257 con datos completos guarda el PDF con un nombre de archivo legible', () => {
    exportarInformePdf(completa);

    expect(doc.save).toHaveBeenCalledWith('Informe_Gil_Luz_2026-10-01.pdf');
    expect(textos()).toMatch(/M\.P\. 123/);
  });

  it('CP-U258 sin informe generado no revienta y guarda igual', () => {
    expect(() => exportarInformePdf({ ...completa, informe_generado: null })).not.toThrow();
    expect(doc.save).toHaveBeenCalled();
  });

  it('CP-U259 sin matrícula no imprime la línea "M.P."', () => {
    exportarInformePdf({ ...completa, profesional: { ...completa.profesional, matricula: null } });

    expect(textos()).not.toMatch(/M\.P\./);
  });

  it('CP-U260 un informe largo agrega páginas en vez de salirse de la hoja', () => {
    const largo = Array.from({ length: 80 }, (_, i) => `Párrafo ${i}\nlinea\nlinea`).join('\n\n');

    exportarInformePdf({ ...completa, informe_generado: largo });

    expect(doc.addPage).toHaveBeenCalled();
  });

  it('CP-U261 con fecha de evaluación nula no revienta', () => {
    expect(() => exportarInformePdf({ ...completa, fecha_evaluacion: null })).not.toThrow();
  });

  it('CP-U262 sin paciente ni profesional cargados no revienta y guarda el archivo', () => {
    expect(() => exportarInformePdf({ ...completa, paciente: null, profesional: null })).not.toThrow();
    expect(doc.save).toHaveBeenCalled();
  });
});
