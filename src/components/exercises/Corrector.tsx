import React, { useMemo, useState, useEffect } from 'react';
import { ExerciseProps } from './types';
import { WORDS_DATABASE } from '../../data/words';
import { buildCorrectorText } from '../../engine/corrector';
import { Word } from '../../types';

function seededRng(seed: string): () => number {
  let a = 0;
  for (let i = 0; i < seed.length; i++) a = (a * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * «Cazador de erratas» — micro-texto de 2-3 frases con 1-2 palabras saboteadas.
 * El usuario toca las palabras mal escritas; acierta si marca todas las erratas
 * sin falsos positivos. El texto se genera 100 % desde datos existentes.
 */
export default function Corrector({ word, answered, onResult }: ExerciseProps) {
  const { tokens, errorIndexes } = useMemo(() => {
    const rng = seededRng(word.id);
    const exampleWords: Word[] = WORDS_DATABASE.filter(w => !!w.example && w.example.includes('___'));
    const others = shuffle(exampleWords.filter(w => w.id !== word.id), rng).slice(0, 2);
    const pool =
      word.example && word.example.includes('___')
        ? [word, ...others]
        : shuffle(exampleWords, rng).slice(0, 3);
    return buildCorrectorText(pool, seededRng(word.id + '·'));
  }, [word.id]);

  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    setSelected(new Set());
  }, [word.id]);

  const errorSet = useMemo(() => new Set(errorIndexes), [errorIndexes]);

  const toggle = (idx: number) => {
    if (answered) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const submit = () => {
    if (answered) return;
    const allErrorsMarked = errorIndexes.every(i => selected.has(i));
    const noFalsePositives = [...selected].every(i => errorSet.has(i));
    onResult(allErrorsMarked && noFalsePositives);
  };

  return (
    <div>
      <div className="text-center">
        <div className="text-[9px] tracking-[0.3em] text-[var(--color-fg-dim)] uppercase mb-[26px]">Cazador de erratas</div>
        <p className="text-[11px] text-[var(--color-fg-muted)] mb-7">Tocá las palabras mal escritas ({errorIndexes.length})</p>
      </div>
      <div className="max-w-xl mx-auto border border-[var(--color-line-soft)] px-6 py-7 leading-[2.1] text-lg text-center">
        {tokens.map((token, idx) => {
          if (!token.isWord) return <span key={idx}>{token.text}</span>;
          const isSel = selected.has(idx);
          return (
            <span
              key={idx}
              onClick={() => toggle(idx)}
              className={`cursor-pointer transition-colors ${
                isSel
                  ? 'bg-[var(--color-fg)] text-black px-0.5'
                  : 'hover:text-[var(--color-fg)] text-[var(--color-fg-soft)] underline decoration-dotted decoration-[var(--color-fg-faint)] underline-offset-4'
              }`}
            >
              {token.text}
            </span>
          );
        })}
      </div>
      <div className="flex justify-center mt-8">
        <button
          onClick={submit}
          className="brutal-btn px-8 py-3.5 text-black text-xs tracking-[0.1em] cursor-pointer"
          id="btn-corrector-submit"
        >
          Corregir <span className="opacity-60">({selected.size} marcada{selected.size === 1 ? '' : 's'})</span>
        </button>
      </div>
    </div>
  );
}
