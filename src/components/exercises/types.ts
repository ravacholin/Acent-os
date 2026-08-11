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
  /**
   * Solo para formatos con feedback propio (ver `SELF_FEEDBACK_MODES` en
   * `ExerciseCard`): cuando el ejercicio no delega en el `FeedbackPanel`
   * genérico, recibe el resultado ya calculado y el avance a la siguiente
   * palabra. El resto de formatos los ignora.
   */
  isCorrect?: boolean;
  onNext?: () => void;
}
