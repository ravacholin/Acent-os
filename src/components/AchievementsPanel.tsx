import React from 'react';
import { Achievement, UserStats } from '../types';
import { motion } from 'motion/react';

interface AchievementsPanelProps {
  stats: UserStats;
  achievements: Achievement[];
}

export default function AchievementsPanel({ stats, achievements }: AchievementsPanelProps) {

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
      <div className="border-b border-[#1a1a1a] pb-[22px] mb-8">
        <div className="font-display text-[34px]">Logros</div>
        <p className="text-[#888] text-[11px] mt-1.5">Hitos de dominio de la prosodia y ortografía</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 border-t border-l border-[#1a1a1a]" id="achievements-grid">
        {achievements.map((ach, idx) => {
          const progress = calculateProgress(ach);
          const isUnlocked = !!ach.unlockedAt || progress >= 100;

          return (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, delay: idx * 0.03 }}
              className={`border-r border-b border-[#1a1a1a] p-6 ${isUnlocked ? '' : 'opacity-55'}`}
            >
              <div className="flex justify-between items-baseline">
                <span className="font-display text-[19px]">{ach.title}</span>
                <span
                  className={`text-[9px] tracking-[0.1em] px-2 py-0.5 border ${
                    isUnlocked ? 'border-[#F5F5F0] text-[#F5F5F0]' : 'border-[#2a2a2a] text-[#666]'
                  }`}
                >
                  {ach.unlockedAt ? 'DESBLOQUEADO' : `${progress}%`}
                </span>
              </div>
              <p className="text-[#888] text-[11px] mt-2 leading-relaxed">{ach.description}</p>
              <div className="mt-3.5 h-[2px] bg-[#161616]">
                <div className="h-full bg-[#F5F5F0]" style={{ width: `${progress}%` }} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach-seen-100',
    title: 'Iniciado de la Prosodia',
    description: 'Ve 100 palabras en el banco de acentuación.',
    category: 'count',
    requirement: 100,
    icon: 'BookOpen'
  },
  {
    id: 'ach-seen-500',
    title: 'Inspector de Vocales',
    description: 'Ve 500 palabras y expande tu biblioteca mental.',
    category: 'count',
    requirement: 500,
    icon: 'Trophy'
  },
  {
    id: 'ach-streak-50',
    title: 'Flujo Perfecto',
    description: 'Logra una racha consecutiva de 50 aciertos sin cometer errores.',
    category: 'streak',
    requirement: 50,
    icon: 'Flame'
  },
  {
    id: 'ach-accuracy-90',
    title: 'Precisión de Relojero',
    description: 'Mantén una precisión mayor al 90% en tus últimas 20 palabras.',
    category: 'accuracy',
    requirement: 90,
    icon: 'Target'
  },
  {
    id: 'ach-hiatos',
    title: 'Maestro del Hiato',
    description: 'Consigue más del 85% de precisión en la categoría Hiatos (mínimo 5 palabras).',
    category: 'category',
    requirement: 85,
    targetCategory: 'hiato',
    icon: 'Sparkles'
  },
  {
    id: 'ach-esdrujulas',
    title: 'Acento Antepenúltimo',
    description: 'Consigue más del 85% de precisión en la categoría Esdrújulas (mínimo 5 palabras).',
    category: 'category',
    requirement: 85,
    targetCategory: 'esdrújula',
    icon: 'Zap'
  },
  {
    id: 'ach-diacriticas',
    title: 'Especialista en Distinciones',
    description: 'Consigue más del 85% de precisión en palabras Diacríticas (mínimo 5 palabras).',
    category: 'category',
    requirement: 85,
    targetCategory: 'diacrítica',
    icon: 'Award'
  }
];
