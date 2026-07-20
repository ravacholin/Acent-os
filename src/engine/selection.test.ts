import { describe, it, expect } from 'vitest';
import { shuffle, pushRecent, selectSessionWords, RECENT_MEMORY_CAP } from './selection';
import { createDefaultStats } from './stats';
import { Word, UserStats } from '../types';

// RNG determinista (mulberry32) para tests reproducibles.
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

function word(id: string, extra: Partial<Word> = {}): Word {
  return {
    id,
    word: id,
    wordClean: id,
    syllables: [id],
    stressedSyllableIdx: 0,
    classification: 'aguda',
    category: 'aguda',
    level: 'A1',
    hasTilde: false,
    rule: 'r',
    explanation: 'e',
    frequency: 'alta',
    ...extra
  };
}

const pool: Word[] = Array.from({ length: 40 }, (_, i) => word(`w${i}`));

describe('shuffle', () => {
  it('es determinista con la misma semilla y no muta la entrada', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = shuffle(input, seeded(42));
    const b = shuffle(input, seeded(42));
    expect(a).toEqual(b);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // sin mutar
    expect([...a].sort()).toEqual(input); // misma multiset
  });

  it('semillas distintas dan órdenes distintos', () => {
    const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8], seeded(1));
    const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8], seeded(2));
    expect(a).not.toEqual(b);
  });
});

describe('pushRecent', () => {
  it('agrega al frente, deduplica y capa', () => {
    expect(pushRecent(['a', 'b'], ['c'])).toEqual(['c', 'a', 'b']);
    expect(pushRecent(['a', 'b'], ['a'])).toEqual(['a', 'b']);
    const big = Array.from({ length: RECENT_MEMORY_CAP + 10 }, (_, i) => `x${i}`);
    expect(pushRecent(big, ['new']).length).toBe(RECENT_MEMORY_CAP);
    expect(pushRecent(big, ['new'])[0]).toBe('new');
  });
});

describe('selectSessionWords', () => {
  const baseCtx = (stats: UserStats, recentIds: string[] = []) => ({
    stats,
    recentIds,
    now: 1_000_000,
    rng: seeded(7)
  });

  it('devuelve la cantidad pedida y sin duplicados', () => {
    const stats = createDefaultStats();
    const out = selectSessionWords('lleva-tilde', baseCtx(stats), undefined, 10, pool);
    expect(out).toHaveLength(10);
    expect(new Set(out.map(w => w.id)).size).toBe(10);
  });

  it('capa la cuota de repaso a ~40% (falladas vuelven con moderación)', () => {
    const stats = createDefaultStats();
    // 20 palabras falladas
    for (let i = 0; i < 20; i++) {
      stats.spacedRepetition![`w${i}`] = {
        wordId: `w${i}`,
        box: 1,
        consecutiveCorrect: 0,
        lastSeenTimestamp: 0,
        nextReviewTimestamp: 0,
        failCount: 1
      };
    }
    const out = selectSessionWords('lleva-tilde', baseCtx(stats), undefined, 10, pool);
    const failedInOutput = out.filter(w => stats.spacedRepetition![w.id]?.failCount).length;
    // ceil(10 * 0.4) = 4
    expect(failedInOutput).toBe(4);
  });

  it('prefiere palabras no vistas recientemente', () => {
    const stats = createDefaultStats();
    const recent = pool.slice(0, 35).map(w => w.id); // solo 5 frescas
    const out = selectSessionWords('lleva-tilde', baseCtx(stats, recent), undefined, 5, pool);
    const fresh = pool.slice(35).map(w => w.id);
    // Las 5 frescas deben aparecer antes que las recientes
    expect(out.every(w => fresh.includes(w.id))).toBe(true);
  });

  it('filtra por tilde en donde-va-tilde', () => {
    const withTilde = [word('camión', { hasTilde: true }), word('mesa', { hasTilde: false })];
    const stats = createDefaultStats();
    const out = selectSessionWords('donde-va-tilde', baseCtx(stats), undefined, 10, withTilde);
    expect(out.every(w => w.hasTilde)).toBe(true);
    expect(out).toHaveLength(1);
  });

  it('devuelve vacío si el filtro personalizado no matchea nada', () => {
    const stats = createDefaultStats();
    const out = selectSessionWords(
      'personalizado',
      baseCtx(stats),
      { levels: ['C2'], categories: ['triptongo'] },
      10,
      pool
    );
    expect(out).toEqual([]);
  });
});
