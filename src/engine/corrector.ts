import { Word } from '../types';
import { getMisaccentedForm } from '../data/words';

/**
 * Generador de texto para «Cazador de erratas» (corrector).
 *
 * Arma un micro-texto concatenando las frases `example` de 2-3 palabras de la
 * sesión (sustituyendo el hueco `___` por la palabra). De las palabras objetivo,
 * 1-2 se sabotean introduciendo un error de tilde. El usuario debe tocar las
 * palabras mal escritas.
 *
 * Función PURA con RNG inyectable. Garantías (verificadas por tests):
 *   - el sabotaje nunca reproduce la grafía correcta;
 *   - `tokens.map(t => t.text).join('')` reconstruye exactamente el texto.
 */

export type RNG = () => number;

export interface CorrectorToken {
  text: string;      // texto exacto tal como se muestra
  isWord: boolean;   // token de palabra (clickeable) vs. espacio/puntuación
  sabotaged: boolean;// true solo en las erratas insertadas
}

export interface CorrectorResult {
  tokens: CorrectorToken[];
  errorIndexes: number[]; // índices (en tokens) de las erratas a encontrar
}

const WORD_RE = /[A-Za-zÁÉÍÓÚáéíóúÜüÑñ]+/g;

function shuffle<T>(arr: T[], rng: RNG): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Introduce un error de tilde: quita la tilde si la hay, o agrega una mal puesta. */
export function sabotageWord(word: Word): string {
  if (word.hasTilde) return word.wordClean; // quita la tilde
  return getMisaccentedForm(word);          // agrega una tilde donde no va
}

function tokenizeText(str: string): CorrectorToken[] {
  const tokens: CorrectorToken[] = [];
  let last = 0;
  for (const m of str.matchAll(WORD_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) tokens.push({ text: str.slice(last, idx), isWord: false, sabotaged: false });
    tokens.push({ text: m[0], isWord: true, sabotaged: false });
    last = idx + m[0].length;
  }
  if (last < str.length) tokens.push({ text: str.slice(last), isWord: false, sabotaged: false });
  return tokens;
}

export function buildCorrectorText(words: Word[], rng: RNG = Math.random): CorrectorResult {
  const candidates = words.filter(w => !!w.example && w.example.includes('___'));
  // Si ninguna palabra tiene ejemplo, arma un marco mínimo con la primera.
  const targets =
    candidates.length > 0
      ? shuffle(candidates, rng).slice(0, 3)
      : words.slice(0, 1);

  // Cuántas saboteamos: 1, o 2 si hay al menos dos objetivos.
  const sabotageCount = targets.length >= 2 && rng() < 0.5 ? 2 : 1;
  const sabotageSet = new Set(
    shuffle(targets.map((_, i) => i), rng).slice(0, Math.min(sabotageCount, targets.length))
  );

  const tokens: CorrectorToken[] = [];
  const errorIndexes: number[] = [];

  targets.forEach((word, i) => {
    const example = word.example && word.example.includes('___') ? word.example : `Revisá ___ con atención.`;
    const parts = example.split('___');
    const before = parts[0] ?? '';
    const after = parts[1] ?? '';
    const doSabotage = sabotageSet.has(i);
    const form = doSabotage ? sabotageWord(word) : word.word;

    tokens.push(...tokenizeText(before));
    const tokenIdx = tokens.length;
    tokens.push({ text: form, isWord: true, sabotaged: doSabotage });
    if (doSabotage) errorIndexes.push(tokenIdx);
    tokens.push(...tokenizeText(after));

    if (i < targets.length - 1) {
      // Separador entre oraciones: agrega punto solo si la frase no terminó ya
      // en un signo de puntuación (?, !, .).
      const trimmed = after.trimEnd();
      const endsWithPunct = /[.?!…]$/.test(trimmed);
      tokens.push({ text: endsWithPunct ? ' ' : '. ', isWord: false, sabotaged: false });
    }
  });

  return { tokens, errorIndexes };
}
