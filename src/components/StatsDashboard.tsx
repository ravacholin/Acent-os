import React, { useState } from 'react';
import { UserStats, WordCategory, LevelMCER, Word } from '../types';
import { WORDS_DATABASE } from '../data/words';
import { calculateErrorProfiles } from '../utils/errorAnalysis';

interface StatsDashboardProps {
  stats: UserStats;
  onResetStats?: () => void;
  onStartFocusSession?: (categories: WordCategory[]) => void;
}

export default function StatsDashboard({ stats, onResetStats, onStartFocusSession }: StatsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'profiles' | 'categories' | 'mistakes'>('overview');

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
    'solo-solo': 'Solo/Sólo',
    demostrativo: 'Demostrativos',
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
    if (count === 0) return '#0d0d0d';
    if (count < 5) return '#161616';
    if (count < 15) return '#8a8a8a';
    return '#F5F5F0';
  };

  // Frequent mistakes array sorted
  const frequentMistakesArray = Object.values(stats.frequentMistakes || {})
    .sort((a, b) => b.incorrectCount - a.incorrectCount)
    .slice(0, 5);

  const subTabs: { id: typeof activeTab; label: string }[] = [
    { id: 'overview', label: 'Resumen' },
    { id: 'profiles', label: 'Perfiles' },
    { id: 'categories', label: 'Categorías' },
    { id: 'mistakes', label: 'Errores' }
  ];

  return (
    <div id="stats-dashboard">
      <div className="flex justify-between items-baseline border-b border-[#1a1a1a] pb-[22px] mb-8 flex-wrap gap-4">
        <div>
          <div className="font-display text-[34px]">Estadísticas</div>
          <p className="text-[#888] text-[11px] mt-1.5">Análisis de tu intuición de acentuación</p>
        </div>
        <div className="flex gap-[22px] text-[10px] tracking-[0.15em] uppercase">
          {subTabs.map(st => (
            <span
              key={st.id}
              onClick={() => setActiveTab(st.id)}
              className={`cursor-pointer transition-colors ${
                activeTab === st.id ? 'text-[#F5F5F0] underline underline-offset-[6px]' : 'text-[#777] hover:text-[#F5F5F0]'
              }`}
            >
              {st.label}
            </span>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-l border-[#1a1a1a] mb-8">
            <div className="border-r border-b border-[#1a1a1a] p-[24px_22px]">
              <div className="text-[9px] tracking-[0.15em] text-[#666] uppercase">Racha actual</div>
              <div className="font-display text-[38px] mt-3">{stats.currentStreak}</div>
              <div className="text-[10px] text-[#666] mt-1.5">mejor racha: {stats.bestStreak}</div>
            </div>
            <div className="border-r border-b border-[#1a1a1a] p-[24px_22px]">
              <div className="text-[9px] tracking-[0.15em] text-[#666] uppercase">Precisión general</div>
              <div className="font-display text-[38px] mt-3">{stats.accuracy}%</div>
              <div className="text-[10px] text-[#666] mt-1.5">{stats.correctAnswers} correctas de {stats.correctAnswers + stats.incorrectAnswers}</div>
            </div>
            <div className="border-r border-b border-[#1a1a1a] p-[24px_22px]">
              <div className="text-[9px] tracking-[0.15em] text-[#666] uppercase">Nivel y XP</div>
              <div className="font-display text-[38px] mt-3">Nvl {stats.level || 1}</div>
              <div className="text-[10px] text-[#666] mt-1.5">{stats.xp} XP acumulado</div>
            </div>
            <div className="border-r border-b border-[#1a1a1a] p-[24px_22px]">
              <div className="text-[9px] tracking-[0.15em] text-[#666] uppercase">Tiempo promedio</div>
              <div className="font-display text-[38px] mt-3">{formatAverageTime()}</div>
              <div className="text-[10px] text-[#666] mt-1.5">respuesta rápida</div>
            </div>
          </div>

          <div className="mb-2 text-[9px] tracking-[0.2em] text-[#666] uppercase">Constancia — últimos 21 días</div>
          <div className="flex gap-1 flex-wrap mt-3.5 mb-8">
            {heatmapDays.map(day => (
              <div
                key={day.dateStr}
                title={`${day.count} palabras practicadas el ${day.dateStr}`}
                className="w-6 h-[30px] border border-[#2a2a2a]"
                style={{ background: heatmapBg(day.count) }}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-[#1a1a1a] pt-8">
            <div>
              <div className="text-[9px] tracking-[0.2em] text-[#666] uppercase mb-3.5">
                Palabras dominadas ({stats.masteredWords?.length || 0})
              </div>
              {stats.masteredWords && stats.masteredWords.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {stats.masteredWords.map(id => {
                    const matched = WORDS_DATABASE.find(w => w.id === id);
                    return (
                      <span key={id} className="text-[11px] font-mono px-2 py-0.5 border border-[#2a2a2a] text-[#999]">
                        {matched?.word || id}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[#666] text-xs italic">Las palabras correctas varias veces consecutivas aparecerán acá.</p>
              )}
            </div>
            <div>
              <div className="text-[9px] tracking-[0.2em] text-[#666] uppercase mb-3.5">Cobertura del banco de palabras</div>
              <div className="flex justify-between text-xs font-mono text-[#888] mb-1.5">
                <span>Vistas</span>
                <span>{stats.wordsSeen} / {WORDS_DATABASE.length} palabras</span>
              </div>
              <div className="w-full bg-[#161616] h-[2px]">
                <div className="bg-[#F5F5F0] h-full" style={{ width: `${Math.min(100, (stats.wordsSeen / WORDS_DATABASE.length) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profiles' && (
        <div>
          <p className="text-[#888] text-xs leading-relaxed max-w-2xl mb-8">
            Cada acierto y error se agrupa en perfiles ortográficos concretos. Los perfiles marcados en{' '}
            <span className="text-[#F5F5F0] underline underline-offset-2">crítico</span> se priorizan automáticamente en tus próximas sesiones.
          </p>

          <div className="border-t border-[#1a1a1a]">
            {calculateErrorProfiles(stats).map((p) => {
              const hasData = p.total > 0;
              const statusLabel = p.status === 'excelente' ? 'excelente' : p.status === 'crítico' ? 'crítico' : hasData ? 'en progreso' : 'sin datos';

              return (
                <div key={p.id} className="border-b border-[#1a1a1a] py-[26px] flex justify-between gap-8 flex-wrap">
                  <div className="flex-1 min-w-[280px]">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="font-display text-[22px]">{p.name}</span>
                      <span className="text-[9px] tracking-[0.1em] text-[#999] border border-[#2a2a2a] px-2.5 py-0.5 uppercase">{statusLabel}</span>
                    </div>
                    <p className="text-[#888] text-[11px] mt-2.5 max-w-[460px] leading-relaxed">{p.description}</p>
                    <div className="mt-3.5 h-[2px] bg-[#161616] max-w-[320px]">
                      <div className="h-full bg-[#F5F5F0]" style={{ width: `${hasData ? p.accuracy : 0}%` }} />
                    </div>
                    <div className="text-[10px] text-[#666] mt-2">
                      {hasData ? `${p.accuracy}% (${p.correct}/${p.total} aciertos)` : 'Sin datos registrados'}
                    </div>
                    <p className="text-[#999] text-[11px] mt-3 italic leading-relaxed max-w-[460px]">{p.recommendation}</p>
                  </div>
                  {onStartFocusSession && (
                    <button
                      onClick={() => onStartFocusSession(p.categories)}
                      className="self-center px-5 py-3 border border-[#F5F5F0] text-[11px] tracking-[0.08em] cursor-pointer whitespace-nowrap h-fit hover:bg-[#F5F5F0] hover:text-black transition-colors"
                    >
                      Entrenar perfil
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <div className="text-[9px] tracking-[0.2em] text-[#666] uppercase mb-4">Por categoría</div>
            <div className="flex flex-col gap-3.5">
              {(Object.keys(categoryLabels) as WordCategory[]).map((cat) => {
                const progress = stats.categoryStats?.[cat] || { correct: 0, total: 0 };
                const pct = progress.total > 0 ? Math.round((progress.correct / progress.total) * 100) : 0;
                const barColor = pct >= 80 ? '#F5F5F0' : pct >= 50 ? '#8a8a8a' : progress.total > 0 ? '#555' : '#333';
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span>{categoryLabels[cat]}</span>
                      <span className="text-[#666]">{progress.total > 0 ? `${pct}%` : '—'}</span>
                    </div>
                    <div className="h-[2px] bg-[#161616]">
                      <div className="h-full" style={{ width: `${progress.total > 0 ? pct : 0}%`, background: barColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-[9px] tracking-[0.2em] text-[#666] uppercase mb-4">Por nivel MCER</div>
            <div className="flex flex-col gap-3.5">
              {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as LevelMCER[]).map((lvl) => {
                const progress = stats.levelStats?.[lvl] || { correct: 0, total: 0 };
                const pct = progress.total > 0 ? Math.round((progress.correct / progress.total) * 100) : 0;
                return (
                  <div key={lvl}>
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span>Nivel {lvl}</span>
                      <span className="text-[#666]">{progress.total > 0 ? `${pct}%` : '—'}</span>
                    </div>
                    <div className="h-[2px] bg-[#161616]">
                      <div className="h-full bg-[#F5F5F0]" style={{ width: `${progress.total > 0 ? pct : 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'mistakes' && (
        <div className="border-t border-[#1a1a1a]">
          {frequentMistakesArray.length > 0 ? (
            frequentMistakesArray.map((m) => (
              <div key={m.wordId} className="border-b border-[#1a1a1a] py-5">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-xl">{m.word}</span>
                  <span className="text-[9px] text-[#999] border border-[#2a2a2a] px-2 py-0.5">fallada {m.incorrectCount} veces</span>
                </div>
                <p className="text-[#888] text-[11px] mt-2 italic">"{m.explanation}"</p>
              </div>
            ))
          ) : (
            <p className="text-center py-8 text-[#888] text-xs italic">
              Sin errores críticos registrados todavía. Segui practicando para generar tu perfil.
            </p>
          )}
        </div>
      )}

      {onResetStats && (
        <div className="flex justify-end pt-8">
          <span
            onClick={() => {
              if (window.confirm('¿Estás seguro de que deseas reiniciar todas las estadísticas? Esta acción es irreversible.')) {
                onResetStats();
              }
            }}
            className="text-[10px] text-[#555] hover:text-[#F5F5F0] cursor-pointer transition-colors"
          >
            Reiniciar historial de entrenamiento
          </span>
        </div>
      )}
    </div>
  );
}
