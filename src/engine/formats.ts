import { GameMode, Word, SRSEntry } from '../types';
import { isAmbiguousWord } from '../data/words';

/**
 * Escalera adaptativa de formatos: la caja Leitner de una palabra decide qué
 * formato le toca, en una progresión reconocimiento → discriminación →
 * producción. Una palabra nueva se reconoce; una dominada se produce de memoria.
 *
 * | Caja | Formatos elegibles                                             |
 * |------|----------------------------------------------------------------|
 * | 1    | silaba-tonica, lleva-tilde                                     |
 * | 2-3  | encontra-error, clasificacion, donde-va-tilde, contexto*       |
 * | 4    | la-regla, escribi-tilde, corrector                             |
 * | 5    | dictado, escribi-tilde                                         |
 *
 * (*) contexto solo para palabras ambiguas con `example`. Para ambiguas,
 * `dictado` y `escribi-tilde` quedan excluidos.
 */

const TIERS: Record<number, GameMode[]> = {
  1: ['silaba-tonica', 'lleva-tilde'],
  2: ['encontra-error', 'clasificacion', 'donde-va-tilde', 'contexto'],
  3: ['encontra-error', 'clasificacion', 'donde-va-tilde', 'contexto'],
  4: ['la-regla', 'escribi-tilde', 'corrector'],
  5: ['dictado', 'escribi-tilde']
};

// `lleva-tilde` acepta cualquier palabra: es el fallback universal.
const FALLBACK: GameMode = 'lleva-tilde';

export function isFormatEligible(format: GameMode, word: Word): boolean {
  switch (format) {
    case 'silaba-tonica':
      return word.syllables.length >= 2;
    case 'donde-va-tilde':
      return word.hasTilde;
    case 'contexto':
      return isAmbiguousWord(word) && !!word.example && word.example.includes('___');
    case 'dictado':
    case 'escribi-tilde':
      return !isAmbiguousWord(word);
    default:
      return true;
  }
}

export interface PickFormatOptions {
  lastFormat?: GameMode;
  rng?: () => number;
}

export function pickFormat(word: Word, srs: SRSEntry | undefined, opts: PickFormatOptions = {}): GameMode {
  const box = Math.min(5, Math.max(1, srs?.box ?? 3));
  const tier = TIERS[box];

  let eligible = tier.filter(f => isFormatEligible(f, word));
  if (eligible.length === 0) eligible = [FALLBACK];

  // Rotación: evitar repetir el mismo formato dos veces seguidas si hay opción.
  const avoidLast = eligible.filter(f => f !== opts.lastFormat);
  const pool = avoidLast.length > 0 ? avoidLast : eligible;

  const rng = opts.rng ?? Math.random;
  return pool[Math.floor(rng() * pool.length)];
}

/** RNG determinista sembrado con un string (para formatos estables/reproducibles). */
export function seededRng(seed: string): () => number {
  let a = 0;
  for (let i = 0; i < seed.length; i++) a = (a * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
