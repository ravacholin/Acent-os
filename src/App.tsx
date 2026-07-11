import React, { useState, useEffect, useRef } from 'react';
import { 
  GameMode, 
  AppSettings, 
  UserStats, 
  Achievement, 
  GameSessionState, 
  Word, 
  WordCategory, 
  LevelMCER 
} from './types';
import { WORDS_DATABASE, isAmbiguousWord } from './data/words';
import { calculateErrorProfiles, getWeakCategories } from './utils/errorAnalysis';
import PracticeSelector from './components/PracticeSelector';
import StatsDashboard from './components/StatsDashboard';
import AchievementsPanel, { INITIAL_ACHIEVEMENTS } from './components/AchievementsPanel';
import DailyChallenge from './components/DailyChallenge';
import SettingsPanel, { DEFAULT_SETTINGS } from './components/SettingsPanel';
import ExerciseCard from './components/ExerciseCard';
import { playClickSound, playCorrectSound, speakWord } from './utils/audio';
import { 
  Home, 
  BookOpen, 
  Calendar, 
  BarChart3, 
  Award, 
  Settings as SettingsIcon, 
  Flame, 
  Zap, 
  Play, 
  Trophy, 
  Sparkles,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  Volume2,
  Check,
  X,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  categoryStats: {} as any,
  levelStats: {} as any,
  frequentMistakes: {},
  masteredWords: [],
  dailyHistory: {},
  spacedRepetition: {}
};

// Seed initial category stats
const CATEGORIES_LIST: WordCategory[] = [
  'aguda', 'grave', 'esdrújula', 'sobreesdrújula', 'hiato', 'diptongo', 'triptongo', 'monosílabo', 'diacrítica', 'interrogativo'
];
CATEGORIES_LIST.forEach(cat => {
  DEFAULT_STATS.categoryStats[cat] = { correct: 0, total: 0 };
});

