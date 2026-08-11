import { useEffect } from 'react';

/**
 * Atajo de teclado numérico común a los ejercicios de opción múltiple: las
 * teclas `1..count` disparan `onPick(index)` (0-indexado). Antes cada ejercicio
 * (Clasificación, SílabaTónica, LaRegla, EncontráError, Contexto, DóndeVaTilde)
 * reescribía el mismo `addEventListener('keydown') + parseInt`.
 *
 * `active` desactiva el atajo cuando el ejercicio ya fue respondido, para no
 * competir con el Enter/Espacio de "Siguiente palabra".
 */
export function useNumericKeys(
  count: number,
  onPick: (index: number) => void,
  active: boolean = true
): void {
  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= count) onPick(n - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [count, onPick, active]);
}
