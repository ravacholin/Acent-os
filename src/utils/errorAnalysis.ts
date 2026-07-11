import { UserStats, WordCategory } from '../types';

export interface ErrorProfile {
  id: string;
  name: string;
  description: string;
  categories: WordCategory[];
  recommendation: string;
  examples: string[];
  correct: number;
  total: number;
  accuracy: number;
  failCount: number;
  status: 'excelente' | 'estable' | 'crítico';
}

export function calculateErrorProfiles(stats: UserStats): ErrorProfile[] {
  const profiles = [
    {
      id: 'hiatos_diptongos',
      name: 'Grupos Vocálicos (Hiatos y Diptongos)',
      description: 'Dificultad para distinguir e identificar cuándo se acentúan los hiatos frente a diptongos al chocar vocales abiertas y cerradas.',
      categories: ['hiato', 'diptongo', 'triptongo'] as WordCategory[],
      recommendation: 'Recuerda: los hiatos formados por vocal abierta + cerrada tónica SIEMPRE llevan tilde (ej. río, baúl, país), saltándose las reglas generales. Los diptongos normales siguen las reglas de agudas, graves y esdrújulas.',
      examples: ['río', 'baúl', 'héroe', 'canción', 'búho']
    },
    {
      id: 'diacriticas',
      name: 'Tildes Diacríticas y Monosílabos',
      description: 'Confusión al aplicar la tilde diferencial (diacrítica) en palabras homófonas o monosílabos para marcar funciones gramaticales distintas.',
      categories: ['diacrítica', 'monosílabo', 'solo-solo', 'demostrativo', 'pronombre'] as WordCategory[],
      recommendation: 'Estudia las parejas clave: "él" (pronombre) vs "el" (artículo), "tú" (pronombre) vs "tu" (posesivo), "sí" (afirmación/pronombre) vs "si" (conjunción condicional). Recuerda que los demostrativos y "solo" ya nunca llevan tilde.',
      examples: ['él', 'tú', 'mí', 'sí', 'más', 'té']
    },
    {
      id: 'interrogativos',
      name: 'Acentuación Enfática (Interrogativos)',
      description: 'Omisión o mala colocación de tildes en pronombres y adverbios con sentido interrogativo o exclamativo, ya sea en expresiones directas o indirectas.',
      categories: ['interrogativo', 'exclamativo'] as WordCategory[],
      recommendation: 'Las palabras qué, quién, cómo, cuándo, dónde, cuánto, cuál llevan tilde únicamente cuando tienen valor interrogativo o exclamativo. Si actúan como relativos o conjunciones, van sin tilde (ej. "Dime qué quieres" vs "El libro que quieres").',
      examples: ['qué', 'cómo', 'cuándo', 'dónde', 'quién']
    },
    {
      id: 'acentuacion_general',
      name: 'Reglas de Acentuación General',
      description: 'Errores al aplicar las reglas básicas de acentuación basadas en la posición de la sílaba tónica (última, penúltima, antepenúltima).',
      categories: ['aguda', 'grave', 'esdrújula', 'sobreesdrújula'] as WordCategory[],
      recommendation: 'Agudas: llevan tilde si terminan en N, S o vocal. Graves: llevan tilde si NO terminan en N, S o vocal. Esdrújulas y sobreesdrújulas: siempre llevan tilde sin excepción.',
      examples: ['café', 'árbol', 'música', 'cántaselo']
    }
  ];

  return profiles.map(p => {
    let correct = 0;
    let total = 0;
    p.categories.forEach(cat => {
      const stat = stats.categoryStats?.[cat] || { correct: 0, total: 0 };
      correct += stat.correct || 0;
      total += stat.total || 0;
    });

    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100;
    const failCount = total - correct;
    
    // Define status based on threshold and experience
    let status: 'excelente' | 'estable' | 'crítico' = 'estable';
    if (total >= 3) {
      if (accuracy < 75) {
        status = 'crítico';
      } else if (accuracy >= 90) {
        status = 'excelente';
      }
    } else if (failCount > 0) {
      // Early warning if they've failed but don't have 3 trials yet
      status = 'estable';
    }

    return {
      ...p,
      correct,
      total,
      accuracy,
      failCount,
      status
    };
  });
}

/**
 * Returns a list of categories that are flagged as critical/weak for the user.
 */
export function getWeakCategories(stats: UserStats): WordCategory[] {
  const profiles = calculateErrorProfiles(stats);
  const critical = profiles.filter(p => p.status === 'crítico');
  
  if (critical.length > 0) {
    const cats: WordCategory[] = [];
    critical.forEach(p => cats.push(...p.categories));
    return cats;
  }
  
  // Fallback: any category with accuracy < 75% and total > 0
  const weakCats: WordCategory[] = [];
  const categoriesList: WordCategory[] = [
    'aguda', 'grave', 'esdrújula', 'sobreesdrújula', 'hiato', 'diptongo', 'triptongo', 'monosílabo', 'diacrítica', 'interrogativo', 'exclamativo', 'solo-solo', 'demostrativo', 'mayúscula', 'extranjerismo', 'latinismo', 'mente', 'pronombre'
  ];
  
  categoriesList.forEach(cat => {
    const stat = stats.categoryStats?.[cat];
    if (stat && stat.total > 0) {
      const pct = (stat.correct / stat.total) * 100;
      if (pct < 75) {
        weakCats.push(cat);
      }
    }
  });
  
  return weakCats;
}
