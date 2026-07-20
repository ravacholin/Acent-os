import { describe, it, expect } from 'vitest';
import { createSession, sessionReducer, survivalDelta, isEndlessMode } from './session';
import { Word } from '../types';

function fakeWord(id: string): Word {
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
    frequency: 'alta'
  };
}

const words = [fakeWord('a'), fakeWord('b'), fakeWord('c')];

describe('session reducer', () => {
  it('cuenta aciertos, fallos y racha', () => {
    let s = createSession({ mode: 'lleva-tilde', words, now: 0 });
    s = sessionReducer(s, { type: 'answer', correct: true, timeTakenMs: 100 });
    expect(s.correctCount).toBe(1);
    expect(s.streak).toBe(1);
    s = sessionReducer(s, { type: 'next' });
    s = sessionReducer(s, { type: 'answer', correct: false, timeTakenMs: 100 });
    expect(s.incorrectCount).toBe(1);
    expect(s.streak).toBe(0);
    expect(s.history).toHaveLength(2);
    expect(s.history[0]).toMatchObject({ wordId: 'a', isCorrect: true });
    expect(s.history[1]).toMatchObject({ wordId: 'b', isCorrect: false });
  });

  it('marca finished al pasar de la última palabra (modo finito)', () => {
    let s = createSession({ mode: 'lleva-tilde', words, now: 0 });
    s = sessionReducer(s, { type: 'next' }); // idx 1
    s = sessionReducer(s, { type: 'next' }); // idx 2
    expect(s.finished).toBeFalsy();
    s = sessionReducer(s, { type: 'next' }); // más allá
    expect(s.finished).toBe(true);
  });

  it('modo infinito nunca termina por cola y admite refill', () => {
    expect(isEndlessMode('infinito')).toBe(true);
    let s = createSession({ mode: 'infinito', words, now: 0 });
    s = sessionReducer(s, { type: 'next', refill: [fakeWord('d')] });
    expect(s.finished).toBeFalsy();
    expect(s.currentIndex).toBe(1);
    expect(s.words).toHaveLength(4);
  });

  it('supervivencia: +3s en acierto, -5s en error, y llega a 0 → finished', () => {
    expect(survivalDelta(true, 0)).toBe(3);
    expect(survivalDelta(true, 9)).toBe(6); // 3 + min(5, floor(9/3))
    expect(survivalDelta(false, 100)).toBe(-5);

    let s = createSession({ mode: 'supervivencia', words, initialTime: 30, now: 0 });
    s = sessionReducer(s, { type: 'answer', correct: true, timeTakenMs: 100 });
    expect(s.timeLeft).toBe(33);
    s = sessionReducer(s, { type: 'answer', correct: false, timeTakenMs: 100 });
    expect(s.timeLeft).toBe(28);
  });

  it('supervivencia: tick decrementa y termina en 0', () => {
    let s = createSession({ mode: 'supervivencia', words, initialTime: 2, now: 0 });
    s = sessionReducer(s, { type: 'tick' });
    expect(s.timeLeft).toBe(1);
    expect(s.finished).toBeFalsy();
    s = sessionReducer(s, { type: 'tick' });
    expect(s.timeLeft).toBe(0);
    expect(s.finished).toBe(true);
  });

  it('tick no afecta a modos no-supervivencia', () => {
    let s = createSession({ mode: 'infinito', words, now: 0 });
    const before = s;
    s = sessionReducer(s, { type: 'tick' });
    expect(s).toBe(before);
  });
});
