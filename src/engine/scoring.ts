/**
 * Puntuación — XP, combo y nivel.
 *
 * Reglas extraídas sin cambios de `App.tsx`:
 *   - XP por acierto = 10 × multiplicador de combo.
 *   - multiplicador = min(3, 1 + floor(racha / 5)).
 *   - nivel = floor(xp / 150) + 1.
 * La racha usada para el multiplicador es la racha DENTRO de la sesión.
 */

export const XP_PER_CORRECT = 10;
export const XP_PER_LEVEL = 150;
export const MAX_COMBO_MULTIPLIER = 3;

export function comboMultiplier(streak: number): number {
  return Math.min(MAX_COMBO_MULTIPLIER, 1 + Math.floor(streak / 5));
}

export function xpForAnswer(streak: number, correct: boolean): number {
  return correct ? XP_PER_CORRECT * comboMultiplier(streak) : 0;
}

export function levelForXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}
