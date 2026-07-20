import { Word, AppSettings } from '../../types';

/**
 * Contrato común de todo componente de formato de ejercicio. El router
 * (`ExerciseCard`) provee `onResult` y gestiona el estado de respondido,
 * los sonidos, el temporizado y el panel de feedback.
 */
export interface ExerciseProps {
  word: Word;
  settings: AppSettings;
  answered: boolean;
  onResult: (correct: boolean) => void;
}
