import React, { useEffect } from 'react';
import { ExerciseProps } from './types';
import ExerciseShell from './ExerciseShell';
import { isAmbiguousWord, getHomophonePartner, getMisaccentedForm } from '../../data/words';

/** Modo 3: Encontrá el error — elegir la grafía correcta entre dos. */
export default function EncontraError({ word, answered, onResult }: ExerciseProps) {
  const isAmbiguous = isAmbiguousWord(word);

  const options = React.useMemo(() => {
    const correctOption = word.word;
    let incorrectOption = word.wordClean;
    if (isAmbiguous) {
      // Ambas grafías son válidas; el distractor es la pareja homófona.
      incorrectOption = getHomophonePartner(word);
    } else if (!word.hasTilde) {
      // La palabra correcta no lleva tilde: el distractor la acentúa mal.
      incorrectOption = getMisaccentedForm(word);
    }
    // Orden determinista según la longitud del id.
    const order = word.id.length % 2 === 0;
    return order ? [correctOption, incorrectOption] : [incorrectOption, correctOption];
  }, [word, isAmbiguous]);

  const respond = (selected: string) => {
    if (answered) return;
    onResult(selected === word.word);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (answered) return;
      if (e.key === '1') respond(options[0]);
      else if (e.key === '2') respond(options[1]);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [answered, options, word]);

  return (
    <ExerciseShell word={word}>
      <div>
        <p className="text-center text-[11px] text-[var(--color-fg-muted)] mb-7">
          {isAmbiguous ? 'Elegí la forma correcta para la frase' : 'Elegí la palabra escrita correctamente'}
        </p>
        <div className="flex justify-center gap-5 flex-wrap">
          {options.map((opt, oIdx) => (
            <button
              key={oIdx}
              onClick={() => respond(opt)}
              className="w-full max-w-[220px] p-7 border border-[var(--color-line)] text-left hover:bg-[var(--color-fg)] hover:text-black cursor-pointer transition-colors"
              id={`btn-option-${oIdx}`}
            >
              <div className="text-[9px] text-[var(--color-fg-dim)] tracking-[0.1em] mb-3 uppercase">Opción {oIdx + 1}</div>
              <div className="display-heavy text-[32px] break-words">{opt}</div>
            </button>
          ))}
        </div>
      </div>
    </ExerciseShell>
  );
}
