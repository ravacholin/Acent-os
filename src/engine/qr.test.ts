import { describe, it, expect } from 'vitest';
import { qrMatrix, qrSvgPath } from './qr';

describe('qrMatrix', () => {
  it('devuelve una matriz cuadrada no vacía', () => {
    const m = qrMatrix('https://acent.example/#pack=abc');
    expect(m.length).toBeGreaterThan(0);
    for (const row of m) expect(row.length).toBe(m.length);
  });

  it('es determinista para el mismo texto', () => {
    const a = qrMatrix('https://acent.example/#pack=hola');
    const b = qrMatrix('https://acent.example/#pack=hola');
    expect(b).toEqual(a);
  });

  it('crece de versión cuando el texto es más largo', () => {
    const chico = qrMatrix('x');
    const grande = qrMatrix('https://acent.example/#pack=' + 'A'.repeat(600));
    expect(grande.length).toBeGreaterThan(chico.length);
  });

  it('tolera un enlace de pack al tope (40 palabras)', () => {
    // 40 ids de hasta ~15 chars codificados en base64url siguen siendo ASCII.
    const enlace = 'https://acent.example/#pack=' + 'QWJjRGVm'.repeat(120);
    expect(() => qrMatrix(enlace)).not.toThrow();
    const m = qrMatrix(enlace);
    expect(m.length).toBeGreaterThan(21);
  });

  it('rechaza texto vacío', () => {
    expect(() => qrMatrix('')).toThrow();
  });

  it('contiene módulos oscuros y claros', () => {
    const m = qrMatrix('https://acent.example/#pack=abc');
    const flat = m.flat();
    expect(flat.some(Boolean)).toBe(true);
    expect(flat.some((v) => !v)).toBe(true);
  });
});

describe('qrSvgPath', () => {
  it('genera un cuadrado 1×1 por cada módulo oscuro', () => {
    const matrix = [
      [true, false],
      [false, true]
    ];
    const d = qrSvgPath(matrix);
    const rects = d.match(/M\d+ \d+h1v1h-1z/g) ?? [];
    expect(rects.length).toBe(2);
    expect(d).toContain('M0 0h1v1h-1z'); // fila 0, col 0
    expect(d).toContain('M1 1h1v1h-1z'); // fila 1, col 1
  });

  it('devuelve un path vacío para una matriz sin módulos oscuros', () => {
    expect(qrSvgPath([[false, false], [false, false]])).toBe('');
  });
});
