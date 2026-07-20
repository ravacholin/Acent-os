import React, { useState } from 'react';
import { UserStats, WordCategory, LevelMCER, Achievement } from '../types';
import { WORDS_DATABASE } from '../data/words';
import { calculateErrorProfiles } from '../utils/errorAnalysis';
import AchievementsPanel from './AchievementsPanel';

interface StatsDashboardProps {
  stats: UserStats;
  achievements: Achievement[];
  onResetStats?: () => void;
  onStartFocusSession?: (categories: WordCategory[]) => void;
  onExportProgress?: () => void;
  onImportProgress?: (file: File) => void;
}

export default function StatsDashboard({
  stats,
  achievements,
  onResetStats,
  onStartFocusSession,
  onExportProgress,
  onImportProgress
}: StatsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'profiles' | 'logros'>('overview');
  // Confirmación de reinicio por doble-tap en el propio botón (sin modal).
  const [confirmReset, setConfirmReset] = useState(false);
  const importInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportProgress) onImportProgress(file);
    e.target.value = ''; // permite reimportar el mismo archivo
  };

  // Helper to format average time
  const formatAverageTime = () => {
    const totalWords = stats.correctAnswers + stats.incorrectAnswers;
    if (totalWords === 0) return '0.0s';
    const avg = stats.totalTimeSeconds / totalWords;
    return `${avg.toFixed(1)}s`;
  };

  // Convert categories names to Spanish human readable
  const categoryLabels: Record<WordCategory, string> = {
    aguda: 'Agudas',
    grave: 'Graves',
    esdrújula: 'Esdrújulas',
    sobreesdrújula: 'Sobreesdrújulas',
    hiato: 'Hiatos',
    diptongo: 'Diptongos',
    triptongo: 'Triptongos',
    monosílabo: 'Monosílabos',
    diacrítica: 'Diacríticas',
    interrogativo: 'Interrogativos',
    exclamativo: 'Exclamativos',
    mayúscula: 'Mayúsculas',
    extranjerismo: 'Extranjerismos',
    latinismo: 'Latinismos',
    mente: 'Sufijo -mente',
    pronombre: 'Pronombres enclíticos'
  };

  // Prepare calendar heatmap data (last 21 days)
  const getHeatmapDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 20; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = stats.dailyHistory?.[dateStr] || 0;
      days.push({ dateStr, count });
    }
    return days;
  };

  const heatmapDays = getHeatmapDays();
  const heatmapBg = (count: number) => {
    if (count === 0) return 'var(--color-surface)';
    if (count < 5) return 'var(--color-surface-2)';
    if (count < 15) return 'var(--color-grey-mid)';
    return 'var(--color-fg)';
  };

  // Frequent mistakes array sorted
  const frequentMistakesArray = Object.values(stats.frequentMistakes || {})
    .sort((a, b) => b.incorrectCount - a.incorrectCount)
    .slice(0, 5);

  const subTabs: { id: typeof activeTab; label: string }[] = [
    { id: 'overview', label: 'Resumen' },
    { id: 'profiles', label: 'Perfiles' },
    { id: 'logros', label: 'Logros' }
  ];

  return (
    <div id="stats-dashboard">
      <div className="flex justify-between items-baseline border-b border-[var(--color-line-soft)] pb-[22px] mb-8 flex-wrap gap-4">
        <div className="display-brutal text-[34px] sm:text-[40px]">Progreso</div>
        <div className="flex gap-[22px] text-[10px] tracking-[0.15em] uppercase">
          {subTabs.map(st => (
            <span
              key={st.id}
              onClick={() => setActiveTab(st.id)}
              className={`cursor-pointer transition-colors ${
                activeTab === st.id ? 'text-[var(--color-fg)] underline underline-offset-[6px]' : 'text-[var(--color-fg-quiet)] hover:text-[var(--color-fg)]'
              }`}
            >
              {st.label}
            </span>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-l border-[var(--color-line-soft)] mb-8">
            <div className="border-r border-b border-[var(--color-line-soft)] p-[24px_22px]">
              <div className="text-[9px] tracking-[0.15em] text-[var(--color-fg-dim)] uppercase">Racha actual</div>
              <div className="display-heavy text-[38px] mt-3">{stats.currentStreak}</div>
              <div className="text-[10px] text-[var(--color-fg-dim)] mt-1.5">mejor racha: {stats.bestStreak}</div>
            </div>
            <div className="border-r border-b border-[var(--color-line-soft)] p-[24px_22px]">
              <div className="text-[9px] tracking-[0.15em] text-[var(--color-fg-dim)] uppercase">Precisión general</div>
              <div className="display-heavy text-[38px] mt-3">{stats.accuracy}%</div>
              <div className="text-[10px] text-[var(--color-fg-dim)] mt-1.5">{stats.correctAnswers} correctas de {stats.correctAnswers + stats.incorrectAnswers}</div>
            </div>
            <div className="border-r border-b border-[var(--color-line-soft)] p-[24px_22px]">
              <div className="text-[9px] tracking-[0.15em] text-[var(--color-fg-dim)] uppercase">Nivel y XP</div>
              <div className="display-heavy text-[38px] mt-3">Nvl {stats.level || 1}</div>
              <div className="text-[10px] text-[var(--color-fg-dim)] mt-1.5">{stats.xp} XP acumulado</div>
            </div>
            <div className="border-r border-b border-[var(--color-line-soft)] p-[24px_22px]">
              <div className="text-[9px] tracking-[0.15em] text-[var(--color-fg-dim)] uppercase">Tiempo promedio</div>
              <div className="display-heavy text-[38px] mt-3">{formatAverageTime()}</div>
              <div className="text-[10px] text-[var(--color-fg-dim)] mt-1.5">respuesta rápida</div>
            </div>
          </div>

          <div className="mb-2 text-[9px] tracking-[0.2em] text-[var(--color-fg-dim)] uppercase">Constancia — últimos 21 días</div>
          <div className="flex gap-1 flex-wrap mt-3.5 mb-8">
            {heatmapDays.map(day => (
              <div
                key={day.dateStr}
                title={`${day.count} palabras practicadas el ${day.dateStr}`}
                className="w-6 h-[30px] border border-[var(--color-line)]"
                style={{ background: heatmapBg(day.count) }}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-[var(--color-line-soft)] pt-8">
            <div>
              <div className="text-[9px] tracking-[0.2em] text-[var(--color-fg-dim)] uppercase mb-3.5">
                Palabras dominadas ({stats.masteredWords?.length || 0})
              </div>
              {stats.masteredWords && stats.masteredWords.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {stats.masteredWords.map(id => {
                    const matched = WORDS_DATABASE.find(w => w.id === id);
                    return (
                      <span key={id} className="text-[11px] px-2 py-0.5 border border-[var(--color-line)] text-[var(--color-fg-soft)]">
                        {matched?.word || id}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[var(--color-fg-dim)] text-xs italic">Las palabras correctas varias veces consecutivas aparecerán acá.</p>
              )}
            </div>
            <div>
              <div className="text-[9px] tracking-[0.2em] text-[var(--color-fg-dim)] uppercase mb-3.5">Cobertura del banco de palabras</div>
              <div className="flex justify-between text-xs text-[var(--color-fg-muted)] mb-1.5">
                <span>Vistas</span>
                <span>{stats.wordsSeen} / {WORDS_DATABASE.length} palabras</span>
              </div>
              <div className="w-full bg-[var(--color-surface-2)] h-[2px]">
                <div className="bg-[var(--color-fg)] h-full" style={{ width: `${Math.min(100, (stats.wordsSeen / WORDS_DATABASE.length) * 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Categorías y niveles — antes eran una sub-pestaña propia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-[var(--color-line-soft)] pt-8 mt-8">
            <div>
              <div className="text-[9px] tracking-[0.2em] text-[var(--color-fg-dim)] uppercase mb-4">Por categoría</div>
              <div className="flex flex-col gap-3.5 max-h-72 overflow-y-auto pr-1">
                {(Object.keys(categoryLabels) as WordCategory[]).map((cat) => {
                  const progress = stats.categoryStats?.[cat] || { correct: 0, total: 0 };
                  const pct = progress.total > 0 ? Math.round((progress.correct / progress.total) * 100) : 0;
                  const barColor = pct >= 80 ? 'var(--color-fg)' : pct >= 50 ? 'var(--color-grey-mid)' : progress.total > 0 ? 'var(--color-fg-faint)' : 'var(--color-ink-3)';
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-[11px] mb-1.5">
                        <span>{categoryLabels[cat]}</span>
                        <span className="text-[var(--color-fg-dim)]">{progress.total > 0 ? `${pct}%` : '—'}</span>
                      </div>
                      <div className="h-[2px] bg-[var(--color-surface-2)]">
                        <div className="h-full" style={{ width: `${progress.total > 0 ? pct : 0}%`, background: barColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-[9px] tracking-[0.2em] text-[var(--color-fg-dim)] uppercase mb-4">Por nivel MCER</div>
              <div className="flex flex-col gap-3.5">
                {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as LevelMCER[]).map((lvl) => {
                  const progress = stats.levelStats?.[lvl] || { correct: 0, total: 0 };
                  const pct = progress.total > 0 ? Math.round((progress.correct / progress.total) * 100) : 0;
                  return (
                    <div key={lvl}>
                      <div className="flex justify-between text-[11px] mb-1.5">
                        <span>Nivel {lvl}</span>
                        <span className="text-[var(--color-fg-dim)]">{progress.total > 0 ? `${pct}%` : '—'}</span>
                      </div>
                      <div className="h-[2px] bg-[var(--color-surface-2)]">
                        <div className="h-full bg-[var(--color-fg)]" style={{ width: `${progress.total > 0 ? pct : 0}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profiles' && (
        <div>
          <p className="text-[var(--color-fg-muted)] text-xs leading-relaxed max-w-2xl mb-8">
            Cada acierto y error se agrupa en perfiles ortográficos concretos. Los perfiles marcados en{' '}
            <span className="text-[var(--color-fg)] underline underline-offset-2">crítico</span> se priorizan automáticamente en tus próximas sesiones.
          </p>

          <div className="border-t border-[var(--color-line-soft)]">
            {calculateErrorProfiles(stats).map((p) => {
              const hasData = p.total > 0;
              const statusLabel = p.status === 'excelente' ? 'excelente' : p.status === 'crítico' ? 'crítico' : hasData ? 'en progreso' : 'sin datos';

              return (
                <div key={p.id} className="border-b border-[var(--color-line-soft)] py-[26px] flex justify-between gap-8 flex-wrap">
                  <div className="flex-1 min-w-[280px]">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="display-heavy text-[22px]">{p.name}</span>
                      <span className="text-[9px] tracking-[0.1em] text-[var(--color-fg-soft)] border border-[var(--color-line)] px-2.5 py-0.5 uppercase">{statusLabel}</span>
                    </div>
                    <p className="text-[var(--color-fg-muted)] text-[11px] mt-2.5 max-w-[460px] leading-relaxed">{p.description}</p>
                    <div className="mt-3.5 h-[2px] bg-[var(--color-surface-2)] max-w-[320px]">
                      <div className="h-full bg-[var(--color-fg)]" style={{ width: `${hasData ? p.accuracy : 0}%` }} />
                    </div>
                    <div className="text-[10px] text-[var(--color-fg-dim)] mt-2">
                      {hasData ? `${p.accuracy}% (${p.correct}/${p.total} aciertos)` : 'Sin datos registrados'}
                    </div>
                    <p className="text-[var(--color-fg-soft)] text-[11px] mt-3 italic leading-relaxed max-w-[460px]">{p.recommendation}</p>
                  </div>
                  {onStartFocusSession && (
                    <button
                      onClick={() => onStartFocusSession(p.categories)}
                      className="self-center px-5 py-3 border border-[var(--color-fg)] text-[11px] tracking-[0.08em] cursor-pointer whitespace-nowrap h-fit hover:bg-[var(--color-fg)] hover:text-black transition-colors"
                    >
                      Entrenar perfil
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Errores frecuentes — antes eran una sub-pestaña propia */}
          <div className="mt-10">
            <div className="text-[9px] tracking-[0.2em] text-[var(--color-fg-dim)] uppercase mb-4">Errores frecuentes</div>
            <div className="border-t border-[var(--color-line-soft)]">
              {frequentMistakesArray.length > 0 ? (
                frequentMistakesArray.map((m) => (
                  <div key={m.wordId} className="border-b border-[var(--color-line-soft)] py-5">
                    <div className="flex items-baseline gap-3">
                      <span className="display-heavy text-xl">{m.word}</span>
                      <span className="text-[9px] text-[var(--color-fg-soft)] border border-[var(--color-line)] px-2 py-0.5">fallada {m.incorrectCount} veces</span>
                    </div>
                    <p className="text-[var(--color-fg-muted)] text-[11px] mt-2 italic">"{m.explanation}"</p>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-[var(--color-fg-muted)] text-xs italic">
                  Sin errores críticos registrados todavía. Seguí practicando para generar tu perfil.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logros' && (
        <AchievementsPanel stats={stats} achievements={achievements} embedded />
      )}

      {/* Progreso portable — exportar / importar (sin cuentas ni backend) */}
      {(onExportProgress || onImportProgress) && (
        <div className="flex items-center gap-5 pt-8 border-t border-[var(--color-line-soft)] mt-8">
          {onExportProgress && (
            <span
              onClick={onExportProgress}
              className="text-[10px] tracking-[0.05em] text-[var(--color-fg-quiet)] hover:text-[var(--color-fg)] cursor-pointer transition-colors underline underline-offset-2"
            >
              Exportar progreso
            </span>
          )}
          {onImportProgress && (
            <>
              <span
                onClick={() => importInputRef.current?.click()}
                className="text-[10px] tracking-[0.05em] text-[var(--color-fg-quiet)] hover:text-[var(--color-fg)] cursor-pointer transition-colors underline underline-offset-2"
              >
                Importar progreso
              </span>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                className="hidden"
              />
            </>
          )}
          <span className="text-[10px] text-[var(--color-fg-faint)]">Guardá o migrá tu progreso como archivo JSON</span>
        </div>
      )}

      {onResetStats && (
        <div className="flex justify-end pt-8">
          {confirmReset ? (
            <span className="flex items-center gap-3 text-[10px]">
              <span className="text-[var(--color-fg-soft)]">¿Reiniciar todo? Es irreversible.</span>
              <span
                onClick={() => {
                  setConfirmReset(false);
                  onResetStats();
                }}
                className="text-[var(--color-fg)] underline underline-offset-2 cursor-pointer"
              >
                Confirmar
              </span>
              <span
                onClick={() => setConfirmReset(false)}
                className="text-[var(--color-fg-faint)] hover:text-[var(--color-fg)] cursor-pointer transition-colors"
              >
                Cancelar
              </span>
            </span>
          ) : (
            <span
              onClick={() => setConfirmReset(true)}
              className="text-[10px] text-[var(--color-fg-faint)] hover:text-[var(--color-fg)] cursor-pointer transition-colors"
            >
              Reiniciar historial de entrenamiento
            </span>
          )}
        </div>
      )}
    </div>
  );
}
