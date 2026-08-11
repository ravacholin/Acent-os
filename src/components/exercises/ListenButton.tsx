import React from 'react';
import { speakWord } from '../../utils/audio';

interface ListenButtonProps {
  word: string;
  soundEnabled: boolean;
  /**
   * `pill` — helper secundario de texto "♪ Escuchar" (SílabaTónica, DóndeVaTilde).
   * `block` — affordance primaria cuadrada "♪" (Dictado, donde escuchar ES la tarea).
   */
  variant?: 'pill' | 'block';
}

/**
 * Botón de audio compartido (TTS). Unifica el control que antes estaba
 * duplicado con dos tratamientos distintos y sin `aria-label`.
 */
export default function ListenButton({ word, soundEnabled, variant = 'pill' }: ListenButtonProps) {
  const speak = () => speakWord(word, soundEnabled);

  if (variant === 'block') {
    return (
      <button
        type="button"
        onClick={speak}
        className="btn-ghost w-16 h-16 flex items-center justify-center mx-auto text-xl cursor-pointer"
        aria-label="Escuchar la palabra"
        title="Escuchar la palabra"
      >
        ♪
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={speak}
      className="mt-8 inline-flex items-center gap-2 hud text-[var(--color-fg-quiet)] hover:text-[var(--color-fg)] cursor-pointer transition-colors"
      aria-label="Escuchar la palabra"
      title="Escuchar la palabra"
    >
      ♪ Escuchar
    </button>
  );
}
