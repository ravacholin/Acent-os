import React, { useState } from 'react';
import { UserStats, WordCategory, LevelMCER, Word } from '../types';
import { WORDS_DATABASE } from '../data/words';
import { calculateErrorProfiles } from '../utils/errorAnalysis';
import { 
  Trophy, 
  Flame, 
  Target, 
  Clock, 
  Eye, 
  CheckCircle, 
  AlertTriangle, 
  Bookmark, 
  BookmarkCheck,
  Calendar,
  Grid,
  Play
} from 'lucide-react';
import { motion } from 'motion/react';

interface StatsDashboardProps {
  stats: UserStats;
  onResetStats?: () => void;
  onStartFocusSession?: (categories: WordCategory[]) => void;
}

export default function StatsDashboard({ stats, onResetStats, onStartFocusSession }: StatsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'profiles' | 'categories' | 'mistakes'>('overview');

  // Helper to format average time
  const formatAverageTime = () => {
    if (stats.wordsSeen === 0) return '0.0s';
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
      days.push({
        dateStr,
        dayLabel: date.toLocaleDateString('es-ES', { weekday: 'narrow' }),
        dayNum: date.getDate(),
        count
      });
    }
    return days;
  };

  const heatmapDays = getHeatmapDays();

  // Frequent mistakes array sorted
  const frequentMistakesArray = Object.values(stats.frequentMistakes || {})
    .sort((a, b) => b.incorrectCount - a.incorrectCount)
    .slice(0, 5);

  return (
    <div className="space-y-6" id="stats-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#1F1F1F] pb-5 gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#EDEDED] font-display">Estadísticas de Rendimiento</h2>
          <p className="text-[#A1A1A1] text-sm mt-1">
            Análisis detallado de tu intuición de acentuación y perfiles de error detectados.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-mono rounded border cursor-pointer transition-all ${
              activeTab === 'overview'
                ? 'bg-white text-black border-white font-semibold'
                : 'bg-[#161616] text-[#A1A1A1] border-[#222] hover:text-white'
            }`}
          >
            Resumen
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-3 py-1.5 text-xs font-mono rounded border cursor-pointer transition-all ${
              activeTab === 'profiles'
                ? 'bg-white text-black border-white font-semibold'
                : 'bg-[#161616] text-[#A1A1A1] border-[#222] hover:text-white'
            }`}
          >
            Perfiles de Error
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 text-xs font-mono rounded border cursor-pointer transition-all ${
              activeTab === 'categories'
                ? 'bg-white text-black border-white font-semibold'
                : 'bg-[#161616] text-[#A1A1A1] border-[#222] hover:text-white'
            }`}
          >
            Categorías y Niveles
          </button>
          <button
            onClick={() => setActiveTab('mistakes')}
            className={`px-3 py-1.5 text-xs font-mono rounded border cursor-pointer transition-all ${
              activeTab === 'mistakes'
                ? 'bg-white text-black border-white font-semibold'
                : 'bg-[#161616] text-[#A1A1A1] border-[#222] hover:text-white'
            }`}
          >
            Errores Frecuentes ({frequentMistakesArray.length})
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Grid Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#161616] border border-[#222] p-5 rounded-lg flex flex-col justify-between">
              <span className="text-[#A1A1A1] text-[10px] uppercase tracking-widest font-mono flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" /> Racha Actual
              </span>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#EDEDED] tracking-tight">{stats.currentStreak}</span>
                <span className="text-xs text-[#A1A1A1]">palabras</span>
              </div>
              <span className="text-[10px] text-[#A1A1A1] font-mono mt-1">Mejor racha: {stats.bestStreak}</span>
            </div>

            <div className="bg-[#161616] border border-[#222] p-5 rounded-lg flex flex-col justify-between">
              <span className="text-[#A1A1A1] text-[10px] uppercase tracking-widest font-mono flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-emerald-400" /> Precisión General
              </span>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-emerald-400 tracking-tight">{stats.accuracy}%</span>
              </div>
              <span className="text-[10px] text-[#A1A1A1] font-mono mt-1">
                {stats.correctAnswers} correctas de {stats.correctAnswers + stats.incorrectAnswers}
              </span>
            </div>

            <div className="bg-[#161616] border border-[#222] p-5 rounded-lg flex flex-col justify-between">
              <span className="text-[#A1A1A1] text-[10px] uppercase tracking-widest font-mono flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500/10" /> Nivel y XP
              </span>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#EDEDED] tracking-tight font-display">Nvl {stats.level || 1}</span>
              </div>
              <span className="text-[10px] text-[#A1A1A1] font-mono mt-1">{stats.xp} XP acumulado</span>
            </div>

            <div className="bg-[#161616] border border-[#222] p-5 rounded-lg flex flex-col justify-between">
              <span className="text-[#A1A1A1] text-[10px] uppercase tracking-widest font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Tiempo Promedio
              </span>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#EDEDED] tracking-tight">{formatAverageTime()}</span>
              </div>
              <span className="text-[10px] text-[#A1A1A1] font-mono mt-1">Respuesta rápida</span>
            </div>
          </div>

          {/* Activity Heatmap Grid */}
          <div className="bg-[#161616] border border-[#222] p-5 rounded-lg space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold tracking-widest text-[#A1A1A1] uppercase font-mono flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#A1A1A1]" /> Constancia de Práctica
              </span>
              <span className="text-[#A1A1A1] text-[10px] font-mono">Últimos 21 días</span>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-between py-2">
              {heatmapDays.map((day) => {
                const isPracticed = day.count > 0;
                let intensityClass = 'bg-[#0A0A0A] border-[#222] text-[#555]';
                if (day.count > 0 && day.count < 5) intensityClass = 'bg-[#161616] border-[#222] text-[#A1A1A1]';
                else if (day.count >= 5 && day.count < 15) intensityClass = 'bg-[#EDEDED] text-black border-white';
                else if (day.count >= 15) intensityClass = 'bg-white text-black border-white font-bold scale-105 shadow-sm';

                return (
                  <div
                    key={day.dateStr}
                    className={`w-10 h-12 border rounded flex flex-col items-center justify-center transition-all ${intensityClass}`}
                    title={`${day.count} palabras practicadas el ${day.dateStr}`}
                  >
                    <span className="text-[9px] font-mono opacity-60 uppercase">{day.dayLabel}</span>
                    <span className="text-xs font-mono font-medium mt-0.5">{day.dayNum}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-between items-center text-[10px] text-[#A1A1A1] pt-2 border-t border-[#1F1F1F]">
              <span>Menos activo</span>
              <div className="flex gap-1.5 items-center">
                <div className="w-2.5 h-2.5 bg-[#0A0A0A] rounded border border-[#222]"></div>
                <div className="w-2.5 h-2.5 bg-[#161616] rounded border border-[#222]"></div>
                <div className="w-2.5 h-2.5 bg-[#EDEDED] rounded"></div>
                <div className="w-2.5 h-2.5 bg-white rounded"></div>
              </div>
              <span>Más activo</span>
            </div>
          </div>

          {/* Quick analysis boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mastered words */}
            <div className="bg-[#161616] border border-[#222] p-5 rounded-lg space-y-3">
              <span className="text-xs font-semibold tracking-widest text-[#A1A1A1] uppercase font-mono flex items-center gap-1.5">
                <BookmarkCheck className="w-4 h-4 text-emerald-400" /> Palabras Dominadas ({stats.masteredWords?.length || 0})
              </span>
              {stats.masteredWords && stats.masteredWords.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-2 pt-1">
                  {stats.masteredWords.map((id) => {
                    const matched = WORDS_DATABASE.find(w => w.id === id);
                    return (
                      <span key={id} className="text-[11px] font-mono px-2 py-0.5 border border-emerald-950 bg-emerald-950/10 text-emerald-400 rounded-full">
                        {matched?.word || id}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[#A1A1A1] text-xs italic py-4">
                  Las palabras correctas varias veces consecutivas aparecerán aquí como dominadas.
                </p>
              )}
            </div>

            {/* General progress info */}
            <div className="bg-[#161616] border border-[#222] p-5 rounded-lg space-y-3">
              <span className="text-xs font-semibold tracking-widest text-[#A1A1A1] uppercase font-mono flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-[#A1A1A1]" /> Cobertura del Banco de Palabras
              </span>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-mono text-[#A1A1A1]">
                  <span>Vistas</span>
                  <span>{stats.wordsSeen} / {WORDS_DATABASE.length} palabras</span>
                </div>
                <div className="w-full bg-[#0A0A0A] h-1.5 rounded-full overflow-hidden border border-[#222]">
                  <div 
                    className="bg-[#EDEDED] h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (stats.wordsSeen / WORDS_DATABASE.length) * 100)}%` }}
                  />
                </div>
                <p className="text-[#A1A1A1] text-[10px] leading-relaxed pt-1">
                  Practica diferentes modos para encontrar más palabras del banco de datos (esdrújulas, latinismos, hiatos, diacríticas, etc.)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profiles' && (
        <div className="space-y-6">
          <div className="bg-[#161616] border border-[#222] p-6 rounded-lg space-y-2">
            <h3 className="text-sm font-semibold tracking-widest text-[#A1A1A1] uppercase font-mono flex items-center gap-1.5">
              <Target className="w-4 h-4 text-white" /> Análisis Dinámico del Perfil de Errores
            </h3>
            <p className="text-[#A1A1A1] text-xs leading-relaxed max-w-2xl">
              Nuestro sistema analiza cada acierto y error que cometes para agrupar tus fallos en perfiles ortográficos y pedagógicos concretos. Los perfiles marcados en <span className="text-rose-400 font-semibold">crítico</span> se inyectan automáticamente con mayor frecuencia en tus sesiones de práctica generales para acelerar tu aprendizaje.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {calculateErrorProfiles(stats).map((p) => {
              const hasData = p.total > 0;
              
              // Status badges & color styling
              let statusText = 'Estable';
              let statusStyles = 'border-[#222] bg-[#0A0A0A] text-[#A1A1A1]';
              let Icon = Target;
              let barColor = 'bg-white';

              if (p.status === 'excelente') {
                statusText = 'Excelente';
                statusStyles = 'border-emerald-950/60 bg-emerald-950/10 text-emerald-400';
                Icon = CheckCircle;
                barColor = 'bg-emerald-400';
              } else if (p.status === 'crítico') {
                statusText = 'Crítico (Priorizado)';
                statusStyles = 'border-rose-950/60 bg-rose-950/10 text-rose-400';
                Icon = AlertTriangle;
                barColor = 'bg-rose-500';
              } else if (hasData) {
                statusText = 'En Progreso';
                statusStyles = 'border-amber-950/60 bg-amber-950/10 text-amber-400';
                barColor = 'bg-amber-400';
              } else {
                statusText = 'Sin Datos';
                statusStyles = 'border-[#222] bg-[#0A0A0A] text-[#555]';
                barColor = 'bg-neutral-800';
              }

              return (
                <div key={p.id} className="bg-[#161616] border border-[#222] p-6 rounded-lg space-y-4 flex flex-col md:flex-row gap-6 justify-between items-start">
                  <div className="space-y-4 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h4 className="text-base font-semibold text-[#EDEDED] tracking-tight font-display">{p.name}</h4>
                      <span className={`px-2 py-0.5 border text-[10px] font-mono font-medium rounded-full flex items-center gap-1 ${statusStyles}`}>
                        <Icon className="w-3 h-3" />
                        {statusText}
                      </span>
                    </div>

                    <p className="text-xs text-[#A1A1A1] leading-relaxed">
                      {p.description}
                    </p>

                    {/* Progress tracker */}
                    <div className="space-y-1.5 max-w-md">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-[#A1A1A1]">Precisión:</span>
                        <span className="text-[#EDEDED] font-bold">
                          {hasData ? `${p.accuracy}% (${p.correct}/${p.total} aciertos)` : 'Sin datos registrados'}
                        </span>
                      </div>
                      <div className="w-full bg-[#0A0A0A] h-1.5 rounded-full overflow-hidden border border-[#222]">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${hasData ? p.accuracy : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Pedagogical recommendations box */}
                    <div className="p-3.5 bg-[#0A0A0A] border border-[#222] rounded-md space-y-1">
                      <span className="text-[10px] font-semibold tracking-widest text-white uppercase font-mono">
                        Consejo Pedagógico:
                      </span>
                      <p className="text-xs text-[#A1A1A1] leading-relaxed italic">
                        {p.recommendation}
                      </p>
                    </div>

                    {/* Examples taglist */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-[#555] uppercase">Ejemplos:</span>
                      {p.examples.map((ex, exIdx) => (
                        <span key={exIdx} className="text-[11px] font-mono px-2 py-0.5 bg-[#0A0A0A] border border-[#222] text-[#A1A1A1] rounded">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Immediate focus session trigger button */}
                  {onStartFocusSession && (
                    <button
                      onClick={() => onStartFocusSession(p.categories)}
                      className="w-full md:w-auto shrink-0 px-4 py-2.5 bg-white text-black text-xs font-semibold font-mono rounded hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-white"
                    >
                      <Play className="w-3.5 h-3.5 fill-black stroke-[3]" />
                      Entrenar Perfil
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Categories Stats Card */}
          <div className="bg-[#161616] border border-[#222] p-5 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold tracking-widest text-[#A1A1A1] uppercase font-mono flex items-center gap-1.5">
              <Grid className="w-4 h-4 text-[#A1A1A1]" /> Precisión por Regla / Categoría
            </h3>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {(Object.keys(categoryLabels) as WordCategory[]).map((cat) => {
                const progress = stats.categoryStats?.[cat] || { correct: 0, total: 0 };
                const pct = progress.total > 0 ? Math.round((progress.correct / progress.total) * 100) : 0;
                
                // Only show categories the user has faced, or highlight others
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#EDEDED] font-medium">{categoryLabels[cat]}</span>
                      <span className="text-[#A1A1A1] font-mono">
                        {progress.total > 0 ? `${pct}% (${progress.correct}/${progress.total})` : 'Sin entrenar'}
                      </span>
                    </div>
                    <div className="w-full bg-[#0A0A0A] h-1 rounded-full overflow-hidden border border-[#222]">
                      <div 
                        className={`h-full rounded-full ${
                          pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : progress.total > 0 ? 'bg-rose-500' : 'bg-neutral-800'
                        }`}
                        style={{ width: `${progress.total > 0 ? pct : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Levels Stats Card */}
          <div className="bg-[#161616] border border-[#222] p-5 rounded-lg space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold tracking-widest text-[#A1A1A1] uppercase font-mono flex items-center gap-1.5">
                <Target className="w-4 h-4 text-[#A1A1A1]" /> Precisión por Nivel MCER
              </h3>
              
              <div className="space-y-3">
                {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as LevelMCER[]).map((lvl) => {
                  const progress = stats.levelStats?.[lvl] || { correct: 0, total: 0 };
                  const pct = progress.total > 0 ? Math.round((progress.correct / progress.total) * 100) : 0;
                  
                  return (
                    <div key={lvl} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#EDEDED] font-medium">Nivel {lvl}</span>
                        <span className="text-[#A1A1A1]">
                          {progress.total > 0 ? `${pct}% (${progress.correct}/${progress.total})` : 'Sin entrenar'}
                        </span>
                      </div>
                      <div className="w-full bg-[#0A0A0A] h-1 rounded-full overflow-hidden border border-[#222]">
                        <div 
                          className="bg-white h-full rounded-full"
                          style={{ width: `${progress.total > 0 ? pct : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[#A1A1A1] text-xs leading-relaxed border-t border-[#1F1F1F] pt-4 mt-4">
              AcentOS analiza continuamente tus respuestas. A medida que resuelves desafíos de niveles superiores (B2, C1), la dificultad media de tus entrenamientos se adapta automáticamente.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'mistakes' && (
        <div className="bg-[#161616] border border-[#222] p-5 rounded-lg space-y-4">
          <h3 className="text-sm font-semibold tracking-widest text-[#A1A1A1] uppercase font-mono flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Perfil de Errores Críticos
          </h3>
          <p className="text-[#A1A1A1] text-xs">
            Palabras que has fallado más veces. El algoritmo de Spaced Repetition (repaso espaciado) las insertará con prioridad en tus próximas sesiones.
          </p>

          {frequentMistakesArray.length > 0 ? (
            <div className="divide-y divide-[#1F1F1F] pt-2">
              {frequentMistakesArray.map((m) => (
                <div key={m.wordId} className="py-3 flex flex-col sm:flex-row justify-between items-start gap-2 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-[#EDEDED] font-display">{m.word}</span>
                      <span className="px-2 py-0.5 border border-rose-900/40 bg-rose-950/20 text-rose-400 font-mono text-[10px] rounded">
                        Fallada {m.incorrectCount} veces
                      </span>
                    </div>
                    <p className="text-[#A1A1A1] italic">"{m.explanation}"</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[#A1A1A1] font-mono text-[10px]">Corrección</span>
                    <div className="font-bold text-emerald-400 font-mono">{m.word}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#A1A1A1] text-xs italic">
              ¡Excelente! No tienes errores críticos registrados todavía. Sigue practicando para generar tu perfil.
            </div>
          )}
        </div>
      )}

      {/* Danger zone / Reset */}
      {onResetStats && (
        <div className="flex justify-end pt-4">
          <button
            onClick={() => {
              if (window.confirm('¿Estás seguro de que deseas reiniciar todas las estadísticas? Esta acción es irreversible.')) {
                onResetStats();
              }
            }}
            className="text-[10px] font-mono text-neutral-600 hover:text-rose-500 border border-transparent hover:border-rose-950 px-2.5 py-1 rounded transition-all cursor-pointer"
          >
            Reiniciar historial de entrenamiento
          </button>
        </div>
      )}
    </div>
  );
}
