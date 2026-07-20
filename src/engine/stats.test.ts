import { describe, it, expect } from 'vitest';
import { recordAnswer, createDefaultStats } from './stats';
import { Word } from '../types';

const word: Word = {
  id: 'café',
  word: 'café',
  wordClean: 'cafe',
  syllables: ['ca', 'fé'],
  stressedSyllableIdx: 1,
  classification: 'aguda',
  category: 'aguda',
  level: 'A1',
  hasTilde: true,
  rule: 'r',
  explanation: 'e',
  frequency: 'alta'
};

const NOW = 1_700_000_000_000;

describe('recordAnswer', () => {
  it('no muta el estado previo (inmutable)', () => {
    const prev = createDefaultStats();
    const snapshot = JSON.stringify(prev);
    recordAnswer(prev, { word, correct: true, timeTakenSeconds: 2, sessionStreak: 0, now: NOW });
    expect(JSON.stringify(prev)).toBe(snapshot);
  });

  it('acumula XP, racha, categoría y SRS en acierto', () => {
    const prev = createDefaultStats();
    const { stats } = recordAnswer(prev, { word, correct: true, timeTakenSeconds: 2, sessionStreak: 0, now: NOW });
    expect(stats.wordsSeen).toBe(1);
    expect(stats.correctAnswers).toBe(1);
    expect(stats.xp).toBe(10);
    expect(stats.currentStreak).toBe(1);
    expect(stats.bestStreak).toBe(1);
    expect(stats.categoryStats.aguda).toEqual({ correct: 1, total: 1 });
    expect(stats.levelStats.A1).toEqual({ correct: 1, total: 1 });
    expect(stats.masteredWords).toContain('café');
    expect(stats.spacedRepetition!['café'].box).toBe(4);
    expect(stats.accuracy).toBe(100);
  });

  it('registra el error y resetea la racha en fallo', () => {
    let prev = createDefaultStats();
    prev = recordAnswer(prev, { word, correct: true, timeTakenSeconds: 1, sessionStreak: 0, now: NOW }).stats;
    const { stats } = recordAnswer(prev, { word, correct: false, timeTakenSeconds: 1, sessionStreak: 1, now: NOW });
    expect(stats.currentStreak).toBe(0);
    expect(stats.incorrectAnswers).toBe(1);
    expect(stats.masteredWords).not.toContain('café');
    expect(stats.frequentMistakes['café'].incorrectCount).toBe(1);
    expect(stats.accuracy).toBe(50);
    expect(stats.spacedRepetition!['café'].box).toBe(1);
  });

  it('reporta la subida de nivel', () => {
    let prev = createDefaultStats();
    prev.xp = 140;
    prev.level = 1;
    // acierto con racha alta → +30 XP → 170 → nivel 2
    const { leveledUpTo } = recordAnswer(prev, { word, correct: true, timeTakenSeconds: 1, sessionStreak: 10, now: NOW });
    expect(leveledUpTo).toBe(2);
  });
});
