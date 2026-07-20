import React, { useEffect } from 'react';
import { ExerciseProps } from './types';
import ExerciseShell from './ExerciseShell';
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (answered) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        respond(OPTIONS[parseInt(e.key, 10) - 1].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [answered, word]);

  return (
    <ExerciseShell word={word}>
      <div>
        <div className="text-center">
          <div className="display-heavy text-6xl">{word.word}</div>
          <p className="text-[11px] text-[var(--color-fg-muted)] mt-4">¿Cómo se clasifica esta palabra según su sílaba tónica?</p>
        </div>
        <div className="flex justify-center gap-2.5 mt-[26px] flex-wrap">
          {OPTIONS.map((item) => (
            <button
              key={item.id}
              onClick={() => respond(item.id)}
              className="w-[140px] text-center py-4 border border-[var(--color-line)] hover:bg-[var(--color-fg)] hover:text-black cursor-pointer transition-colors"
              id={`btn-classification-${item.id}`}
            >
              <div className="display-heavy text-base break-words leading-tight">{item.label}</div>
              <div className="text-[9px] text-[var(--color-fg-dim)] mt-1.5">[ {item.key} ]</div>
            </button>
          ))}
        </div>
      </div>
    </ExerciseShell>
  );
}
