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

      <div className="grid-bg min-h-screen flex justify-center px-4 sm:px-6 py-8 sm:py-12 box-border" id="app-root">
        <div className="relative w-[1040px] max-w-full border border-[var(--color-line-strong)] bg-[var(--color-canvas)] text-[var(--color-fg)]">

          {/* Corner registration marks */}
          <div className="absolute -top-px -left-px w-3.5 h-3.5 border-t border-l border-[var(--color-fg-faint)]" />
          <div className="absolute -top-px -right-px w-3.5 h-3.5 border-t border-r border-[var(--color-fg-faint)]" />
          <div className="absolute -bottom-px -left-px w-3.5 h-3.5 border-b border-l border-[var(--color-fg-faint)]" />
          <div className="absolute -bottom-px -right-px w-3.5 h-3.5 border-b border-r border-[var(--color-fg-faint)]" />

          {/* TOPBAR */}
          <div className="px-6 sm:px-[52px] pt-6 sm:pt-[34px]">
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <span onClick={goTo('entrenar')} className="hud cursor-pointer text-[var(--color-fg-soft)] hover:text-[var(--color-fg)] transition-colors" id="brand-logo">
                AcentOS — ES
              </span>
              {/* HUD de estado repartido en módulos con divisor de hairline. */}
              <div className="flex items-stretch" id="topbar-stats">
                {[
                  { label: 'Nivel', value: stats.level },
                  { label: 'Precisión', value: `${stats.accuracy}%` },
                  { label: 'Racha', value: stats.currentStreak }
                ].map((m, i) => (
                  <div
                    key={m.label}
                    className={`flex flex-col items-end gap-1.5 px-3.5 first:pl-0 last:pr-0 ${i > 0 ? 'border-l border-[var(--color-line)]' : ''}`}
                  >
                    <span className="hud leading-none">{m.label}</span>
                    <span className="num text-[13px] leading-none text-[var(--color-fg)]">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* NAV — dos destinos como cajas numeradas + toggle de sonido */}
            <div className="flex justify-between items-center gap-6 mt-5 pt-5 border-t border-[var(--color-line-soft)]" id="main-navigation">
              <div className="flex gap-2.5">
                {NAV_ITEMS.map((item, i) => {
                  const active = !session && (activeTab === item.id || (item.id === 'entrenar' && activeTab === 'desafio'));
                  return (
                    <span
                      key={item.id}
                      onClick={goTo(item.id)}
                      className={`nav-tab hud px-3.5 py-2 ${active ? 'nav-tab-on' : ''}`}
                      id={`nav-tab-${item.id}`}
                    >
                      <span className="nav-tab-num num">{String(i + 1).padStart(2, '0')}</span>
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
                className="nav-tab shrink-0 px-3 py-2"
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
                  {/* Hero */}
                  <div className="pt-4 pb-9 border-b border-[var(--color-line-soft)]">
                    <div className="hud tracking-[0.3em] mb-6">
                      Entrenador de acentuación · Español
                    </div>
                    <h1 className="display-xl">AcentOS</h1>
                    <p className="text-[var(--color-fg-soft)] text-[15px] max-w-[440px] mt-6 leading-[1.65]">
                      Sesiones de 2 a 10 minutos para saber, sin dudar, cuándo una palabra lleva tilde.
                    </p>

                    {/* Racha visible (solo si hay racha en curso; sin nags ni notificaciones) */}
                    {stats.currentStreak > 0 && (
                      <div className="hud mt-6 inline-flex items-center gap-2 text-[var(--color-fg-quiet)]" id="hero-streak">
                        <span className="w-1.5 h-1.5 bg-[var(--color-fg)]" />
                        Racha de {stats.currentStreak} {stats.currentStreak === 1 ? 'acierto' : 'aciertos'}
                      </div>
                    )}

                    {/* CTA primario: sesión adaptativa (el formato se ajusta al dominio
                        de cada palabra). Es la única puerta de entrada destacada. */}
                    <button
                      onClick={() => startPractice('adaptativo')}
                      className="btn-primary group mt-9 w-full sm:w-auto inline-flex items-center justify-between gap-5 sm:gap-10 px-6 sm:px-8 py-4 cursor-pointer"
                      id="cta-entrenar"
                    >
                      <span className="display-sm whitespace-nowrap">ENTRENAR</span>
                      <span className="hud text-[var(--color-canvas)] opacity-60 text-right">Sesión adaptativa →</span>
                    </button>
                  </div>

                  {/* Desafío diario — entrada destacada */}
                  <button
                    onClick={goTo('desafio')}
                    className="group w-full flex justify-between items-center gap-6 border-b border-[var(--color-line-soft)] py-7 px-4 -mx-4 text-left cursor-pointer hover:bg-[var(--color-surface)] transition-colors"
                    id="entry-daily-challenge"
                  >
                    <div>
                      <div className="hud mb-2.5">
                        Hoy · 20 palabras · +100 XP
                      </div>
                      <div className="display-md">Desafío diario</div>
                    </div>
                    <span className="hud shrink-0 group-hover:text-[var(--color-fg)] transition-colors">Empezar →</span>
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
