import React, { useRef, useState } from 'react';
import { GameMode, GameSessionState, Word } from './types';
import PracticeSelector from './components/PracticeSelector';
import StatsDashboard from './components/StatsDashboard';
import DailyChallenge from './components/DailyChallenge';
import ExerciseCard from './components/ExerciseCard';
import { useGameSession } from './hooks/useGameSession';
import { pickFormat, seededRng } from './engine/formats';
import { playClickSound } from './utils/audio';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';

// Modos "adaptativos": no son un formato en sí; el formato de cada palabra lo
// decide la escalera (pickFormat) según su caja Leitner. El resto de los modos
// (los de la grilla "Práctica dirigida") SON un formato concreto y se renderizan
// tal cual.
const ADAPTIVE_MODES = new Set<GameMode>(['adaptativo', 'supervivencia', 'infinito', 'personalizado']);

// Tres destinos de nivel superior. "desafio" es una sub-vista de Entrenar.
type Tab = 'entrenar' | 'progreso' | 'desafio';

const NAV_ITEMS: { id: Tab; label: string }[] = [
  { id: 'entrenar', label: 'Entrenar' },
  { id: 'progreso', label: 'Progreso' }
];

export default function App() {
  const {
    stats,
    settings,
    achievements,
    session,
    sessionCompleted,
    levelUpAlert,
    achievementToast,
    errorToast,
    startPractice,
    startDailyChallenge,
    answer,
    nextWord,
    exitSession,
    restartSameMode,
    toggleSound,
    resetProgress,
    startFocusSession,
    dailyChallenges,
    exportProgress,
    importProgress
  } = useGameSession();

  const [activeTab, setActiveTab] = useState<Tab>('entrenar');
  const [selectedResultWord, setSelectedResultWord] = useState<Word | null>(null);

  // Descarga el progreso versionado como acentos-progreso.json.
  const handleExportProgress = () => {
    const data = exportProgress();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'acentos-progreso.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportProgress = (file: File) => {
    file.text().then(text => {
      if (importProgress(text)) setActiveTab('progreso');
    });
  };

  // Cache de formato por índice de palabra dentro de la sesión activa. El
  // formato se decide UNA vez (estable entre renders para no cambiar a mitad de
  // pregunta) y de forma determinista (sembrada por id+índice), lo que hace que
  // el Desafío Diario sea reproducible.
  const formatCacheRef = useRef<{ startTime: number; formats: Record<number, GameMode> }>({
    startTime: -1,
    formats: {}
  });

  const resolveRenderMode = (s: GameSessionState, index: number): GameMode => {
    if (!ADAPTIVE_MODES.has(s.mode)) return s.mode;

    // Reinicia el cache cuando cambia la sesión.
    if (formatCacheRef.current.startTime !== s.startTime) {
      formatCacheRef.current = { startTime: s.startTime, formats: {} };
    }
    const cache = formatCacheRef.current.formats;
    if (cache[index]) return cache[index];

    const word = s.words[index];
    const srs = stats.spacedRepetition?.[word.id];
    const fmt = pickFormat(word, srs, {
      lastFormat: cache[index - 1],
      rng: seededRng(`${word.id}-${index}`)
    });
    cache[index] = fmt;
    return fmt;
  };

  // Navigating away from an in-progress session exits it first.
  const goTo = (tab: Tab) => () => {
    playClickSound(settings.soundEnabled);
    if (session) exitSession();
    setActiveTab(tab);
  };

  const totalAnswered = session ? session.words.length : 0;
  const sessionIsEndless = session
    ? session.mode === 'infinito' || session.mode === 'supervivencia'
    : false;

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
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-fg)] text-black px-6 py-3.5 border border-black font-mono"
            id="toast-level-up"
          >
            <div className="text-[9px] tracking-[0.2em] uppercase opacity-60">¡Subida de nivel!</div>
            <div className="display-heavy text-lg mt-1">Nivel {levelUpAlert.level}</div>
          </motion.div>
        )}

        {errorToast && (
          <motion.div
            key="toast-error"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.12 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-black text-[var(--color-fg)] px-6 py-3.5 border border-[var(--color-line)] font-mono max-w-md text-center"
            id="toast-error"
          >
            <div className="text-[9px] tracking-[0.2em] uppercase text-[var(--color-fg-dim)] mb-1.5">Aviso</div>
            <p className="text-xs text-[var(--color-fg-soft)] leading-relaxed">{errorToast}</p>
          </motion.div>
        )}

        {achievementToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.12 }}
            className="fixed bottom-6 right-6 z-50 bg-black text-[var(--color-fg)] p-5 border border-[var(--color-line)] max-w-sm font-mono"
            id="toast-achievement"
          >
            <div className="text-[9px] tracking-[0.2em] uppercase text-[var(--color-fg-dim)] mb-1.5">Logro desbloqueado</div>
            <div className="display-heavy text-lg truncate">{achievementToast.title}</div>
            <p className="text-[var(--color-fg-muted)] text-xs leading-relaxed mt-1">{achievementToast.description}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-black flex justify-center px-4 sm:px-6 py-8 sm:py-12 font-mono box-border" id="app-root">
        <div className="relative w-[1040px] max-w-full border border-[var(--color-line)] bg-black text-[var(--color-fg)]">

          {/* Corner registration marks */}
          <div className="absolute -top-px -left-px w-3.5 h-3.5 border-t border-l border-[var(--color-fg-faint)]" />
          <div className="absolute -top-px -right-px w-3.5 h-3.5 border-t border-r border-[var(--color-fg-faint)]" />
          <div className="absolute -bottom-px -left-px w-3.5 h-3.5 border-b border-l border-[var(--color-fg-faint)]" />
          <div className="absolute -bottom-px -right-px w-3.5 h-3.5 border-b border-r border-[var(--color-fg-faint)]" />

          {/* TOPBAR */}
          <div className="px-6 sm:px-[52px] pt-6 sm:pt-[34px]">
            <div className="flex justify-between items-center gap-3 text-[9px] tracking-[0.22em] text-[var(--color-fg-dim)] uppercase flex-wrap">
              <span onClick={goTo('entrenar')} className="cursor-pointer text-[var(--color-fg-soft)] hover:text-[var(--color-fg)] transition-colors" id="brand-logo">
                AcentOS — ES
              </span>
              <span>Nivel {stats.level} · {stats.accuracy}% · racha {stats.currentStreak}</span>
            </div>

            {/* NAV — dos destinos de texto + icono de sonido */}
            <div className="flex justify-between items-center gap-6 mt-5 pt-5 border-t border-[var(--color-line-faint)]" id="main-navigation">
              <div className="flex gap-6 sm:gap-[30px] text-[10px] tracking-[0.18em] uppercase">
                {NAV_ITEMS.map(item => {
                  const active = !session && (activeTab === item.id || (item.id === 'entrenar' && activeTab === 'desafio'));
                  return (
                    <span
                      key={item.id}
                      onClick={goTo(item.id)}
                      className={`cursor-pointer pb-1.5 border-b transition-colors ${
                        active ? 'border-[var(--color-fg)] text-[var(--color-fg)]' : 'border-transparent text-[var(--color-fg-quiet)] hover:text-[var(--color-fg)]'
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
                className="shrink-0 pb-1.5 text-[var(--color-fg-quiet)] hover:text-[var(--color-fg)] transition-colors"
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
                      onClick={exitSession}
                      className="text-[10px] text-[var(--color-fg-dim)] cursor-pointer underline underline-offset-2 hover:text-[var(--color-fg)] transition-colors"
                    >
                      ← abandonar sesión
                    </span>
                    <span className="text-[10px] text-[var(--color-fg-dim)] uppercase tracking-[0.12em]">
                      Palabra {session.currentIndex + 1} de {sessionIsEndless ? '∞' : totalAnswered}
                    </span>
                  </div>

                  {session.words[session.currentIndex] && (
                    <div key={`${session.mode}-${session.currentIndex}`}>
                      <ExerciseCard
                        word={session.words[session.currentIndex]}
                        mode={resolveRenderMode(session, session.currentIndex)}
                        settings={settings}
                        comboStreak={session.streak}
                        timeLeft={session.mode === 'supervivencia' ? session.timeLeft : undefined}
                        onAnswer={answer}
                        onNext={nextWord}
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
                  <div className="max-w-xl mx-auto text-center pb-9 border-b border-[var(--color-line-soft)]">
                    <span className="text-[9px] tracking-[0.2em] text-[var(--color-fg-dim)] uppercase border border-[var(--color-line)] px-3 py-1 inline-block">
                      Sesión completada
                    </span>
                    <div className="display-brutal text-[34px] sm:text-[44px] mt-5">Resumen</div>
                    <p className="text-[var(--color-fg-muted)] text-xs mt-2">Análisis de rendimiento sobre el set de acentuación</p>
                  </div>

                  <div className="max-w-xl mx-auto grid grid-cols-3 border-b border-[var(--color-line-soft)]">
                    <div className="py-[26px] text-center border-r border-[var(--color-line-soft)]">
                      <div className="text-[9px] tracking-[0.2em] text-[var(--color-fg-dim)] uppercase">Aciertos</div>
                      <div className="display-heavy text-[34px] sm:text-[42px] mt-2.5">{session.correctCount} / {session.words.length}</div>
                    </div>
                    <div className="py-[26px] text-center border-r border-[var(--color-line-soft)]">
                      <div className="text-[9px] tracking-[0.2em] text-[var(--color-fg-dim)] uppercase">Precisión</div>
                      <div className="display-heavy text-[34px] sm:text-[42px] mt-2.5">
                        {session.words.length > 0 ? Math.round((session.correctCount / session.words.length) * 100) : 0}%
                      </div>
                    </div>
                    <div className="py-[26px] text-center">
                      <div className="text-[9px] tracking-[0.2em] text-[var(--color-fg-dim)] uppercase">Tiempo</div>
                      <div className="display-heavy text-[34px] sm:text-[42px] mt-2.5">
                        {((Date.now() - session.startTime) / 1000).toFixed(0)}s
                      </div>
                    </div>
                  </div>

                  <div className="max-w-xl mx-auto mt-9">
                    <div className="text-[9px] tracking-[0.2em] text-[var(--color-fg-dim)] uppercase mb-3">Revisión del vocabulario</div>
                    <div className="divide-y divide-[var(--color-line-soft)] border-t border-[var(--color-line-soft)] max-h-56 overflow-y-auto pr-1">
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
                              className="flex justify-between items-center cursor-pointer hover:bg-[var(--color-surface)] px-2 py-2.5 transition-colors"
                            >
                              <span className="display-heavy text-lg">{w.word}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono text-[var(--color-fg-dim)] uppercase">{w.classification}</span>
                                <span className={`text-sm ${isWordCorrect ? 'text-[var(--color-fg)]' : 'text-[var(--color-fg-quiet)]'}`}>
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
                                <div className="flex justify-between text-[11px] font-mono text-[var(--color-fg-muted)]">
                                  <span>Silabeo: {w.syllables.join(' • ')}</span>
                                  <span>Regla: {w.rule}</span>
                                </div>
                                <p className="text-[var(--color-fg-soft)] text-xs italic">"{w.explanation}"</p>
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="max-w-xl mx-auto flex flex-col sm:flex-row gap-3 pt-9">
                    <button
                      onClick={restartSameMode}
                      className="flex-1 py-3 bg-[var(--color-fg)] text-black text-xs tracking-[0.1em] cursor-pointer hover:bg-[var(--color-paper-dim)] transition-colors"
                    >
                      Practicar de nuevo
                    </button>
                    <button
                      onClick={exitSession}
                      className="flex-1 py-3 border border-[var(--color-line)] text-[var(--color-fg-soft)] text-xs tracking-[0.1em] cursor-pointer hover:border-[var(--color-fg)] hover:text-[var(--color-fg)] transition-colors"
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
                  <div className="pt-4 pb-9 border-b border-[var(--color-line-soft)]">
                    <div className="text-[9px] tracking-[0.3em] text-[var(--color-fg-dim)] uppercase mb-5">
                      Entrenador de acentuación · Español
                    </div>
                    <div className="display-brutal normal-case text-[52px] sm:text-[92px]">AcentOS</div>
                    <p className="text-[var(--color-fg-soft)] text-[13px] max-w-[440px] mt-5 leading-[1.7]">
                      Sesiones de 2 a 10 minutos para saber, sin dudar, cuándo una palabra lleva tilde.
                    </p>

                    {/* Racha visible (solo si hay racha en curso; sin nags ni notificaciones) */}
                    {stats.currentStreak > 0 && (
                      <div className="mt-6 inline-flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase text-[var(--color-fg-quiet)]" id="hero-streak">
                        <span className="w-1.5 h-1.5 bg-[var(--color-fg)] rounded-full" />
                        Racha de {stats.currentStreak} {stats.currentStreak === 1 ? 'acierto' : 'aciertos'}
                      </div>
                    )}

                    {/* CTA primario: sesión adaptativa (el formato se ajusta al dominio
                        de cada palabra). Es la única puerta de entrada destacada. */}
                    <button
                      onClick={() => startPractice('adaptativo')}
                      className="group mt-8 w-full sm:w-auto inline-flex items-center justify-between gap-10 bg-[var(--color-fg)] text-black px-8 py-4 cursor-pointer hover:bg-[var(--color-paper-dim)] transition-colors"
                      id="cta-entrenar"
                    >
                      <span className="display-heavy text-lg tracking-[0.05em]">ENTRENAR</span>
                      <span className="text-[10px] tracking-[0.15em] uppercase opacity-70">Sesión adaptativa →</span>
                    </button>
                  </div>

                  {/* Desafío diario — entrada destacada */}
                  <button
                    onClick={goTo('desafio')}
                    className="group w-full flex justify-between items-center gap-6 border-b border-[var(--color-line-soft)] py-7 px-2 -mx-2 text-left cursor-pointer hover:bg-[var(--color-fg)] hover:text-black transition-colors"
                    id="entry-daily-challenge"
                  >
                    <div>
                      <div className="text-[9px] tracking-[0.2em] text-[var(--color-fg-dim)] group-hover:text-black/60 uppercase mb-2 transition-colors">
                        Hoy · 20 palabras · +100 XP
                      </div>
                      <div className="display-heavy text-[26px]">Desafío diario</div>
                    </div>
                    <span className="text-[11px] tracking-[0.15em] uppercase shrink-0">Empezar →</span>
                  </button>

                  {/* Modos */}
                  <div className="pt-9">
                    <PracticeSelector onSelectMode={startPractice} />
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
                    className="inline-block mb-8 text-[10px] text-[var(--color-fg-dim)] cursor-pointer underline underline-offset-2 hover:text-[var(--color-fg)] transition-colors"
                  >
                    ← volver a entrenar
                  </span>
                  <DailyChallenge stats={stats} dailyChallenges={dailyChallenges} onStartChallenge={startDailyChallenge} />
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
                    onResetStats={resetProgress}
                    onStartFocusSession={startFocusSession}
                    onExportProgress={handleExportProgress}
                    onImportProgress={handleImportProgress}
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
