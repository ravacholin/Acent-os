import React, { useState } from 'react';
import { GameMode, LevelMCER, WordCategory } from '../types';
import { motion } from 'motion/react';

interface PracticeSelectorProps {
  onSelectMode: (mode: GameMode, customOptions?: { levels: LevelMCER[]; categories: WordCategory[]; timeLimit?: number }) => void;
  onOpenDaily?: () => void;
}

export default function PracticeSelector({ onSelectMode, onOpenDaily }: PracticeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  // Modo enfocado en el expositor (gobierna el panel monumental de la izquierda).
  const [focusId, setFocusId] = useState<string>('entrenar');

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
            <div className="hud mb-3.5"><span className="num text-[var(--color-fg-soft)] mr-2">01</span>Nivel MCER</div>
            <div className="flex flex-wrap gap-2">
              {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as LevelMCER[]).map((lvl) => (
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
          <div className="hud mb-3.5"><span className="num text-[var(--color-fg-soft)] mr-2">03</span>Reglas y categorías</div>
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
            className="btn-primary hud text-[var(--color-canvas)] px-8 py-3.5 cursor-pointer"
          >
            Comenzar entrenamiento
          </button>
        </div>
      </div>
    );
  }

  // Entradas del riel: dos destacadas (sesión adaptativa + desafío) y los nueve
  // modos. Cada una define su acción y el contenido del panel monumental.
  type Entry = {
    id: string;
    num: string;
    railTitle: string;
    kick: string;
    name: string;
    desc: string;
    cta: string;
    feat?: boolean;
    run: () => void;
  };

  const entries: Entry[] = [
    {
      id: 'entrenar',
      num: '00',
      railTitle: 'Entrenar',
      kick: 'Sesión adaptativa · recomendado',
      name: 'Entrenar',
      desc: 'El formato de cada palabra se ajusta a tu dominio. La forma recomendada de empezar una sesión.',
      cta: 'Empezar',
      feat: true,
      run: () => onSelectMode('adaptativo')
    },
    ...(onOpenDaily
      ? [{
          id: 'desafio',
          num: '★',
          railTitle: 'Desafío diario',
          kick: 'Hoy · 20 palabras · +100 XP',
          name: 'Desafío diario',
          desc: 'Una prueba fija de veinte palabras, una vez al día. Combinación balanceada de reglas.',
          cta: 'Ver desafío',
          feat: true,
          run: onOpenDaily
        } as Entry]
      : []),
    ...modesList.map((mode, idx): Entry => ({
      id: mode.id,
      num: String(idx + 1).padStart(2, '0'),
      railTitle: mode.title,
      kick: `${mode.badge} · ${mode.difficulty}`,
      name: mode.title,
      desc: mode.description,
      cta: mode.id === 'personalizado' ? 'Configurar' : 'Empezar',
      run: mode.id === 'personalizado' ? () => setSelectedMode('personalizado') : () => onSelectMode(mode.id)
    }))
  ];

  const focused = entries.find(e => e.id === focusId) ?? entries[0];

  return (
    <div id="practice-selector">
      <div className="expo">
        {/* Panel monumental: el modo enfocado, con su numeral fantasma detrás. */}
        <section className="expo-focus">
          <span className="expo-ghost" aria-hidden="true">{focused.num}</span>
          <motion.div
            key={focused.id}
            className="expo-in"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: [0.5, 0, 0.2, 1] }}
          >
            <div className="hud mb-[clamp(0.9rem,2.4vw,1.6rem)]">{focused.kick}</div>
            <h2 className="expo-name">{focused.name}</h2>
            <p className="expo-desc">{focused.desc}</p>
            <button type="button" onClick={focused.run} className="expo-cta">
              {focused.cta} <span className="ar" aria-hidden="true">→</span>
            </button>
          </motion.div>
        </section>

        {/* Riel-índice: recorrer aquí gobierna el panel; el clic ejecuta. */}
        <nav className="expo-rail" aria-label="Modos de práctica" id="modes-grid">
          <div className="expo-rail-head">
            <span className="hud">Práctica</span>
            <span className="hud num text-[var(--color-fg-quiet)]">{String(entries.length).padStart(2, '0')}</span>
          </div>
          {entries.map((e) => (
            <button
              key={e.id}
              type="button"
              className={`expo-item ${e.feat ? 'feat' : ''} ${focusId === e.id ? 'expo-item-on' : ''}`}
              id={`mode-card-${e.id}`}
              onMouseEnter={() => setFocusId(e.id)}
              onFocus={() => setFocusId(e.id)}
              onClick={e.run}
            >
              <span className="n" aria-hidden="true">{e.num}</span>
              <span className="t">{e.railTitle}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
