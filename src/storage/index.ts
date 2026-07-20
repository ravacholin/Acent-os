import { UserStats, AppSettings, Achievement } from '../types';

/**
 * Estado persistido versionado bajo una única clave `acentos-state`.
 *
 * Reemplaza las claves sueltas legacy (`acentos-user-stats`, `acentos-settings`,
 * `acentos-achievements`, `acentos-recent-words`). Al cargar, si no existe la
 * clave nueva pero sí las legacy, se migran una sola vez y se borran las viejas,
 * para nunca perder el progreso de un usuario que vuelve.
 */

export const STATE_KEY = 'acentos-state';

export const LEGACY_KEYS = {
  stats: 'acentos-user-stats',
  settings: 'acentos-settings',
  achievements: 'acentos-achievements',
  recentWords: 'acentos-recent-words'
} as const;

export const CURRENT_VERSION = 2 as const;

export interface PersistedState {
  version: typeof CURRENT_VERSION;
  stats: UserStats;
  settings: AppSettings;
  achievements: Achievement[];
  recentWords: string[];
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

/**
 * Construye el objeto v2 desde las claves legacy. Devuelve null si NO había
 * ninguna clave legacy (usuario totalmente nuevo).
 */
export function migrateLegacy(store: Storage, defaults: PersistDefaults): PersistedState | null {
  const legacyStats = readJSON<UserStats>(store, LEGACY_KEYS.stats);
  const legacySettings = readJSON<AppSettings>(store, LEGACY_KEYS.settings);
  const legacyAchievements = readJSON<Achievement[]>(store, LEGACY_KEYS.achievements);
  const legacyRecent = readJSON<string[]>(store, LEGACY_KEYS.recentWords);

  const hasAny =
    legacyStats !== null ||
    legacySettings !== null ||
    legacyAchievements !== null ||
    legacyRecent !== null;
  if (!hasAny) return null;

  return {
    version: CURRENT_VERSION,
    stats: legacyStats ?? defaults.stats,
    settings: legacySettings ?? defaults.settings,
    achievements: legacyAchievements ?? defaults.achievements,
    recentWords: Array.isArray(legacyRecent) ? legacyRecent : []
  };
}

function clearLegacy(store: Storage): void {
  for (const key of Object.values(LEGACY_KEYS)) {
    try {
      store.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Carga el estado persistido. Orden de prioridad:
 *   1. Clave nueva `acentos-state`.
 *   2. Migración desde claves legacy (se guarda y se borran las viejas).
 *   3. Valores por defecto.
 */
export function loadState(defaults: PersistDefaults): PersistedState {
  const store = getStore();
  const fallback: PersistedState = { version: CURRENT_VERSION, ...defaults, recentWords: [] };
  if (!store) return fallback;

  const existing = readJSON<PersistedState>(store, STATE_KEY);
  if (existing && existing.version === CURRENT_VERSION) {
    return {
      version: CURRENT_VERSION,
      stats: existing.stats ?? defaults.stats,
      settings: existing.settings ?? defaults.settings,
      achievements: existing.achievements ?? defaults.achievements,
      recentWords: Array.isArray(existing.recentWords) ? existing.recentWords : []
    };
  }

  const migrated = migrateLegacy(store, defaults);
  if (migrated) {
    saveState(migrated);
    clearLegacy(store);
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

/** Valida (superficialmente) un objeto importado antes de aceptarlo. */
export function isValidPersistedState(value: unknown): value is PersistedState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<PersistedState>;
  return (
    v.version === CURRENT_VERSION &&
    !!v.stats &&
    typeof v.stats === 'object' &&
    !!v.settings &&
    typeof v.settings === 'object' &&
    Array.isArray(v.achievements)
  );
}
