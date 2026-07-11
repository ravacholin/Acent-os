import React, { useState } from 'react';
import { GameMode, LevelMCER, WordCategory } from '../types';
import { 
  CheckCircle, 
  Keyboard, 
  AlertOctagon, 
  Type, 
  Layers, 
  Volume2, 
  Zap, 
  Infinity as InfinityIcon, 
  SlidersHorizontal, 
  Play, 
  Check 
} from 'lucide-react';
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
      description: 'Microdesafíos ultra rápidos de Sí o No. Entrena tu reacción inmediata.',
      icon: CheckCircle,
      difficulty: 'Fácil • 2-4s por palabra',
      badge: 'Rápido'
    },
    {
      id: 'escribi-tilde' as GameMode,
      title: 'Escribí la tilde',
      description: 'Escribe la palabra con su tilde correspondiente. Práctica de teclado activa.',
      icon: Keyboard,
      difficulty: 'Medio • 4-6s por palabra',
      badge: 'Escritura'
    },
    {
      id: 'encontra-error' as GameMode,
      title: 'Encontrá el error',
      description: 'Compara dos opciones gráficas de la misma palabra y elige la correcta.',
      icon: AlertOctagon,
      difficulty: 'Fácil • 3-5s por palabra',
      badge: 'Visual'
    },
    {
      id: 'donde-va-tilde' as GameMode,
      title: '¿Dónde va la tilde?',
      description: 'Toca exactamente la vocal que debe llevar la tilde en la palabra mostrada.',
      icon: Type,
      difficulty: 'Medio-Difícil • 3-6s',
      badge: 'Interactivo'
    },
    {
      id: 'clasificacion' as GameMode,
      title: 'Clasificación',
      description: 'Clasifica las palabras instantáneamente en Agudas, Graves, Esdrújulas o Sobreesdrújulas.',
      icon: Layers,
      difficulty: 'Medio • 3-5s por palabra',
      badge: 'Teoría Práctica'
    },
    {
      id: 'dictado' as GameMode,
      title: 'Dictado (Audio)',
      description: 'Escucha la palabra pronunciada y escríbela correctamente con sus tildes.',
      icon: Volume2,
      difficulty: 'Difícil • 5-8s por palabra',
      badge: 'Auditivo'
    },
    {
      id: 'supervivencia' as GameMode,
      title: 'Supervivencia',
      description: 'Empieza con 30 segundos. Los aciertos suman tiempo; los errores descuentan.',
      icon: Zap,
      difficulty: 'Extremo • Presión',
      badge: 'Arcade'
    },
    {
      id: 'infinito' as GameMode,
      title: 'Infinito',
      description: 'Práctica libre sin límites de tiempo ni presión. Ideal para relajarse.',
      icon: InfinityIcon,
      difficulty: 'Libre • Sin Estrés',
      badge: 'Zen'
    },
    {
      id: 'personalizado' as GameMode,
      title: 'Personalizado',
      description: 'Elige niveles específicos (A1-C2), categorías y duración a tu medida.',
      icon: SlidersHorizontal,
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

  return (
    <div className="space-y-8" id="practice-selector">
      <div className="border-b border-[#1F1F1F] pb-5">
        <h2 className="text-2xl font-semibold tracking-tight text-[#EDEDED] font-display">Modos de Entrenamiento</h2>
        <p className="text-[#A1A1A1] text-sm mt-1">
          Sesiones rápidas, limpias y altamente adictivas de 2 a 5 minutos. Diseñado para construir intuición ortográfica.
        </p>
      </div>

      {selectedMode === 'personalizado' ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-[#262626] bg-[#161616] p-6 space-y-6"
          id="custom-setup-panel"
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-[#EDEDED] font-display">Configuración Personalizada</h3>
              <p className="text-[#A1A1A1] text-xs">Ajusta el entrenamiento según tus necesidades de estudio</p>
            </div>
            <button 
              onClick={() => setSelectedMode(null)}
              className="text-[#A1A1A1] hover:text-white text-xs px-3 py-1.5 border border-[#262626] hover:bg-[#0d0d0d] transition-colors"
            >
              Volver a modos
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Levels */}
            <div className="space-y-3">
              <label className="text-xs font-semibold tracking-widest text-[#A1A1A1] uppercase font-mono">Nivel MCER</label>
              <div className="flex flex-wrap gap-2">
                {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as LevelMCER[]).map((lvl) => {
                  const active = customLevels.includes(lvl);
                  return (
                    <button
                      key={lvl}
                      onClick={() => handleToggleLevel(lvl)}
                      className={`px-4 py-2 text-xs font-mono font-medium transition-all flex items-center gap-1.5 border cursor-pointer ${
                        active
                          ? 'bg-white text-black border-white'
                          : 'bg-[#0d0d0d] text-[#A1A1A1] border-[#262626] hover:border-[#EDEDED]'
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time limit */}
            <div className="space-y-3">
              <label className="text-xs font-semibold tracking-widest text-[#A1A1A1] uppercase font-mono">Límite de tiempo</label>
              <div className="flex gap-2">
                {[30, 60, 120, 180].map((t) => (
                  <button
                    key={t}
                    onClick={() => setCustomTime(t)}
                    className={`px-4 py-2 text-xs font-mono font-medium transition-all border cursor-pointer ${
                      customTime === t
                        ? 'bg-white text-black border-white'
                        : 'bg-[#0d0d0d] text-[#A1A1A1] border-[#262626] hover:border-[#EDEDED]'
                    }`}
                  >
                    {t === 180 ? '3 Min' : t === 120 ? '2 Min' : t === 60 ? '1 Min' : '30s'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-semibold tracking-widest text-[#A1A1A1] uppercase font-mono">Reglas y Categorías</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {[
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
                { id: 'pronombre', label: 'Enclíticos' },
              ].map((cat) => {
                const active = customCategories.includes(cat.id as WordCategory);
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleToggleCategory(cat.id as WordCategory)}
                    className={`px-3 py-2 text-xs text-left transition-all flex items-center justify-between border cursor-pointer ${
                      active
                        ? 'bg-[#0d0d0d] text-white border-[#EDEDED]'
                        : 'bg-[#0d0d0d] text-[#A1A1A1] border-[#262626] hover:border-[#EDEDED]'
                    }`}
                  >
                    <span className="truncate font-medium">{cat.label}</span>
                    {active && <Check className="w-3 h-3 text-white shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Launch Button */}
          <div className="pt-4 border-t border-[#1F1F1F] flex justify-end">
            <button
              onClick={handleStartCustomMode}
              className="px-6 py-2.5 bg-white text-black font-semibold hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center gap-2 text-sm cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current text-black" />
              Comenzar Entrenamiento
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="modes-grid">
          {modesList.map((mode, idx) => {
            const Icon = mode.icon;
            return (
              <motion.div
                key={mode.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                whileHover={{ y: -3 }}
                onClick={() => {
                  if (mode.id === 'personalizado') {
                    setSelectedMode('personalizado');
                  } else {
                    onSelectMode(mode.id);
                  }
                }}
                className="group relative p-5 bg-[#161616] hover:bg-white border border-[#262626] hover:border-white flex flex-col justify-between cursor-pointer h-52 transition-all duration-200"
                id={`mode-card-${mode.id}`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div className="p-2.5 bg-[#0d0d0d] group-hover:bg-black/5 border border-[#262626] group-hover:border-black/10 transition-all duration-200">
                      <Icon className="w-5 h-5 text-white group-hover:text-black stroke-[2] transition-colors" />
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-mono text-[#A1A1A1] group-hover:text-black/80 border border-[#262626] group-hover:border-black/10 px-2 py-0.5 bg-[#0d0d0d] group-hover:bg-black/5 transition-all duration-200">
                      {mode.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#EDEDED] group-hover:text-black mt-4 font-display flex items-center gap-1.5 transition-colors">
                    {mode.title}
                  </h3>
                  <p className="text-[#A1A1A1] group-hover:text-black/80 transition-colors text-xs mt-1.5 line-clamp-2 leading-relaxed">
                    {mode.description}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-4 pt-3 border-t border-[#1F1F1F] group-hover:border-black/10 text-[11px] transition-colors">
                  <span className="font-mono text-[#A1A1A1] group-hover:text-black/60 transition-colors">{mode.difficulty}</span>
                  <span className="text-white group-hover:text-black opacity-0 group-hover:opacity-100 font-mono flex items-center gap-1 transition-all">
                    Entrenar <Play className="w-2.5 h-2.5 fill-current text-white group-hover:text-black shrink-0 transition-colors" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
