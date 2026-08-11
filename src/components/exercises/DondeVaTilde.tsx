import React from 'react';
import { ExerciseProps } from './types';
import ExerciseShell from './ExerciseShell';
import ListenButton from './ListenButton';
import { useNumericKeys } from '../../hooks/useNumericKeys';

const VOWELS = 'aeiou';

/** Modo 4: ¿Dónde va la tilde? — tocar (o teclear) la vocal que lleva la tilde. */
export default function DondeVaTilde({ word, settings, answered, onResult }: ExerciseProps) {
  // Índice de la letra que difiere entre la palabra acentuada y la limpia.
  const correctLetterIdx = React.useMemo(() => {
    const correct = word.word.toLowerCase();
    const clean = word.wordClean.toLowerCase();
    for (let i = 0; i < correct.length; i++) {
      if (correct[i] !== clean[i]) return i;
    }
    return -1;
  }, [word]);

  // Posiciones (índice de letra) de las vocales, en orden: son las respondibles y
  // las que reciben un número de teclado.
  const vowelPositions = React.useMemo(
    () =>
      word.wordClean
        .split('')
        .map((char, idx) => (VOWELS.includes(char.toLowerCase()) ? idx : -1))
        .filter((idx) => idx >= 0),
    [word]
  );

  const respondByLetterIdx = (letterIdx: number) => {
    if (answered) return;
    onResult(letterIdx === correctLetterIdx);
  };

  useNumericKeys(vowelPositions.length, (i) => respondByLetterIdx(vowelPositions[i]), !answered);

  return (
    <ExerciseShell word={word}>
      <div className="text-center">
        <div className="hud tracking-[0.3em] mb-[26px]">¿Dónde va la tilde?</div>
        <p className="text-[13px] text-[var(--color-fg-muted)] mb-[30px]">Tocá la vocal que lleva la tilde</p>
        <div className="flex justify-center gap-2 flex-wrap">
          {word.wordClean.split('').map((char, letterIdx) => {
            const isVowel = VOWELS.includes(char.toLowerCase());
            if (!isVowel) {
              return (
                <button
                  key={letterIdx}
                  type="button"
                  disabled
                  aria-hidden="true"
                  tabIndex={-1}
                  className="w-11 h-[52px] flex items-center justify-center text-xl border border-transparent bg-[var(--color-surface-2)] text-[var(--color-fg-faint)] cursor-not-allowed"
                >
                  {char}
                </button>
              );
            }
            const vowelNumber = vowelPositions.indexOf(letterIdx) + 1;
            return (
              <button
                key={letterIdx}
                type="button"
                onClick={() => respondByLetterIdx(letterIdx)}
                aria-label={`Vocal ${char}, opción ${vowelNumber}`}
                className="btn-ghost min-w-11 h-[52px] px-1 pt-1.5 pb-1 flex flex-col items-center justify-center cursor-pointer"
              >
                <span className="text-xl leading-none">{char}</span>
                <span className="hud text-current opacity-55 mt-1">[ {vowelNumber} ]</span>
              </button>
            );
          })}
        </div>
        <ListenButton word={word.word} soundEnabled={settings.soundEnabled} variant="pill" />
      </div>
    </ExerciseShell>
  );
}
