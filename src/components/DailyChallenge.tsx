import React from 'react';
import { Word, UserStats } from '../types';
import { WORDS_DATABASE } from '../data/words';
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
    const dayLetters = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const res = localStorage.getItem(`daily-challenge-${dateStr}`);
      records.push({
        dateStr,
        label: dayLetters[date.getDay()],
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
    <div id="daily-challenge">
      <div className="border-b border-[#1a1a1a] pb-[22px] mb-8">
        <div className="font-display text-[34px]">Desafío diario</div>
        <p className="text-[#888] text-[11px] mt-1.5">Una prueba fija de 20 palabras, una vez al día</p>
      </div>

      {!isCompleted ? (
        <div className="flex justify-between items-center gap-10 flex-wrap" id="daily-challenge-pending">
          <div className="flex-1 min-w-[280px]">
            <div className="text-[9px] tracking-[0.2em] text-[#666] uppercase mb-4">Hoy · 20 palabras</div>
            <div className="font-display text-[30px] leading-[1.2]">Poné a prueba tu intuición diaria</div>
            <p className="text-[#888] text-xs mt-3.5 leading-relaxed max-w-[420px]">
              Combinación balanceada de hiatos, agudas y tildes diacríticas. Tiempo estimado: 1.5 minutos. Recompensa: +100 XP.
            </p>
          </div>
          <button
            onClick={handleLaunch}
            className="px-8 py-4 border border-[#F5F5F0] text-xs tracking-[0.1em] cursor-pointer whitespace-nowrap hover:bg-[#F5F5F0] hover:text-black transition-colors"
          >
            Empezar desafío
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} id="daily-challenge-completed">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[11px] text-[#999]">Completado hoy — vuelve mañana</span>
          </div>

          <div className="grid grid-cols-3 border-t border-b border-[#1a1a1a] mt-5">
            <div className="py-[26px] text-center border-r border-[#1a1a1a]">
              <div className="text-[9px] tracking-[0.2em] text-[#666] uppercase">Puntuación</div>
              <div className="font-display text-[34px] sm:text-[42px] mt-2.5">{resultData.correctCount} / 20</div>
            </div>
            <div className="py-[26px] text-center border-r border-[#1a1a1a]">
              <div className="text-[9px] tracking-[0.2em] text-[#666] uppercase">Tiempo</div>
              <div className="font-display text-[34px] sm:text-[42px] mt-2.5">{(resultData.timeTakenSeconds || 0).toFixed(0)}s</div>
            </div>
            <div className="py-[26px] text-center">
              <div className="text-[9px] tracking-[0.2em] text-[#666] uppercase">Recompensa</div>
              <div className="font-display text-[34px] sm:text-[42px] mt-2.5">+{resultData.xpEarned || 100} XP</div>
            </div>
          </div>

          <div className="flex gap-1.5 items-end h-[70px] mt-8">
            {history.map((h) => (
              <div key={h.dateStr} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                {h.completed ? (
                  <div className="w-full bg-[#F5F5F0]" style={{ height: `${Math.max(8, (h.score / 20) * 60)}px` }} />
                ) : (
                  <div className="w-full border border-dashed border-[#2a2a2a]" style={{ height: '3px' }} />
                )}
                <span className="text-[9px] text-[#666]">{h.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
