import { PracticePack, Word } from '../types';

/**
 * Packs de práctica compartibles.
 *
 * Un pack es un set fijo de palabras que un docente arma y comparte por enlace.
 * Como la app no tiene backend, el pack viaja codificado en el hash de la URL
 * (`#pack=<base64url>`). El alumno abre el enlace, la app decodifica el pack y
 * ofrece arrancar una sesión con esas palabras exactas.
 *
 * Módulo PURO: encode/decode/resolve no tocan el DOM. `packUrl` acepta una base
 * inyectable para poder testearla sin `window`.
 */

/** Tope de palabras por pack: mantiene la URL y la sesión manejables. */
export const MAX_PACK_WORDS = 40;

// --- base64url (dependency-free, unicode-safe) -----------------------------

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// --- construcción / validación ---------------------------------------------

/** Normaliza una lista de ids en un pack: recorta espacios, deduplica y capa. */
export function createPack(wordIds: string[], name?: string): PracticePack {
  const seen = new Set<string>();
  const w: string[] = [];
  for (const raw of wordIds) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    w.push(id);
    if (w.length >= MAX_PACK_WORDS) break;
  }
  const trimmedName = name?.trim();
  const pack: PracticePack = { v: 1, w };
  if (trimmedName) pack.n = trimmedName;
  return pack;
}

function isValidPack(value: unknown): value is PracticePack {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<PracticePack>;
  if (p.v !== 1) return false;
  if (!Array.isArray(p.w) || !p.w.every(id => typeof id === 'string')) return false;
  if (p.n !== undefined && typeof p.n !== 'string') return false;
  return true;
}

// --- encode / decode --------------------------------------------------------

export function encodePack(pack: PracticePack): string {
  const json = JSON.stringify({ v: pack.v, n: pack.n, w: pack.w });
  return toBase64Url(new TextEncoder().encode(json));
}

/** Decodifica un string base64url a pack. Devuelve null si es inválido. */
export function decodePack(encoded: string): PracticePack | null {
  try {
    const json = new TextDecoder().decode(fromBase64Url(encoded));
    const parsed = JSON.parse(json);
    if (!isValidPack(parsed)) return null;
    // Renormaliza (dedup + cap) para no confiar en un payload manipulado.
    return createPack(parsed.w, parsed.n);
  } catch {
    return null;
  }
}

// --- resolución a palabras --------------------------------------------------

/**
 * Mapea los ids del pack a objetos Word del banco, preservando el orden del
 * pack, descartando ids desconocidos y deduplicando.
 */
export function resolvePackWords(pack: PracticePack, allWords: Word[]): Word[] {
  const byId = new Map(allWords.map(w => [w.id, w]));
  const out: Word[] = [];
  const used = new Set<string>();
  for (const id of pack.w) {
    if (used.has(id)) continue;
    const word = byId.get(id);
    if (word) {
      out.push(word);
      used.add(id);
    }
  }
  return out;
}

// --- URL --------------------------------------------------------------------

/** Base por defecto: origen + path actuales (sin query ni hash). */
function currentBase(): string {
  if (typeof location === 'undefined') return '';
  return `${location.origin}${location.pathname}`;
}

export function packUrl(pack: PracticePack, base: string = currentBase()): string {
  return `${base}#pack=${encodePack(pack)}`;
}

/** Lee un pack desde un hash tipo `#pack=...`. Devuelve null si no hay o es inválido. */
export function readPackFromHash(hash: string): PracticePack | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return null;
  const enc = new URLSearchParams(raw).get('pack');
  if (!enc) return null;
  return decodePack(enc);
}
