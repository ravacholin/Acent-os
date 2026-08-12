import { GameMode, Word, SRSEntry } from '../types';
import { isAmbiguousWord, hasMultipleVowels } from '../data/words';

// `seededRng` vive ahora en un util compartido; se re-exporta para no romper a
// los consumidores que ya lo importaban desde este módulo (App, tests).
export { seededRng } from '../utils/rng';

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
    case 'clasificacion':
      // Un monosílabo no tiene sílaba tónica que discriminar ni clasificación
      // aguda/grave/esdrújula: pedir cualquiera de las dos cosas es absurdo.
      return word.syllables.length >= 2;
    case 'donde-va-tilde':
      // Con una sola vocal hay una única opción posible: sin desafío, fuera.
      return word.hasTilde && hasMultipleVowels(word);
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
