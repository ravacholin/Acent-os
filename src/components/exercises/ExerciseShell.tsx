import React from 'react';
import { Word } from '../../types';
import { isAmbiguousWord } from '../../data/words';

/**
 * Layout común de la fase de pregunta. Para palabras ambiguas (diacríticas /
 * interrogativas) muestra el sentido gramatical + una frase de ejemplo antes de
 * responder, ya que sin contexto son imposibles de resolver.
 */
export default function ExerciseShell({ word, children }: { word: Word; children: React.ReactNode }) {
  const isAmbiguous = isAmbiguousWord(word);
  return (
    <div>
      {isAmbiguous && (word.sense || word.example) && (
        <div className="max-w-md mx-auto border border-[var(--color-line-soft)] px-4 py-3 mb-8 text-center">
          {word.sense && (
            <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--color-fg-dim)]">
              Se pide: <span className="text-[var(--color-fg)] normal-case tracking-normal">{word.sense}</span>
            </div>
          )}
          {word.example && (
            <p className="display-heavy text-lg mt-2">{word.example.replace(/___/g, '_____')}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
