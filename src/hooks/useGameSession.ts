import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  GameMode,
  GameSessionState,
  Word,
  LevelMCER,
  WordCategory,
  Achievement,
  DEFAULT_SETTINGS,
  AppSettings,
  UserStats
} from '../types';
import {
  loadState,
  saveState,
  PersistedState,
  CURRENT_VERSION,
  isValidPersistedState
} from '../storage';
import { createDefaultStats, recordAnswer } from '../engine/stats';
import { INITIAL_ACHIEVEMENTS, checkUnlockAchievements } from '../engine/achievements';
import { levelForXp } from '../engine/scoring';
import {
  selectSessionWords,
  pushRecent,
  SelectionContext,
  CustomOptions
} from '../engine/selection';
import {
  createSession,
  sessionReducer,
  isEndlessMode,
  SessionAction
} from '../engine/session';
import { playClickSound } from '../utils/audio';

/**
 * Hook orquestador: enlaza el motor puro (`engine/*`) con el estado persistido
 * (`storage/*`) y con la sesión de juego (reducer + timer de supervivencia).
 * Deja a `App.tsx` como shell de presentación sin lógica de dominio.
 */

const TOAST_MS = 4000;

interface StartOptions extends CustomOptions {
  timeLimit?: number;
}

type ReducerState = GameSessionState | null;
type ReducerAction = SessionAction | { type: 'start'; session: GameSessionState } | { type: 'exit' };

function rootReducer(state: ReducerState, action: ReducerAction): ReducerState {
  if (action.type === 'start') return action.session;
  if (action.type === 'exit') return null;
  if (!state) return null;
  return sessionReducer(state, action);
}

function defaultProgress(): PersistedState {
  return {
    version: CURRENT_VERSION,
    stats: createDefaultStats(),
    settings: DEFAULT_SETTINGS,
    achievements: INITIAL_ACHIEVEMENTS,
    recentWords: []
  };
}

export interface LevelUpAlert {
  show: boolean;
  level: number;
}

