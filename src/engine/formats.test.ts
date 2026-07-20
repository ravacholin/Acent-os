import { describe, it, expect } from 'vitest';
import { pickFormat, isFormatEligible, seededRng } from './formats';
import { Word, SRSEntry, GameMode } from '../types';

function word(extra: Partial<Word> = {}): Word {
  return {
    id: 'camión', word: 'camión', wordClean: 'camion',
    syllables: ['ca', 'mión'], stressedSyllableIdx: 1,
    classification: 'aguda', category: 'aguda', level: 'A1', hasTilde: true,
    rule: 'r', explanation: 'e', frequency: 'alta', ...extra
  };
}

function srs(box: number): SRSEntry {
  return { wordId: 'x', box, consecutiveCorrect: 0, lastSeenTimestamp: 0, nextReviewTimestamp: 0, failCount: 0 };
}

const alwaysZero = () => 0;

describe('isFormatEligible', () => {
  it('silaba-tonica requiere 2+ sílabas', () => {
    expect(isFormatEligible('silaba-tonica', word({ syllables: ['ca', 'sa'] }))).toBe(true);
    expect(isFormatEligible('silaba-tonica', word({ syllables: ['sol'] }))).toBe(false);
  });
  it('donde-va-tilde requiere que lleve tilde', () => {
    expect(isFormatEligible('donde-va-tilde', word({ hasTilde: true }))).toBe(true);
    expect(isFormatEligible('donde-va-tilde', word({ hasTilde: false }))).toBe(false);
  });
  it('contexto requiere palabra ambigua con ejemplo', () => {
    expect(isFormatEligible('contexto', word({ category: 'diacrítica', example: '___ coche' }))).toBe(true);
    expect(isFormatEligible('contexto', word({ category: 'diacrítica', example: undefined }))).toBe(false);
    expect(isFormatEligible('contexto', word({ category: 'aguda', example: '___ x' }))).toBe(false);
  });
  it('dictado y escribi-tilde se excluyen para ambiguas', () => {
    const ambiguous = word({ category: 'diacrítica' });
    expect(isFormatEligible('dictado', ambiguous)).toBe(false);
    expect(isFormatEligible('escribi-tilde', ambiguous)).toBe(false);
    expect(isFormatEligible('dictado', word({ category: 'aguda' }))).toBe(true);
  });
});

describe('pickFormat — tabla por caja', () => {
  it('caja 1 → reconocimiento (silaba-tonica / lleva-tilde)', () => {
    const f = pickFormat(word(), srs(1), { rng: alwaysZero });
    expect(['silaba-tonica', 'lleva-tilde']).toContain(f);
  });
  it('caja 2-3 → discriminación', () => {
    for (const box of [2, 3]) {
      const f = pickFormat(word({ hasTilde: true }), srs(box), { rng: alwaysZero });
      expect(['encontra-error', 'clasificacion', 'donde-va-tilde', 'contexto']).toContain(f);
    }
  });
  it('caja 4 → producción', () => {
    const f = pickFormat(word({ category: 'aguda' }), srs(4), { rng: alwaysZero });
    expect(['la-regla', 'escribi-tilde', 'corrector']).toContain(f);
  });
  it('caja 5 → dictado / escribi-tilde para no ambiguas', () => {
    const f = pickFormat(word({ category: 'aguda' }), srs(5), { rng: alwaysZero });
    expect(['dictado', 'escribi-tilde']).toContain(f);
  });
  it('palabra nueva (sin SRS) arranca en la caja 3', () => {
    const f = pickFormat(word({ hasTilde: true }), undefined, { rng: alwaysZero });
    expect(['encontra-error', 'clasificacion', 'donde-va-tilde', 'contexto']).toContain(f);
  });
});

describe('pickFormat — elegibilidad y fallback', () => {
  it('nunca elige dictado para una palabra ambigua en caja 5 (fallback)', () => {
    const ambiguous = word({ category: 'diacrítica', example: '___ x' });
    for (let s = 0; s < 30; s++) {
      const f = pickFormat(ambiguous, srs(5), { rng: seededRng('s' + s) });
      expect(f).not.toBe('dictado');
      expect(f).not.toBe('escribi-tilde');
    }
  });
  it('nunca elige donde-va-tilde para una palabra sin tilde', () => {
    const noTilde = word({ hasTilde: false, category: 'aguda' });
    for (let s = 0; s < 30; s++) {
      const f = pickFormat(noTilde, srs(2), { rng: seededRng('n' + s) });
      expect(f).not.toBe('donde-va-tilde');
    }
  });
  it('evita repetir el formato anterior cuando hay alternativa', () => {
    const w = word({ hasTilde: true });
    // rng=0 elegiría el primero elegible; con lastFormat = ese, debe rotar
    const first = pickFormat(w, srs(2), { rng: alwaysZero });
    const rotated = pickFormat(w, srs(2), { rng: alwaysZero, lastFormat: first });
    expect(rotated).not.toBe(first);
  });
});

describe('seededRng', () => {
  it('es determinista', () => {
    const a = seededRng('abc');
    const b = seededRng('abc');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
