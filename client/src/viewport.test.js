import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const leer = (archivo) => fs.readFileSync(path.resolve(__dirname, archivo), 'utf8');

describe('zoom y tamaño de fuente en el celular', () => {
  it('CP-U302 el meta viewport no bloquea el zoom (sin maximum-scale ni user-scalable=no)', () => {
    const viewport = leer('../index.html').match(/<meta name="viewport" content="([^"]*)"/)[1];

    expect(viewport).toContain('width=device-width');
    expect(viewport).not.toMatch(/maximum-scale/);
    expect(viewport).not.toMatch(/user-scalable\s*=\s*(no|0)/);
  });

  it('CP-U303 en pantallas chicas los campos de texto usan al menos 16 px (iOS no hace zoom al enfocarlos)', () => {
    const css = leer('index.css');
    const regla = css.match(/@media \(max-width: 767px\) \{([\s\S]*?)\n\}/)[1];

    expect(regla).toMatch(/input,\s*select,\s*textarea\s*\{\s*font-size: 16px !important;/);
  });
});
