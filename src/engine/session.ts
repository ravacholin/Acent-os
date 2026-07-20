import { GameMode, GameSessionState, Word } from '../types';

/**
 * Reducer PURO de la sesión de juego.
 *
 * Reemplaza los setState entrelazados de `handleAnswerReceived`/`handleNextWord`
 * y el `setInterval` de supervivencia de `App.tsx`. Sólo gestiona el estado de
 * la SESIÓN (contadores, racha, tiempo, cola de palabras, índice actual). La
 * agregación de estadísticas globales vive aparte (`engine/stats.ts`).
 *
 * El relleno de palabras en modos infinitos es impuro (usa selección), así que
 * el llamador calcula las palabras frescas y las pasa en la acción `next`.
 *
 * Reglas de supervivencia conservadas: 30 s iniciales, acierto +3 s (+bonus por
 * racha), error −5 s, fin cuando el tiempo llega a 0.
 */

export const ENDLESS_MODES: ReadonlySet<GameMode> = new Set<GameMode>(['infinito', 'supervivencia']);

export const isEndlessMode = (mode: GameMode): boolean => ENDLESS_MODES.has(mode);

export type SessionAction =
  | { type: 'answer'; correct: boolean; timeTakenMs: number }
  | { type: 'next'; refill?: Word[] }
  | { type: 'tick' };

export interface NewSessionInput {
  mode: GameMode;
  words: Word[];
  initialTime?: number;
  now: number;
}

export function createSession({ mode, words, initialTime = 0, now }: NewSessionInput): GameSessionState {
  return {
    mode,
    words,
    currentIndex: 0,
    correctCount: 0,
    incorrectCount: 0,
    streak: 0,
    score: 0,
    timeLeft: initialTime,
    initialTime,
    startTime: now,
    finished: false,
    history: []
  };
}

/** Segundos que suma/resta una respuesta en supervivencia. */
export function survivalDelta(correct: boolean, streak: number): number {
  if (!correct) return -5;
  return 3 + Math.min(5, Math.floor(streak / 3));
}

export function sessionReducer(state: GameSessionState, action: SessionAction): GameSessionState {
  switch (action.type) {
    case 'answer': {
      const { correct, timeTakenMs } = action;
      const extraTime = state.mode === 'supervivencia' ? survivalDelta(correct, state.streak) : 0;
      const currentWord = state.words[state.currentIndex];
      return {
        ...state,
        correctCount: correct ? state.correctCount + 1 : state.correctCount,
        incorrectCount: !correct ? state.incorrectCount + 1 : state.incorrectCount,
        streak: correct ? state.streak + 1 : 0,
        timeLeft: Math.max(0, state.timeLeft + extraTime),
        history: [
          ...state.history,
          {
            wordId: currentWord ? currentWord.id : '',
            userAnswer: correct,
            isCorrect: correct,
            timeTakenMs
          }
        ]
      };
    }

    case 'next': {
      if (isEndlessMode(state.mode)) {
        const words = action.refill && action.refill.length > 0
          ? [...state.words, ...action.refill]
          : state.words;
        return { ...state, words, currentIndex: state.currentIndex + 1 };
      }
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.words.length) {
        return { ...state, finished: true };
      }
      return { ...state, currentIndex: nextIndex };
    }

    case 'tick': {
      if (state.mode !== 'supervivencia' || state.finished) return state;
      if (state.timeLeft <= 1) {
        return { ...state, timeLeft: 0, finished: true };
      }
      return { ...state, timeLeft: state.timeLeft - 1 };
    }

    default:
      return state;
  }
}
