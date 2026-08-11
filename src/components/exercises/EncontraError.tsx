import React from 'react';
import { ExerciseProps } from './types';
import ExerciseShell from './ExerciseShell';
import { useNumericKeys } from '../../hooks/useNumericKeys';
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

  useNumericKeys(options.length, (i) => respond(options[i]), !answered);

  return (
    <ExerciseShell word={word}>
      <div>
        <div className="hud tracking-[0.3em] mb-[26px] text-center">Encontrá el error</div>
        <p className="text-center text-[13px] text-[var(--color-fg-muted)] mb-7">
          {isAmbiguous ? 'Elegí la forma correcta para la frase' : 'Elegí la palabra escrita correctamente'}
        </p>
        <div className="flex justify-center gap-5 flex-wrap">
          {options.map((opt, oIdx) => (
            <button
              key={oIdx}
              onClick={() => respond(opt)}
              className="w-full max-w-[220px] p-7 btn-ghost text-left cursor-pointer"
              id={`btn-option-${oIdx}`}
            >
              <div className="hud text-current opacity-55 mb-3">Opción {oIdx + 1}</div>
              <div className="display-lg break-words">{opt}</div>
            </button>
          ))}
        </div>
      </div>
    </ExerciseShell>
  );
}
