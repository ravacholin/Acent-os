/**
 * PRNG determinista (mulberry32-like) sembrado con un string. Da una secuencia
 * estable entre renders pero distinta por semilla — se usa para barajar opciones
 * y generar textos reproducibles sin depender de `Math.random`.
 *
 * Antes estaba copiado carácter por carácter en `formats.ts`, `LaRegla.tsx` y
 * `Corrector.tsx`; ahora es la única fuente compartida.
 */
export function seededRng(seed: string): () => number {
  let a = 0;
  for (let i = 0; i < seed.length; i++) a = (a * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
