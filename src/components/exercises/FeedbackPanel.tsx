import React from 'react';
import { Word, AppSettings } from '../../types';

interface FeedbackPanelProps {
  word: Word;
  isCorrect: boolean;
  settings: AppSettings;
  onNext: () => void;
}

/**
 * Panel de resultado: marca correcto/incorrecto, palabra con silabeo, regla y
 * explicación, y el botón "Siguiente palabra". Igual para todos los formatos.
 */
export default function FeedbackPanel({ word, isCorrect, settings, onNext }: FeedbackPanelProps) {
  return (
    <div className="text-center" id="feedback-canvas">
      {/* Marca cuadrada, no circular: el radio 0 es la regla del sistema. */}
      <div
        className="inline-flex items-center justify-center w-11 h-11 text-lg"
        style={
          isCorrect
            ? { background: 'var(--color-accent-ok)', color: 'var(--color-canvas)', border: '1px solid var(--color-accent-ok)' }
            : { background: 'transparent', color: 'var(--color-accent-err)', border: '1px solid var(--color-accent-err)' }
        }
      >
        {isCorrect ? '✓' : '✗'}
      </div>
      <div
        className="hud mt-4"
        style={{ color: isCorrect ? 'var(--color-accent-ok)' : 'var(--color-accent-err)' }}
      >
        {isCorrect ? 'Respuesta correcta' : 'Respuesta incorrecta'}
      </div>

      <div className="display-xl mt-5">{word.word}</div>

      {settings.showSyllables && (
        <div className="flex justify-center gap-1.5 mt-4 text-[13px]">
          {word.syllables.map((syllable, idx) => {
            const isStressed = idx === word.stressedSyllableIdx;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-[var(--color-fg-faint)]">•</span>}
                <span className={isStressed ? 'px-2 py-0.5 border-b border-[var(--color-fg)] text-[var(--color-fg)]' : 'px-2 py-0.5 text-[var(--color-fg-muted)]'}>
                  {syllable}
                </span>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {(settings.showRule || settings.showExplanationOnError) && (
        <div className="inset max-w-[420px] mx-auto mt-7 py-[18px] px-[22px]">
          {settings.showRule && (
            <div className="hud">{word.rule}</div>
          )}
          {settings.showExplanationOnError && (
            <p className="text-[13px] text-[var(--color-fg-soft)] mt-3 leading-relaxed">{word.explanation}</p>
          )}
        </div>
      )}

      <button
        onClick={onNext}
        className="btn-primary hud inline-block mt-8 px-8 py-3.5 text-[var(--color-canvas)] cursor-pointer"
        id="btn-next-exercise"
      >
        Siguiente palabra →
      </button>
      <div className="hud mt-4 normal-case tracking-normal">Atajo: Enter o Espacio</div>
    </div>
  );
}
