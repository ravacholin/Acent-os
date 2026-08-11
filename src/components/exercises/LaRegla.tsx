import React, { useMemo } from 'react';
import { ExerciseProps } from './types';
import ExerciseShell from './ExerciseShell';
import { getRuleDistractors } from '../../data/words';
import { seededRng } from '../../utils/rng';
import { useNumericKeys } from '../../hooks/useNumericKeys';

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

  useNumericKeys(options.length, (i) => respond(options[i]), !answered);

  return (
    <ExerciseShell word={word}>
      <div>
        <div className="text-center">
          <div className="hud tracking-[0.3em] mb-[26px]">¿Por qué?</div>
          <div className="display-lg">{word.word}</div>
          <p className="text-[13px] text-[var(--color-fg-muted)] mt-4">¿Qué regla explica su acentuación?</p>
        </div>
        <div className="flex flex-col gap-2.5 mt-8 max-w-[520px] mx-auto">
          {options.map((rule, idx) => (
            <button
              key={idx}
              onClick={() => respond(rule)}
              className="text-left px-5 py-4 btn-ghost cursor-pointer flex items-baseline gap-3"
              id={`btn-rule-${idx}`}
            >
              <span className="hud text-current opacity-55 shrink-0">[ {idx + 1} ]</span>
              <span className="text-sm leading-snug">{rule}</span>
            </button>
          ))}
        </div>
      </div>
    </ExerciseShell>
  );
}
