import React, { useEffect, useRef, useState } from 'react';
import { ExerciseProps } from './types';
import ExerciseShell from './ExerciseShell';

// Minimum horizontal distance (px) that counts as a deliberate swipe
const SWIPE_THRESHOLD = 70;

/** Modo 1: ¿Lleva tilde? — sí/no con gestos de swipe y teclas S/N/1/2. */
export default function LlevaTilde({ word, answered, onResult }: ExerciseProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  const respond = (hasTildeAnswer: boolean) => {
    if (answered) return;
    onResult(word.hasTilde === hasTildeAnswer);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (answered) return;
      if (e.key.toLowerCase() === 's' || e.key === '1') respond(true);
      else if (e.key.toLowerCase() === 'n' || e.key === '2') respond(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [answered, word]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (answered) return;
    touchStartXRef.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (answered || touchStartXRef.current === null) return;
    setSwipeOffset(e.touches[0].clientX - touchStartXRef.current);
  };
  const onTouchEnd = () => {
    if (answered || touchStartXRef.current === null) {
      setSwipeOffset(0);
      touchStartXRef.current = null;
      return;
    }
    const delta = swipeOffset;
    touchStartXRef.current = null;
    setSwipeOffset(0);
    if (delta > SWIPE_THRESHOLD) respond(true);
    else if (delta < -SWIPE_THRESHOLD) respond(false);
  };

  return (
    <ExerciseShell word={word}>
      <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ touchAction: 'pan-y' }}>
        <div
          className="text-center pt-2.5 pb-[46px] select-none"
          style={{
            transform: `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.02}deg)`,
            transition: swipeOffset === 0 ? 'transform 0.25s ease' : 'none'
          }}
        >
          <div className="text-[9px] tracking-[0.3em] text-[var(--color-fg-dim)] uppercase mb-[26px]">¿Lleva tilde?</div>
          <div className="display-heavy text-[64px] sm:text-[120px] leading-none lowercase">{word.wordClean}</div>
          <div className="h-4 mt-3 text-[10px] tracking-[0.2em] uppercase">
            {swipeOffset > SWIPE_THRESHOLD && <span className="text-[var(--color-fg)]">Sí →</span>}
            {swipeOffset < -SWIPE_THRESHOLD && <span className="text-[var(--color-fg)]">← No</span>}
          </div>
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => respond(false)}
            className="w-[180px] text-center py-5 border border-[var(--color-line)] text-[var(--color-fg-soft)] hover:bg-[var(--color-fg)] hover:text-black hover:border-[var(--color-fg)] cursor-pointer transition-colors"
            id="btn-lleva-no"
          >
            <div className="display-heavy text-xl">No</div>
            <div className="text-[9px] text-[var(--color-fg-dim)] mt-1.5">[ N ] · ← swipe</div>
          </button>
          <button
            onClick={() => respond(true)}
            className="w-[180px] text-center py-5 border border-[var(--color-fg)] hover:bg-[var(--color-fg)] hover:text-black cursor-pointer transition-colors"
            id="btn-lleva-si"
          >
            <div className="display-heavy text-xl">Sí</div>
            <div className="text-[9px] text-[var(--color-fg-dim)] mt-1.5">[ S ] · swipe →</div>
          </button>
        </div>
        <div className="text-center text-[10px] text-[var(--color-fg-dim)] mt-4 sm:hidden">
          Deslizá la palabra → para <span className="text-[var(--color-fg-soft)]">Sí</span>, ← para <span className="text-[var(--color-fg-soft)]">No</span>
        </div>
      </div>
    </ExerciseShell>
  );
}
