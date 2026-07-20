import React, { useState } from 'react';
import { GameMode, LevelMCER, WordCategory } from '../types';
import { motion } from 'motion/react';

interface PracticeSelectorProps {
  onSelectMode: (mode: GameMode, customOptions?: { levels: LevelMCER[]; categories: WordCategory[]; timeLimit?: number }) => void;
}

export default function PracticeSelector({ onSelectMode }: PracticeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);

  // Custom mode options
  const [customLevels, setCustomLevels] = useState<LevelMCER[]>(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  const [customCategories, setCustomCategories] = useState<WordCategory[]>([
    'aguda', 'grave', 'esdrújula', 'sobreesdrújula', 'hiato', 'diptongo', 'triptongo', 'monosílabo',
    'diacrítica', 'interrogativo', 'exclamativo', 'solo-solo', 'demostrativo', 'mayúscula',
    'extranjerismo', 'latinismo', 'mente', 'pronombre'
  ]);
  const [customTime, setCustomTime] = useState<number>(60);

  const modesList = [
    {
      id: 'lleva-tilde' as GameMode,
      title: '¿Lleva tilde?',
      description: 'Microdesafíos de sí o no. Reacción inmediata.',
      difficulty: 'Fácil · 2–4s',
      badge: 'Rápido'
    },
    {
      id: 'escribi-tilde' as GameMode,
      title: 'Escribí la tilde',
      description: 'Escribí la palabra con su tilde correspondiente.',
      difficulty: 'Medio · 4–6s',
      badge: 'Escritura'
    },
    {
      id: 'encontra-error' as GameMode,
      title: 'Encontrá el error',
      description: 'Comparás dos formas gráficas y elegís la correcta.',
      difficulty: 'Fácil · 3–5s',
      badge: 'Visual'
    },
    {
      id: 'donde-va-tilde' as GameMode,
      title: '¿Dónde va la tilde?',
      description: 'Tocás la vocal que debe llevar la tilde.',
      difficulty: 'Medio · 3–6s',
      badge: 'Interactivo'
    },
    {
      id: 'clasificacion' as GameMode,
      title: 'Clasificación',
      description: 'Clasificás agudas, graves, esdrújulas o sobreesdrújulas.',
      difficulty: 'Medio · 3–5s',
      badge: 'Teoría'
    },
    {
      id: 'dictado' as GameMode,
      title: 'Dictado (audio)',
      description: 'Escuchás y escribís la palabra con sus tildes.',
      difficulty: 'Difícil · 5–8s',
      badge: 'Auditivo'
    },
    {
      id: 'supervivencia' as GameMode,
      title: 'Supervivencia',
      description: '30 segundos iniciales. Aciertos suman, errores restan.',
      difficulty: 'Extremo',
      badge: 'Arcade'
    },
    {
      id: 'infinito' as GameMode,
      title: 'Infinito',
      description: 'Práctica libre, sin límite de tiempo ni presión.',
      difficulty: 'Libre',
      badge: 'Zen'
    },
    {
      id: 'personalizado' as GameMode,
      title: 'Personalizado',
      description: 'Elegí niveles, categorías y duración a tu medida.',
      difficulty: 'Configurable',
      badge: 'Filtros'
    }
  ];

  const handleToggleLevel = (lvl: LevelMCER) => {
    if (customLevels.includes(lvl)) {
      if (customLevels.length > 1) {
        setCustomLevels(customLevels.filter(l => l !== lvl));
      }
    } else {
      setCustomLevels([...customLevels, lvl]);
    }
  };

  const handleToggleCategory = (cat: WordCategory) => {
    if (customCategories.includes(cat)) {
      if (customCategories.length > 1) {
        setCustomCategories(customCategories.filter(c => c !== cat));
      }
    } else {
      setCustomCategories([...customCategories, cat]);
    }
  };

  const handleStartCustomMode = () => {
    onSelectMode('personalizado', {
      levels: customLevels,
      categories: customCategories,
      timeLimit: customTime
    });
  };

  const chipClass = (active: boolean) =>
    `px-4 py-2 text-[11px] border cursor-pointer transition-colors ${
      active ? 'border-[var(--color-fg)] text-[var(--color-fg)]' : 'border-[var(--color-line)] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-faint)]'
    }`;

  const categoryOptions: { id: WordCategory; label: string }[] = [
    { id: 'aguda', label: 'Agudas' },
    { id: 'grave', label: 'Graves' },
    { id: 'esdrújula', label: 'Esdrújulas' },
    { id: 'sobreesdrújula', label: 'Sobreesdrújulas' },
    { id: 'hiato', label: 'Hiatos' },
    { id: 'diptongo', label: 'Diptongos' },
    { id: 'triptongo', label: 'Triptongos' },
    { id: 'monosílabo', label: 'Monosílabos' },
    { id: 'diacrítica', label: 'Diacríticas' },
    { id: 'interrogativo', label: 'Interrogativos' },
    { id: 'exclamativo', label: 'Exclamativos' },
    { id: 'solo-solo', label: 'Solo / Sólo' },
    { id: 'demostrativo', label: 'Demostrativos' },
    { id: 'mayúscula', label: 'Mayúsculas' },
    { id: 'extranjerismo', label: 'Extranjerismos' },
    { id: 'latinismo', label: 'Latinismos' },
    { id: 'mente', label: 'Adverbios -mente' },
    { id: 'pronombre', label: 'Enclíticos' }
  ];

  if (selectedMode === 'personalizado') {
    return (
      <div id="custom-setup-panel">
        <div className="flex justify-between items-baseline border-b border-[var(--color-line-soft)] pb-[22px] mb-8 gap-4 flex-wrap">
          <div>
            <div className="display-brutal text-[30px] sm:text-[36px]">Personalizado</div>
            <p className="text-[var(--color-fg-muted)] text-[11px] mt-2">Elegí niveles, categorías y duración</p>
          </div>
          <span
            onClick={() => setSelectedMode(null)}
            className="text-[10px] tracking-[0.15em] text-[var(--color-fg-soft)] border border-[var(--color-line)] px-4 py-2 cursor-pointer uppercase hover:border-[var(--color-fg)] hover:text-[var(--color-fg)] transition-colors"
          >
            Volver
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8">
          <div>
            <div className="text-[9px] tracking-[0.2em] text-[var(--color-fg-quiet)] uppercase mb-3.5">Nivel MCER</div>
            <div className="flex flex-wrap gap-2">
              {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as LevelMCER[]).map((lvl) => (
                <span key={lvl} onClick={() => handleToggleLevel(lvl)} className={chipClass(customLevels.includes(lvl))}>
                  {lvl}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[9px] tracking-[0.2em] text-[var(--color-fg-quiet)] uppercase mb-3.5">Duración</div>
            <div className="flex flex-wrap gap-2">
              {[30, 60, 120, 180].map((t) => (
                <span key={t} onClick={() => setCustomTime(t)} className={chipClass(customTime === t)}>
                  {t === 180 ? '3 min' : t === 120 ? '2 min' : t === 60 ? '1 min' : '30s'}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-9">
          <div className="text-[9px] tracking-[0.2em] text-[var(--color-fg-quiet)] uppercase mb-3.5">Reglas y categorías</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {categoryOptions.map((cat) => (
              <span key={cat.id} onClick={() => handleToggleCategory(cat.id)} className={chipClass(customCategories.includes(cat.id))}>
                {cat.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-[var(--color-line-soft)] pt-[26px]">
          <button
            onClick={handleStartCustomMode}
            className="px-8 py-3.5 bg-[var(--color-fg)] text-black text-xs tracking-[0.1em] cursor-pointer hover:bg-[var(--color-paper-dim)] transition-colors"
          >
            Comenzar entrenamiento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="practice-selector">
      <div className="border-b border-[var(--color-line-soft)] pb-[18px] mb-8">
        <div className="text-[9px] tracking-[0.25em] text-[var(--color-fg-dim)] uppercase">Práctica dirigida</div>
        <p className="text-[var(--color-fg-muted)] text-[11px] mt-2">Elegí un formato o modo concreto para enfocar tu práctica</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-[var(--color-line-soft)]" id="modes-grid">
        {modesList.map((mode, idx) => (
          <motion.div
            key={mode.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, delay: idx * 0.03 }}
            onClick={() => {
              if (mode.id === 'personalizado') {
                setSelectedMode('personalizado');
              } else {
                onSelectMode(mode.id);
              }
            }}
            className="group border-r border-b border-[var(--color-line-soft)] p-6 cursor-pointer min-h-[190px] flex flex-col justify-between hover:bg-[var(--color-fg)] hover:text-black transition-colors duration-150"
            id={`mode-card-${mode.id}`}
          >
            <div>
              <div className="flex justify-end items-baseline">
                <span className="text-[9px] text-[var(--color-fg-faint)] group-hover:text-black/40 transition-colors">{String(idx + 1).padStart(2, '0')}</span>
              </div>
              <div className="display-heavy text-2xl mt-3">{mode.title}</div>
              <p className="text-[var(--color-fg-muted)] group-hover:text-black/70 text-[11px] mt-2.5 leading-relaxed transition-colors">{mode.description}</p>
            </div>
            <div className="text-[10px] text-[var(--color-fg-dim)] group-hover:text-black/60 mt-4 transition-colors">{mode.difficulty}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
