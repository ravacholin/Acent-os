import { describe, it, expect } from 'vitest';
import { applyAnswer, isDue, createEntry, SRS_INTERVALS, INITIAL_BOX } from './srs';

const NOW = 1_000_000;

describe('srs', () => {
  it('arranca en la caja 3 (neutral)', () => {
    const entry = createEntry('café');
    expect(entry.box).toBe(INITIAL_BOX);
    expect(entry.box).toBe(3);
    expect(entry.failCount).toBe(0);
  });

  it('promueve una caja en acierto y fija el intervalo', () => {
    const next = applyAnswer(undefined, true, NOW, 'café');
    expect(next.box).toBe(4);
    expect(next.consecutiveCorrect).toBe(1);
    expect(next.failCount).toBe(0);
    expect(next.nextReviewTimestamp).toBe(NOW + SRS_INTERVALS[4]);
    expect(next.lastSeenTimestamp).toBe(NOW);
  });

  it('no supera la caja 5', () => {
    let e = createEntry('café');
    e.box = 5;
    const next = applyAnswer(e, true, NOW, 'café');
    expect(next.box).toBe(5);
    expect(next.nextReviewTimestamp).toBe(NOW + SRS_INTERVALS[5]);
  });

  it('degrada a caja 1 en fallo y reaparece a 15 s', () => {
    const start = createEntry('café');
    start.box = 5;
    const next = applyAnswer(start, false, NOW, 'café');
    expect(next.box).toBe(1);
    expect(next.consecutiveCorrect).toBe(0);
    expect(next.failCount).toBe(1);
    expect(next.nextReviewTimestamp).toBe(NOW + 15_000);
  });

  it('reaparece a 5 s tras dos fallos seguidos', () => {
    const first = applyAnswer(undefined, false, NOW, 'café');
    const second = applyAnswer(first, false, NOW, 'café');
    expect(second.failCount).toBe(2);
    expect(second.nextReviewTimestamp).toBe(NOW + 5_000);
  });

  it('no muta el registro de entrada', () => {
    const entry = createEntry('café');
    const snapshot = { ...entry };
    applyAnswer(entry, true, NOW, 'café');
    expect(entry).toEqual(snapshot);
  });

  it('isDue respeta la próxima revisión', () => {
    const entry = applyAnswer(undefined, false, NOW, 'café'); // due a NOW+15s
    expect(isDue(entry, NOW + 10_000)).toBe(false);
    expect(isDue(entry, NOW + 15_000)).toBe(true);
    expect(isDue(undefined, NOW)).toBe(false);
  });
});
