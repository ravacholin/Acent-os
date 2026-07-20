import { SRSEntry } from '../types';

/**
 * Repetición espaciada — sistema de cajas de Leitner.
 *
 * Cada palabra vive en una caja 1..5. Una palabra nueva arranca en la caja 3
 * (neutral). Un acierto la promueve una caja; un fallo la degrada de golpe a la
 * caja 1. El intervalo hasta la próxima revisión depende de la caja.
 *
 * Intervalos por caja (índice = número de caja):
 *   1 → 30 s, 2 → 2 min, 3 → 10 min, 4 → 1 h, 5 → 1 día.
 *
 * Lógica extraída sin cambios de `App.tsx` (handleAnswerReceived) para poder
 * testearla de forma aislada.
 */

// Índice por caja (0 no se usa; box válido es 1..5).
export const SRS_INTERVALS = [0, 30_000, 120_000, 600_000, 3_600_000, 86_400_000];

// Caja inicial neutral para una palabra que aún no se vio.
export const INITIAL_BOX = 3;

export function createEntry(wordId: string): SRSEntry {
  return {
    wordId,
    box: INITIAL_BOX,
    consecutiveCorrect: 0,
    lastSeenTimestamp: 0,
    nextReviewTimestamp: 0,
    failCount: 0
  };
}

/**
 * Devuelve un NUEVO registro tras aplicar una respuesta (no muta el de entrada).
 * Si `entry` es undefined, la palabra arranca en la caja 3.
 */
export function applyAnswer(
  entry: SRSEntry | undefined,
  correct: boolean,
  now: number,
  wordId: string
): SRSEntry {
  const base = entry ?? createEntry(wordId);
  const next: SRSEntry = { ...base, wordId, lastSeenTimestamp: now };

  if (correct) {
    next.consecutiveCorrect += 1;
    next.failCount = 0;
    next.box = Math.min(5, next.box + 1);
    next.nextReviewTimestamp = now + SRS_INTERVALS[next.box];
  } else {
    next.consecutiveCorrect = 0;
    next.failCount += 1;
    next.box = 1; // democión inmediata a caja 1
    // Reaparece a los 15 s; si ya se falló repetidamente (>= 2), a los 5 s.
    const penalty = next.failCount >= 2 ? 5_000 : 15_000;
    next.nextReviewTimestamp = now + penalty;
  }

  return next;
}

/** Una palabra está "due" si su próxima revisión ya pasó. */
export function isDue(entry: SRSEntry | undefined, now: number): boolean {
  if (!entry) return false;
  return now >= entry.nextReviewTimestamp;
}
