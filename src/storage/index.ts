import { UserStats, AppSettings, Achievement } from '../types';

/**
 * Estado persistido versionado bajo una única clave `acentos-state`.
 *
 * Reemplaza las claves sueltas legacy (`acentos-user-stats`, `acentos-settings`,
 * `acentos-achievements`, `acentos-recent-words`) y, desde la v3, también las
 * claves `daily-challenge-YYYY-MM-DD`. Al cargar, se migra una sola vez todo lo
 * viejo y se borran las claves antiguas, para nunca perder el progreso.
 */

export const STATE_KEY = 'acentos-state';

export const LEGACY_KEYS = {
  stats: 'acentos-user-stats',
  settings: 'acentos-settings',
  achievements: 'acentos-achievements',
  recentWords: 'acentos-recent-words'
} as const;

export const DAILY_PREFIX = 'daily-challenge-';

export const CURRENT_VERSION = 3 as const;

export interface DailyResult {
  correctCount: number;
  timeTakenSeconds: number;
  xpEarned: number;
}

export interface PersistedState {
  version: typeof CURRENT_VERSION;
  stats: UserStats;
  settings: AppSettings;
  achievements: Achievement[];
  recentWords: string[];
  dailyChallenges: Record<string, DailyResult>; // clave: "YYYY-MM-DD"
}

export interface PersistDefaults {
  stats: UserStats;
  settings: AppSettings;
  achievements: Achievement[];
}

// Acceso tolerante a entornos sin localStorage (tests, SSR).
function getStore(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function readJSON<T>(store: Storage, key: string): T | null {
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Recoge (y opcionalmente borra) todas las claves `daily-challenge-*`. */
function sweepDailyKeys(store: Storage, remove: boolean): Record<string, DailyResult> {
  const out: Record<string, DailyResult> = {};
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key && key.startsWith(DAILY_PREFIX)) keys.push(key);
  }
  for (const key of keys) {
    const value = readJSON<DailyResult>(store, key);
    if (value) out[key.slice(DAILY_PREFIX.length)] = value;
    if (remove) {
      try { store.removeItem(key); } catch { /* ignore */ }
    }
  }
  return out;
}

/** Construye el objeto v3 desde claves legacy. null si no había ninguna. */
export function migrateLegacy(store: Storage, defaults: PersistDefaults): PersistedState | null {
  const legacyStats = readJSON<UserStats>(store, LEGACY_KEYS.stats);
  const legacySettings = readJSON<AppSettings>(store, LEGACY_KEYS.settings);
  const legacyAchievements = readJSON<Achievement[]>(store, LEGACY_KEYS.achievements);
  const legacyRecent = readJSON<string[]>(store, LEGACY_KEYS.recentWords);
  const dailyChallenges = sweepDailyKeys(store, false);

  const hasAny =
    legacyStats !== null ||
    legacySettings !== null ||
    legacyAchievements !== null ||
    legacyRecent !== null ||
    Object.keys(dailyChallenges).length > 0;
  if (!hasAny) return null;

  return {
    version: CURRENT_VERSION,
    stats: legacyStats ?? defaults.stats,
    settings: legacySettings ?? defaults.settings,
    achievements: legacyAchievements ?? defaults.achievements,
    recentWords: Array.isArray(legacyRecent) ? legacyRecent : [],
    dailyChallenges
  };
}

function clearLegacy(store: Storage): void {
  for (const key of Object.values(LEGACY_KEYS)) {
    try { store.removeItem(key); } catch { /* ignore */ }
  }
}

/** Normaliza cualquier objeto persistido/importado (v2 o v3) al esquema actual. */
export function coerceState(raw: Record<string, unknown>, defaults: PersistDefaults): PersistedState {
  const r = raw as Partial<PersistedState>;
  return {
    version: CURRENT_VERSION,
    stats: r.stats ?? defaults.stats,
    settings: r.settings ?? defaults.settings,
    achievements: Array.isArray(r.achievements) ? r.achievements : defaults.achievements,
    recentWords: Array.isArray(r.recentWords) ? r.recentWords : [],
    dailyChallenges: r.dailyChallenges && typeof r.dailyChallenges === 'object' ? r.dailyChallenges : {}
  };
}

/**
 * Carga el estado persistido. Orden de prioridad:
 *   1. Clave nueva `acentos-state` (v2 se actualiza a v3 barriendo daily keys).
 *   2. Migración desde claves legacy (se guarda y se borran las viejas).
 *   3. Valores por defecto.
 */
export function loadState(defaults: PersistDefaults): PersistedState {
  const store = getStore();
  const fallback: PersistedState = coerceState({}, defaults);
  if (!store) return fallback;

  const existing = readJSON<Omit<Partial<PersistedState>, 'version'> & { version?: number }>(store, STATE_KEY);
  if (existing && (existing.version === CURRENT_VERSION || existing.version === 2)) {
    // Al subir desde v2, incorpora las claves daily sueltas y las borra.
    const daily =
      existing.version === 2
        ? { ...sweepDailyKeys(store, true), ...(existing.dailyChallenges ?? {}) }
        : existing.dailyChallenges ?? {};
    const state = coerceState({ ...existing, dailyChallenges: daily }, defaults);
    if (existing.version === 2) saveState(state);
    return state;
  }

  const migrated = migrateLegacy(store, defaults);
  if (migrated) {
    saveState(migrated);
    clearLegacy(store);
    sweepDailyKeys(store, true); // borra las daily keys ya incorporadas
    return migrated;
  }

  return fallback;
}

export function saveState(state: PersistedState): void {
  const store = getStore();
  if (!store) return;
  try {
    store.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / serialization errors */
  }
}

/** Valida un objeto importado: debe ser v2 o v3 con las secciones núcleo. */
export function isValidPersistedState(value: unknown): value is Partial<PersistedState> {
  if (!value || typeof value !== 'object') return false;
  const v = value as { version?: number; stats?: unknown; settings?: unknown; achievements?: unknown };
  return (
    (v.version === CURRENT_VERSION || v.version === 2) &&
    !!v.stats &&
    typeof v.stats === 'object' &&
    !!v.settings &&
    typeof v.settings === 'object' &&
    Array.isArray(v.achievements)
  );
}
