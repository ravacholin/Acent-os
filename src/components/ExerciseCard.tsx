import React, { useState, useEffect, useRef } from 'react';
import { Word, GameMode, AppSettings, WordClassification } from '../types';
import { 
  playClickSound, 
  playCorrectSound, 
  playIncorrectSound, 
  speakWord 
} from '../utils/audio';
import { 
  Volume2, 
  ChevronRight, 
  Check, 
  X, 
  HelpCircle, 
  Sparkles, 
  Timer as TimerIcon,
  Flame,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExerciseCardProps {
  word: Word;
  mode: GameMode;
  settings: AppSettings;
  comboStreak: number;
  timeLeft?: number; // For Survival Mode
  onAnswer: (isCorrect: boolean, timeTakenMs: number) => void;
  onNext: () => void;
}

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
  
  const startTimeRef = useRef<number>(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  // Restart state on word change
  useEffect(() => {
    setAnswered(false);
    setIsCorrect(false);
    setUserVal('');
    setSelectedLetterIdx(null);
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

  // Handle Mode 3: Encontrá el error
  // We need static options for the word
  const getComparisonOptions = () => {
    // Determine options. One with correct accents, one without (clean)
    // Sometimes word doesn't have tilde, but the incorrect option adds one incorrectly!
    const correctOption = word.word;
    let incorrectOption = word.wordClean;

    if (!word.hasTilde) {
      // If original doesn't have a tilde, create a fake incorrect accented syllable
      // e.g., "reloj" -> "relój"
      const syllables = [...word.syllables];
      if (syllables.length > 0) {
        // Place a tilde on the stressed syllable vowel incorrectly
        if (word.id === 'reloj') incorrectOption = 'relój';
        else if (word.id === 'pared') incorrectOption = 'paréd';
        else if (word.id === 'cantar') incorrectOption = 'cantár';
        else if (word.id === 'mesa') incorrectOption = 'mésa';
        else if (word.id === 'examen') incorrectOption = 'exámen';
        else if (word.id === 'joven') incorrectOption = 'jóven';
        else incorrectOption = word.wordClean + '́'; // fallback marker
      }
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

  // Syllables visualization highlights
  const renderSyllables = () => {
    return (
      <div className="flex gap-1.5 font-mono text-sm justify-center py-1">
        {word.syllables.map((syllable, idx) => {
          const isStressed = idx === word.stressedSyllableIdx;
          return (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-neutral-700">•</span>}
              <span className={`px-2 py-0.5 ${
                isStressed
                  ? 'bg-[#161616] border border-[#262626] text-white font-semibold'
                  : 'text-[#8a8a8a]'
              }`}>
                {syllable}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6" id={`exercise-${word.id}`}>
      
      {/* Top Indicators bar */}
      <div className="flex justify-between items-center bg-[#161616] p-4 border border-[#262626]">
        <div className="flex gap-3 items-center text-xs font-mono text-[#A1A1A1]">
          {settings.showLevel && (
            <span className="px-2 py-0.5 bg-black border border-[#262626] text-[#A1A1A1]">
              Nivel {word.level}
            </span>
          )}
          <span className="capitalize">{word.category}</span>
        </div>

        {/* Combo metrics & timer */}
        <div className="flex items-center gap-4 text-xs font-mono">
          {timeLeft !== undefined && (
            <div className="flex items-center gap-1 text-white font-bold">
              <TimerIcon className="w-3.5 h-3.5" />
              <span>{timeLeft}s</span>
            </div>
          )}
          {comboStreak > 1 && (
            <div className="flex items-center gap-1 text-white font-bold animate-pulse">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{comboStreak}x Combo</span>
            </div>
          )}
        </div>
      </div>

      {/* Main interaction Card */}
      <div className="bg-[#161616] border border-[#262626] p-8 relative overflow-hidden min-h-[280px] flex flex-col justify-between">
        
        {/* Dynamic game mode canvas */}
        <div className="flex-1 flex flex-col justify-center items-center py-6">
          <AnimatePresence mode="wait">
            {!answered ? (
              <motion.div 
                key="active-exercise"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="w-full text-center space-y-6"
              >
                
                {/* MODE 1: ¿Lleva tilde? */}
                {mode === 'lleva-tilde' && (
                  <div className="flex flex-col items-center gap-8">
                    <div className="flex flex-col items-center gap-4">
                      <span className="text-[11px] text-[#A1A1A1] uppercase tracking-[0.3em] font-medium font-mono">¿Lleva tilde?</span>
                      <div className="text-[72px] md:text-[100px] font-medium tracking-tight leading-none lowercase text-[#EDEDED] font-display select-none">
                        {word.wordClean}
                      </div>
                    </div>
                    
                    {/* Interactive Buttons matching the Clean Minimalism mockup */}
                    <div className="flex gap-6 justify-center pt-2">
                      <button
                        onClick={() => handleLlevaTildeAnswer(true)}
                        className="group relative w-44 py-5 bg-[#0d0d0d] border border-[#262626] hover:bg-white hover:text-black transition-all duration-200 flex flex-col items-center gap-2 cursor-pointer"
                        id="btn-lleva-si"
                      >
                        <span className="text-lg font-medium">Sí</span>
                        <span className="text-[10px] opacity-40 font-mono">[ S ]</span>
                      </button>
                      <button
                        onClick={() => handleLlevaTildeAnswer(false)}
                        className="group relative w-44 py-5 bg-[#0d0d0d] border border-[#262626] hover:bg-white hover:text-black transition-all duration-200 flex flex-col items-center gap-2 cursor-pointer"
                        id="btn-lleva-no"
                      >
                        <span className="text-lg font-medium">No</span>
                        <span className="text-[10px] opacity-40 font-mono">[ N ]</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* MODE 2: Escribí la tilde */}
                {mode === 'escribi-tilde' && (
                  <div className="space-y-6 w-full max-w-sm mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#A1A1A1] font-display">
                      {word.wordClean}
                    </h1>
                    <p className="text-xs font-mono text-[#A1A1A1]">Escribe la palabra correctamente acentuada</p>
                    
                    <form onSubmit={handleEscribiTildeSubmit} className="space-y-3">
                      <input
                        ref={inputRef}
                        type="text"
                        value={userVal}
                        onChange={(e) => setUserVal(e.target.value)}
                        placeholder="Escribe aquí..."
                        className="w-full bg-[#0d0d0d] border border-[#262626] focus:border-white text-white font-mono text-center text-lg py-2.5 px-4 outline-none transition-colors"
                        autoComplete="off"
                        autoCapitalize="off"
                        autoCorrect="off"
                        id="input-escribi-tilde"
                      />
                      
                      {/* Virtual Accents Helper */}
                      <div className="flex justify-center gap-1.5 pt-1">
                        {['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ'].map((vowel) => (
                          <button
                            key={vowel}
                            type="button"
                            onClick={() => handleInsertAccent(vowel)}
                            className="w-8 h-8 flex items-center justify-center bg-[#0d0d0d] border border-[#262626] text-xs font-mono text-[#A1A1A1] hover:bg-white hover:text-black transition-colors cursor-pointer"
                          >
                            {vowel}
                          </button>
                        ))}
                      </div>

                      <button
                        type="submit"
                        disabled={!userVal.trim()}
                        className="w-full py-2.5 bg-white text-black font-semibold hover:bg-neutral-200 disabled:opacity-40 disabled:hover:bg-white transition-all text-sm cursor-pointer"
                      >
                        Validar <span className="text-[10px] opacity-60 font-mono ml-1">(Enter)</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* MODE 3: Encontrá el error */}
                {mode === 'encontra-error' && (
                  <div className="space-y-6">
                    <p className="text-xs font-mono text-[#A1A1A1]">Elige la palabra escrita correctamente</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto pt-2">
                      {options.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          onClick={() => handleComparisonAnswer(opt)}
                          className="p-5 bg-[#0d0d0d] border border-[#262626] hover:bg-white hover:text-black group text-center font-display text-2xl font-bold text-[#EDEDED] transition-all cursor-pointer"
                          id={`btn-option-${oIdx}`}
                        >
                          <div className="text-[10px] font-mono text-[#A1A1A1] group-hover:text-black/60 transition-colors uppercase tracking-widest text-left mb-2">Opción {oIdx + 1}</div>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* MODE 4: ¿Dónde va la tilde? */}
                {mode === 'donde-va-tilde' && (
                  <div className="space-y-6">
                    <p className="text-xs font-mono text-[#A1A1A1]">Haz clic sobre la vocal que lleva la tilde</p>
                    
                    <div className="flex gap-2 justify-center py-4">
                      {word.wordClean.split('').map((char, letterIdx) => {
                        const isVowel = 'aeiou'.includes(char.toLowerCase());
                        return (
                          <button
                            key={letterIdx}
                            onClick={() => handleLetterClick(letterIdx, char)}
                            className={`w-12 h-14 border flex items-center justify-center text-2xl font-bold font-mono transition-all ${
                              isVowel
                                ? 'bg-[#0d0d0d] border-[#262626] text-white hover:bg-white hover:text-black cursor-pointer'
                                : 'bg-[#161616] border-[#161616] text-[#555] cursor-not-allowed'
                            }`}
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
                  <div className="space-y-6">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#EDEDED] font-display">
                      {word.word}
                    </h1>
                    <p className="text-xs font-mono text-[#A1A1A1]">¿Cómo se clasifica esta palabra según su sílaba tónica?</p>
                    
                    <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto pt-2">
                      {[
                        { id: 'aguda' as WordClassification, label: 'Aguda', key: '1' },
                        { id: 'grave' as WordClassification, label: 'Grave', key: '2' },
                        { id: 'esdrújula' as WordClassification, label: 'Esdrújula', key: '3' },
                        { id: 'sobreesdrújula' as WordClassification, label: 'Sobreesdrújula', key: '4' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleClassificationAnswer(item.id)}
                          className="p-3 bg-[#0d0d0d] border border-[#262626] hover:bg-white hover:text-black group text-xs text-[#EDEDED] font-semibold transition-all cursor-pointer flex flex-col justify-center items-center gap-1"
                          id={`btn-classification-${item.id}`}
                        >
                          <span className="font-display text-sm font-semibold">{item.label}</span>
                          <span className="text-[9px] font-mono text-[#A1A1A1] group-hover:text-black/60 transition-colors">Atajo: {item.key}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* MODE 6: Dictado */}
                {mode === 'dictado' && (
                  <div className="space-y-6 w-full max-w-sm mx-auto">
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => speakWord(word.word, settings.soundEnabled)}
                        className="p-4 bg-[#0d0d0d] border border-[#262626] hover:bg-white hover:text-black transition-all active:scale-90 cursor-pointer flex items-center justify-center"
                        title="Escuchar palabra"
                      >
                        <Volume2 className="w-6 h-6 stroke-[2]" />
                      </button>
                    </div>
                    <p className="text-xs font-mono text-[#A1A1A1]">Escucha y escribe correctamente la palabra</p>
                    
                    <form onSubmit={handleEscribiTildeSubmit} className="space-y-3">
                      <input
                        ref={inputRef}
                        type="text"
                        value={userVal}
                        onChange={(e) => setUserVal(e.target.value)}
                        placeholder="Escribe la palabra..."
                        className="w-full bg-[#0d0d0d] border border-[#262626] focus:border-white text-white font-mono text-center text-lg py-2.5 px-4 outline-none transition-colors"
                        autoComplete="off"
                        autoCapitalize="off"
                        autoCorrect="off"
                        id="input-dictado"
                      />

                      {/* Virtual Accents Helper */}
                      <div className="flex justify-center gap-1.5 pt-1">
                        {['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ'].map((vowel) => (
                          <button
                            key={vowel}
                            type="button"
                            onClick={() => handleInsertAccent(vowel)}
                            className="w-8 h-8 flex items-center justify-center bg-[#0d0d0d] border border-[#262626] text-xs font-mono text-[#A1A1A1] hover:bg-white hover:text-black transition-colors cursor-pointer"
                          >
                            {vowel}
                          </button>
                        ))}
                      </div>

                      <button
                        type="submit"
                        disabled={!userVal.trim()}
                        className="w-full py-2.5 bg-white text-black font-semibold hover:bg-neutral-200 disabled:opacity-40 disabled:hover:bg-white transition-all text-sm cursor-pointer"
                      >
                        Validar <span className="text-[10px] opacity-60 font-mono ml-1">(Enter)</span>
                      </button>
                    </form>
                  </div>
                )}

              </motion.div>
            ) : (
              <motion.div 
                key="feedback-canvas"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="w-full space-y-6"
              >
                {/* Result Announcement */}
                <div className="flex flex-col items-center space-y-3">
                  <div className={`p-3 border-2 ${
                    isCorrect
                      ? 'bg-white border-white text-black'
                      : 'bg-transparent border-white text-white'
                  }`}>
                    {isCorrect ? (
                      <Check className="w-8 h-8 stroke-[3]" />
                    ) : (
                      <X className="w-8 h-8 stroke-[3]" />
                    )}
                  </div>
                  <h2 className="text-sm font-semibold tracking-widest font-mono text-[#A1A1A1] uppercase">
                    {isCorrect ? '¡Respuesta Correcta!' : 'Respuesta Incorrecta'}
                  </h2>
                </div>

                {/* Primary Comparison Info */}
                <div className="text-center space-y-3">
                  <div className="text-4xl md:text-5xl font-bold tracking-tight text-[#EDEDED] font-display">
                    {word.word}
                  </div>
                  
                  {settings.showSyllables && renderSyllables()}
                </div>

                {/* Pedagogical support details */}
                <div className="max-w-md mx-auto bg-[#0d0d0d] p-4 border border-[#262626] space-y-2.5 text-center">
                  {settings.showRule && (
                    <div className="text-[10px] font-mono text-[#A1A1A1] uppercase tracking-widest">
                      {word.rule}
                    </div>
                  )}
                  {settings.showExplanationOnError && (!isCorrect || settings.showExplanationOnError) && (
                    <p className="text-xs text-[#A1A1A1] leading-relaxed max-w-sm mx-auto">
                      {word.explanation}
                    </p>
                  )}
                </div>

                {/* Next button */}
                <div className="flex justify-center pt-3">
                  <button
                    onClick={onNext}
                    className="px-6 py-2.5 bg-white text-black font-semibold hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center gap-2 text-sm cursor-pointer"
                    id="btn-next-exercise"
                  >
                    Siguiente Palabra
                    <ArrowRight className="w-4 h-4 text-black" />
                  </button>
                </div>
                <div className="text-[10px] text-neutral-500 font-mono text-center">
                  Atajo: pulsa <span className="text-[#EDEDED] bg-[#0d0d0d] px-1.5 py-0.5 border border-[#262626] font-mono">Enter</span> o <span className="text-[#EDEDED] bg-[#0d0d0d] px-1.5 py-0.5 border border-[#262626] font-mono">Espacio</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
