import React, { useEffect, useRef, useState } from 'react';
import { ExerciseProps } from './types';
import ExerciseShell from './ExerciseShell';
import AccentInput from './AccentInput';

/** Modo 2: Escribí la tilde — el usuario tipea la palabra bien acentuada. */
export default function EscribiTilde({ word, settings, answered, onResult }: ExerciseProps) {
  const [userVal, setUserVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [word]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (answered || !userVal.trim()) return;
    onResult(userVal.trim().toLowerCase() === word.word.toLowerCase());
  };

  return (
    <ExerciseShell word={word}>
      <div className="text-center max-w-[360px] mx-auto">
        <div className="display-heavy text-[var(--color-fg-soft)] text-5xl">{word.wordClean}</div>
        <p className="text-[11px] text-[var(--color-fg-muted)] mt-3.5">Escribí la palabra correctamente acentuada</p>
        <AccentInput
          value={userVal}
          onChange={setUserVal}
          onSubmit={submit}
          placeholder="Escribí aquí…"
          soundEnabled={settings.soundEnabled}
          inputRef={inputRef}
          inputId="input-escribi-tilde"
        />
      </div>
    </ExerciseShell>
  );
}
