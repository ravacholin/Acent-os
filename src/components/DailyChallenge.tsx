import React from 'react';
import { Word, UserStats } from '../types';
import { WORDS_DATABASE } from '../data/words';
import { DailyResult } from '../storage';
import { motion } from 'motion/react';

interface DailyChallengeProps {
  stats: UserStats;
  dailyChallenges: Record<string, DailyResult>;
  onStartChallenge: (words: Word[]) => void;
}

export default function DailyChallenge({ stats, dailyChallenges, onStartChallenge }: DailyChallengeProps) {
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

  // Check if completed today desde el objeto versionado
  const resultData = dailyChallenges[todayStr] || null;
  const isCompleted = !!resultData;

  // Gather historic daily challenge records
  const getHistoricRecords = () => {
    const records = [];
    const today = new Date();
    const dayLetters = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const res = dailyChallenges[dateStr];
      records.push({
        dateStr,
        label: dayLetters[date.getDay()],
        completed: !!res,
        score: res ? res.correctCount : 0
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
      <div className="border-b border-[var(--color-line-soft)] pb-[22px] mb-8">
        <div className="display-lg">Desafío diario</div>
        <p className="text-[var(--color-fg-muted)] text-[13px] mt-2.5">Una prueba fija de 20 palabras, una vez al día</p>
      </div>

      {!isCompleted ? (
        <div className="flex justify-between items-center gap-10 flex-wrap" id="daily-challenge-pending">
          <div className="flex-1 min-w-[280px]">
            <div className="hud mb-4">Hoy · 20 palabras</div>
            <div className="display-md">Poné a prueba tu intuición diaria</div>
            <p className="text-[var(--color-fg-muted)] text-[13px] mt-4 leading-relaxed max-w-[420px]">
              Combinación balanceada de hiatos, agudas y tildes diacríticas. Tiempo estimado: 1.5 minutos. Recompensa: +100 XP.
            </p>
          </div>
          <button
            onClick={handleLaunch}
            className="btn-ghost hud px-8 py-4 cursor-pointer whitespace-nowrap"
          >
            Empezar desafío
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} id="daily-challenge-completed">
          <div className="flex justify-between items-baseline mb-2">
            <span className="hud text-[var(--color-fg-soft)]">Completado hoy — volvé mañana</span>
          </div>

          <div className="grid grid-cols-3 border-t border-b border-[var(--color-line-soft)] mt-5">
            <div className="py-[26px] text-center border-r border-[var(--color-line-soft)]">
              <div className="hud">Puntuación</div>
              <div className="display-lg num mt-3">{resultData.correctCount}/20</div>
            </div>
            <div className="py-[26px] text-center border-r border-[var(--color-line-soft)]">
              <div className="hud">Tiempo</div>
              <div className="display-lg num mt-3">{(resultData.timeTakenSeconds || 0).toFixed(0)}s</div>
            </div>
            <div className="py-[26px] text-center">
              <div className="hud">Recompensa</div>
              <div className="display-lg num mt-3">+{resultData.xpEarned || 100} XP</div>
            </div>
          </div>

          <div className="flex gap-1.5 items-end h-[70px] mt-8">
            {history.map((h) => (
              <div key={h.dateStr} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                {h.completed ? (
                  <div className="w-full bg-[var(--color-fg)]" style={{ height: `${Math.max(8, (h.score / 20) * 60)}px` }} />
                ) : (
                  <div className="w-full border border-dashed border-[var(--color-line)]" style={{ height: '3px' }} />
                )}
                <span className="hud">{h.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
