import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadState,
  saveState,
  STATE_KEY,
  LEGACY_KEYS,
  CURRENT_VERSION,
  isValidPersistedState,
  PersistDefaults
} from './index';
import { createDefaultStats } from '../engine/stats';
import { INITIAL_ACHIEVEMENTS } from '../engine/achievements';
import { DEFAULT_SETTINGS } from '../types';

// Mock mínimo de localStorage en memoria.
class MemoryStorage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
  key(i: number) { return Array.from(this.map.keys())[i] ?? null; }
}

const defaults = (): PersistDefaults => ({
  stats: createDefaultStats(),
  settings: DEFAULT_SETTINGS,
  achievements: INITIAL_ACHIEVEMENTS
});

beforeEach(() => {
  (globalThis as any).localStorage = new MemoryStorage();
});

describe('storage', () => {
  it('devuelve defaults para un usuario nuevo', () => {
    const state = loadState(defaults());
    expect(state.version).toBe(CURRENT_VERSION);
    expect(state.stats.xp).toBe(0);
    expect(state.recentWords).toEqual([]);
  });

  it('migra desde las claves legacy y las borra', () => {
    const legacyStats = createDefaultStats();
    legacyStats.xp = 320;
    legacyStats.wordsSeen = 45;
    localStorage.setItem(LEGACY_KEYS.stats, JSON.stringify(legacyStats));
    localStorage.setItem(LEGACY_KEYS.settings, JSON.stringify({ ...DEFAULT_SETTINGS, soundEnabled: false }));
    localStorage.setItem(LEGACY_KEYS.recentWords, JSON.stringify(['café', 'sofá']));

    const state = loadState(defaults());

    // El progreso viejo se conserva
    expect(state.stats.xp).toBe(320);
    expect(state.stats.wordsSeen).toBe(45);
    expect(state.settings.soundEnabled).toBe(false);
    expect(state.recentWords).toEqual(['café', 'sofá']);

    // Se guardó bajo la clave nueva
    const raw = localStorage.getItem(STATE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).version).toBe(CURRENT_VERSION);

    // Las claves legacy fueron eliminadas
    expect(localStorage.getItem(LEGACY_KEYS.stats)).toBeNull();
    expect(localStorage.getItem(LEGACY_KEYS.settings)).toBeNull();
    expect(localStorage.getItem(LEGACY_KEYS.recentWords)).toBeNull();
  });

  it('usa la clave nueva si ya existe (sin re-migrar)', () => {
    const fresh = createDefaultStats();
    fresh.xp = 999;
    saveState({
      version: CURRENT_VERSION,
      stats: fresh,
      settings: DEFAULT_SETTINGS,
      achievements: INITIAL_ACHIEVEMENTS,
      recentWords: ['x'],
      dailyChallenges: {}
    });
    // También hay claves legacy con otro valor: deben ignorarse.
    localStorage.setItem(LEGACY_KEYS.stats, JSON.stringify(createDefaultStats()));

    const state = loadState(defaults());
    expect(state.stats.xp).toBe(999);
    expect(state.recentWords).toEqual(['x']);
  });

  it('valida objetos importados (acepta v2 y v3, rechaza el resto)', () => {
    expect(isValidPersistedState(null)).toBe(false);
    expect(isValidPersistedState({ version: 1 })).toBe(false);
    expect(isValidPersistedState({ version: CURRENT_VERSION, stats: {}, settings: {}, achievements: [] })).toBe(true);
    // v2 (versión vieja) también se acepta para importar/migrar
    expect(isValidPersistedState({ version: 2, stats: {}, settings: {}, achievements: [] })).toBe(true);
  });

  it('barre las claves daily-challenge-* al migrar desde legacy', () => {
    localStorage.setItem(LEGACY_KEYS.stats, JSON.stringify(createDefaultStats()));
    localStorage.setItem('daily-challenge-2026-07-19', JSON.stringify({ correctCount: 18, timeTakenSeconds: 90, xpEarned: 190 }));

    const state = loadState(defaults());
    expect(state.dailyChallenges['2026-07-19']).toEqual({ correctCount: 18, timeTakenSeconds: 90, xpEarned: 190 });
    expect(localStorage.getItem('daily-challenge-2026-07-19')).toBeNull();
  });

  it('actualiza un estado v2 existente a v3 incorporando las daily keys', () => {
    // Estado guardado con el esquema viejo (v2, sin dailyChallenges)
    localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 2,
      stats: createDefaultStats(),
      settings: DEFAULT_SETTINGS,
      achievements: INITIAL_ACHIEVEMENTS,
      recentWords: ['w1']
    }));
    localStorage.setItem('daily-challenge-2026-07-18', JSON.stringify({ correctCount: 10, timeTakenSeconds: 60, xpEarned: 150 }));

    const state = loadState(defaults());
    expect(state.version).toBe(CURRENT_VERSION);
    expect(state.recentWords).toEqual(['w1']);
    expect(state.dailyChallenges['2026-07-18']).toBeTruthy();
    // Se persiste ya en v3 y la daily key suelta desaparece
    expect(JSON.parse(localStorage.getItem(STATE_KEY)!).version).toBe(CURRENT_VERSION);
    expect(localStorage.getItem('daily-challenge-2026-07-18')).toBeNull();
  });
});
