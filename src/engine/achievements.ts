import { Achievement, UserStats } from '../types';

/**
 * Reglas de logros — catálogo inicial + evaluación de desbloqueo.
 * Movido desde `AchievementsPanel.tsx` (catálogo) y `App.tsx`
 * (checkUnlockAchievements) para que `AchievementsPanel` sea solo UI.
 */

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

/** ¿Se cumple la condición de desbloqueo de un logro dado el estado actual? */
export function isUnlocked(achievementId: string, stats: UserStats): boolean {
  switch (achievementId) {
    case 'ach-seen-100':
      return stats.wordsSeen >= 100;
    case 'ach-seen-500':
      return stats.wordsSeen >= 500;
    case 'ach-streak-50':
      return stats.bestStreak >= 50;
    case 'ach-accuracy-90':
      return stats.wordsSeen >= 20 && stats.accuracy >= 90;
    case 'ach-hiatos': {
      const s = stats.categoryStats['hiato'];
      return !!s && s.total >= 5 && s.correct / s.total >= 0.85;
    }
    case 'ach-esdrujulas': {
      const s = stats.categoryStats['esdrújula'];
      return !!s && s.total >= 5 && s.correct / s.total >= 0.85;
    }
    case 'ach-diacriticas': {
      const s = stats.categoryStats['diacrítica'];
      return !!s && s.total >= 5 && s.correct / s.total >= 0.85;
    }
    default:
      return false;
  }
}

export interface AchievementCheckResult {
  updated: Achievement[];
  newlyUnlocked: Achievement[];
}

/**
 * Marca los logros recién desbloqueados. `dateLabel` es inyectable para tests;
 * por defecto usa la fecha local en formato es-ES (comportamiento original).
 */
export function checkUnlockAchievements(
  stats: UserStats,
  achievements: Achievement[],
  dateLabel: () => string = () => new Date().toLocaleDateString('es-ES')
): AchievementCheckResult {
  const newlyUnlocked: Achievement[] = [];
  const updated = achievements.map(ach => {
    if (ach.unlockedAt) return ach;
    if (isUnlocked(ach.id, stats)) {
      const unlocked = { ...ach, unlockedAt: dateLabel() };
      newlyUnlocked.push(unlocked);
      return unlocked;
    }
    return ach;
  });
  return { updated, newlyUnlocked };
}
