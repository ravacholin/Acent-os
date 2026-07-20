export type LevelMCER = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type WordClassification = 'aguda' | 'grave' | 'esdrújula' | 'sobreesdrújula';

export type WordCategory =
  | 'aguda'
  | 'grave'
  | 'esdrújula'
  | 'sobreesdrújula'
  | 'hiato'
  | 'diptongo'
  | 'triptongo'
  | 'monosílabo'
  | 'diacrítica'
  | 'interrogativo'
  | 'exclamativo'
  | 'mayúscula'
  | 'extranjerismo'
  | 'latinismo'
  | 'mente'
  | 'pronombre';

export interface Word {
  id: string;
  word: string;               // Correct word with correct accents (e.g., "camión")
  wordClean: string;          // Word without any accents/tildes (e.g., "camion")
  syllables: string[];        // Syllable breakdown (e.g., ["ca", "mión"])
  stressedSyllableIdx: number;// Index of the stressed syllable in syllables array (0-indexed)
  classification: WordClassification;
  category: WordCategory;
  level: LevelMCER;
  hasTilde: boolean;
  rule: string;               // Grammatical rule
  explanation: string;        // Short explanation (max 3 lines)
  frequency: 'alta' | 'media' | 'baja';
  options?: string[];         // Alternatives for Mode 3 (e.g., ["camión", "camion"])
  sense?: string;             // Grammatical function for ambiguous pairs (e.g., "artículo", "pronombre personal")
  example?: string;           // Context sentence with the target position marked by "___" (e.g., "___ coche es rojo")
}

export type GameMode =
  | 'lleva-tilde'      // Mode 1: ¿Lleva tilde?
  | 'escribi-tilde'    // Mode 2: Escribí la tilde
  | 'encontra-error'   // Mode 3: Encontrá el error
  | 'donde-va-tilde'   // Mode 4: ¿Dónde va la tilde?
  | 'clasificacion'    // Mode 5: Clasificación
  | 'dictado'          // Mode 6: Dictado (TTS)
  | 'silaba-tonica'    // Mode: ¿Dónde suena? (tocar la sílaba tónica)
  | 'la-regla'         // Mode: ¿Por qué? (elegir la regla)
  | 'contexto'         // Mode: El contexto manda (par diacrítico en una frase)
  | 'corrector'        // Mode: Cazador de erratas (marcar palabras mal escritas)
  | 'adaptativo'       // Sesión adaptativa: pickFormat elige el formato por palabra
  | 'supervivencia'    // Mode 7: Supervivencia (Cronómetro)
  | 'infinito'         // Mode 8: Infinito
  | 'personalizado';   // Mode 9: Configuración personalizada

export interface AppSettings {
  darkModeOnly: boolean;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  showExplanationOnError: boolean;
  showSyllables: boolean;
  showRule: boolean;
  showLevel: boolean;
}

// Preferencias por defecto. El sonido es lo único que el usuario puede alternar
// (icono de altavoz en la barra); el resto queda fijo en estos valores.
export const DEFAULT_SETTINGS: AppSettings = {
  darkModeOnly: true,
  soundEnabled: true,
  animationsEnabled: true,
  showExplanationOnError: true,
  showSyllables: true,
  showRule: true,
  showLevel: true
};

export interface UserStats {
  wordsSeen: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number; // Percentage
  currentStreak: number;
  bestStreak: number;
  totalTimeSeconds: number;
  xp: number;
  level: number;
  categoryStats: Record<WordCategory, { correct: number; total: number }>;
  levelStats: Record<LevelMCER, { correct: number; total: number }>;
  frequentMistakes: Record<string, { wordId: string; word: string; incorrectCount: number; explanation: string }>;
  masteredWords: string[]; // List of wordIds with consecutive correct answers
  dailyHistory: Record<string, number>; // Date string "YYYY-MM-DD" -> words practiced
  spacedRepetition?: Record<string, SRSEntry>;
}

// Leitner spaced-repetition record for a single word.
export interface SRSEntry {
  wordId: string;
  box: number;                 // Leitner box (1..5)
  consecutiveCorrect: number;
  lastSeenTimestamp: number;
  nextReviewTimestamp: number;
  failCount: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'count' | 'streak' | 'accuracy' | 'category' | 'mode';
  requirement: number;
  targetCategory?: WordCategory;
  unlockedAt?: string; // Date string
  icon: string; // Lucide icon name
}

export interface GameSessionState {
  mode: GameMode;
  words: Word[];
  currentIndex: number;
  correctCount: number;
  incorrectCount: number;
  streak: number;
  score: number;
  timeLeft: number; // Used in survival
  initialTime: number; // Used in survival
  startTime: number; // Timestamp of game start
  finished?: boolean; // set by the session reducer when the session ends
  history: Array<{
    wordId: string;
    userAnswer: string | boolean | number;
    isCorrect: boolean;
    timeTakenMs: number;
  }>;
}
