import React, { useEffect, useMemo } from 'react';
import { ExerciseProps } from './types';
import { getHomophonePartner } from '../../data/words';

/**
 * «El contexto manda» — para pares diacríticos/interrogativos: se muestra la
 * frase de ejemplo con un hueco y dos botones (la palabra y su pareja homófona).
 * A diferencia de los demás modos ambiguos, acá NO se muestra el sentido
 * gramatical: es justamente el contexto el que debe decidir.
 */
export default function Contexto({ word, answered, onResult }: ExerciseProps) {
  const options = useMemo(() => {
    const partner = getHomophonePartner(word);
    // Orden determinista según la longitud del id.
    return word.id.length % 2 === 0 ? [word.word, partner] : [partner, word.word];
  }, [word]);

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

  const sentence = (word.example || '___').replace(/___/g, '______');

  return (
    <div>
      <div className="text-center">
        <div className="text-[9px] tracking-[0.3em] text-[var(--color-fg-dim)] uppercase mb-[26px]">El contexto manda</div>
        <p className="text-[11px] text-[var(--color-fg-muted)] mb-7">¿Qué forma completa correctamente la frase?</p>
        <div className="max-w-md mx-auto border border-[var(--color-line-soft)] px-5 py-6 mb-8">
          <p className="display-heavy text-2xl leading-snug">{sentence}</p>
        </div>
      </div>
      <div className="flex justify-center gap-5 flex-wrap">
        {options.map((opt, oIdx) => (
          <button
            key={oIdx}
            onClick={() => respond(opt)}
            className="w-full max-w-[200px] p-6 border border-[var(--color-line)] text-center hover:bg-[var(--color-fg)] hover:text-black cursor-pointer transition-colors"
            id={`btn-contexto-${oIdx}`}
          >
            <div className="text-[9px] text-[var(--color-fg-dim)] tracking-[0.1em] mb-3 uppercase">[ {oIdx + 1} ]</div>
            <div className="display-heavy text-[32px] break-words">{opt}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
