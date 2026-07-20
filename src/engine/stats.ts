import { UserStats, Word, WordCategory, LevelMCER } from '../types';
import { applyAnswer as applySrs } from './srs';
import { xpForAnswer, levelForXp } from './scoring';

// Las 16 categorías y 6 niveles, sembrados a cero en un estado nuevo para que
// cada bucket exista desde el arranque (sin creación lazy inconsistente).
export const CATEGORY_LIST: WordCategory[] = [
  'aguda', 'grave', 'esdrújula', 'sobreesdrújula', 'hiato', 'diptongo', 'triptongo',
  'monosílabo', 'diacrítica', 'interrogativo', 'exclamativo',
  'mayúscula', 'extranjerismo', 'latinismo', 'mente', 'pronombre'
];
export const LEVEL_LIST: LevelMCER[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function createDefaultStats(): UserStats {
  return {
    wordsSeen: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    accuracy: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalTimeSeconds: 0,
    xp: 0,
    level: 1,
    categoryStats: Object.fromEntries(
      CATEGORY_LIST.map(cat => [cat, { correct: 0, total: 0 }])
    ) as UserStats['categoryStats'],
    levelStats: Object.fromEntries(
      LEVEL_LIST.map(lvl => [lvl, { correct: 0, total: 0 }])
    ) as UserStats['levelStats'],
    frequentMistakes: {},
    masteredWords: [],
    dailyHistory: {},
    spacedRepetition: {}
  };
}

/**
 * Agregación de estadísticas de usuario a partir de una respuesta.
 *
 * Función PURA e inmutable (no muta `prev` ni sus objetos anidados) que
 * reemplaza el bloque imperativo de `handleAnswerReceived` en `App.tsx`.
 * Combina scoring (XP/nivel) y SRS, y devuelve además el nivel alcanzado si
 * hubo subida de nivel, para que la UI dispare su aviso.
 */

export interface RecordAnswerInput {
  word: Word;
  correct: boolean;
  timeTakenSeconds: number;
  // Racha DENTRO de la sesión (multiplicador de XP), al momento de responder.
  sessionStreak: number;
  now: number;
}

export interface RecordAnswerResult {
  stats: UserStats;
  leveledUpTo: number | null;
}

export function recordAnswer(prev: UserStats, input: RecordAnswerInput): RecordAnswerResult {
  const { word, correct, timeTakenSeconds, sessionStreak, now } = input;

  const stats: UserStats = {
    ...prev,
    categoryStats: { ...prev.categoryStats },
    levelStats: { ...prev.levelStats },
    frequentMistakes: { ...prev.frequentMistakes },
    spacedRepetition: { ...(prev.spacedRepetition || {}) },
    dailyHistory: { ...prev.dailyHistory },
    masteredWords: [...prev.masteredWords]
  };

  stats.wordsSeen += 1;
  stats.totalTimeSeconds += timeTakenSeconds;

  stats.spacedRepetition![word.id] = applySrs(stats.spacedRepetition![word.id], correct, now, word.id);

  if (correct) {
    stats.correctAnswers += 1;
    stats.xp += xpForAnswer(sessionStreak, true);
    stats.currentStreak += 1;
    if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak;
    if (!stats.masteredWords.includes(word.id)) stats.masteredWords.push(word.id);
  } else {
    stats.incorrectAnswers += 1;
    stats.currentStreak = 0;
    stats.masteredWords = stats.masteredWords.filter(id => id !== word.id);
    const fm = stats.frequentMistakes[word.id];
    stats.frequentMistakes[word.id] = fm
      ? { ...fm, incorrectCount: fm.incorrectCount + 1 }
      : { wordId: word.id, word: word.word, incorrectCount: 1, explanation: word.explanation };
  }

  const cat = stats.categoryStats[word.category] || { correct: 0, total: 0 };
  stats.categoryStats[word.category] = {
    correct: cat.correct + (correct ? 1 : 0),
    total: cat.total + 1
  };

  const lvl = stats.levelStats[word.level] || { correct: 0, total: 0 };
  stats.levelStats[word.level] = {
    correct: lvl.correct + (correct ? 1 : 0),
    total: lvl.total + 1
  };

  const totalAns = stats.correctAnswers + stats.incorrectAnswers;
  stats.accuracy = totalAns > 0 ? Math.round((stats.correctAnswers / totalAns) * 100) : 0;

  const newLevel = levelForXp(stats.xp);
  let leveledUpTo: number | null = null;
  if (newLevel > (prev.level || 1)) {
    stats.level = newLevel;
    leveledUpTo = newLevel;
  }

  const todayStr = new Date(now).toISOString().split('T')[0];
  stats.dailyHistory[todayStr] = (stats.dailyHistory[todayStr] || 0) + 1;

  return { stats, leveledUpTo };
}
