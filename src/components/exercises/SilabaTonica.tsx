import React, { useEffect } from 'react';
import { ExerciseProps } from './types';
import ExerciseShell from './ExerciseShell';
import { speakWord } from '../../utils/audio';

/**
 * «¿Dónde suena?» — se muestran las sílabas como botones y el usuario toca la
 * tónica. Es el paso pedagógico previo a toda regla de tildación.
 */
export default function SilabaTonica({ word, settings, answered, onResult }: ExerciseProps) {
  const respond = (idx: number) => {
    if (answered) return;
    onResult(idx === word.stressedSyllableIdx);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (answered) return;
      const n = parseInt(e.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= word.syllables.length) respond(n - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [answered, word]);

  return (
    <ExerciseShell word={word}>
      <div className="text-center">
        <div className="text-[9px] tracking-[0.3em] text-[var(--color-fg-dim)] uppercase mb-[26px]">¿Dónde suena?</div>
        <p className="text-[11px] text-[var(--color-fg-muted)] mb-7">Tocá la sílaba tónica (la que suena más fuerte)</p>
        <div className="flex justify-center gap-2.5 flex-wrap">
          {word.syllables.map((syllable, idx) => (
            <button
              key={idx}
              onClick={() => respond(idx)}
              className="min-w-[72px] px-5 py-6 border border-[var(--color-line)] hover:bg-[var(--color-fg)] hover:text-black cursor-pointer transition-colors"
              id={`btn-syllable-${idx}`}
            >
              <div className="display-heavy text-3xl lowercase">{syllable}</div>
              <div className="text-[9px] text-[var(--color-fg-dim)] mt-2">[ {idx + 1} ]</div>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => speakWord(word.word, settings.soundEnabled)}
          className="mt-8 inline-flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase text-[var(--color-fg-quiet)] hover:text-[var(--color-fg)] cursor-pointer transition-colors"
          title="Escuchar la palabra"
        >
          ♪ Escuchar
        </button>
      </div>
    </ExerciseShell>
  );
}
