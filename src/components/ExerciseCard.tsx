import React, { useEffect, useRef, useState } from 'react';
import { Word, GameMode, AppSettings } from '../types';
import { playCorrectSound, playIncorrectSound } from '../utils/audio';
import { ExerciseProps } from './exercises/types';
import FeedbackPanel from './exercises/FeedbackPanel';
import LlevaTilde from './exercises/LlevaTilde';
import EscribiTilde from './exercises/EscribiTilde';
import EncontraError from './exercises/EncontraError';
import DondeVaTilde from './exercises/DondeVaTilde';
import Clasificacion from './exercises/Clasificacion';
import Dictado from './exercises/Dictado';
import SilabaTonica from './exercises/SilabaTonica';
import LaRegla from './exercises/LaRegla';
import Contexto from './exercises/Contexto';
import Corrector from './exercises/Corrector';

interface ExerciseCardProps {
  word: Word;
  mode: GameMode;
  settings: AppSettings;
  comboStreak: number;
  timeLeft?: number; // For Survival Mode
  onAnswer: (isCorrect: boolean, timeTakenSeconds: number) => void;
  onNext: () => void;
}

// Router modo → componente de formato.
const EXERCISES: Partial<Record<GameMode, React.ComponentType<ExerciseProps>>> = {
  'lleva-tilde': LlevaTilde,
  'escribi-tilde': EscribiTilde,
  'encontra-error': EncontraError,
  'donde-va-tilde': DondeVaTilde,
  'clasificacion': Clasificacion,
  'dictado': Dictado,
  'silaba-tonica': SilabaTonica,
  'la-regla': LaRegla,
  'contexto': Contexto,
  'corrector': Corrector
};

// Formatos que muestran su propio feedback en vez de delegar en `FeedbackPanel`.
// El «Cazador de erratas» necesita revisar el texto completo (qué palabras eran
// erratas, cuáles se marcaron mal), imposible de representar con el panel de una
// sola palabra. Estos formatos siguen montados al responder y reciben
// `isCorrect` + `onNext`.
const SELF_FEEDBACK_MODES = new Set<GameMode>(['corrector']);

export default function ExerciseCard({
  word,
  mode,
  settings,
  comboStreak,
  timeLeft,
  onAnswer,
  onNext
}: ExerciseCardProps) {
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  // Reset on word / mode change.
  useEffect(() => {
    setAnswered(false);
    setIsCorrect(false);
    startTimeRef.current = Date.now();
  }, [word, mode]);

  // Enter / Space advances once the word has been answered.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (answered && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [answered, onNext]);

  const handleResult = (correct: boolean) => {
    if (answered) return;
    const timeTaken = Date.now() - startTimeRef.current;
    setIsCorrect(correct);
    setAnswered(true);
    if (correct) playCorrectSound(settings.soundEnabled);
    else playIncorrectSound(settings.soundEnabled);
    onAnswer(correct, timeTaken / 1000);
  };

  const Format = EXERCISES[mode];
  const selfFeedback = SELF_FEEDBACK_MODES.has(mode);

  return (
    <div id={`exercise-${word.id}`}>
      {/* Combo / timer strip — only when relevant (survival / streak) */}
      {(timeLeft !== undefined || comboStreak > 1) && (
        <div className="hud flex justify-end gap-6 mb-6">
          {timeLeft !== undefined && <span className="num text-[var(--color-fg)]">{timeLeft}s</span>}
          {comboStreak > 1 && <span className="num text-[var(--color-fg)]">{comboStreak}x combo</span>}
        </div>
      )}

      {!answered || selfFeedback ? (
        Format ? (
          <Format
            word={word}
            settings={settings}
            answered={answered}
            onResult={handleResult}
            isCorrect={isCorrect}
            onNext={onNext}
          />
        ) : null
      ) : (
        <FeedbackPanel word={word} isCorrect={isCorrect} settings={settings} onNext={onNext} />
      )}
    </div>
  );
}
