import { describe, it, expect } from 'vitest';
import { comboMultiplier, xpForAnswer, levelForXp } from './scoring';

describe('scoring', () => {
  it('multiplicador de combo crece cada 5 y topa en 3', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(4)).toBe(1);
    expect(comboMultiplier(5)).toBe(2);
    expect(comboMultiplier(9)).toBe(2);
    expect(comboMultiplier(10)).toBe(3);
    expect(comboMultiplier(50)).toBe(3); // tope
  });

  it('XP = 10 × multiplicador en acierto, 0 en fallo', () => {
    expect(xpForAnswer(0, true)).toBe(10);
    expect(xpForAnswer(5, true)).toBe(20);
    expect(xpForAnswer(10, true)).toBe(30);
    expect(xpForAnswer(50, true)).toBe(30);
    expect(xpForAnswer(50, false)).toBe(0);
  });

  it('nivel = floor(xp / 150) + 1', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(149)).toBe(1);
    expect(levelForXp(150)).toBe(2);
    expect(levelForXp(300)).toBe(3);
  });
});
