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
      <div
        className="inline-flex items-center justify-center w-12 h-12 rounded-full text-lg"
        style={
          isCorrect
            ? { background: 'var(--color-fg)', color: 'var(--color-ink)', border: '2px solid var(--color-fg)' }
            : { background: 'transparent', color: 'var(--color-fg)', border: '2px solid var(--color-fg)' }
        }
      >
        {isCorrect ? '✓' : '✗'}
      </div>
      <div className="text-[11px] tracking-[0.15em] text-[var(--color-fg-soft)] uppercase mt-4">
        {isCorrect ? '¡Respuesta correcta!' : 'Respuesta incorrecta'}
      </div>

      <div className="display-heavy text-[58px] mt-5">{word.word}</div>

      {settings.showSyllables && (
        <div className="flex justify-center gap-1.5 mt-3.5 text-xs">
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
        <div className="max-w-[420px] mx-auto mt-6 border border-[var(--color-line-soft)] py-[18px] px-[22px]">
          {settings.showRule && (
            <div className="text-[9px] tracking-[0.15em] text-[var(--color-fg-dim)] uppercase">{word.rule}</div>
          )}
          {settings.showExplanationOnError && (
            <p className="text-xs text-[var(--color-fg-soft)] mt-2.5 leading-relaxed">{word.explanation}</p>
          )}
        </div>
      )}

      <button
        onClick={onNext}
        className="inline-block mt-7 px-8 py-3.5 bg-[var(--color-fg)] text-black text-xs tracking-[0.08em] hover:bg-[var(--color-paper-dim)] cursor-pointer transition-colors"
        id="btn-next-exercise"
      >
        Siguiente palabra →
      </button>
      <div className="text-[10px] text-[var(--color-fg-dim)] mt-3">Atajo: Enter o Espacio</div>
    </div>
  );
}