const LEVELS_LIST: LevelMCER[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
LEVELS_LIST.forEach(lvl => {
  DEFAULT_STATS.levelStats[lvl] = { correct: 0, total: 0 };
});

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

export default function App() {
  const [activeTab, setActiveTab] = useState<'inicio' | 'practicar' | 'desafio' | 'estadisticas' | 'logros' | 'configuracion'>('inicio');
  
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
    setActiveTab('inicio');
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

  return (
    <div className="min-h-screen bg-black text-[#EDEDED] flex flex-col font-sans relative overflow-x-hidden select-none" id="app-root">
      
      {/* 1. Global Alert/Toast Notifications */}
      <AnimatePresence>
        {levelUpAlert.show && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white text-black px-6 py-3.5 border border-black flex items-center gap-3"
            id="toast-level-up"
          >
            <div className="p-1.5 bg-black text-white animate-bounce">
              <Sparkles className="w-5 h-5 fill-current text-white" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold tracking-widest uppercase opacity-60">¡SUBIDA DE NIVEL!</div>
              <div className="font-display font-bold text-sm">Has alcanzado el Nivel {levelUpAlert.level}</div>
            </div>
          </motion.div>
        )}

        {unlockedAchievementToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-[#0d0d0d] text-white p-5 border border-[#262626] flex gap-3 max-w-sm"
            id="toast-achievement"
          >
            <div className="p-2.5 bg-[#161616] border border-[#262626] text-white shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="text-[10px] font-mono font-bold tracking-widest uppercase text-[#8a8a8a]">Logro Desbloqueado</div>
              <div className="font-semibold text-sm truncate">{unlockedAchievementToast.title}</div>
              <p className="text-neutral-500 text-xs leading-relaxed">{unlockedAchievementToast.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Top Navigation / Status Bar matching the Clean Minimalism theme */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-[#1F1F1F] bg-[#0A0A0A]" id="main-nav-header">
        <div 
          onClick={() => { if (!session) setActiveTab('inicio'); }}
          className="flex items-center gap-3 cursor-pointer group select-none"
          id="brand-logo"
        >
          <div className="w-8 h-8 bg-white flex items-center justify-center transition-all group-hover:scale-105 duration-200">
            <span className="text-black font-black text-xl leading-none">A</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight leading-none text-[#EDEDED] font-display">AcentOS</h1>
            <p className="text-[10px] text-[#A1A1A1] uppercase tracking-[0.2em] mt-1 font-mono">Spanish Accent Trainer</p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-[#A1A1A1] uppercase tracking-wider font-mono">Racha</span>
            <span className="text-sm font-mono text-[#EDEDED]">{stats.currentStreak}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-[#A1A1A1] uppercase tracking-wider font-mono">Precisión</span>
            <span className="text-sm font-mono text-[#EDEDED]">{stats.accuracy}%</span>
          </div>
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-[10px] text-[#A1A1A1] uppercase tracking-wider font-mono">Nivel {stats.level}</span>
            <span className="text-sm font-mono text-[#A1A1A1]">{stats.xp} XP</span>
          </div>
          <div 
            onClick={() => {
              playClickSound(settings.soundEnabled);
              if (session) handleExitSession();
              setActiveTab('configuracion');
            }}
            className="w-10 h-10 border border-[#262626] flex items-center justify-center cursor-pointer hover:bg-[#161616] transition-colors"
          >
            <div className="w-4 h-4 border-2 border-white"></div>
          </div>
        </div>
      </nav>

      {/* 3. Main Split Screen Shell */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto px-4 md:px-6 py-6 gap-6">
        
        {/* SIDE NAV - Hidden when in active practice session */}
        {!session && (
          <nav className="w-full md:w-56 shrink-0 flex flex-row md:flex-col gap-2 border-b md:border-b-0 md:border-r border-[#1F1F1F] pb-4 md:pb-0 md:pr-4 overflow-x-auto scrollbar-none" id="main-navigation">
            {[
              { id: 'inicio', label: 'Inicio', icon: Home },
              { id: 'practicar', label: 'Entrenar', icon: Play },
              { id: 'desafio', label: 'Desafío Diario', icon: Calendar },
              { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
              { id: 'logros', label: 'Logros', icon: Award },
              { id: 'configuracion', label: 'Configuración', icon: SettingsIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    playClickSound(settings.soundEnabled);
                    setActiveTab(tab.id as any);
                  }}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-mono font-medium transition-all cursor-pointer border shrink-0 ${
                    active
                      ? 'bg-white text-black border-white'
                      : 'bg-[#161616] border border-[#262626] text-[#A1A1A1] hover:bg-white hover:text-black hover:border-white'
                  }`}
                  id={`nav-tab-${tab.id}`}
                >
                  <Icon className="w-4 h-4 shrink-0 stroke-[2]" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* MAIN VIEWER */}
        <main className="flex-1 min-w-0" id="main-viewer">
          <AnimatePresence mode="wait">
            
            {/* ACTIVE TRAINING VIEW */}
            {session && !sessionCompleted && (
              <motion.div
                key="active-session-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
                id="active-session-container"
              >
                {/* Back out button */}
                <div className="flex justify-between items-center">
                  <button
                    onClick={handleExitSession}
                    className="flex items-center gap-1.5 text-xs font-mono text-neutral-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Abandonar sesión</span>
                  </button>
                  <span className="text-xs font-mono text-neutral-500">
                    Palabra {session.currentIndex + 1} de {session.mode === 'infinito' || session.mode === 'supervivencia' ? '∞' : session.words.length}
                  </span>
                </div>

                {session.words[session.currentIndex] && (
                  // Keyed wrapper: changing the key on each word remounts ExerciseCard
                  // with fresh state, so the previous word's answer/feedback never
                  // flashes for a frame before the new exercise renders.
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
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6 max-w-xl mx-auto"
                id="session-completed-panel"
              >
                <div className="text-center space-y-2">
                  <span className="text-[10px] font-mono tracking-widest text-white uppercase border border-[#262626] bg-[#161616] px-3 py-1">
                    Sesión Completada
                  </span>
                  <h2 className="text-3xl font-bold tracking-tight text-white font-display pt-2">Resumen de Práctica</h2>
                  <p className="text-neutral-500 text-sm">Análisis de rendimiento inmediato sobre el set de acentuación</p>
                </div>

                {/* Score stats grid */}
                <div className="grid grid-cols-3 gap-4 border border-[#262626] p-6 bg-[#0d0d0d] text-center">
                  <div>
                    <span className="text-[#8a8a8a] text-[10px] uppercase font-mono tracking-widest block">Aciertos</span>
                    <span className="text-2xl font-bold text-white block mt-1">{session.correctCount} / {session.words.length}</span>
                    <span className="text-[10px] text-[#8a8a8a] font-mono">palabras</span>
                  </div>
                  <div>
                    <span className="text-[#8a8a8a] text-[10px] uppercase font-mono tracking-widest block">Precisión</span>
                    <span className="text-2xl font-bold text-white block mt-1">
                      {session.words.length > 0 ? Math.round((session.correctCount / session.words.length) * 100) : 0}%
                    </span>
                    <span className="text-[10px] text-[#8a8a8a] font-mono">porcentaje</span>
                  </div>
                  <div>
                    <span className="text-[#8a8a8a] text-[10px] uppercase font-mono tracking-widest block">Tiempo</span>
                    <span className="text-2xl font-bold text-white block mt-1">
                      {((Date.now() - session.startTime) / 1000).toFixed(0)}s
                    </span>
                    <span className="text-[10px] text-[#8a8a8a] font-mono">duración total</span>
                  </div>
                </div>

                {/* Word review list */}
                <div className="bg-[#0d0d0d] border border-[#262626] p-5 space-y-4">
                  <h3 className="text-xs font-semibold tracking-widest text-[#A1A1A1] uppercase font-mono">
                    Revisión del Vocabulario
                  </h3>
                  <div className="divide-y divide-[#1a1a1a] max-h-56 overflow-y-auto pr-1">
                    {session.words.map((w, wIdx) => {
                      const histItem = session.history.find(h => h.wordId === w.id);
                      const isWordCorrect = histItem ? histItem.isCorrect : false;
                      const isSelected = selectedResultWord?.id === w.id;

                      return (
                        <div key={wIdx} className="py-2.5">
                          <div 
                            onClick={() => {
                              playClickSound(settings.soundEnabled);
                              setSelectedResultWord(isSelected ? null : w);
                            }}
                            className="flex justify-between items-center cursor-pointer hover:bg-[#161616] px-2 py-1 transition-colors"
                          >
                            <span className="font-display text-sm font-semibold text-white">{w.word}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-[#8a8a8a] uppercase">{w.classification}</span>
                              {isWordCorrect ? (
                                <span className="w-5 h-5 flex items-center justify-center bg-white text-black">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </span>
                              ) : (
                                <span className="w-5 h-5 flex items-center justify-center border border-white text-white">
                                  <X className="w-3.5 h-3.5 stroke-[3]" />
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Extra info collapsible details */}
                          {isSelected && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-2 p-3 bg-[#161616] border border-[#262626] text-xs space-y-2"
                            >
                              <div className="flex justify-between text-[11px] font-mono text-[#A1A1A1]">
                                <span>Silabeo: {w.syllables.join(' • ')}</span>
                                <span>Regla: {w.rule}</span>
                              </div>
                              <p className="text-[#EDEDED] italic">"{w.explanation}"</p>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Return controls */}
                <div className="flex flex-col sm:flex-row gap-3 pt-3">
                  <button
                    onClick={() => handleStartPractice(session.mode)}
                    className="flex-1 py-3 bg-white text-black font-semibold hover:bg-neutral-200 transition-all flex justify-center items-center gap-2 text-sm cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-black" />
                    Practicar de Nuevo
                  </button>
                  <button
                    onClick={handleExitSession}
                    className="flex-1 py-3 bg-[#0d0d0d] hover:bg-[#161616] border border-[#262626] text-white font-semibold transition-all text-sm cursor-pointer"
                  >
                    Volver a Modos
                  </button>
                </div>
              </motion.div>
            )}

            {/* LANDING TAB: INICIO */}
            {!session && activeTab === 'inicio' && (
              <motion.div
                key="inicio-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
                id="inicio-view"
              >
                {/* Hero Card layout */}
                <div className="bg-[#161616] border border-[#262626] p-8 md:p-12 space-y-6 text-center max-w-2xl mx-auto relative overflow-hidden">
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono tracking-widest text-[#A1A1A1] uppercase">
                      SPANISH ACCENT TRAINER
                    </span>
                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#EDEDED] font-display">AcentOS</h2>
                    <p className="text-[#A1A1A1] text-sm max-w-md mx-auto leading-relaxed pt-2">
                      Desarrollá intuición ortográfica instantánea sobre cuándo una palabra lleva tilde y cuándo no. Práctica rápida, inteligente y adictiva diseñada para sesiones de 2 a 10 minutos.
                    </p>
                  </div>

                  <div className="flex justify-center pt-3">
                    <button
                      onClick={() => setActiveTab('practicar')}
                      className="px-8 py-3.5 bg-white text-black font-bold hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center gap-2 text-sm cursor-pointer"
                    >
                      Comenzar Entrenamiento
                      <ChevronRight className="w-4 h-4 text-black stroke-[3]" />
                    </button>
                  </div>
                </div>

                {/* Secondary Quick Access grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <div
                    onClick={() => setActiveTab('desafio')}
                    className="bg-[#161616] border border-[#262626] p-5 cursor-pointer hover:bg-white hover:text-black group transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <Calendar className="w-5 h-5 text-[#EDEDED] group-hover:text-black transition-colors" />
                      <h4 className="text-sm font-semibold text-[#EDEDED] group-hover:text-black transition-colors mt-3 font-display">Desafío Diario</h4>
                      <p className="text-[#A1A1A1] group-hover:text-black/80 transition-colors text-xs mt-1">Prueba fija de 20 palabras.</p>
                    </div>
                    <span className="text-[10px] font-mono text-[#A1A1A1] group-hover:text-black transition-colors mt-4 flex items-center gap-1">Entrar <ChevronRight className="w-3 h-3" /></span>
                  </div>

                  <div
                    onClick={() => setActiveTab('estadisticas')}
                    className="bg-[#161616] border border-[#262626] p-5 cursor-pointer hover:bg-white hover:text-black group transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <BarChart3 className="w-5 h-5 text-[#EDEDED] group-hover:text-black transition-colors" />
                      <h4 className="text-sm font-semibold text-[#EDEDED] group-hover:text-black transition-colors mt-3 font-display">Estadísticas</h4>
                      <p className="text-[#A1A1A1] group-hover:text-black/80 transition-colors text-xs mt-1">Analizá tus perfiles de error.</p>
                    </div>
                    <span className="text-[10px] font-mono text-[#A1A1A1] group-hover:text-black transition-colors mt-4 flex items-center gap-1">Ver <ChevronRight className="w-3 h-3" /></span>
                  </div>

                  <div
                    onClick={() => setActiveTab('configuracion')}
                    className="bg-[#161616] border border-[#262626] p-5 cursor-pointer hover:bg-white hover:text-black group transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <SettingsIcon className="w-5 h-5 text-[#EDEDED] group-hover:text-black transition-colors" />
                      <h4 className="text-sm font-semibold text-[#EDEDED] group-hover:text-black transition-colors mt-3 font-display">Configuración</h4>
                      <p className="text-[#A1A1A1] group-hover:text-black/80 transition-colors text-xs mt-1">Audio, sílabas y explicaciones.</p>
                    </div>
                    <span className="text-[10px] font-mono text-[#A1A1A1] group-hover:text-black transition-colors mt-4 flex items-center gap-1">Ajustar <ChevronRight className="w-3 h-3" /></span>
                  </div>
                </div>

                {/* Elegant credits disclaimer */}
                <div className="text-center text-[11px] font-mono text-neutral-600 max-w-sm mx-auto pt-6">
                  AcentOS — Spanish Accent Trainer. Diseñado para estudiantes de ELE, docentes y autodidactas. Todo el progreso se almacena localmente.
                </div>
              </motion.div>
            )}

            {/* PRACTICE SELECTOR TAB */}
            {!session && activeTab === 'practicar' && (
              <motion.div
                key="practicar-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <PracticeSelector onSelectMode={handleStartPractice} />
              </motion.div>
            )}

            {/* DAILY CHALLENGE TAB */}
            {!session && activeTab === 'desafio' && (
              <motion.div
                key="desafio-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <DailyChallenge stats={stats} onStartChallenge={handleStartDailyChallenge} />
              </motion.div>
            )}

            {/* STATS TAB */}
            {!session && activeTab === 'estadisticas' && (
              <motion.div
                key="estadisticas-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <StatsDashboard 
                  stats={stats} 
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

            {/* ACHIEVEMENTS TAB */}
            {!session && activeTab === 'logros' && (
              <motion.div
                key="logros-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AchievementsPanel stats={stats} achievements={achievements} />
              </motion.div>
            )}

            {/* CONFIGURATION TAB */}
            {!session && activeTab === 'configuracion' && (
              <motion.div
                key="configuracion-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <SettingsPanel 
                  settings={settings} 
                  onChangeSettings={saveSettingsToStorage}
                  onResetStats={handleResetProgress}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* 4. Bottom Command Bar in Clean Minimalism Style */}
      <footer className="px-8 py-6 border-t border-[#1F1F1F] bg-[#0A0A0A] flex flex-col sm:flex-row items-center justify-between gap-4 text-[#555] mt-auto select-none" id="app-footer">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6 text-[11px] uppercase tracking-wider font-medium">
          <div 
            onClick={() => {
              playClickSound(settings.soundEnabled);
              if (session) handleExitSession();
              setActiveTab('inicio');
            }}
            className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
          >
            <span className="px-1.5 py-0.5 bg-[#161616] border border-[#262626] text-[#888] text-[9px] font-mono">ESC</span>
            Menú
          </div>
          <div 
            onClick={() => {
              playClickSound(settings.soundEnabled);
              if (session) handleExitSession();
              setActiveTab('estadisticas');
            }}
            className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
          >
            <span className="px-1.5 py-0.5 bg-[#161616] border border-[#262626] text-[#888] text-[9px] font-mono">H</span>
            Historial
          </div>
          <div 
            onClick={() => {
              playClickSound(settings.soundEnabled);
              if (session) handleExitSession();
              setActiveTab('configuracion');
            }}
            className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
          >
            <span className="px-1.5 py-0.5 bg-[#161616] border border-[#262626] text-[#888] text-[9px] font-mono">T</span>
            Ajustes
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-32 h-1.5 bg-[#161616] overflow-hidden border border-[#262626]">
              <div
                className="h-full bg-[#EDEDED] transition-all duration-300"
                style={{ width: `${Math.min(100, ((stats.xp % 150) / 150) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] uppercase tracking-widest text-[#A1A1A1] font-mono">Nivel {stats.level}</span>
          </div>
          <div className="w-[1px] h-4 bg-[#262626] hidden sm:block"></div>
          <div className="text-[11px] flex items-center gap-2 text-[#A1A1A1] font-mono">
            <span className="w-2 h-2 bg-[#A1A1A1] animate-pulse"></span>
            Autoguardado
          </div>
        </div>
      </footer>
    </div>
  );
}
