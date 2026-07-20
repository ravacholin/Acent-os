import React, { useEffect, useMemo } from 'react';
import { ExerciseProps } from './types';
import ExerciseShell from './ExerciseShell';
import { getRuleDistractors } from '../../data/words';

// RNG determinista sembrado con el id de la palabra: el orden de las opciones es
// estable entre renders pero varía entre palabras.
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

/**
 * «¿Por qué?» — se muestra la palabra correcta y 3 reglas candidatas (la real +
 * 2 distractoras plausibles). Entrena el porqué, no solo el reflejo.
 */
export default function LaRegla({ word, answered, onResult }: ExerciseProps) {
  const options = useMemo(() => {
    const rng = seededRng(word.id);
    const opts = [word.rule, ...getRuleDistractors(word.rule, 2, rng)];
    // Barajar posiciones de forma estable
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts;
  }, [word.id, word.rule]);

  const respond = (rule: string) => {
    if (answered) return;
    onResult(rule === word.rule);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (answered) return;
      const n = parseInt(e.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= options.length) respond(options[n - 1]);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [answered, options, word]);

  return (
    <ExerciseShell word={word}>
      <div>
        <div className="text-center">
          <div className="text-[9px] tracking-[0.3em] text-[var(--color-fg-dim)] uppercase mb-[26px]">¿Por qué?</div>
          <div className="display-heavy text-6xl">{word.word}</div>
          <p className="text-[11px] text-[var(--color-fg-muted)] mt-4">¿Qué regla explica su acentuación?</p>
        </div>
        <div className="flex flex-col gap-2.5 mt-8 max-w-[520px] mx-auto">
          {options.map((rule, idx) => (
            <button
              key={idx}
              onClick={() => respond(rule)}
              className="text-left px-5 py-4 border border-[var(--color-line)] hover:bg-[var(--color-fg)] hover:text-black cursor-pointer transition-colors flex items-baseline gap-3"
              id={`btn-rule-${idx}`}
            >
              <span className="text-[9px] text-[var(--color-fg-dim)] shrink-0">[ {idx + 1} ]</span>
              <span className="text-sm leading-snug">{rule}</span>
            </button>
          ))}
        </div>
      </div>
    </ExerciseShell>
  );
}
