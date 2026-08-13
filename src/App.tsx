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
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-[var(--color-fg)] text-[var(--color-canvas)] px-6 py-3.5 border border-[var(--color-fg)]"
            id="toast-level-up"
          >
            <div className="hud text-[var(--color-canvas)] opacity-60">¡Subida de nivel!</div>
            <div className="display-sm mt-1.5">Nivel <span className="num">{levelUpAlert.level}</span></div>
          </motion.div>
        )}

        {errorToast && (
          <motion.div
            key="toast-error"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.12 }}
            className="panel fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-6 py-3.5 max-w-md text-center"
            id="toast-error"
          >
            <div className="hud mb-1.5">Aviso</div>
            <p className="text-[13px] text-[var(--color-fg-soft)] leading-relaxed">{errorToast}</p>
          </motion.div>
        )}

        {achievementToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.12 }}
            className="panel fixed bottom-6 right-6 z-[60] p-5 max-w-sm"
            id="toast-achievement"
          >
            <div className="hud mb-2">Logro desbloqueado</div>
            <div className="display-sm truncate">{achievementToast.title}</div>
            <p className="text-[var(--color-fg-muted)] text-[13px] leading-relaxed mt-1.5">{achievementToast.description}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grano de película: capa decorativa fija, por encima de todo pero sin
          capturar eventos. */}
      <div className="grain" aria-hidden="true" />

      <div className="grid-bg min-h-screen" id="app-root">
        <div className="relative w-full max-w-[1440px] mx-auto min-h-screen bg-[var(--color-canvas)] text-[var(--color-fg)] border-x border-[var(--color-line-faint)]">

          {/* TOPBAR — tira HUD de instrumento: wordmark + readout de estado */}
          <header className="px-[var(--pad-x)] pt-[clamp(1.25rem,3vw,2.25rem)]">
            <div className="flex justify-between items-center gap-x-6 gap-y-3 flex-wrap pb-4 border-b border-[var(--color-line-soft)]">
              <span
                onClick={goTo('entrenar')}
                className="hud num cursor-pointer text-[var(--color-fg)] hover:opacity-70 transition-opacity tracking-[0.34em]"
                id="brand-logo"
              >
                ACENTOS
              </span>
              <div className="hud flex items-center gap-2.5 text-[var(--color-fg-soft)]" id="topbar-stats">
                <span>LVL <span className="num text-[var(--color-fg)]">{String(stats.level).padStart(2, '0')}</span></span>
                <span className="text-[var(--color-fg-faint)]" aria-hidden="true">/</span>
                <span>ACC <span className="num text-[var(--color-fg)]">{stats.accuracy}%</span></span>
                <span className="text-[var(--color-fg-faint)]" aria-hidden="true">/</span>
                <span>STK <span className="num text-[var(--color-fg)]">{stats.currentStreak}</span></span>
              </div>
            </div>

            {/* NAV — destinos como índice numerado, sin cajas */}
            <nav className="flex justify-between items-center gap-6 mt-4" id="main-navigation">
              <div className="flex items-center gap-7">
                {NAV_ITEMS.map((item, i) => {
                  const active = !session && (activeTab === item.id || (item.id === 'entrenar' && activeTab === 'desafio'));
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={goTo(item.id)}
                      className={`index-nav ${active ? 'index-nav-on' : ''}`}
                      id={`nav-tab-${item.id}`}
                    >
                      <span className="index-nav-num">{String(i).padStart(2, '0')}</span>
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={toggleSound}
                aria-label={settings.soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
                title={settings.soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
                aria-pressed={settings.soundEnabled}
                className="index-nav items-center shrink-0"
                id="nav-toggle-sound"
              >
                {settings.soundEnabled
                  ? <Volume2 size={15} strokeWidth={1.5} />
                  : <VolumeX size={15} strokeWidth={1.5} />}
              </button>
            </nav>
          </header>

          {/* CONTENT */}
          <div className="px-[var(--pad-x)] pt-8 sm:pt-11 pb-12 sm:pb-[60px]">
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
                  <div className="flex justify-between items-baseline gap-4 mb-11">
                    <span
                      onClick={exitSession}
                      className="hud cursor-pointer hover:text-[var(--color-fg)] transition-colors"
                    >
                      ← abandonar sesión
                    </span>
                    <span className="hud num">
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
                    <span className="tag">Sesión completada</span>
                    <div className="display-lg mt-5">Resumen</div>
                    <p className="text-[var(--color-fg-muted)] text-[13px] mt-2.5">Análisis de rendimiento sobre el set de acentuación</p>
                  </div>

                  <div className="max-w-xl mx-auto grid grid-cols-3 border-b border-[var(--color-line-soft)]">
                    <div className="py-[26px] text-center border-r border-[var(--color-line-soft)]">
                      <div className="hud">Aciertos</div>
                      <div className="display-lg num mt-3">{session.correctCount}/{session.words.length}</div>
                    </div>
                    <div className="py-[26px] text-center border-r border-[var(--color-line-soft)]">
                      <div className="hud">Precisión</div>
                      <div className="display-lg num mt-3">
                        {session.words.length > 0 ? Math.round((session.correctCount / session.words.length) * 100) : 0}%
                      </div>
                    </div>
                    <div className="py-[26px] text-center">
                      <div className="hud">Tiempo</div>
                      <div className="display-lg num mt-3">
                        {((Date.now() - session.startTime) / 1000).toFixed(0)}s
                      </div>
                    </div>
                  </div>

                  <div className="max-w-xl mx-auto mt-9">
                    <div className="hud mb-3">Revisión del vocabulario</div>
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
                              className="flex justify-between items-center gap-4 cursor-pointer hover:bg-[var(--color-surface)] px-2 py-2.5 transition-colors"
                            >
                              <span className="display-sm">{w.word}</span>
                              <div className="flex items-center gap-3">
                                <span className="hud">{w.classification}</span>
                                <span
                                  className="text-sm"
                                  style={{ color: isWordCorrect ? 'var(--color-accent-ok)' : 'var(--color-accent-err)' }}
                                >
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
                                <div className="flex justify-between gap-4 text-[11px] text-[var(--color-fg-muted)]">
                                  <span>Silabeo: {w.syllables.join(' • ')}</span>
                                  <span>Regla: {w.rule}</span>
                                </div>
                                <p className="text-[var(--color-fg-soft)] text-[13px] leading-relaxed">{w.explanation}</p>
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
                      className="btn-primary hud flex-1 py-3.5 text-[var(--color-canvas)] cursor-pointer"
                    >
                      Practicar de nuevo
                    </button>
                    <button
                      onClick={exitSession}
                      className="btn-ghost hud flex-1 py-3.5 hover:text-[var(--color-canvas)] cursor-pointer"
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
                  {/* Hero — wordmark descomunal */}
                  <div className="pt-[clamp(1rem,3vw,2.5rem)] pb-[clamp(2rem,5vw,3.25rem)]">
                    <div className="hud tracking-[0.3em] mb-6">
                      Entrenador de acentuación · Español
                    </div>
                    <h1 className="display-2xl">AcentOS</h1>
                    <p className="text-[var(--color-fg-soft)] text-[15px] max-w-[440px] mt-7 leading-[1.65]">
                      Sesiones de 2 a 10 minutos para saber, sin dudar, cuándo una palabra lleva tilde.
                    </p>

                    {/* Racha visible (solo si hay racha en curso; sin nags ni notificaciones) */}
                    {stats.currentStreak > 0 && (
                      <div className="hud mt-6 inline-flex items-center gap-2 text-[var(--color-fg-quiet)]" id="hero-streak">
                        <span className="w-1.5 h-1.5 bg-[var(--color-fg)]" />
                        Racha de {stats.currentStreak} {stats.currentStreak === 1 ? 'acierto' : 'aciertos'}
                      </div>
                    )}
                  </div>

                  {/* Filas destacadas full-bleed: CTA adaptativo (00) + Desafío diario (★) */}
                  <div className="-mx-[var(--pad-x)] border-t border-[var(--color-line)]">
                    {/* CTA primario: sesión adaptativa (el formato se ajusta al dominio
                        de cada palabra). Es la puerta de entrada destacada. */}
                    <button
                      type="button"
                      onClick={() => startPractice('adaptativo')}
                      className="index-row group"
                      id="cta-entrenar"
                    >
                      <span className="index-num" aria-hidden="true">00</span>
                      <span className="flex-1 min-w-0">
                        <span className="hud block">Sesión adaptativa</span>
                        <span className="display-lg block mt-1.5 leading-none">Entrenar</span>
                        <span className="index-sub block text-[13px] mt-2 leading-relaxed max-w-[52ch]">
                          El formato de cada palabra se ajusta a tu dominio. La forma recomendada de empezar.
                        </span>
                      </span>
                      <span className="index-arrow" aria-hidden="true">→</span>
                    </button>

                    <button
                      type="button"
                      onClick={goTo('desafio')}
                      className="index-row group"
                      id="entry-daily-challenge"
                    >
                      <span className="index-num" aria-hidden="true">★</span>
                      <span className="flex-1 min-w-0">
                        <span className="hud block">Hoy · 20 palabras · +100 XP</span>
                        <span className="display-md block mt-1.5 leading-none">Desafío diario</span>
                      </span>
                      <span className="index-arrow" aria-hidden="true">→</span>
                    </button>
                  </div>

                  {/* Modos */}
                  <div className="pt-[clamp(2rem,5vw,3.25rem)]">
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
                    className="hud inline-block mb-8 cursor-pointer hover:text-[var(--color-fg)] transition-colors"
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
