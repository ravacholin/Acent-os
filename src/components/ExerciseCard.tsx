import React, { useState, useEffect, useRef } from 'react';
import { Word, GameMode, AppSettings, WordClassification } from '../types';
import { isAmbiguousWord, getHomophonePartner, getMisaccentedForm } from '../data/words';
import {
  playClickSound,
  playCorrectSound,
  playIncorrectSound,
  speakWord
} from '../utils/audio';

interface ExerciseCardProps {
  word: Word;
  mode: GameMode;
  settings: AppSettings;
  comboStreak: number;
  timeLeft?: number; // For Survival Mode
  onAnswer: (isCorrect: boolean, timeTakenMs: number) => void;
  onNext: () => void;
}

const ACCENT_HELPERS = ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ'];

export default function ExerciseCard({
  word,
  mode,
  settings,
  comboStreak,
  timeLeft,
  onAnswer,
  onNext
}: ExerciseCardProps) {
  const [answered, setAnswered] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [userVal, setUserVal] = useState<string>('');
  const [selectedLetterIdx, setSelectedLetterIdx] = useState<number | null>(null);

  // Swipe gesture state for Mode 1 (¿Lleva tilde?): drag right = Sí, left = No
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const touchStartXRef = useRef<number | null>(null);

  const startTimeRef = useRef<number>(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  // Minimum horizontal distance (px) that counts as a deliberate swipe
  const SWIPE_THRESHOLD = 70;

  // Restart state on word change
  useEffect(() => {
    setAnswered(false);
    setIsCorrect(false);
    setUserVal('');
    setSelectedLetterIdx(null);
    setSwipeOffset(0);
    touchStartXRef.current = null;
    startTimeRef.current = Date.now();

    // Auto focus inputs for keyboard entry modes
    if (mode === 'escribi-tilde' || mode === 'dictado') {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }

    // Auto play dictation sound on load if in Dictado mode
    if (mode === 'dictado') {
      setTimeout(() => {
        speakWord(word.word, settings.soundEnabled);
      }, 200);
    }
  }, [word, mode]);

  // Keyboard shortcut listener for fast navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (answered) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNext();
        }
        return;
      }

      // Mode 1: ¿Lleva tilde? (S/N shortcuts or 1/2)
      if (mode === 'lleva-tilde') {
        if (e.key.toLowerCase() === 's' || e.key === '1') {
          handleLlevaTildeAnswer(true);
        } else if (e.key.toLowerCase() === 'n' || e.key === '2') {
          handleLlevaTildeAnswer(false);
        }
      }

      // Mode 3: Encontrá el error (1/2 options)
      if (mode === 'encontra-error') {
        if (e.key === '1') {
          handleComparisonAnswer(options[0]);
        } else if (e.key === '2') {
          handleComparisonAnswer(options[1]);
        }
      }

      // Mode 5: Clasificación (1=Aguda, 2=Grave, 3=Esdrújula, 4=Sobreesdrújula)
      if (mode === 'clasificacion') {
        const classifications: WordClassification[] = ['aguda', 'grave', 'esdrújula', 'sobreesdrújula'];
        if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key) - 1;
          handleClassificationAnswer(classifications[idx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [answered, word, mode, userVal]);

  // Handle Mode 1: ¿Lleva tilde?
  const handleLlevaTildeAnswer = (hasTildeAnswer: boolean) => {
    if (answered) return;
    const correct = word.hasTilde === hasTildeAnswer;
    submitAnswer(correct);
  };

  // Swipe gestures for Mode 1: drag right → Sí, drag left → No
  const handleSwipeTouchStart = (e: React.TouchEvent) => {
    if (answered) return;
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleSwipeTouchMove = (e: React.TouchEvent) => {
    if (answered || touchStartXRef.current === null) return;
    setSwipeOffset(e.touches[0].clientX - touchStartXRef.current);
  };

  const handleSwipeTouchEnd = () => {
    if (answered || touchStartXRef.current === null) {
      setSwipeOffset(0);
      touchStartXRef.current = null;
      return;
    }
    const delta = swipeOffset;
    touchStartXRef.current = null;
    setSwipeOffset(0);
    if (delta > SWIPE_THRESHOLD) {
      handleLlevaTildeAnswer(true); // Sí
    } else if (delta < -SWIPE_THRESHOLD) {
      handleLlevaTildeAnswer(false); // No
    }
  };

  // Handle Mode 2: Escribí la tilde
  const handleEscribiTildeSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (answered || !userVal.trim()) return;

    // Direct comparison ignoring casing
    const correct = userVal.trim().toLowerCase() === word.word.toLowerCase();
    submitAnswer(correct);
  };

  // Insert virtual vowel accent
  const handleInsertAccent = (vowel: string) => {
    if (answered) return;
    playClickSound(settings.soundEnabled);
    setUserVal(prev => prev + vowel);
    inputRef.current?.focus();
  };

  // True for diacritic / interrogative pairs that are unanswerable without context
  // (el/él, tu/tú, qué/que…). For these we always surface the grammatical sense +
  // an example sentence so the intended form is clear before answering.
  const isAmbiguous = isAmbiguousWord(word);

  // Handle Mode 3: Encontrá el error
  // We need static options for the word
  const getComparisonOptions = () => {
    // Determine options. One with correct accents, one without (clean)
    // Sometimes word doesn't have tilde, but the incorrect option adds one incorrectly!
    const correctOption = word.word;
    let incorrectOption = word.wordClean;

    if (isAmbiguous) {
      // Both spellings are valid words; the distractor is the homophone partner
      // (el↔él, qué↔que). The example sentence + sense decide which one is correct.
      incorrectOption = getHomophonePartner(word);
    } else if (!word.hasTilde) {
      // If original doesn't have a tilde, the distractor is the same word with a tilde
      // wrongly placed on its stressed vowel (e.g., "reloj" -> "relój"). The tilde always
      // lands on a vowel — never on a consonant like "l" or "s".
      incorrectOption = getMisaccentedForm(word);
    }

    // Deterministic ordering based on word id length
    const order = word.id.length % 2 === 0;
    return order ? [correctOption, incorrectOption] : [incorrectOption, correctOption];
  };

  const options = getComparisonOptions();

  const handleComparisonAnswer = (selected: string) => {
    if (answered) return;
    const correct = selected === word.word;
    submitAnswer(correct);
  };

  // Handle Mode 4: ¿Dónde va la tilde?
  // Find which letter index in the clean word corresponds to the tilde
  const findCorrectTildeIndex = () => {
    const correctWordLower = word.word.toLowerCase();
    const cleanWordLower = word.wordClean.toLowerCase();

    for (let i = 0; i < correctWordLower.length; i++) {
      if (correctWordLower[i] !== cleanWordLower[i]) {
        return i;
      }
    }
    return -1;
  };

  const correctLetterIdx = findCorrectTildeIndex();

  const handleLetterClick = (idx: number, char: string) => {
    if (answered) return;

    // Check if the character selected is a vowel (vowels can carry accents)
    const isVowel = 'aeiou'.includes(char.toLowerCase());
    if (!isVowel) {
      // Visual feedback but not a final answer
      return;
    }

    setSelectedLetterIdx(idx);
    const correct = idx === correctLetterIdx;
    submitAnswer(correct);
  };

  // Handle Mode 5: Clasificación
  const handleClassificationAnswer = (selectedClass: WordClassification) => {
    if (answered) return;
    const correct = selectedClass === word.classification;
    submitAnswer(correct);
  };

  // Logic to process answers
  const submitAnswer = (correct: boolean) => {
    const timeTaken = Date.now() - startTimeRef.current;
    setIsCorrect(correct);
    setAnswered(true);

    if (correct) {
      playCorrectSound(settings.soundEnabled);
    } else {
      playIncorrectSound(settings.soundEnabled);
    }

    onAnswer(correct, timeTaken / 1000);
  };

  const btnBase = 'cursor-pointer transition-colors';

  return (
    <div id={`exercise-${word.id}`}>

      {/* Combo / timer strip — only present when relevant (survival / streak) */}
      {(timeLeft !== undefined || comboStreak > 1) && (
        <div className="flex justify-end gap-6 text-[10px] text-[#666] uppercase tracking-[0.12em] mb-6">
          {timeLeft !== undefined && <span className="text-[#F5F5F0]">{timeLeft}s</span>}
          {comboStreak > 1 && <span className="text-[#F5F5F0]">{comboStreak}x combo</span>}
        </div>
      )}

      {!answered ? (
        <div>
          {/* Disambiguation context for diacritic / interrogative pairs.
              Without this, "el" vs "él" (etc.) is impossible to answer. */}
          {isAmbiguous && (word.sense || word.example) && (
            <div className="max-w-md mx-auto border border-[#1a1a1a] px-4 py-3 mb-8 text-center">
              {word.sense && (
                <div className="text-[10px] tracking-[0.2em] uppercase text-[#666]">
                  Se pide: <span className="text-[#F5F5F0] normal-case tracking-normal">{word.sense}</span>
                </div>
              )}
              {word.example && (
                <p className="display-heavy text-lg mt-2">{word.example.replace(/___/g, '_____')}</p>
              )}
            </div>
          )}

          {/* MODE 1: ¿Lleva tilde? */}
          {mode === 'lleva-tilde' && (
            <div
              onTouchStart={handleSwipeTouchStart}
              onTouchMove={handleSwipeTouchMove}
              onTouchEnd={handleSwipeTouchEnd}
              style={{ touchAction: 'pan-y' }}
            >
              <div
                className="text-center pt-2.5 pb-[46px] select-none"
                style={{
                  transform: `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.02}deg)`,
                  transition: swipeOffset === 0 ? 'transform 0.25s ease' : 'none'
                }}
              >
                <div className="text-[9px] tracking-[0.3em] text-[#666] uppercase mb-[26px]">¿Lleva tilde?</div>
                <div className="display-heavy text-[64px] sm:text-[120px] leading-none lowercase">{word.wordClean}</div>
                {/* Swipe direction cue while dragging */}
                <div className="h-4 mt-3 text-[10px] tracking-[0.2em] uppercase">
                  {swipeOffset > SWIPE_THRESHOLD && <span className="text-[#F5F5F0]">Sí →</span>}
                  {swipeOffset < -SWIPE_THRESHOLD && <span className="text-[#F5F5F0]">← No</span>}
                </div>
              </div>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => handleLlevaTildeAnswer(false)}
                  className={`w-[180px] text-center py-5 border border-[#2a2a2a] text-[#999] hover:bg-[#F5F5F0] hover:text-black hover:border-[#F5F5F0] ${btnBase}`}
                  id="btn-lleva-no"
                >
                  <div className="display-heavy text-xl">No</div>
                  <div className="text-[9px] text-[#666] mt-1.5">[ N ] · ← swipe</div>
                </button>
                <button
                  onClick={() => handleLlevaTildeAnswer(true)}
                  className={`w-[180px] text-center py-5 border border-[#F5F5F0] hover:bg-[#F5F5F0] hover:text-black ${btnBase}`}
                  id="btn-lleva-si"
                >
                  <div className="display-heavy text-xl">Sí</div>
                  <div className="text-[9px] text-[#666] mt-1.5">[ S ] · swipe →</div>
                </button>
              </div>
              <div className="text-center text-[10px] text-[#666] mt-4 sm:hidden">
                Deslizá la palabra → para <span className="text-[#999]">Sí</span>, ← para <span className="text-[#999]">No</span>
              </div>
            </div>
          )}

          {/* MODE 2: Escribí la tilde */}
          {mode === 'escribi-tilde' && (
            <div className="text-center max-w-[360px] mx-auto">
              <div className="display-heavy text-[#999] text-5xl">{word.wordClean}</div>
              <p className="text-[11px] text-[#888] mt-3.5">Escribí la palabra correctamente acentuada</p>
              <form onSubmit={handleEscribiTildeSubmit}>
                <input
                  ref={inputRef}
                  type="text"
                  value={userVal}
                  onChange={(e) => setUserVal(e.target.value)}
                  placeholder="Escribí aquí…"
                  className="mt-5 w-full bg-transparent border border-[#2a2a2a] focus:border-[#F5F5F0] text-[#F5F5F0] text-center text-lg py-3.5 px-4 outline-none transition-colors"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  id="input-escribi-tilde"
                />
                <div className="flex justify-center gap-2 mt-4">
                  {ACCENT_HELPERS.map((vowel) => (
                    <button
                      key={vowel}
                      type="button"
                      onClick={() => handleInsertAccent(vowel)}
                      className={`w-[30px] h-[30px] flex items-center justify-center border border-[#2a2a2a] text-xs text-[#999] hover:bg-[#F5F5F0] hover:text-black ${btnBase}`}
                    >
                      {vowel}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={!userVal.trim()}
                  className={`mt-5 w-full py-3.5 bg-[#F5F5F0] text-black text-xs disabled:opacity-40 hover:bg-[#d4d4d4] ${btnBase}`}
                >
                  Validar <span className="opacity-60">(Enter)</span>
                </button>
              </form>
            </div>
          )}

          {/* MODE 3: Encontrá el error */}
          {mode === 'encontra-error' && (
            <div>
              <p className="text-center text-[11px] text-[#888] mb-7">
                {isAmbiguous ? 'Elegí la forma correcta para la frase' : 'Elegí la palabra escrita correctamente'}
              </p>
              <div className="flex justify-center gap-5 flex-wrap">
                {options.map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    onClick={() => handleComparisonAnswer(opt)}
                    className={`w-full max-w-[220px] p-7 border border-[#2a2a2a] text-left hover:bg-[#F5F5F0] hover:text-black ${btnBase}`}
                    id={`btn-option-${oIdx}`}
                  >
                    <div className="text-[9px] text-[#666] tracking-[0.1em] mb-3 uppercase">Opción {oIdx + 1}</div>
                    <div className="display-heavy text-[32px] break-words">{opt}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MODE 4: ¿Dónde va la tilde? */}
          {mode === 'donde-va-tilde' && (
            <div>
              <p className="text-center text-[11px] text-[#888] mb-[30px]">Hacé clic sobre la vocal que lleva la tilde</p>
              <div className="flex justify-center gap-2">
                {word.wordClean.split('').map((char, letterIdx) => {
                  const isVowel = 'aeiou'.includes(char.toLowerCase());
                  return (
                    <button
                      key={letterIdx}
                      onClick={() => handleLetterClick(letterIdx, char)}
                      className={
                        isVowel
                          ? `w-11 h-[52px] flex items-center justify-center text-xl border border-[#2a2a2a] text-[#F5F5F0] hover:bg-[#F5F5F0] hover:text-black ${btnBase}`
                          : 'w-11 h-[52px] flex items-center justify-center text-xl border border-[#161616] bg-[#161616] text-[#444] cursor-not-allowed'
                      }
                    >
                      {char}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODE 5: Clasificación */}
          {mode === 'clasificacion' && (
            <div>
              <div className="text-center">
                <div className="display-heavy text-6xl">{word.word}</div>
                <p className="text-[11px] text-[#888] mt-4">¿Cómo se clasifica esta palabra según su sílaba tónica?</p>
              </div>
              <div className="flex justify-center gap-2.5 mt-[26px] flex-wrap">
                {[
                  { id: 'aguda' as WordClassification, label: 'Aguda', key: '1' },
                  { id: 'grave' as WordClassification, label: 'Grave', key: '2' },
                  { id: 'esdrújula' as WordClassification, label: 'Esdrújula', key: '3' },
                  { id: 'sobreesdrújula' as WordClassification, label: 'Sobreesdrújula', key: '4' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleClassificationAnswer(item.id)}
                    className={`w-[140px] text-center py-4 border border-[#2a2a2a] hover:bg-[#F5F5F0] hover:text-black ${btnBase}`}
                    id={`btn-classification-${item.id}`}
                  >
                    <div className="display-heavy text-base break-words leading-tight">{item.label}</div>
                    <div className="text-[9px] text-[#666] mt-1.5">[ {item.key} ]</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MODE 6: Dictado */}
          {mode === 'dictado' && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => speakWord(word.word, settings.soundEnabled)}
                className={`w-16 h-16 rounded-full border border-[#2a2a2a] flex items-center justify-center mx-auto text-xl hover:bg-[#F5F5F0] hover:text-black ${btnBase}`}
                title="Escuchar palabra"
              >
                ♪
              </button>
              <p className="text-[11px] text-[#888] mt-[18px]">Escuchá y escribí correctamente la palabra</p>
              <form onSubmit={handleEscribiTildeSubmit} className="max-w-[320px] mx-auto mt-5">
                <input
                  ref={inputRef}
                  type="text"
                  value={userVal}
                  onChange={(e) => setUserVal(e.target.value)}
                  placeholder="Escribí la palabra…"
                  className="w-full bg-transparent border border-[#2a2a2a] focus:border-[#F5F5F0] text-[#F5F5F0] text-center text-lg py-3.5 px-4 outline-none transition-colors"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  id="input-dictado"
                />
                <div className="flex justify-center gap-2 mt-4">
                  {ACCENT_HELPERS.map((vowel) => (
                    <button
                      key={vowel}
                      type="button"
                      onClick={() => handleInsertAccent(vowel)}
                      className={`w-[30px] h-[30px] flex items-center justify-center border border-[#2a2a2a] text-xs text-[#999] hover:bg-[#F5F5F0] hover:text-black ${btnBase}`}
                    >
                      {vowel}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={!userVal.trim()}
                  className={`mt-5 w-full py-3.5 bg-[#F5F5F0] text-black text-xs disabled:opacity-40 hover:bg-[#d4d4d4] ${btnBase}`}
                >
                  Validar <span className="opacity-60">(Enter)</span>
                </button>
              </form>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center" id="feedback-canvas">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-full text-lg"
            style={
              isCorrect
                ? { background: '#F5F5F0', color: '#000', border: '2px solid #F5F5F0' }
                : { background: 'transparent', color: '#F5F5F0', border: '2px solid #F5F5F0' }
            }
          >
            {isCorrect ? '✓' : '✗'}
          </div>
          <div className="text-[11px] tracking-[0.15em] text-[#999] uppercase mt-4">
            {isCorrect ? '¡Respuesta correcta!' : 'Respuesta incorrecta'}
          </div>

          <div className="display-heavy text-[58px] mt-5">{word.word}</div>

          {settings.showSyllables && (
            <div className="flex justify-center gap-1.5 mt-3.5 text-xs">
              {word.syllables.map((syllable, idx) => {
                const isStressed = idx === word.stressedSyllableIdx;
                return (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span className="text-[#555]">•</span>}
                    <span className={isStressed ? 'px-2 py-0.5 border-b border-[#F5F5F0] text-[#F5F5F0]' : 'px-2 py-0.5 text-[#888]'}>
                      {syllable}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {(settings.showRule || settings.showExplanationOnError) && (
            <div className="max-w-[420px] mx-auto mt-6 border border-[#1a1a1a] py-[18px] px-[22px]">
              {settings.showRule && (
                <div className="text-[9px] tracking-[0.15em] text-[#666] uppercase">{word.rule}</div>
              )}
              {settings.showExplanationOnError && (
                <p className="text-xs text-[#999] mt-2.5 leading-relaxed">{word.explanation}</p>
              )}
            </div>
          )}

          <button
            onClick={onNext}
            className={`inline-block mt-7 px-8 py-3.5 bg-[#F5F5F0] text-black text-xs tracking-[0.08em] hover:bg-[#d4d4d4] ${btnBase}`}
            id="btn-next-exercise"
          >
            Siguiente palabra →
          </button>
          <div className="text-[10px] text-[#666] mt-3">Atajo: Enter o Espacio</div>
        </div>
      )}
    </div>
  );
}
