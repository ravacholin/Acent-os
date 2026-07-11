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

export function speakWord(word: string, enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;

    // Cancel any ongoing speech
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'es-ES';
    utterance.rate = 0.85; // Slightly slower for training clarity
    utterance.pitch = 1.0;
    
    // Find a proper Spanish voice if available
    const voices = synth.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es'));
    if (esVoice) {
      utterance.voice = esVoice;
    }

    synth.speak(utterance);
  } catch (error) {
    console.warn('Speech synthesis failed', error);
  }
}
