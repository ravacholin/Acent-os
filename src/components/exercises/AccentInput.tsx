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
        className="mt-5 w-full bg-transparent border border-[var(--color-line)] focus:border-[var(--color-fg)] text-[var(--color-fg)] text-center text-lg py-3.5 px-4 outline-none transition-colors"
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
            className="w-[30px] h-[30px] flex items-center justify-center border border-[var(--color-line)] text-xs text-[var(--color-fg-soft)] hover:bg-[var(--color-fg)] hover:text-black cursor-pointer transition-colors"
          >
            {vowel}
          </button>
        ))}
      </div>
      <button
        type="submit"
        disabled={!value.trim()}
        className="mt-5 w-full py-3.5 bg-[var(--color-fg)] text-black text-xs disabled:opacity-40 hover:bg-[var(--color-paper-dim)] cursor-pointer transition-colors"
      >
        Validar <span className="opacity-60">(Enter)</span>
      </button>
    </form>
  );
}
