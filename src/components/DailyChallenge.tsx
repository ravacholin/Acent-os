import React from 'react';
import { Word, UserStats } from '../types';
import { WORDS_DATABASE } from '../data/words';
import { Calendar, Award, CheckCircle, Zap, Star, BarChart3, Play } from 'lucide-react';
import { motion } from 'motion/react';

interface DailyChallengeProps {
  stats: UserStats;
  onStartChallenge: (words: Word[]) => void;
}

export default function DailyChallenge({ stats, onStartChallenge }: DailyChallengeProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Deterministic daily word selector based on the date
  const getDailyWords = (): Word[] => {
    let hash = 0;
    for (let i = 0; i < todayStr.length; i++) {
      hash = todayStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const shuffled = [...WORDS_DATABASE];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const r = Math.abs((hash + i) % (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[r];
      shuffled[r] = temp;
    }
    return shuffled.slice(0, 20);
  };

  const dailyWords = getDailyWords();
  
  // Check if completed today from localStorage
  const dailyKey = `daily-challenge-${todayStr}`;
  const savedResult = localStorage.getItem(dailyKey);
  const isCompleted = !!savedResult;
  const resultData = isCompleted ? JSON.parse(savedResult) : null;

  // Gather historic daily challenge records
  const getHistoricRecords = () => {
    const records = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const res = localStorage.getItem(`daily-challenge-${dateStr}`);
      records.push({
        dateStr,
        label: date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
        completed: !!res,
        score: res ? JSON.parse(res).correctCount : 0
      });
    }
    return records;
  };

  const history = getHistoricRecords();

  const handleLaunch = () => {
    onStartChallenge(dailyWords);
  };

  return (
    <div className="space-y-6" id="daily-challenge">
      <div className="border-b border-[#1F1F1F] pb-5">
        <h2 className="text-2xl font-semibold tracking-tight text-[#EDEDED] font-display">Desafío Diario</h2>
        <p className="text-[#A1A1A1] text-sm mt-1">
          Una prueba única de 20 palabras seleccionadas al azar. Solo se puede jugar una vez al día.
        </p>
      </div>

      {isCompleted ? (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#161616] border border-[#222] p-6 rounded-lg space-y-6"
          id="daily-challenge-completed"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-950/20 border border-emerald-900/60 text-emerald-400 rounded-md">
              <CheckCircle className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#EDEDED] font-display">¡Desafío completado hoy!</h3>
              <p className="text-[#A1A1A1] text-xs">Vuelve mañana para una nueva combinación de palabras.</p>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-b border-[#1F1F1F] py-6">
            <div className="text-center sm:text-left space-y-1">
              <span className="text-[#A1A1A1] text-[10px] uppercase tracking-widest font-mono">Puntuación</span>
              <div className="text-2xl font-bold text-[#EDEDED] flex items-center justify-center sm:justify-start gap-1">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400/20" />
                <span>{resultData.correctCount} / 20</span>
              </div>
              <p className="text-[#A1A1A1] text-[11px] font-mono">{(resultData.correctCount / 20 * 100).toFixed(0)}% de precisión</p>
            </div>

            <div className="text-center sm:text-left space-y-1">
              <span className="text-[#A1A1A1] text-[10px] uppercase tracking-widest font-mono">Tiempo Total</span>
              <div className="text-2xl font-bold text-[#EDEDED] flex items-center justify-center sm:justify-start gap-1">
                <Zap className="w-5 h-5 text-cyan-400" />
                <span>{(resultData.timeTakenSeconds || 0).toFixed(0)}s</span>
              </div>
              <p className="text-[#A1A1A1] text-[11px] font-mono">Promedio: {((resultData.timeTakenSeconds || 0) / 20).toFixed(1)}s por palabra</p>
            </div>

            <div className="text-center sm:text-left space-y-1">
              <span className="text-[#A1A1A1] text-[10px] uppercase tracking-widest font-mono">Recompensa</span>
              <div className="text-2xl font-bold text-emerald-400 flex items-center justify-center sm:justify-start gap-1">
                <Award className="w-5 h-5 text-emerald-400" />
                <span>+{resultData.xpEarned || 100} XP</span>
              </div>
              <p className="text-[#A1A1A1] text-[11px] font-mono">Multiplicador diario aplicado</p>
            </div>
          </div>

          {/* Historic Chart */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold tracking-widest text-[#A1A1A1] uppercase font-mono flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-[#A1A1A1]" /> Historial de la Semana
            </h4>
            
            <div className="grid grid-cols-7 gap-2 h-24 items-end pt-4">
              {history.map((h, i) => (
                <div key={h.dateStr} className="flex flex-col items-center gap-1.5 h-full justify-end">
                  {h.completed ? (
                    <div 
                      className="w-full bg-white rounded-t transition-all cursor-pointer"
                      style={{ height: `${(h.score / 20) * 80 + 10}%` }}
                      title={`Puntuación: ${h.score}/20`}
                    />
                  ) : (
                    <div className="w-full bg-[#0A0A0A] border border-dashed border-[#222] h-2 rounded-t" />
                  )}
                  <span className="text-[9px] font-mono text-[#A1A1A1] truncate max-w-full text-center">
                    {h.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="bg-[#161616] border border-[#222] p-8 rounded-lg flex flex-col md:flex-row justify-between items-center gap-6" id="daily-challenge-pending">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 border border-amber-900/40 bg-amber-950/20 text-amber-400 font-mono text-[10px] rounded flex items-center gap-1">
                <Calendar className="w-3 h-3" /> HOY
              </span>
              <span className="text-[#A1A1A1] font-mono text-xs">20 palabras rápidas</span>
            </div>
            <h3 className="text-xl font-bold text-[#EDEDED] font-display">Pon a prueba tu intuición diaria</h3>
            <p className="text-[#A1A1A1] text-sm leading-relaxed max-w-xl">
              El desafío de hoy contiene una combinación balanceada de hiatos, palabras agudas y tildes diacríticas de nivel avanzado. ¿Podrás conseguir una puntuación perfecta?
            </p>
            <div className="flex gap-6 pt-2 text-[#A1A1A1] font-mono text-[11px]">
              <div>• Tiempo medio estimado: <span className="text-[#EDEDED]">1.5 minutos</span></div>
              <div>• XP extra: <span className="text-emerald-400 font-semibold">+100 XP por completar</span></div>
            </div>
          </div>

          <button
            onClick={handleLaunch}
            className="w-full md:w-auto px-6 py-3.5 bg-white text-black font-semibold rounded hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shrink-0 text-sm cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current text-black" />
            Empezar Desafío
          </button>
        </div>
      )}
    </div>
  );
}
