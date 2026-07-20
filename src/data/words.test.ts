import { describe, it, expect } from 'vitest';
import {
  WORDS_DATABASE,
  stripAccents,
  getMisaccentedForm,
  getHomophonePartner,
  isAmbiguousWord
} from './words';

const TILDE_RE = /[áéíóú]/i;

describe('stripAccents', () => {
  it('quita tildes y diéresis pero conserva la ñ', () => {
    expect(stripAccents('camión')).toBe('camion');
    expect(stripAccents('pingüino')).toBe('pinguino');
    expect(stripAccents('español')).toBe('español'); // la ñ se conserva
    expect(stripAccents('ÁRBOL')).toBe('ARBOL');
  });
});

describe('getMisaccentedForm', () => {
  it('acentúa una vocal de la sílaba tónica y nunca reproduce la forma correcta', () => {
    for (const w of WORDS_DATABASE.filter(w => !w.hasTilde)) {
      const mis = getMisaccentedForm(w);
      expect(mis).not.toBe(w.word); // introduce una tilde que la correcta no tiene
      expect(TILDE_RE.test(mis)).toBe(true); // la tilde cayó sobre una vocal
      // Sin tildes ambas grafías coinciden (misma palabra, distinta acentuación)
      expect(stripAccents(mis)).toBe(w.wordClean);
    }
  });
});

describe('getHomophonePartner', () => {
  it('nunca devuelve la misma grafía que la palabra', () => {
    for (const w of WORDS_DATABASE.filter(isAmbiguousWord)) {
      const partner = getHomophonePartner(w);
      expect(partner).not.toBe(w.word);
    }
  });
});

describe('consistencia del banco de palabras', () => {
  it('tiene 249 palabras con ids únicos', () => {
    expect(WORDS_DATABASE.length).toBe(249);
    expect(new Set(WORDS_DATABASE.map(w => w.id)).size).toBe(WORDS_DATABASE.length);
  });

  it('cada palabra es consistente (sílabas, índice tónico, hasTilde)', () => {
    for (const w of WORDS_DATABASE) {
      // Las sílabas concatenadas reconstruyen la palabra
      expect(w.syllables.join('')).toBe(w.word);
      // El índice de la sílaba tónica está en rango
      expect(w.stressedSyllableIdx).toBeGreaterThanOrEqual(0);
      expect(w.stressedSyllableIdx).toBeLessThan(w.syllables.length);
      // hasTilde coincide con la presencia real de una vocal con tilde
      expect(w.hasTilde).toBe(TILDE_RE.test(w.word));
      // wordClean está libre de tildes
      expect(w.wordClean).toBe(stripAccents(w.word));
    }
  });
});
