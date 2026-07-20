import React from 'react';
import { Achievement, UserStats } from '../types';
import { motion } from 'motion/react';

interface AchievementsPanelProps {
  stats: UserStats;
  achievements: Achievement[];
  // Cuando se monta dentro de Progreso ya hay un encabezado; ocultamos el propio.
  embedded?: boolean;
}

export default function AchievementsPanel({ stats, achievements, embedded }: AchievementsPanelProps) {

  // Check progress toward each achievement dynamically
  const calculateProgress = (ach: Achievement): number => {
    if (ach.unlockedAt) return 100;

    switch (ach.id) {
      case 'ach-seen-100':
        return Math.min(100, Math.round((stats.wordsSeen / ach.requirement) * 100));
      case 'ach-seen-500':
        return Math.min(100, Math.round((stats.wordsSeen / ach.requirement) * 100));
      case 'ach-streak-50':
        return Math.min(100, Math.round((stats.bestStreak / ach.requirement) * 100));
      case 'ach-accuracy-90':
        return stats.wordsSeen >= 20 ? (stats.accuracy >= 90 ? 100 : 0) : Math.min(100, Math.round((stats.wordsSeen / 20) * 100));
      case 'ach-hiatos': {
        const catStat = stats.categoryStats?.['hiato'] || { correct: 0, total: 0 };
        if (catStat.total < 5) {
          return Math.round((catStat.total / 5) * 100 * 0.5); // 50% max weight for count
        }
        const pct = (catStat.correct / catStat.total) * 100;
        return pct >= ach.requirement ? 100 : Math.round(pct);
      }
      case 'ach-esdrujulas': {
        const catStat = stats.categoryStats?.['esdrújula'] || { correct: 0, total: 0 };
        if (catStat.total < 5) {
          return Math.round((catStat.total / 5) * 100 * 0.5);
        }
        const pct = (catStat.correct / catStat.total) * 100;
        return pct >= ach.requirement ? 100 : Math.round(pct);
      }
      case 'ach-diacriticas': {
        const catStat = stats.categoryStats?.['diacrítica'] || { correct: 0, total: 0 };
        if (catStat.total < 5) {
          return Math.round((catStat.total / 5) * 100 * 0.5);
        }
        const pct = (catStat.correct / catStat.total) * 100;
        return pct >= ach.requirement ? 100 : Math.round(pct);
      }
      default:
        return 0;
    }
  };

  return (
    <div id="achievements-panel">
      {!embedded && (
        <div className="border-b border-[var(--color-line-soft)] pb-[22px] mb-8">
          <div className="display-brutal text-[34px] sm:text-[40px]">Logros</div>
          <p className="text-[var(--color-fg-muted)] text-[11px] mt-2">Hitos de dominio de la prosodia y ortografía</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 border-t border-l border-[var(--color-line-soft)]" id="achievements-grid">
        {achievements.map((ach, idx) => {
          const progress = calculateProgress(ach);
          const isUnlocked = !!ach.unlockedAt || progress >= 100;

          return (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, delay: idx * 0.03 }}
              className={`border-r border-b border-[var(--color-line-soft)] p-6 ${isUnlocked ? '' : 'opacity-55'}`}
            >
              <div className="flex justify-between items-baseline gap-3">
                <span className="display-heavy text-[19px]">{ach.title}</span>
                <span
                  className={`text-[9px] tracking-[0.1em] px-2 py-0.5 border ${
                    isUnlocked ? 'border-[var(--color-fg)] text-[var(--color-fg)]' : 'border-[var(--color-line)] text-[var(--color-fg-dim)]'
                  }`}
                >
                  {ach.unlockedAt ? 'DESBLOQUEADO' : `${progress}%`}
                </span>
              </div>
              <p className="text-[var(--color-fg-muted)] text-[11px] mt-2 leading-relaxed">{ach.description}</p>
              <div className="mt-3.5 h-[2px] bg-[var(--color-surface-2)]">
                <div className="h-full bg-[var(--color-fg)]" style={{ width: `${progress}%` }} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// El catálogo de logros vive ahora en el motor (engine/achievements.ts).
// Se re-exporta acá por compatibilidad con imports existentes.
export { INITIAL_ACHIEVEMENTS } from '../engine/achievements';
