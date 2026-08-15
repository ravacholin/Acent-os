import React, { useState } from 'react';
import { GameMode, LevelMCER, WordCategory } from '../types';
import { motion } from 'motion/react';

interface PracticeSelectorProps {
  onSelectMode: (mode: GameMode, customOptions?: { levels: LevelMCER[]; categories: WordCategory[]; timeLimit?: number }) => void;
  onOpenDaily?: () => void;
}

export default function PracticeSelector({ onSelectMode, onOpenDaily }: PracticeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);

  // Custom mode options
  const [customLevels, setCustomLevels] = useState<LevelMCER[]>(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  const [customCategories, setCustomCategories] = useState<WordCategory[]>([
    'aguda', 'grave', 'esdrújula', 'sobreesdrújula', 'hiato', 'diptongo', 'triptongo', 'monosílabo',
    'diacrítica', 'interrogativo', 'exclamativo', 'mayúscula',
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

  const ALL_LEVELS: LevelMCER[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  const handleToggleLevel = (lvl: LevelMCER) => {
    if (customLevels.includes(lvl)) {
      setCustomLevels(customLevels.filter(l => l !== lvl));
    } else {
      setCustomLevels([...customLevels, lvl]);
    }
  };

  const handleToggleCategory = (cat: WordCategory) => {
    if (customCategories.includes(cat)) {
      setCustomCategories(customCategories.filter(c => c !== cat));
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
    `chip px-4 py-2 text-[11px] ${active ? 'chip-on' : ''}`;

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
    { id: 'mayúscula', label: 'Mayúsculas' },
    { id: 'extranjerismo', label: 'Extranjerismos' },
    { id: 'latinismo', label: 'Latinismos' },
    { id: 'mente', label: 'Adverbios -mente' },
    { id: 'pronombre', label: 'Enclíticos' }
  ];

  const allCategoryIds = categoryOptions.map(c => c.id);
  const allLevelsSelected = customLevels.length === ALL_LEVELS.length;
  const allCategoriesSelected = customCategories.length === allCategoryIds.length;
  const canStartCustom = customLevels.length > 0 && customCategories.length > 0;

  if (selectedMode === 'personalizado') {
    return (
      <div id="custom-setup-panel">
        <div className="flex justify-between items-baseline border-b border-[var(--color-line-soft)] pb-[22px] mb-8 gap-4 flex-wrap">
          <div>
            <div className="display-lg">Personalizado</div>
            <p className="text-[var(--color-fg-muted)] text-[13px] mt-2.5">Elegí niveles, categorías y duración</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedMode(null)}
            className="index-nav shrink-0"
          >
            <span className="index-nav-num">←</span>
            Volver
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8">
          <div>
            <div className="flex items-center justify-between mb-3.5 gap-3">
              <div className="hud"><span className="num text-[var(--color-fg-soft)] mr-2">01</span>Nivel MCER</div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setCustomLevels([...ALL_LEVELS])}
                  disabled={allLevelsSelected}
                  className="bulk-toggle"
                >
                  Todo
                </button>
                <button
                  type="button"
                  onClick={() => setCustomLevels([])}
                  disabled={customLevels.length === 0}
                  className="bulk-toggle"
                >
                  Ninguno
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_LEVELS.map((lvl) => (
                <span key={lvl} onClick={() => handleToggleLevel(lvl)} className={chipClass(customLevels.includes(lvl))}>
                  {lvl}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="hud mb-3.5"><span className="num text-[var(--color-fg-soft)] mr-2">02</span>Duración</div>
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
          <div className="flex items-center justify-between mb-3.5 gap-3">
            <div className="hud"><span className="num text-[var(--color-fg-soft)] mr-2">03</span>Reglas y categorías</div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setCustomCategories([...allCategoryIds])}
                disabled={allCategoriesSelected}
                className="bulk-toggle"
              >
                Todo
              </button>
              <button
                type="button"
                onClick={() => setCustomCategories([])}
                disabled={customCategories.length === 0}
                className="bulk-toggle"
              >
                Ninguno
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {categoryOptions.map((cat) => (
              <span key={cat.id} onClick={() => handleToggleCategory(cat.id)} className={chipClass(customCategories.includes(cat.id))}>
                {cat.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-[var(--color-line-soft)] pt-[26px] gap-4 flex-wrap">
          <p className="text-[var(--color-fg-muted)] text-[12px]">
            {canStartCustom
              ? `${customLevels.length} ${customLevels.length === 1 ? 'nivel' : 'niveles'} · ${customCategories.length} ${customCategories.length === 1 ? 'categoría' : 'categorías'}`
              : 'Elegí al menos un nivel y una categoría para empezar'}
          </p>
          <button
            onClick={handleStartCustomMode}
            disabled={!canStartCustom}
            className="btn-primary hud text-[var(--color-canvas)] px-8 py-3.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Comenzar entrenamiento
          </button>
        </div>
      </div>
    );
  }

  // Menú tap-first. Los dos destinos destacados (sesión adaptativa + desafío
  // diario) se ejecutan al tocar; los nueve modos dirigidos viven en un índice
  // numerado donde cada fila lleva su propia spec.
  return (
    <div id="practice-selector">
      <div className="rep">
        {/* Par destacado: primario (slab) + desafío (contorno). */}
        <div className="rep-feature">
          <motion.button
            type="button"
            onClick={() => onSelectMode('adaptativo')}
            className="rep-card rep-primary"
            id="mode-card-entrenar"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.5, 0, 0.2, 1] }}
          >
            <span className="rep-kick">00 · Recomendado</span>
            <span className="rep-name">Entrenar</span>
            <span className="rep-desc">El formato de cada palabra se ajusta a tu dominio.</span>
            <span className="rep-go">Empezar <span className="ar" aria-hidden="true">→</span></span>
          </motion.button>

          {onOpenDaily && (
            <motion.button
              type="button"
              onClick={onOpenDaily}
              className="rep-card rep-secondary"
              id="mode-card-desafio"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.04, ease: [0.5, 0, 0.2, 1] }}
            >
              <span className="rep-kick">★ · Desafío diario</span>
              <span className="rep-name">Hoy</span>
              <span className="rep-desc">20 palabras · +100 XP</span>
              <span className="rep-go">Ver <span className="ar" aria-hidden="true">→</span></span>
            </motion.button>
          )}
        </div>

        {/* Índice de modos dirigidos: cada fila se explica sola y ejecuta al tocar. */}
        <nav aria-label="Modos de práctica dirigida" id="modes-grid">
          <div className="rep-sec">
            <span className="hud">Práctica dirigida</span>
            <span className="hud num text-[var(--color-fg-quiet)]">{String(modesList.length).padStart(2, '0')}</span>
          </div>
          <div className="rep-list">
            {modesList.map((mode, idx) => (
              <button
                key={mode.id}
                type="button"
                className="rep-row"
                id={`mode-card-${mode.id}`}
                onClick={mode.id === 'personalizado' ? () => setSelectedMode('personalizado') : () => onSelectMode(mode.id)}
              >
                <span className="rep-n" aria-hidden="true">{String(idx + 1).padStart(2, '0')}</span>
                <span className="rep-body">
                  <span className="rep-title">{mode.title}</span>
                  <span className="rep-spec">{mode.badge} · {mode.difficulty}</span>
                </span>
                <span className="rep-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
