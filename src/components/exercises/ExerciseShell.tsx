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
        <div className="inset max-w-md mx-auto px-5 py-4 mb-8 text-center">
          {word.sense && (
            <div className="hud">
              Se pide: <span className="text-[var(--color-fg)] normal-case tracking-normal">{word.sense}</span>
            </div>
          )}
          {word.example && (
            <p className="display-sm mt-2.5">{word.example.replace(/___/g, '_____')}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
