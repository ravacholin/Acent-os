import React from 'react';
import { ExerciseProps } from './types';
import ExerciseShell from './ExerciseShell';

/** Modo 4: ¿Dónde va la tilde? — tocar la vocal que lleva la tilde. */
export default function DondeVaTilde({ word, answered, onResult }: ExerciseProps) {
  // Índice de la letra que difiere entre la palabra acentuada y la limpia.
  const correctLetterIdx = React.useMemo(() => {
    const correct = word.word.toLowerCase();
    const clean = word.wordClean.toLowerCase();
    for (let i = 0; i < correct.length; i++) {
      if (correct[i] !== clean[i]) return i;
    }
    return -1;
  }, [word]);

  const handleLetterClick = (idx: number, char: string) => {
    if (answered) return;
    const isVowel = 'aeiou'.includes(char.toLowerCase());
    if (!isVowel) return; // las consonantes no aceptan tilde
    onResult(idx === correctLetterIdx);
  };

  return (
    <ExerciseShell word={word}>
      <div>
        <p className="text-center text-[11px] text-[var(--color-fg-muted)] mb-[30px]">Hacé clic sobre la vocal que lleva la tilde</p>
        <div className="flex justify-center gap-2">
          {word.wordClean.split('').map((char, letterIdx) => {
            const isVowel = 'aeiou'.includes(char.toLowerCase());
            return (
              <button
                key={letterIdx}
                onClick={() => handleLetterClick(letterIdx, char)}
                className={
                  isVowel
                    ? 'w-11 h-[52px] flex items-center justify-center text-xl border border-[var(--color-line)] text-[var(--color-fg)] hover:bg-[var(--color-fg)] hover:text-black cursor-pointer transition-colors'
                    : 'w-11 h-[52px] flex items-center justify-center text-xl border border-[var(--color-surface-2)] bg-[var(--color-surface-2)] text-[var(--color-ink-4)] cursor-not-allowed'
                }
              >
                {char}
              </button>
            );
          })}
        </div>
      </div>
    </ExerciseShell>
  );
}
