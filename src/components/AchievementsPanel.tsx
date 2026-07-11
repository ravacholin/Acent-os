import React from 'react';
import { Achievement, UserStats } from '../types';
import { 
  Trophy, 
  Award, 
  Flame, 
  Target, 
  Sparkles, 
  Zap, 
  BookOpen, 
  Lock, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { motion } from 'motion/react';

interface AchievementsPanelProps {
  stats: UserStats;
  achievements: Achievement[];
}

export default function AchievementsPanel({ stats, achievements }: AchievementsPanelProps) {
  
  // Icon selector helper
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Trophy': return Trophy;
      case 'Award': return Award;
      case 'Flame': return Flame;
      case 'Target': return Target;
      case 'Sparkles': return Sparkles;
      case 'Zap': return Zap;
      case 'BookOpen': return BookOpen;
      default: return HelpCircle;
    }
  };

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
    <div className="space-y-6" id="achievements-panel">
      <div className="border-b border-neutral-900 pb-5">
        <h2 className="text-2xl font-semibold tracking-tight text-white font-display">Logros de Aprendizaje</h2>
        <p className="text-neutral-500 text-sm mt-1">
          Hitos que acreditan tu dominio de la prosodia y ortografía en español. Completamente basados en práctica real.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="achievements-grid">
        {achievements.map((ach, idx) => {
          const Icon = getIconComponent(ach.icon);
          const progress = calculateProgress(ach);
          const isUnlocked = !!ach.unlockedAt || progress >= 100;

          return (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
              className={`p-5 rounded-lg border transition-all duration-300 flex items-start gap-4 ${
                isUnlocked 
                  ? 'bg-neutral-950/40 border-neutral-800' 
                  : 'bg-neutral-950/20 border-neutral-900/60 opacity-65'
              }`}
            >
              <div className={`p-3 rounded-md border shrink-0 transition-colors ${
                isUnlocked 
                  ? 'bg-neutral-900 border-neutral-700 text-white' 
                  : 'bg-neutral-950 border-neutral-900 text-neutral-600'
              }`}>
                {isUnlocked ? (
                  <Icon className="w-5 h-5 text-white stroke-[2]" />
                ) : (
                  <Lock className="w-5 h-5 stroke-[2]" />
                )}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h3 className={`text-sm font-semibold truncate ${isUnlocked ? 'text-white font-display' : 'text-neutral-500'}`}>
                    {ach.title}
                  </h3>
                  {ach.unlockedAt && (
                    <span className="text-[9px] font-mono text-emerald-400 border border-emerald-950 px-1.5 py-0.5 rounded bg-emerald-950/10 shrink-0">
                      DESBLOQUEADO
                    </span>
                  )}
                </div>
                <p className="text-neutral-500 text-xs leading-relaxed">
                  {ach.description}
                </p>

                {/* Progress bar */}
                {!ach.unlockedAt && (
                  <div className="space-y-1 pt-1.5">
                    <div className="flex justify-between items-center text-[10px] font-mono text-neutral-600">
                      <span>Progreso</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-neutral-950 h-1 rounded overflow-hidden">
                      <div 
                        className="bg-neutral-700 h-full rounded transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
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
