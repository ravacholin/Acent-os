import React, { useEffect, useRef, useState } from 'react';
import { ExerciseProps } from './types';
import ExerciseShell from './ExerciseShell';
import AccentInput from './AccentInput';
import ListenButton from './ListenButton';
import { speakWord } from '../../utils/audio';

/** Modo 6: Dictado — escuchar la palabra (TTS) y escribirla acentuada. */
export default function Dictado({ word, settings, answered, onResult }: ExerciseProps) {
  const [userVal, setUserVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focus = setTimeout(() => inputRef.current?.focus(), 50);
    const speak = setTimeout(() => speakWord(word.word, settings.soundEnabled), 200);
    return () => {
      clearTimeout(focus);
      clearTimeout(speak);
    };
  }, [word]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (answered || !userVal.trim()) return;
    onResult(userVal.trim().toLowerCase() === word.word.toLowerCase());
  };

  return (
    <ExerciseShell word={word}>
      <div className="text-center">
        <div className="hud tracking-[0.3em] mb-[26px]">Dictado</div>
        <ListenButton word={word.word} soundEnabled={settings.soundEnabled} variant="block" />
        <p className="text-[13px] text-[var(--color-fg-muted)] mt-[18px]">Escuchá y escribí correctamente la palabra</p>
        <div className="max-w-[320px] mx-auto">
          <AccentInput
            value={userVal}
            onChange={setUserVal}
            onSubmit={submit}
            placeholder="Escribí la palabra…"
            soundEnabled={settings.soundEnabled}
            inputRef={inputRef}
            inputId="input-dictado"
          />
        </div>
      </div>
    </ExerciseShell>
  );
}
