import React from 'react';
import { ExerciseProps } from './types';
import ExerciseShell from './ExerciseShell';
import ListenButton from './ListenButton';
import { useNumericKeys } from '../../hooks/useNumericKeys';
import { stripAccents } from '../../data/words';

/**
 * «¿Dónde suena?» — se muestran las sílabas como botones y el usuario toca la
 * tónica. Es el paso pedagógico previo a toda regla de tildación.
 *
 * Las sílabas se muestran SIN tilde: identificar la tónica leyendo la tilde ya
 * impresa sería trivial y no ejercita nada. Aquí el alumno debe reconocer el
 * énfasis por el sonido (de ahí el botón de escuchar); la tilde reaparece en el
 * feedback, que es el momento pedagógico para mostrar la ortografía correcta.
 */
export default function SilabaTonica({ word, settings, answered, onResult }: ExerciseProps) {
  const respond = (idx: number) => {
    if (answered) return;
    onResult(idx === word.stressedSyllableIdx);
  };

  useNumericKeys(word.syllables.length, respond, !answered);

  return (
    <ExerciseShell word={word}>
      <div className="text-center">
        <div className="hud tracking-[0.3em] mb-[26px]">¿Dónde suena?</div>
        <p className="text-[13px] text-[var(--color-fg-muted)] mb-7">Tocá la sílaba tónica (la que suena más fuerte)</p>
        <div className="flex justify-center gap-2.5 flex-wrap">
          {word.syllables.map((syllable, idx) => (
            <button
              key={idx}
              onClick={() => respond(idx)}
              className="min-w-[72px] px-5 py-6 btn-ghost cursor-pointer"
              id={`btn-syllable-${idx}`}
            >
              <div className="display-md lowercase">{stripAccents(syllable)}</div>
              <div className="hud text-current opacity-55 mt-2">[ {idx + 1} ]</div>
            </button>
          ))}
        </div>
        <ListenButton word={word.word} soundEnabled={settings.soundEnabled} variant="pill" />
      </div>
    </ExerciseShell>
  );
}
