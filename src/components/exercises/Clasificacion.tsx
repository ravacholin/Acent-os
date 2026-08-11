import React from 'react';
import { ExerciseProps } from './types';
import ExerciseShell from './ExerciseShell';
import { useNumericKeys } from '../../hooks/useNumericKeys';
import { WordClassification } from '../../types';

const OPTIONS: { id: WordClassification; label: string; key: string }[] = [
  { id: 'aguda', label: 'Aguda', key: '1' },
  { id: 'grave', label: 'Grave', key: '2' },
  { id: 'esdrújula', label: 'Esdrújula', key: '3' },
  { id: 'sobreesdrújula', label: 'Sobreesdrújula', key: '4' }
];

/** Modo 5: Clasificación — aguda / grave / esdrújula / sobreesdrújula. */
export default function Clasificacion({ word, answered, onResult }: ExerciseProps) {
  const respond = (selected: WordClassification) => {
    if (answered) return;
    onResult(selected === word.classification);
  };

  useNumericKeys(OPTIONS.length, (i) => respond(OPTIONS[i].id), !answered);

  return (
    <ExerciseShell word={word}>
      <div>
        <div className="text-center">
          <div className="hud tracking-[0.3em] mb-[26px]">Clasificación</div>
          <div className="display-lg">{word.word}</div>
          <p className="text-[13px] text-[var(--color-fg-muted)] mt-4">¿Cómo se clasifica esta palabra según su sílaba tónica?</p>
        </div>
        <div className="flex justify-center gap-2.5 mt-[26px] flex-wrap">
          {OPTIONS.map((item) => (
            <button
              key={item.id}
              onClick={() => respond(item.id)}
              className="w-[176px] text-center px-3 py-4 btn-ghost cursor-pointer"
              id={`btn-classification-${item.id}`}
            >
              {/* "Sobreesdrújula" es la etiqueta más larga (~130px a 16px): el
                  ancho y el cuerpo están calibrados para que entre en una línea. */}
              <div className="display-sm text-[16px]">{item.label}</div>
              <div className="hud text-current opacity-55 mt-2">[ {item.key} ]</div>
            </button>
          ))}
        </div>
      </div>
    </ExerciseShell>
  );
}
