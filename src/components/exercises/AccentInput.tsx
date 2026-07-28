import React from 'react';
import { playClickSound } from '../../utils/audio';

const ACCENT_HELPERS = ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ'];

interface AccentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  placeholder: string;
  soundEnabled: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  inputId?: string;
}

/**
 * Input de texto + botones de vocales acentuadas (á é í ó ú ü ñ) + submit.
 * Antes estaba duplicado casi idéntico en los modos "Escribí la tilde" y
 * "Dictado"; ahora es una única primitiva compartida.
 */
export default function AccentInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  soundEnabled,
  inputRef,
  inputId
}: AccentInputProps) {
  const insertAccent = (vowel: string) => {
    playClickSound(soundEnabled);
    onChange(value + vowel);
    inputRef?.current?.focus();
  };

  return (
    <form onSubmit={onSubmit}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="field mt-6 w-full text-center text-lg py-3.5 px-4"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        id={inputId}
      />
      <div className="flex justify-center gap-2 mt-4">
        {ACCENT_HELPERS.map((vowel) => (
          <button
            key={vowel}
            type="button"
            onClick={() => insertAccent(vowel)}
            className="btn-ghost w-8 h-8 flex items-center justify-center text-[13px] cursor-pointer"
          >
            {vowel}
          </button>
        ))}
      </div>
      <button
        type="submit"
        disabled={!value.trim()}
        className="btn-primary hud mt-6 w-full py-3.5 text-[var(--color-canvas)] cursor-pointer"
      >
        Validar <span className="opacity-55">(Enter)</span>
      </button>
    </form>
  );
}