export function useGameSession() {
  const [progress, setProgress] = useState<PersistedState>(() =>
    loadState({
      stats: createDefaultStats(),
      settings: DEFAULT_SETTINGS,
      achievements: INITIAL_ACHIEVEMENTS
    })
  );
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const [session, dispatch] = useReducer(rootReducer, null);

  const [levelUpAlert, setLevelUpAlert] = useState<LevelUpAlert>({ show: false, level: 1 });
  const [achievementToast, setAchievementToast] = useState<Achievement | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const isDailyRef = useRef(false);
  const finishedHandledRef = useRef(false);

  const stats = progress.stats;
  const settings = progress.settings;
  const achievements = progress.achievements;

  // --- Persistence helpers -------------------------------------------------
  const persist = useCallback((updater: (prev: PersistedState) => PersistedState) => {
    setProgress(prev => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  const selectionContext = useCallback((): SelectionContext => ({
    stats: progressRef.current.stats,
    recentIds: progressRef.current.recentWords,
    now: Date.now()
  }), []);

  const rememberSeen = useCallback((ids: string[]) => {
    persist(p => ({ ...p, recentWords: pushRecent(p.recentWords, ids) }));
  }, [persist]);

  // --- Toasts --------------------------------------------------------------
  const showLevelUp = useCallback((level: number) => {
    setLevelUpAlert({ show: true, level });
    setTimeout(() => setLevelUpAlert({ show: false, level: 1 }), TOAST_MS);
  }, []);

  const showAchievement = useCallback((ach: Achievement) => {
    setAchievementToast(ach);
    setTimeout(() => setAchievementToast(null), TOAST_MS);
  }, []);

  const showError = useCallback((message: string) => {
    setErrorToast(message);
    setTimeout(() => setErrorToast(null), TOAST_MS);
  }, []);

  // --- Session lifecycle ---------------------------------------------------
  const startPractice = useCallback((mode: GameMode, options?: StartOptions) => {
    playClickSound(progressRef.current.settings.soundEnabled);

    const custom = mode === 'personalizado' && options
      ? { levels: options.levels, categories: options.categories }
      : undefined;
    const words = selectSessionWords(mode, selectionContext(), custom);

    if (words.length === 0) {
      showError('No hay palabras disponibles para esta combinación de niveles y categorías. Probá a ampliar la selección.');
      return;
    }

    rememberSeen(words.map(w => w.id));
    isDailyRef.current = false;

    const initialTime =
      mode === 'supervivencia' ? 30 : mode === 'personalizado' ? options?.timeLimit || 0 : 0;

    dispatch({ type: 'start', session: createSession({ mode, words, initialTime, now: Date.now() }) });
  }, [rememberSeen, selectionContext, showError]);

  const startDailyChallenge = useCallback((words: Word[]) => {
    playClickSound(progressRef.current.settings.soundEnabled);
    isDailyRef.current = true;
    // El desafío diario también usa la escalera adaptativa (formato por palabra).
    dispatch({
      type: 'start',
      session: createSession({ mode: 'adaptativo', words, initialTime: 0, now: Date.now() })
    });
  }, []);

  const answer = useCallback((correct: boolean, timeTakenSeconds: number) => {
    const current = session;
    if (!current) return;
    const word = current.words[current.currentIndex];
    if (!word) return;

    const { stats: nextStats, leveledUpTo } = recordAnswer(progressRef.current.stats, {
      word,
      correct,
      timeTakenSeconds,
      sessionStreak: current.streak,
      now: Date.now()
    });

    const { updated, newlyUnlocked } = checkUnlockAchievements(nextStats, progressRef.current.achievements);

    persist(p => ({ ...p, stats: nextStats, achievements: updated }));

    if (leveledUpTo) showLevelUp(leveledUpTo);
    if (newlyUnlocked.length > 0) showAchievement(newlyUnlocked[0]);

    dispatch({ type: 'answer', correct, timeTakenMs: timeTakenSeconds * 1000 });
  }, [session, persist, showLevelUp, showAchievement]);

  const nextWord = useCallback(() => {
    const current = session;
    if (!current) return;

    if (isEndlessMode(current.mode)) {
      const nextIdx = current.currentIndex + 1;
      const needNew = nextIdx >= current.words.length - 1;
      let refill: Word[] = [];
      if (needNew) {
        const upcoming = new Set(current.words.slice(nextIdx).map(w => w.id));
        const fresh = selectSessionWords(current.mode, selectionContext()).filter(w => !upcoming.has(w.id));
        if (fresh.length > 0) {
          refill = fresh;
          rememberSeen(fresh.map(w => w.id));
        }
      }
      dispatch({ type: 'next', refill });
      return;
    }

    dispatch({ type: 'next' });
  }, [session, selectionContext, rememberSeen]);

  const exitSession = useCallback(() => {
    dispatch({ type: 'exit' });
  }, []);

  const restartSameMode = useCallback(() => {
    if (session) startPractice(session.mode);
  }, [session, startPractice]);

  // Wrap-up: runs once when a session finishes. Daily challenge awards its XP.
  const handleWrapUp = useCallback((finalSession: GameSessionState) => {
    if (!isDailyRef.current) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const xpEarned = 100 + finalSession.correctCount * 5;
    const result = {
      correctCount: finalSession.correctCount,
      timeTakenSeconds: (Date.now() - finalSession.startTime) / 1000,
      xpEarned
    };
    try {
      localStorage.setItem(`daily-challenge-${todayStr}`, JSON.stringify(result));
    } catch {
      /* ignore */
    }

    const prevStats = progressRef.current.stats;
    const xp = prevStats.xp + xpEarned;
    const newLevel = levelForXp(xp);
    const leveled = newLevel > (prevStats.level || 1);
    persist(p => ({
      ...p,
      stats: { ...p.stats, xp: p.stats.xp + xpEarned, level: leveled ? newLevel : p.stats.level }
    }));
    if (leveled) showLevelUp(newLevel);
  }, [persist, showLevelUp]);

  useEffect(() => {
    if (session && session.finished && !finishedHandledRef.current) {
      finishedHandledRef.current = true;
      handleWrapUp(session);
    }
    if (!session || !session.finished) {
      finishedHandledRef.current = false;
    }
  }, [session, handleWrapUp]);

  // Survival timer: one tick per second while the survival session is running.
  useEffect(() => {
    if (session && session.mode === 'supervivencia' && !session.finished) {
      const id = setInterval(() => dispatch({ type: 'tick' }), 1000);
      return () => clearInterval(id);
    }
    return undefined;
  }, [session?.startTime, session?.mode, session?.finished]);

  // --- Settings & progress management --------------------------------------
  const toggleSound = useCallback(() => {
    const next = !progressRef.current.settings.soundEnabled;
    playClickSound(next);
    persist(p => ({ ...p, settings: { ...p.settings, soundEnabled: next } }));
  }, [persist]);

  const resetProgress = useCallback(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      localStorage.removeItem(`daily-challenge-${todayStr}`);
    } catch {
      /* ignore */
    }
    const fresh = defaultProgress();
    saveState(fresh);
    setProgress(fresh);
    dispatch({ type: 'exit' });
  }, []);

  const startFocusSession = useCallback((categories: WordCategory[]) => {
    startPractice('personalizado', {
      levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as LevelMCER[],
      categories,
      timeLimit: 120
    });
  }, [startPractice]);

  const sessionCompleted = !!session?.finished;

  return {
    // state
    stats,
    settings,
    achievements,
    session,
    sessionCompleted,
    levelUpAlert,
    achievementToast,
    errorToast,
    // handlers
    startPractice,
    startDailyChallenge,
    answer,
    nextWord,
    exitSession,
    restartSameMode,
    toggleSound,
    resetProgress,
    startFocusSession,
    // exposed for Phase 5
    progress,
    setProgress,
    showError
  };
}

export type { AppSettings, UserStats };
