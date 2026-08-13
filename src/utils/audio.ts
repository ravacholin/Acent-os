// Procedural UI sound generation using Web Audio API

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

export function playClickSound(enabled: boolean) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // Resume context if suspended (browser security policies)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch (error) {
    console.warn('Audio click failed', error);
  }
}

export function playCorrectSound(enabled: boolean) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // Multi-tone chime for a premium sound
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad
    
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      
      // Staggered starts for a gorgeous arpeggio chime
      const startTime = now + idx * 0.04;
      const duration = 0.25;

      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    });
  } catch (error) {
    console.warn('Audio correct sound failed', error);
  }
}

export function playIncorrectSound(enabled: boolean) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Detuned negative buzzer tones
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(ctx.destination);
    gain2.connect(ctx.destination);

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    // Lower sad intervals (tritone)
    osc1.frequency.setValueAtTime(220, now); // A3
    osc1.frequency.linearRampToValueAtTime(155.56, now + 0.25); // D#3 (tritone drop)

    osc2.frequency.setValueAtTime(225, now); // slightly detuned
    osc2.frequency.linearRampToValueAtTime(160, now + 0.25);

    // Apply lowpass filter to make the sawtooth warm, not annoying or sharp
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    
    osc1.disconnect(gain1);
    osc2.disconnect(gain2);
    
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain1); // reuse gain

    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.start();
    osc2.start();
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch (error) {
    console.warn('Audio incorrect sound failed', error);
  }
}

// ---------------------------------------------------------------------------
// Text-to-Speech (dictado y botón "Escuchar")
//
// La Web Speech API basta para tener audio nítido y offline SIN backend ni
// claves de API — pero solo si se elige BIEN la voz. El bug clásico es que
// `getVoices()` devuelve [] en la primera llamada (las voces cargan async), así
// que el navegador termina leyendo la palabra española con la voz por defecto
// del sistema (a menudo en inglés) → "no se entiende nada". Aquí esperamos a
// que las voces estén listas y puntuamos para quedarnos con la mejor voz
// española disponible (neural/online/enhanced) en vez de la primera cualquiera.
// ---------------------------------------------------------------------------

let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

/** Espera (una sola vez) a que el navegador termine de cargar las voces. */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (voicesReady) return voicesReady;

  voicesReady = new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      resolve([]);
      return;
    }

    const existing = synth.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }

    // Las voces aún no cargaron: escuchar `voiceschanged` con un timeout de
    // seguridad por si el evento nunca dispara (pasa en algunos navegadores).
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener('voiceschanged', onChange);
      resolve(synth.getVoices());
    };
    const onChange = () => finish();
    synth.addEventListener('voiceschanged', onChange);
    setTimeout(finish, 1500);
  });

  return voicesReady;
}

/**
 * Puntúa una voz para el español. Mayor puntaje = mejor. Prioriza voces
 * neuronales/online/enhanced conocidas por su alta calidad y descarta las
 * "compact"/robóticas. Las variantes latinoamericanas reciben un pequeño plus
 * (la app usa voseo rioplatense), sin excluir el español peninsular.
 */
function scoreSpanishVoice(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang.toLowerCase();
  if (!lang.startsWith('es')) return -Infinity; // nunca una voz no española

  const name = voice.name.toLowerCase();
  let score = 0;

  // Señales fuertes de calidad (nombres de motores neuronales / premium).
  if (/natural|neural|online|enhanced|premium/.test(name)) score += 60;
  if (name.includes('google')) score += 45;
  // Voces conocidas de buena calidad en macOS/iOS/Windows/Android.
  if (/(mónica|monica|paulina|paloma|sabina|elvira|dalia|jorge|juan|lucía|lucia|helena|laura|catalina|marisol)/.test(name)) {
    score += 25;
  }

  // Penalizar las voces "compact"/eSpeak robóticas.
  if (/compact|espeak|eloquence/.test(name)) score -= 40;

  // Preferencia regional: latinoamérica un poco por delante, pero es-ES también alto.
  if (/es-(mx|us|419|ar|co|cl|pe)/.test(lang)) score += 12;
  else if (lang === 'es-es' || lang.startsWith('es-es')) score += 8;
  else score += 4;

  return score;
}

let bestVoicePromise: Promise<SpeechSynthesisVoice | null> | null = null;

/** Devuelve (cacheada) la mejor voz española disponible, o null si no hay. */
function getBestSpanishVoice(): Promise<SpeechSynthesisVoice | null> {
  if (bestVoicePromise) return bestVoicePromise;
  bestVoicePromise = loadVoices().then((voices) => {
    const spanish = voices
      .filter((v) => v.lang.toLowerCase().startsWith('es'))
      .sort((a, b) => scoreSpanishVoice(b) - scoreSpanishVoice(a));
    return spanish[0] ?? null;
  });
  return bestVoicePromise;
}

/**
 * Precarga las voces apenas la app arranca, para que el primer dictado ya tenga
 * la voz correcta seleccionada (evita el primer audio en voz por defecto).
 */
export function warmUpTts() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  getBestSpanishVoice();
}

export function speakWord(word: string, enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (!synth) return;

  getBestSpanishVoice()
    .then((voice) => {
      try {
        // Cortar cualquier locución en curso (p. ej. repique del botón).
        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(word);
        // Fijar el idioma SIEMPRE, aunque no haya una voz española concreta:
        // fuerza al motor a usar fonética española en vez de leer en inglés.
        utterance.lang = voice?.lang || 'es-ES';
        utterance.rate = 0.9;  // levemente más lento para claridad en el dictado
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        if (voice) utterance.voice = voice;

        // Chrome a veces ignora el primer speak() tras un cancel(): un micro
        // retardo lo hace fiable sin ser perceptible.
        setTimeout(() => {
          if (synth.paused) synth.resume();
          synth.speak(utterance);
        }, 60);
      } catch (error) {
        console.warn('Speech synthesis failed', error);
      }
    })
    .catch((error) => console.warn('Speech synthesis failed', error));
}
