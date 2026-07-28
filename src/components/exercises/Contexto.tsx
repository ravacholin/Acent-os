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
        <div className="hud tracking-[0.3em] mb-[26px]">El contexto manda</div>
        <p className="text-[13px] text-[var(--color-fg-muted)] mb-7">¿Qué forma completa correctamente la frase?</p>
        <div className="max-w-md mx-auto inset px-5 py-6 mb-8">
          <p className="display-md">{sentence}</p>
        </div>
      </div>
      <div className="flex justify-center gap-5 flex-wrap">
        {options.map((opt, oIdx) => (
          <button
            key={oIdx}
            onClick={() => respond(opt)}
            className="w-full max-w-[200px] p-6 btn-ghost text-center cursor-pointer"
            id={`btn-contexto-${oIdx}`}
          >
            <div className="hud text-current opacity-55 mb-3">[ {oIdx + 1} ]</div>
            <div className="display-lg break-words">{opt}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
