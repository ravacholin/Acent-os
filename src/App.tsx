import React, { useState, useEffect, useRef } from 'react';
import {
  GameMode,
  AppSettings,
  UserStats,
  Achievement,
  GameSessionState,
  Word,
  WordCategory,
  LevelMCER,
  DEFAULT_SETTINGS
} from './types';
import { WORDS_DATABASE, isAmbiguousWord } from './data/words';
import { calculateErrorProfiles, getWeakCategories } from './utils/errorAnalysis';
import PracticeSelector from './components/PracticeSelector';
import StatsDashboard from './components/StatsDashboard';
import { INITIAL_ACHIEVEMENTS } from './components/AchievementsPanel';
import DailyChallenge from './components/DailyChallenge';
import ExerciseCard from './components/ExerciseCard';
import { playClickSound, playCorrectSound, speakWord } from './utils/audio';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';

// The 18 word categories and 6 MCER levels, seeded to zero in fresh stats so every
// bucket exists from the start (no lazy, inconsistent creation later on).
const CATEGORIES_LIST: WordCategory[] = [
  'aguda', 'grave', 'esdrújula', 'sobreesdrújula', 'hiato', 'diptongo', 'triptongo',
  'monosílabo', 'diacrítica', 'interrogativo', 'exclamativo', 'solo-solo',
  'demostrativo', 'mayúscula', 'extranjerismo', 'latinismo', 'mente', 'pronombre'
];
const LEVELS_LIST: LevelMCER[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const seedCategoryStats = (): UserStats['categoryStats'] =>
  Object.fromEntries(CATEGORIES_LIST.map(cat => [cat, { correct: 0, total: 0 }])) as UserStats['categoryStats'];

const seedLevelStats = (): UserStats['levelStats'] =>
  Object.fromEntries(LEVELS_LIST.map(lvl => [lvl, { correct: 0, total: 0 }])) as UserStats['levelStats'];

// Default empty stats template
const DEFAULT_STATS: UserStats = {
  wordsSeen: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  accuracy: 0,
  currentStreak: 0,
  bestStreak: 0,
  totalTimeSeconds: 0,
  xp: 0,
  level: 1,
  categoryStats: seedCategoryStats(),
  levelStats: seedLevelStats(),
  frequentMistakes: {},
  masteredWords: [],
  dailyHistory: {},
  spacedRepetition: {}
};

// Number of words per regular practice session
const SESSION_SIZE = 10;

// "Meta" modes (timed / endless / filtered) don't have their own question format;
// they present a concrete exercise type per word. We rotate through fast, tap-based
// formats that work for ANY word (including diacritic pairs, which show context).
const META_MODES = new Set<GameMode>(['supervivencia', 'infinito', 'personalizado']);
const META_ROTATION: GameMode[] = ['lleva-tilde', 'encontra-error', 'clasificacion'];

// Resolve the concrete exercise type to render for a given session word index.
function resolveRenderMode(mode: GameMode, index: number): GameMode {
  if (!META_MODES.has(mode)) return mode;
  return META_ROTATION[index % META_ROTATION.length];
}
// How many recently-seen words we remember to avoid repeating them across sessions.
// Capped well below the total database so there is always a fresh pool available.
const RECENT_MEMORY_KEY = 'acentos-recent-words';
const RECENT_MEMORY_CAP = 120;

// Unbiased Fisher–Yates shuffle (returns a new array; does not mutate input)
function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Recently-seen memory persisted in localStorage. Newest ids first.
function loadRecentlySeen(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_MEMORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function rememberSeen(ids: string[]) {
  try {
    const prev = loadRecentlySeen();
    // Prepend the new ids (newest first), de-duplicate, and cap the length.
    const merged = [...ids, ...prev.filter(id => !ids.includes(id))].slice(0, RECENT_MEMORY_CAP);
    localStorage.setItem(RECENT_MEMORY_KEY, JSON.stringify(merged));
  } catch {
    /* ignore storage errors */
  }
}

// Tres destinos de nivel superior. "desafio" es una sub-vista de Entrenar (no aparece
// en la barra; se llega desde la tarjeta de la portada) — se conserva como valor propio
// porque triggerSessionWrapUp lo usa para detectar el desafío diario.
type Tab = 'entrenar' | 'progreso' | 'desafio';

const NAV_ITEMS: { id: Tab; label: string }[] = [
  { id: 'entrenar', label: 'Entrenar' },
  { id: 'progreso', label: 'Progreso' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('entrenar');

  // LocalStorage driven states
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);

  // Active game states
  const [session, setSession] = useState<GameSessionState | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [selectedResultWord, setSelectedResultWord] = useState<Word | null>(null);
  const [levelUpAlert, setLevelUpAlert] = useState<{ show: boolean; level: number }>({ show: false, level: 1 });
  const [unlockedAchievementToast, setUnlockedAchievementToast] = useState<Achievement | null>(null);

  const survivalTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial State Hydration from Local Storage
  useEffect(() => {
    try {
      const savedStats = localStorage.getItem('acentos-user-stats');
      if (savedStats) {
        setStats(JSON.parse(savedStats));
      }

      const savedSettings = localStorage.getItem('acentos-settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }

      const savedAchievements = localStorage.getItem('acentos-achievements');
      if (savedAchievements) {
        setAchievements(JSON.parse(savedAchievements));
      }
    } catch (e) {
      console.warn('Failed to restore states from local storage', e);
    }
  }, []);

  // 2. Persistence Synchronization triggers
  const saveStatsToStorage = (updatedStats: UserStats) => {
    setStats(updatedStats);
    localStorage.setItem('acentos-user-stats', JSON.stringify(updatedStats));
  };

  const saveSettingsToStorage = (updatedSettings: AppSettings) => {
    setSettings(updatedSettings);
    localStorage.setItem('acentos-settings', JSON.stringify(updatedSettings));
  };

  const saveAchievementsToStorage = (updatedAchievements: Achievement[]) => {
    setAchievements(updatedAchievements);
    localStorage.setItem('acentos-achievements', JSON.stringify(updatedAchievements));
  };

  const handleResetProgress = () => {
    localStorage.removeItem('acentos-user-stats');
    localStorage.removeItem('acentos-achievements');
    // Clear daily challenge completions
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.removeItem(`daily-challenge-${todayStr}`);

    setStats(DEFAULT_STATS);
    setAchievements(INITIAL_ACHIEVEMENTS);
    setActiveTab('entrenar');
    setSession(null);
    setSessionCompleted(false);
  };

  // 3. Word selection (pure — never mutates the "recently seen" memory).
  //
  // Two-quota design so the hundreds of words actually surface:
  //   - A *capped* slice of "review" words (failed / due for spaced repetition) so
  //     struggle-words come back in moderation instead of flooding every session.
  //   - The remaining slots are filled with genuinely fresh variety, preferring
  //     never-recently-seen words, all shuffled at random.
  // The caller is responsible for recording what it actually shows (rememberSeen).
  const selectSessionWords = (
    mode: GameMode,
    customOptions?: { levels: LevelMCER[]; categories: WordCategory[] },
    count: number = SESSION_SIZE,
    allWords: Word[] = WORDS_DATABASE
  ): Word[] => {
    let filtered = [...allWords];

    // Mode specific filters
    if (mode === 'donde-va-tilde') {
      // Must have tilde to let users click the vowel
      filtered = filtered.filter(w => w.hasTilde);
    }

    if (mode === 'dictado') {
      // Homophones (el/él, tu/tú, qué/que…) are indistinguishable by audio, so
      // they cannot be dictated fairly — keep them out of this mode only.
      filtered = filtered.filter(w => !isAmbiguousWord(w));
    }

    if (mode === 'personalizado' && customOptions) {
      filtered = filtered.filter(w =>
        customOptions.levels.includes(w.level) &&
        customOptions.categories.includes(w.category)
      );
    }

    if (filtered.length === 0) return [];

    const now = Date.now();
    const weakCats = getWeakCategories(stats);
    const recentSet = new Set(loadRecentlySeen());
    const sr = stats.spacedRepetition || {};

    // Split into "due for review" and everything else.
    const failed: Word[] = [];
    const dueCorrect: Word[] = [];
    const rest: Word[] = [];
    for (const w of filtered) {
      const record = sr[w.id];
      if (record && record.failCount > 0) {
        failed.push(w);
      } else if (record && now >= record.nextReviewTimestamp) {
        dueCorrect.push(w);
      } else {
        rest.push(w);
      }
    }

    // Cap how many review words a single session may contain (failed first).
    const reviewQuota = Math.min(Math.ceil(count * 0.4), failed.length + dueCorrect.length);
    const reviewPool = [...shuffle(failed), ...shuffle(dueCorrect)].slice(0, reviewQuota);

    // Fill the rest with fresh variety: prefer words not seen recently, and give a
    // light preference to weak categories — but keep it heavily shuffled so we never
    // show the same set twice.
    const notRecent = shuffle(rest.filter(w => !recentSet.has(w.id)));
    const recent = shuffle(rest.filter(w => recentSet.has(w.id)));
    const weakFirst = (arr: Word[]) => {
      const weak = arr.filter(w => weakCats.includes(w.category));
      const other = arr.filter(w => !weakCats.includes(w.category));
      return [...weak, ...other];
    };
    const freshPool = [...weakFirst(notRecent), ...recent];

    // Assemble: review words + fresh fill. If still short (tiny custom filter),
    // top up from any leftover review words so we never return fewer than possible.
    const chosen = [...reviewPool, ...freshPool].slice(0, count);
    if (chosen.length < count) {
      const chosenIds = new Set(chosen.map(w => w.id));
      const leftover = [...failed, ...dueCorrect].filter(w => !chosenIds.has(w.id));
      chosen.push(...leftover.slice(0, count - chosen.length));
    }

    // Final shuffle so review words aren't always first.
    return shuffle(chosen);
  };

  // 4. Session Operations
  const handleStartPractice = (
    mode: GameMode,
    customOptions?: { levels: LevelMCER[]; categories: WordCategory[]; timeLimit?: number }
  ) => {
    playClickSound(settings.soundEnabled);

    let words = [];
    let initialTime = 0;

    if (mode === 'supervivencia') {
      words = selectSessionWords(mode);
      initialTime = 30; // Starts with 30s
    } else if (mode === 'infinito') {
      words = selectSessionWords(mode);
    } else if (mode === 'personalizado') {
      words = selectSessionWords(mode, customOptions);
      initialTime = customOptions?.timeLimit || 0;
    } else {
      words = selectSessionWords(mode);
    }

    // Empty selection guard: a very narrow custom filter (or a fully mastered set
    // for a mode) can yield no words. Don't start a session that would hang on a
    // blank card — tell the user and bail out.
    if (words.length === 0) {
      alert('No hay palabras disponibles para esta combinación de niveles y categorías. Prueba a ampliar la selección.');
      return;
    }

    // Record what we're about to show so future sessions favor fresh words.
    rememberSeen(words.map(w => w.id));

    setSession({
      mode,
      words,
      currentIndex: 0,
      correctCount: 0,
      incorrectCount: 0,
      streak: 0,
      score: 0,
      timeLeft: initialTime,
      initialTime,
      startTime: Date.now(),
      history: []
    });

    setSessionCompleted(false);
    setSelectedResultWord(null);

    // Setup Survival Timer if needed
    if (mode === 'supervivencia') {
      if (survivalTimerRef.current) clearInterval(survivalTimerRef.current);
      survivalTimerRef.current = setInterval(() => {
        setSession(prev => {
          if (!prev) return null;
          if (prev.timeLeft <= 1) {
            if (survivalTimerRef.current) clearInterval(survivalTimerRef.current);
            // End session
            setSessionCompleted(true);
            triggerSessionWrapUp(prev);
            return { ...prev, timeLeft: 0 };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
  };

  const handleStartDailyChallenge = (words: Word[]) => {
    playClickSound(settings.soundEnabled);
    setSession({
      mode: 'lleva-tilde', // Default mode for daily challenge
      words: words,
      currentIndex: 0,
      correctCount: 0,
      incorrectCount: 0,
      streak: 0,
      score: 0,
      timeLeft: 0,
      initialTime: 0,
      startTime: Date.now(),
      history: []
    });
    setSessionCompleted(false);
    setSelectedResultWord(null);
  };

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (survivalTimerRef.current) clearInterval(survivalTimerRef.current);
    };
  }, []);

  // 5. Answer Assessment
  const handleAnswerReceived = (isCorrect: boolean, timeTakenSeconds: number) => {
    if (!session) return;

    const currentWord = session.words[session.currentIndex];

    // Calculate Score multiplier
    const comboMultiplier = Math.min(3, 1 + Math.floor(session.streak / 5));
    const xpEarned = isCorrect ? (10 * comboMultiplier) : 0;

    // Acierto / Fallo logic
    const nextStreak = isCorrect ? session.streak + 1 : 0;
    const nextCorrectCount = isCorrect ? session.correctCount + 1 : session.correctCount;
    const nextIncorrectCount = !isCorrect ? session.incorrectCount + 1 : session.incorrectCount;

    // Survival addition
    let extraTime = 0;
    if (session.mode === 'supervivencia') {
      if (isCorrect) {
        extraTime = 3 + Math.min(5, Math.floor(session.streak / 3)); // adds 3s plus streak bonus
      } else {
        extraTime = -5; // subtracts 5s on failure
      }
    }

    // Dynamic stats updates
    const updatedStats = { ...stats };
    updatedStats.wordsSeen += 1;
    updatedStats.totalTimeSeconds += timeTakenSeconds;

    // Ensure spacedRepetition dictionary is initialized
    if (!updatedStats.spacedRepetition) {
      updatedStats.spacedRepetition = {};
    }

    const wordSR = updatedStats.spacedRepetition[currentWord.id] || {
      wordId: currentWord.id,
      box: 3, // start in box 3 (neutral)
      consecutiveCorrect: 0,
      lastSeenTimestamp: 0,
      nextReviewTimestamp: 0,
      failCount: 0
    };

    wordSR.lastSeenTimestamp = Date.now();

    if (isCorrect) {
      updatedStats.correctAnswers += 1;
      updatedStats.xp += xpEarned;
      updatedStats.currentStreak += 1;
      if (updatedStats.currentStreak > updatedStats.bestStreak) {
        updatedStats.bestStreak = updatedStats.currentStreak;
      }

      // Spaced Repetition consecutive correct tracking
      if (!updatedStats.masteredWords.includes(currentWord.id)) {
        updatedStats.masteredWords.push(currentWord.id);
      }

      // Progress word in spaced repetition
      wordSR.consecutiveCorrect += 1;
      wordSR.failCount = 0; // reset fail count upon correct answer
      wordSR.box = Math.min(5, wordSR.box + 1);

      // Box intervals: Box 1 (30s), Box 2 (2m), Box 3 (10m), Box 4 (1h), Box 5 (1d)
      const intervals = [0, 30 * 1000, 120 * 1000, 600 * 1000, 3600 * 1000, 86400 * 1000];
      wordSR.nextReviewTimestamp = Date.now() + intervals[wordSR.box];
    } else {
      updatedStats.incorrectAnswers += 1;
      updatedStats.currentStreak = 0;

      // Unmaster word
      updatedStats.masteredWords = updatedStats.masteredWords.filter(id => id !== currentWord.id);

      // Save to frequent mistakes profile
      if (!updatedStats.frequentMistakes[currentWord.id]) {
        updatedStats.frequentMistakes[currentWord.id] = {
          wordId: currentWord.id,
          word: currentWord.word,
          incorrectCount: 1,
          explanation: currentWord.explanation
        };
      } else {
        updatedStats.frequentMistakes[currentWord.id].incorrectCount += 1;
      }

      // Regress word in spaced repetition
      wordSR.consecutiveCorrect = 0;
      wordSR.failCount += 1;
      wordSR.box = 1; // Demote to box 1 immediately on failure

      // Penalty: reappears sooner. If they fail it repeatedly (failCount >= 2), reappears even sooner!
      const penaltyInterval = wordSR.failCount >= 2 ? 5 * 1000 : 15 * 1000;
      wordSR.nextReviewTimestamp = Date.now() + penaltyInterval;
    }

    updatedStats.spacedRepetition[currentWord.id] = wordSR;

    // Update Category Metrics
    if (!updatedStats.categoryStats[currentWord.category]) {
      updatedStats.categoryStats[currentWord.category] = { correct: 0, total: 0 };
    }
    updatedStats.categoryStats[currentWord.category].total += 1;
    if (isCorrect) {
      updatedStats.categoryStats[currentWord.category].correct += 1;
    }

    // Update Level Metrics
    if (!updatedStats.levelStats[currentWord.level]) {
      updatedStats.levelStats[currentWord.level] = { correct: 0, total: 0 };
    }
    updatedStats.levelStats[currentWord.level].total += 1;
    if (isCorrect) {
      updatedStats.levelStats[currentWord.level].correct += 1;
    }

    // Update Accuracy Percentage
    const totalAns = updatedStats.correctAnswers + updatedStats.incorrectAnswers;
    updatedStats.accuracy = totalAns > 0 ? Math.round((updatedStats.correctAnswers / totalAns) * 100) : 0;

    // Level progression (Level up check)
    const newLevel = Math.floor(updatedStats.xp / 150) + 1;
    if (newLevel > (updatedStats.level || 1)) {
      setLevelUpAlert({ show: true, level: newLevel });
      updatedStats.level = newLevel;
      setTimeout(() => setLevelUpAlert({ show: false, level: 1 }), 4000);
    }

    // Daily History Calendar
    const todayStr = new Date().toISOString().split('T')[0];
    updatedStats.dailyHistory[todayStr] = (updatedStats.dailyHistory[todayStr] || 0) + 1;

    // Check achievement rules
    const achCheck = checkUnlockAchievements(updatedStats, achievements);
    if (achCheck.newlyUnlocked.length > 0) {
      setUnlockedAchievementToast(achCheck.newlyUnlocked[0]);
      saveAchievementsToStorage(achCheck.updated);
      setTimeout(() => setUnlockedAchievementToast(null), 4000);
    }

    saveStatsToStorage(updatedStats);

    // Apply immediate session state transition
    setSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        correctCount: nextCorrectCount,
        incorrectCount: nextIncorrectCount,
        streak: nextStreak,
        timeLeft: Math.max(0, prev.timeLeft + extraTime),
        history: [
          ...prev.history,
          {
            wordId: currentWord.id,
            userAnswer: isCorrect,
            isCorrect,
            timeTakenMs: timeTakenSeconds * 1000
          }
        ]
      };
    });
  };

  const handleNextWord = () => {
    if (!session) return;

    // Endless modes (Infinito + Supervivencia) never "complete" by running out of
    // queue — they keep serving words. Survival ends only when its timer hits 0.
    if (session.mode === 'infinito' || session.mode === 'supervivencia') {
      const nextIdx = session.currentIndex + 1;
      const needNewWords = nextIdx >= session.words.length - 1;

      let updatedWords = session.words;
      if (needNewWords) {
        // Only select (and record as seen) when we actually append. Avoid words
        // still upcoming in the queue so we never repeat back-to-back.
        const upcomingIds = new Set(session.words.slice(nextIdx).map(w => w.id));
        const fresh = selectSessionWords(session.mode).filter(w => !upcomingIds.has(w.id));
        if (fresh.length > 0) {
          rememberSeen(fresh.map(w => w.id));
          updatedWords = [...session.words, ...fresh];
        }
      }

      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          words: updatedWords,
          currentIndex: nextIdx
        };
      });
      return;
    }

    const nextIndex = session.currentIndex + 1;

    if (nextIndex >= session.words.length) {
      // Completed session
      if (survivalTimerRef.current) clearInterval(survivalTimerRef.current);
      setSessionCompleted(true);
      triggerSessionWrapUp(session);
    } else {
      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          currentIndex: nextIndex
        };
      });
    }
  };

  const triggerSessionWrapUp = (finalSession: GameSessionState) => {
    // If it was a Daily Challenge, save to today's completed state
    const isDaily = activeTab === 'desafio';
    if (isDaily) {
      const todayStr = new Date().toISOString().split('T')[0];
      const dailyKey = `daily-challenge-${todayStr}`;

      const resultObj = {
        correctCount: finalSession.correctCount,
        timeTakenSeconds: (Date.now() - finalSession.startTime) / 1000,
        xpEarned: 100 + finalSession.correctCount * 5
      };

      localStorage.setItem(dailyKey, JSON.stringify(resultObj));

      // Update stats with Daily challenge completion XP
      const updatedStats = { ...stats };
      updatedStats.xp += resultObj.xpEarned;
      const newLevel = Math.floor(updatedStats.xp / 150) + 1;
      if (newLevel > (updatedStats.level || 1)) {
        setLevelUpAlert({ show: true, level: newLevel });
        updatedStats.level = newLevel;
        setTimeout(() => setLevelUpAlert({ show: false, level: 1 }), 4000);
      }
      saveStatsToStorage(updatedStats);
    }
  };

  const handleExitSession = () => {
    if (survivalTimerRef.current) clearInterval(survivalTimerRef.current);
    setSession(null);
    setSessionCompleted(false);
  };

  // 6. Achievement Checker Rules
  const checkUnlockAchievements = (currentStats: UserStats, currentAchievements: Achievement[]) => {
    let newlyUnlocked: Achievement[] = [];
    const updated = currentAchievements.map(ach => {
      if (ach.unlockedAt) return ach;

      let unlocked = false;
      switch (ach.id) {
        case 'ach-seen-100':
          unlocked = currentStats.wordsSeen >= 100;
          break;
        case 'ach-seen-500':
          unlocked = currentStats.wordsSeen >= 500;
          break;
        case 'ach-streak-50':
          unlocked = currentStats.bestStreak >= 50;
          break;
        case 'ach-accuracy-90':
          unlocked = currentStats.wordsSeen >= 20 && currentStats.accuracy >= 90;
          break;
        case 'ach-hiatos': {
          const catStat = currentStats.categoryStats['hiato'];
          unlocked = catStat && catStat.total >= 5 && (catStat.correct / catStat.total) >= 0.85;
          break;
        }
        case 'ach-esdrujulas': {
          const catStat = currentStats.categoryStats['esdrújula'];
          unlocked = catStat && catStat.total >= 5 && (catStat.correct / catStat.total) >= 0.85;
          break;
        }
        case 'ach-diacriticas': {
          const catStat = currentStats.categoryStats['diacrítica'];
          unlocked = catStat && catStat.total >= 5 && (catStat.correct / catStat.total) >= 0.85;
          break;
        }
      }

      if (unlocked) {
        const updatedAch = { ...ach, unlockedAt: new Date().toLocaleDateString('es-ES') };
        newlyUnlocked.push(updatedAch);
        return updatedAch;
      }
      return ach;
    });
    return { updated, newlyUnlocked };
  };

  // Navigating away from an in-progress session (via brand mark or nav tabs)
  // exits it first so the tab underneath is what's shown next.
  const goTo = (tab: typeof activeTab) => () => {
    playClickSound(settings.soundEnabled);
    if (session) handleExitSession();
    setActiveTab(tab);
  };

  // Alterna los efectos de sonido desde el icono de altavoz de la barra.
  // El clic de feedback solo se oye cuando el sonido queda activado.
  const toggleSound = () => {
    const nextSoundEnabled = !settings.soundEnabled;
    playClickSound(nextSoundEnabled);
    saveSettingsToStorage({ ...settings, soundEnabled: nextSoundEnabled });
  };

  const totalAnswered = session ? session.words.length : 0;
  const sessionIsEndless = session ? (session.mode === 'infinito' || session.mode === 'supervivencia') : false;

  return (
    <>
      {/* Global Alert/Toast Notifications */}
      <AnimatePresence>
        {levelUpAlert.show && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.12 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#F5F5F0] text-black px-6 py-3.5 border border-black font-mono"
            id="toast-level-up"
          >
            <div className="text-[9px] tracking-[0.2em] uppercase opacity-60">¡Subida de nivel!</div>
            <div className="display-heavy text-lg mt-1">Nivel {levelUpAlert.level}</div>
          </motion.div>
        )}

        {unlockedAchievementToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.12 }}
            className="fixed bottom-6 right-6 z-50 bg-black text-[#F5F5F0] p-5 border border-[#2a2a2a] max-w-sm font-mono"
            id="toast-achievement"
          >
            <div className="text-[9px] tracking-[0.2em] uppercase text-[#666] mb-1.5">Logro desbloqueado</div>
            <div className="display-heavy text-lg truncate">{unlockedAchievementToast.title}</div>
            <p className="text-[#888] text-xs leading-relaxed mt-1">{unlockedAchievementToast.description}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-black flex justify-center px-4 sm:px-6 py-8 sm:py-12 font-mono box-border" id="app-root">
        <div className="relative w-[1040px] max-w-full border border-[#2a2a2a] bg-black text-[#F5F5F0]">

          {/* Corner registration marks */}
          <div className="absolute -top-px -left-px w-3.5 h-3.5 border-t border-l border-[#555]" />
          <div className="absolute -top-px -right-px w-3.5 h-3.5 border-t border-r border-[#555]" />
          <div className="absolute -bottom-px -left-px w-3.5 h-3.5 border-b border-l border-[#555]" />
          <div className="absolute -bottom-px -right-px w-3.5 h-3.5 border-b border-r border-[#555]" />

          {/* TOPBAR */}
          <div className="px-6 sm:px-[52px] pt-6 sm:pt-[34px]">
            <div className="flex justify-between items-center gap-3 text-[9px] tracking-[0.22em] text-[#666] uppercase flex-wrap">
              <span onClick={goTo('entrenar')} className="cursor-pointer text-[#999] hover:text-[#F5F5F0] transition-colors" id="brand-logo">
                AcentOS — ES
              </span>
              <span>Nivel {stats.level} · {stats.accuracy}% · racha {stats.currentStreak}</span>
            </div>

            {/* NAV — dos destinos de texto + icono de sonido */}
            <div className="flex justify-between items-center gap-6 mt-5 pt-5 border-t border-[#1f1f1f]" id="main-navigation">
              <div className="flex gap-6 sm:gap-[30px] text-[10px] tracking-[0.18em] uppercase">
                {NAV_ITEMS.map(item => {
                  const active = !session && (activeTab === item.id || (item.id === 'entrenar' && activeTab === 'desafio'));
                  return (
                    <span
                      key={item.id}
                      onClick={goTo(item.id)}
                      className={`cursor-pointer pb-1.5 border-b transition-colors ${
                        active ? 'border-[#F5F5F0] text-[#F5F5F0]' : 'border-transparent text-[#777] hover:text-[#F5F5F0]'
                      }`}
                      id={`nav-tab-${item.id}`}
                    >
                      {item.label}
                    </span>
                  );
                })}
              </div>
              <button
                onClick={toggleSound}
                aria-label={settings.soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
                title={settings.soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
                aria-pressed={settings.soundEnabled}
                className="shrink-0 pb-1.5 text-[#777] hover:text-[#F5F5F0] transition-colors"
                id="nav-toggle-sound"
              >
                {settings.soundEnabled
                  ? <Volume2 size={16} strokeWidth={1.5} />
                  : <VolumeX size={16} strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="px-6 sm:px-[52px] pt-8 sm:pt-11 pb-12 sm:pb-[60px]">
            <AnimatePresence mode="wait">

              {/* ACTIVE TRAINING VIEW */}
              {session && !sessionCompleted && (
                <motion.div
                  key="active-session-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  id="active-session-container"
                >
                  <div className="flex justify-between items-baseline mb-11">
                    <span
                      onClick={handleExitSession}
                      className="text-[10px] text-[#666] cursor-pointer underline underline-offset-2 hover:text-[#F5F5F0] transition-colors"
                    >
                      ← abandonar sesión
                    </span>
                    <span className="text-[10px] text-[#666] uppercase tracking-[0.12em]">
                      Palabra {session.currentIndex + 1} de {sessionIsEndless ? '∞' : totalAnswered}
                    </span>
                  </div>

                  {session.words[session.currentIndex] && (
                    <div key={`${session.mode}-${session.currentIndex}`}>
                      <ExerciseCard
                        word={session.words[session.currentIndex]}
                        mode={resolveRenderMode(session.mode, session.currentIndex)}
                        settings={settings}
                        comboStreak={session.streak}
                        timeLeft={session.mode === 'supervivencia' ? session.timeLeft : undefined}
                        onAnswer={handleAnswerReceived}
                        onNext={handleNextWord}
                      />
                    </div>
                  )}
                </motion.div>
              )}

              {/* RESULTS VIEW */}
              {session && sessionCompleted && (
                <motion.div
                  key="session-completed-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  id="session-completed-panel"
                >
                  <div className="max-w-xl mx-auto text-center pb-9 border-b border-[#1a1a1a]">
                    <span className="text-[9px] tracking-[0.2em] text-[#666] uppercase border border-[#2a2a2a] px-3 py-1 inline-block">
                      Sesión completada
                    </span>
                    <div className="display-brutal text-[34px] sm:text-[44px] mt-5">Resumen</div>
                    <p className="text-[#888] text-xs mt-2">Análisis de rendimiento sobre el set de acentuación</p>
                  </div>

                  <div className="max-w-xl mx-auto grid grid-cols-3 border-b border-[#1a1a1a]">
                    <div className="py-[26px] text-center border-r border-[#1a1a1a]">
                      <div className="text-[9px] tracking-[0.2em] text-[#666] uppercase">Aciertos</div>
                      <div className="display-heavy text-[34px] sm:text-[42px] mt-2.5">{session.correctCount} / {session.words.length}</div>
                    </div>
                    <div className="py-[26px] text-center border-r border-[#1a1a1a]">
                      <div className="text-[9px] tracking-[0.2em] text-[#666] uppercase">Precisión</div>
                      <div className="display-heavy text-[34px] sm:text-[42px] mt-2.5">
                        {session.words.length > 0 ? Math.round((session.correctCount / session.words.length) * 100) : 0}%
                      </div>
                    </div>
                    <div className="py-[26px] text-center">
                      <div className="text-[9px] tracking-[0.2em] text-[#666] uppercase">Tiempo</div>
                      <div className="display-heavy text-[34px] sm:text-[42px] mt-2.5">
                        {((Date.now() - session.startTime) / 1000).toFixed(0)}s
                      </div>
                    </div>
                  </div>

                  <div className="max-w-xl mx-auto mt-9">
                    <div className="text-[9px] tracking-[0.2em] text-[#666] uppercase mb-3">Revisión del vocabulario</div>
                    <div className="divide-y divide-[#1a1a1a] border-t border-[#1a1a1a] max-h-56 overflow-y-auto pr-1">
                      {session.words.map((w, wIdx) => {
                        const histItem = session.history.find(h => h.wordId === w.id);
                        const isWordCorrect = histItem ? histItem.isCorrect : false;
                        const isSelected = selectedResultWord?.id === w.id;

                        return (
                          <div key={wIdx}>
                            <div
                              onClick={() => {
                                playClickSound(settings.soundEnabled);
                                setSelectedResultWord(isSelected ? null : w);
                              }}
                              className="flex justify-between items-center cursor-pointer hover:bg-[#0d0d0d] px-2 py-2.5 transition-colors"
                            >
                              <span className="display-heavy text-lg">{w.word}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono text-[#666] uppercase">{w.classification}</span>
                                <span className={`text-sm ${isWordCorrect ? 'text-[#F5F5F0]' : 'text-[#777]'}`}>
                                  {isWordCorrect ? '✓' : '✗'}
                                </span>
                              </div>
                            </div>

                            {isSelected && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.12 }}
                                className="px-2 pb-3 space-y-1.5"
                              >
                                <div className="flex justify-between text-[11px] font-mono text-[#888]">
                                  <span>Silabeo: {w.syllables.join(' • ')}</span>
                                  <span>Regla: {w.rule}</span>
                                </div>
                                <p className="text-[#999] text-xs italic">"{w.explanation}"</p>
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="max-w-xl mx-auto flex flex-col sm:flex-row gap-3 pt-9">
                    <button
                      onClick={() => handleStartPractice(session.mode)}
                      className="flex-1 py-3 bg-[#F5F5F0] text-black text-xs tracking-[0.1em] cursor-pointer hover:bg-[#d4d4d4] transition-colors"
                    >
                      Practicar de nuevo
                    </button>
                    <button
                      onClick={handleExitSession}
                      className="flex-1 py-3 border border-[#2a2a2a] text-[#999] text-xs tracking-[0.1em] cursor-pointer hover:border-[#F5F5F0] hover:text-[#F5F5F0] transition-colors"
                    >
                      Volver a modos
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ENTRENAR — portada mínima + desafío diario + modos */}
              {!session && activeTab === 'entrenar' && (
                <motion.div
                  key="entrenar-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  id="entrenar-view"
                >
                  {/* Hero */}
                  <div className="pt-4 pb-9 border-b border-[#1a1a1a]">
                    <div className="text-[9px] tracking-[0.3em] text-[#666] uppercase mb-5">
                      Entrenador de acentuación · Español
                    </div>
                    <div className="display-brutal normal-case text-[52px] sm:text-[92px]">AcentOS</div>
                    <p className="text-[#999] text-[13px] max-w-[440px] mt-5 leading-[1.7]">
                      Sesiones de 2 a 10 minutos para saber, sin dudar, cuándo una palabra lleva tilde.
                    </p>
                  </div>

                  {/* Desafío diario — entrada destacada */}
                  <button
                    onClick={goTo('desafio')}
                    className="group w-full flex justify-between items-center gap-6 border-b border-[#1a1a1a] py-7 px-2 -mx-2 text-left cursor-pointer hover:bg-[#F5F5F0] hover:text-black transition-colors"
                    id="entry-daily-challenge"
                  >
                    <div>
                      <div className="text-[9px] tracking-[0.2em] text-[#666] group-hover:text-black/60 uppercase mb-2 transition-colors">
                        Hoy · 20 palabras · +100 XP
                      </div>
                      <div className="display-heavy text-[26px]">Desafío diario</div>
                    </div>
                    <span className="text-[11px] tracking-[0.15em] uppercase shrink-0">Empezar →</span>
                  </button>

                  {/* Modos */}
                  <div className="pt-9">
                    <PracticeSelector onSelectMode={handleStartPractice} />
                  </div>
                </motion.div>
              )}

              {/* DESAFÍO DIARIO — sub-vista de Entrenar */}
              {!session && activeTab === 'desafio' && (
                <motion.div
                  key="desafio-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  <span
                    onClick={goTo('entrenar')}
                    className="inline-block mb-8 text-[10px] text-[#666] cursor-pointer underline underline-offset-2 hover:text-[#F5F5F0] transition-colors"
                  >
                    ← volver a entrenar
                  </span>
                  <DailyChallenge stats={stats} onStartChallenge={handleStartDailyChallenge} />
                </motion.div>
              )}

              {/* PROGRESO — estadísticas + logros fusionados */}
              {!session && activeTab === 'progreso' && (
                <motion.div
                  key="progreso-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  <StatsDashboard
                    stats={stats}
                    achievements={achievements}
                    onResetStats={handleResetProgress}
                    onStartFocusSession={(categories) => {
                      handleStartPractice('personalizado', {
                        levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
                        categories: categories,
                        timeLimit: 120
                      });
                    }}
                  />
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
