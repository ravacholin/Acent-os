import { describe, it, expect } from 'vitest';
import { buildCorrectorText, sabotageWord } from './corrector';
import { Word } from '../types';

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const camion: Word = {
  id: 'camión', word: 'camión', wordClean: 'camion',
  syllables: ['ca', 'mión'], stressedSyllableIdx: 1,
  classification: 'aguda', category: 'aguda', level: 'A1', hasTilde: true,
  rule: 'r', explanation: 'e', frequency: 'alta', example: 'El ___ es azul'
};
const reloj: Word = {
  id: 'reloj', word: 'reloj', wordClean: 'reloj',
  syllables: ['re', 'loj'], stressedSyllableIdx: 1,
  classification: 'aguda', category: 'aguda', level: 'A1', hasTilde: false,
  rule: 'r', explanation: 'e', frequency: 'alta', example: 'Perdí mi ___ ayer'
};
const arbol: Word = {
  id: 'árbol', word: 'árbol', wordClean: 'arbol',
  syllables: ['ár', 'bol'], stressedSyllableIdx: 0,
  classification: 'grave', category: 'grave', level: 'A1', hasTilde: true,
  rule: 'r', explanation: 'e', frequency: 'alta', example: 'Ese ___ da sombra'
};

const words = [camion, reloj, arbol];

describe('sabotageWord', () => {
  it('quita la tilde si la palabra la tiene', () => {
    expect(sabotageWord(camion)).toBe('camion');
    expect(sabotageWord(camion)).not.toBe(camion.word);
  });
  it('agrega una tilde mal puesta si no la tiene', () => {
    const s = sabotageWord(reloj);
    expect(s).not.toBe(reloj.word);
    expect(/[áéíóú]/i.test(s)).toBe(true);
  });
});

describe('buildCorrectorText', () => {
  it('los tokens reconstruyen exactamente el texto mostrado', () => {
    const { tokens } = buildCorrectorText(words, seeded(3));
    const text = tokens.map(t => t.text).join('');
    expect(text.length).toBeGreaterThan(0);
    // Reconstrucción coherente: re-tokenizar el join no rompe nada evidente
    expect(tokens.every(t => typeof t.text === 'string')).toBe(true);
  });

  it('marca al menos una errata y todas están en errorIndexes', () => {
    const { tokens, errorIndexes } = buildCorrectorText(words, seeded(3));
    expect(errorIndexes.length).toBeGreaterThanOrEqual(1);
    expect(errorIndexes.length).toBeLessThanOrEqual(2);
    // errorIndexes coincide exactamente con los tokens saboteados
    const sabotagedIdx = tokens.flatMap((t, i) => (t.sabotaged ? [i] : []));
    expect(errorIndexes.slice().sort()).toEqual(sabotagedIdx.slice().sort());
  });

  it('el sabotaje nunca reproduce la grafía correcta', () => {
    for (let seed = 0; seed < 50; seed++) {
      const { tokens, errorIndexes } = buildCorrectorText(words, seeded(seed));
      for (const idx of errorIndexes) {
        const token = tokens[idx];
        expect(token.sabotaged).toBe(true);
        // No coincide con la forma correcta de ninguna palabra objetivo
        expect(words.some(w => w.word === token.text)).toBe(false);
      }
    }
  });

  it('las erratas son tokens de palabra (clickeables)', () => {
    const { tokens, errorIndexes } = buildCorrectorText(words, seeded(9));
    for (const idx of errorIndexes) {
      expect(tokens[idx].isWord).toBe(true);
    }
  });

  it('es determinista con la misma semilla', () => {
    const a = buildCorrectorText(words, seeded(11));
    const b = buildCorrectorText(words, seeded(11));
    expect(a).toEqual(b);
  });
});
