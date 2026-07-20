import { GameMode, LevelMCER, Word, WordCategory, UserStats } from '../types';
import { WORDS_DATABASE, isAmbiguousWord } from '../data/words';
import { getWeakCategories } from '../utils/errorAnalysis';

/**
 * Selección de palabras por sesión + memoria de recientes.
 *
 * Diseño de dos cuotas (extraído sin cambios de `App.tsx`):
 *   - Una porción CAPADA de repaso (~40 %): palabras falladas + "due" por SRS,
 *     para que vuelvan con moderación en vez de inundar cada sesión.
 *   - El resto se llena con variedad fresca, prefiriendo palabras no vistas
 *     recientemente y con un leve sesgo a categorías débiles.
 *
 * Es una función PURA: recibe el estado, la lista de recientes y un RNG
 * inyectable; nunca toca localStorage.
 */

export type RNG = () => number; // devuelve [0, 1)

export const SESSION_SIZE = 10;
export const RECENT_MEMORY_CAP = 120;

/** Fisher–Yates imparcial. No muta la entrada. RNG inyectable para tests. */
export function shuffle<T>(input: T[], rng: RNG = Math.random): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Ring buffer de recientes: agrega ids nuevos al frente, deduplica y capa. */
export function pushRecent(prev: string[], ids: string[], cap: number = RECENT_MEMORY_CAP): string[] {
  return [...ids, ...prev.filter(id => !ids.includes(id))].slice(0, cap);
}

export interface SelectionContext {
  stats: UserStats;
  recentIds: string[];
  now: number;
  rng?: RNG;
}

export interface CustomOptions {
  levels: LevelMCER[];
  categories: WordCategory[];
}

export function selectSessionWords(
  mode: GameMode,
  ctx: SelectionContext,
  customOptions?: CustomOptions,
  count: number = SESSION_SIZE,
  allWords: Word[] = WORDS_DATABASE
): Word[] {
  const rng = ctx.rng ?? Math.random;
  const sh = <T,>(a: T[]): T[] => shuffle(a, rng);

  let filtered = [...allWords];

  // Filtros por modo (mismos que en la versión original).
  if (mode === 'donde-va-tilde') {
    filtered = filtered.filter(w => w.hasTilde);
  }
  if (mode === 'dictado') {
    // Los homófonos (el/él, tu/tú…) no se distinguen por audio: fuera del dictado.
    filtered = filtered.filter(w => !isAmbiguousWord(w));
  }
  if (mode === 'personalizado' && customOptions) {
    filtered = filtered.filter(
      w => customOptions.levels.includes(w.level) && customOptions.categories.includes(w.category)
    );
  }

  if (filtered.length === 0) return [];

  const now = ctx.now;
  const weakCats = getWeakCategories(ctx.stats);
  const recentSet = new Set(ctx.recentIds);
  const sr = ctx.stats.spacedRepetition || {};

  // Partición: falladas / due (acertadas pero vencidas) / resto.
  const failed: Word[] = [];
  const dueCorrect: Word[] = [];
  const rest: Word[] = [];
  for (const w of filtered) {
    const record = sr[w.id];
    if (record && record.failCount > 0) failed.push(w);
    else if (record && now >= record.nextReviewTimestamp) dueCorrect.push(w);
    else rest.push(w);
  }

  // Cuota de repaso capada (falladas primero).
  const reviewQuota = Math.min(Math.ceil(count * 0.4), failed.length + dueCorrect.length);
  const reviewPool = [...sh(failed), ...sh(dueCorrect)].slice(0, reviewQuota);

  // Relleno fresco: prioriza no-recientes y, dentro de esas, categorías débiles.
  const notRecent = sh(rest.filter(w => !recentSet.has(w.id)));
  const recent = sh(rest.filter(w => recentSet.has(w.id)));
  const weakFirst = (arr: Word[]) => {
    const weak = arr.filter(w => weakCats.includes(w.category));
    const other = arr.filter(w => !weakCats.includes(w.category));
    return [...weak, ...other];
  };
  const freshPool = [...weakFirst(notRecent), ...recent];

  const chosen = [...reviewPool, ...freshPool].slice(0, count);
  if (chosen.length < count) {
    const chosenIds = new Set(chosen.map(w => w.id));
    const leftover = [...failed, ...dueCorrect].filter(w => !chosenIds.has(w.id));
    chosen.push(...leftover.slice(0, count - chosen.length));
  }

  // Barajado final para que las de repaso no queden siempre primeras.
  return sh(chosen);
}
