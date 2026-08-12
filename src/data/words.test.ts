import { describe, it, expect } from 'vitest';
import {
  WORDS_DATABASE,
  stripAccents,
  countVowels,
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

describe('countVowels', () => {
  it('cuenta vocales ignorando tildes, diéresis y mayúsculas', () => {
    expect(countVowels('más')).toBe(1);
    expect(countVowels('sol')).toBe(1);
    expect(countVowels('camión')).toBe(3);
    expect(countVowels('pingüino')).toBe(4); // la ü cuenta como vocal
    expect(countVowels('ÁRBOL')).toBe(2);
    expect(countVowels('ritmo')).toBe(2);
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

const TILDE_GLOBAL_RE = /[áéíóú]/gi;

describe('consistencia del banco de palabras', () => {
  it('tiene 394 palabras con ids únicos', () => {
    expect(WORDS_DATABASE.length).toBe(394);
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

  it('ninguna palabra española lleva más de una tilde', () => {
    for (const w of WORDS_DATABASE) {
      const count = (w.word.match(TILDE_GLOBAL_RE) || []).length;
      expect(count).toBeLessThanOrEqual(1);
    }
  });

  it('en las palabras con tilde, la sílaba tónica es la que lleva la vocal acentuada', () => {
    for (const w of WORDS_DATABASE.filter(w => w.hasTilde)) {
      const stressed = w.syllables[w.stressedSyllableIdx];
      // La tilde ortográfica cae dentro de la sílaba marcada como tónica…
      expect(TILDE_RE.test(stressed)).toBe(true);
      // …y en ninguna otra sílaba.
      const otherHasTilde = w.syllables.some((s, i) => i !== w.stressedSyllableIdx && TILDE_RE.test(s));
      expect(otherHasTilde).toBe(false);
    }
  });

  it('la clasificación coincide con la posición de la sílaba tónica', () => {
    const posFromEnd = (w: (typeof WORDS_DATABASE)[number]) => w.syllables.length - w.stressedSyllableIdx;
    for (const w of WORDS_DATABASE) {
      if (w.syllables.length < 2) continue; // los monosílabos no se clasifican
      // Los adverbios en -mente tienen doble acento: la clasificación refleja el
      // adjetivo base (la tilde), no la posición tónica de la palabra completa.
      if (w.category === 'mente') continue;
      const pos = posFromEnd(w); // 1 = última, 2 = penúltima, 3 = antepenúltima…
      const expected =
        pos === 1 ? 'aguda' : pos === 2 ? 'grave' : pos === 3 ? 'esdrújula' : 'sobreesdrújula';
      expect(w.classification).toBe(expected);
    }
  });
});
