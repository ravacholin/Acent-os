import React, { useMemo, useState, useEffect } from 'react';
import { ExerciseProps } from './types';
import { WORDS_DATABASE } from '../../data/words';
import { buildCorrectorText } from '../../engine/corrector';
import { seededRng } from '../../utils/rng';
import { Word } from '../../types';

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * «Cazador de erratas» — micro-texto de 2-3 frases con 1-2 palabras saboteadas.
 * El usuario toca las palabras mal escritas; acierta si marca todas las erratas
 * sin falsos positivos. Al responder no cede al `FeedbackPanel` genérico: muestra
 * su propia revisión del texto (aciertos, erratas no vistas y falsos positivos)
 * más la lista de correcciones — es un formato de auto-feedback (ver
 * `SELF_FEEDBACK_MODES` en `ExerciseCard`).
 */
export default function Corrector({ word, answered, isCorrect, onResult, onNext }: ExerciseProps) {
  const { tokens, errorIndexes } = useMemo(() => {
    const rng = seededRng(word.id);
    const exampleWords: Word[] = WORDS_DATABASE.filter(w => !!w.example && w.example.includes('___'));
    const others = shuffle(exampleWords.filter(w => w.id !== word.id), rng).slice(0, 2);
    const pool =
      word.example && word.example.includes('___')
        ? [word, ...others]
        : shuffle(exampleWords, rng).slice(0, 3);
    return buildCorrectorText(pool, seededRng(word.id + '·'));
  }, [word.id]);

  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    setSelected(new Set());
  }, [word.id]);

  const errorSet = useMemo(() => new Set(errorIndexes), [errorIndexes]);

  const toggle = (idx: number) => {
    if (answered) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const submit = () => {
    if (answered) return;
    const allErrorsMarked = errorIndexes.every(i => selected.has(i));
    const noFalsePositives = [...selected].every(i => errorSet.has(i));
    onResult(allErrorsMarked && noFalsePositives);
  };

  // Correcciones a listar en la revisión: cada errata con su forma correcta.
  const corrections = useMemo(
    () => errorIndexes.map(i => ({ wrong: tokens[i].text, right: tokens[i].correct ?? '' })),
    [errorIndexes, tokens]
  );

  // ── Fase de revisión (respondido) ─────────────────────────────────────────
  if (answered) {
    return (
      <div className="text-center">
        <div role="status" aria-live="polite">
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
          <div className="hud mt-4" style={{ color: isCorrect ? 'var(--color-accent-ok)' : 'var(--color-accent-err)' }}>
            {isCorrect ? 'Cazaste todas las erratas' : 'Se te escapó alguna errata'}
          </div>
        </div>

        <div className="max-w-xl mx-auto inset px-6 py-7 mt-6 leading-[2.1] text-lg text-center">
          {tokens.map((token, idx) => {
            if (!token.isWord) return <span key={idx}>{token.text}</span>;
            const isError = errorSet.has(idx);
            const wasSelected = selected.has(idx);
            if (isError && wasSelected) {
              // Errata bien cazada.
              return (
                <span key={idx} className="px-0.5" style={{ background: 'var(--color-accent-ok)', color: 'var(--color-canvas)' }}>
                  {token.text}
                </span>
              );
            }
            if (isError && !wasSelected) {
              // Errata que se escapó.
              return (
                <span key={idx} className="px-0.5 underline decoration-2 underline-offset-4" style={{ color: 'var(--color-accent-err)', textDecorationColor: 'var(--color-accent-err)' }}>
                  {token.text}
                </span>
              );
            }
            if (!isError && wasSelected) {
              // Falso positivo: estaba bien escrita.
              return (
                <span key={idx} className="px-0.5 line-through" style={{ color: 'var(--color-accent-err)', textDecorationColor: 'var(--color-accent-err)' }}>
                  {token.text}
                </span>
              );
            }
            return <span key={idx} className="text-[var(--color-fg-soft)]">{token.text}</span>;
          })}
        </div>

        <div className="max-w-xl mx-auto inset px-6 py-[18px] mt-5">
          <div className="hud mb-3">{corrections.length === 1 ? 'La errata era' : 'Las erratas eran'}</div>
          <ul className="flex flex-col gap-1.5">
            {corrections.map((c, i) => (
              <li key={i} className="text-[15px] flex items-center justify-center gap-2">
                <span className="line-through text-[var(--color-fg-muted)]">{c.wrong}</span>
                <span className="text-[var(--color-fg-quiet)]">→</span>
                <span className="text-[var(--color-fg)]" style={{ borderBottom: '1px solid var(--color-accent-ok)' }}>{c.right}</span>
              </li>
            ))}
          </ul>
        </div>

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

  // ── Fase de pregunta ──────────────────────────────────────────────────────
  return (
    <div>
      <div className="text-center">
        <div className="hud tracking-[0.3em] mb-[26px]">Cazador de erratas</div>
        <p className="text-[13px] text-[var(--color-fg-muted)] mb-7">Tocá las palabras mal escritas ({errorIndexes.length})</p>
      </div>
      <div className="max-w-xl mx-auto inset px-6 py-7 leading-[2.1] text-lg text-center">
        {tokens.map((token, idx) => {
          if (!token.isWord) return <span key={idx}>{token.text}</span>;
          const isSel = selected.has(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggle(idx)}
              aria-pressed={isSel}
              aria-label={`Marcar «${token.text}» como mal escrita`}
              style={{ font: 'inherit' }}
              className={`cursor-pointer transition-colors align-baseline border-0 p-0 ${
                isSel
                  ? 'bg-[var(--color-fg)] text-[var(--color-canvas)] px-0.5'
                  : 'bg-transparent hover:text-[var(--color-fg)] text-[var(--color-fg-soft)] underline decoration-dotted decoration-[var(--color-fg-faint)] underline-offset-4'
              }`}
            >
              {token.text}
            </button>
          );
        })}
      </div>
      <div className="flex justify-center mt-8">
        <button
          onClick={submit}
          className="btn-primary hud px-8 py-3.5 text-[var(--color-canvas)] cursor-pointer"
          id="btn-corrector-submit"
        >
          Corregir <span className="opacity-55">({selected.size} marcada{selected.size === 1 ? '' : 's'})</span>
        </button>
      </div>
    </div>
  );
}
