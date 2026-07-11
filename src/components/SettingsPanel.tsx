import React from 'react';
import { AppSettings } from '../types';
import { 
  Volume2, 
  VolumeX, 
  Sparkles, 
  BookOpen, 
  Layers, 
  Tag, 
  ShieldAlert, 
  Moon, 
  RotateCcw 
} from 'lucide-react';

interface SettingsPanelProps {
  settings: AppSettings;
  onChangeSettings: (settings: AppSettings) => void;
  onResetStats?: () => void;
}

export default function SettingsPanel({ settings, onChangeSettings, onResetStats }: SettingsPanelProps) {
  
  const handleToggle = (key: keyof AppSettings) => {
    // darkModeOnly is locked
    if (key === 'darkModeOnly') return;
    
    onChangeSettings({
      ...settings,
      [key]: !settings[key]
    });
  };

  const optionGroups = [
    {
      title: 'Sistema y Audio',
      options: [
        {
          key: 'darkModeOnly' as keyof AppSettings,
          label: 'Modo Oscuro Exclusivo',
          description: 'Forzar interfaz oscura brutalista con alto contraste. No desactivable.',
          icon: Moon,
          isLocked: true,
          value: true
        },
        {
          key: 'soundEnabled' as keyof AppSettings,
          label: 'Efectos de Sonido',
          description: 'Habilitar microtonos procedimentales de respuesta correcta, incorrecta y clics.',
          icon: settings.soundEnabled ? Volume2 : VolumeX,
          isLocked: false,
          value: settings.soundEnabled
        },
        {
          key: 'animationsEnabled' as keyof AppSettings,
          label: 'Animaciones de Transición',
          description: 'Micro-animaciones rápidas de 150-250ms para retroalimentación instantánea.',
          icon: Sparkles,
          isLocked: false,
          value: settings.animationsEnabled
        }
      ]
    },
    {
      title: 'Pedagogía y Visualización',
      options: [
        {
          key: 'showExplanationOnError' as keyof AppSettings,
          label: 'Explicación Breve tras Error',
          description: 'Muestra una justificación gramatical corta de máximo 3 líneas al equivocarte.',
          icon: ShieldAlert,
          isLocked: false,
          value: settings.showExplanationOnError
        },
        {
          key: 'showSyllables' as keyof AppSettings,
          label: 'División Silábica',
          description: 'Muestra las sílabas separadas (ej. "ca • mión") en la corrección o análisis.',
          icon: Layers,
          isLocked: false,
          value: settings.showSyllables
        },
        {
          key: 'showRule' as keyof AppSettings,
          label: 'Regla Ortográfica',
          description: 'Enuncia explícitamente la regla de acentuación aplicable a la palabra.',
          icon: BookOpen,
          isLocked: false,
          value: settings.showRule
        },
        {
          key: 'showLevel' as keyof AppSettings,
          label: 'Etiqueta de Nivel MCER',
          description: 'Muestra el nivel de vocabulario recomendado según el marco europeo (A1-C2).',
          icon: Tag,
          isLocked: false,
          value: settings.showLevel
        }
      ]
    }
  ];

  return (
    <div className="space-y-6" id="settings-panel">
      <div className="border-b border-[#1F1F1F] pb-5">
        <h2 className="text-2xl font-semibold tracking-tight text-[#EDEDED] font-display">Configuración</h2>
        <p className="text-[#A1A1A1] text-sm mt-1">
          Personaliza la velocidad del feedback visual y las herramientas de apoyo pedagógico.
        </p>
      </div>

      <div className="space-y-6">
        {optionGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-3">
            <h3 className="text-[10px] font-semibold tracking-widest text-[#A1A1A1] uppercase font-mono">
              {group.title}
            </h3>

            <div className="divide-y divide-[#1F1F1F] border border-[#222] rounded-lg bg-[#161616]">
              {group.options.map((option) => {
                const Icon = option.icon;
                return (
                  <div 
                    key={option.key} 
                    className="p-4 flex items-start justify-between gap-4"
                    id={`settings-item-${option.key}`}
                  >
                    <div className="flex gap-3 items-start min-w-0">
                      <div className="p-2 bg-[#0A0A0A] border border-[#222] rounded text-[#A1A1A1] mt-0.5">
                        <Icon className="w-4 h-4 stroke-[2]" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#EDEDED]">
                            {option.label}
                          </span>
                          {option.isLocked && (
                            <span className="text-[9px] font-mono text-[#A1A1A1] border border-[#222] px-1.5 py-0.5 rounded bg-[#0A0A0A]">
                              FIJO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#A1A1A1] leading-relaxed">
                          {option.description}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggle(option.key)}
                      disabled={option.isLocked}
                      className={`relative w-9 h-5 rounded-full transition-all shrink-0 focus:outline-none cursor-pointer ${
                        option.isLocked 
                          ? 'bg-[#1F1F1F] opacity-60' 
                          : option.value 
                            ? 'bg-white' 
                            : 'bg-[#0A0A0A] border border-[#222]'
                      }`}
                    >
                      <span 
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-all ${
                          option.isLocked 
                            ? 'bg-[#A1A1A1]' 
                            : option.value 
                              ? 'bg-black translate-x-4' 
                              : 'bg-[#555]'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {onResetStats && (
        <div className="bg-[#161616] border border-[#222] p-5 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-[#EDEDED]">Reiniciar Base de Datos Local</h4>
            <p className="text-[#A1A1A1] text-xs leading-relaxed max-w-md">
              Esto borrará tu nivel de XP, rachas, logros desbloqueados e historial del mapa de calor de este navegador.
            </p>
          </div>
          <button
            onClick={() => {
              if (window.confirm('¿Estás absolutamente seguro de que quieres restablecer todo el progreso? Perderás tus estadísticas acumuladas.')) {
                onResetStats();
              }
            }}
            className="px-4 py-2 bg-[#0A0A0A] hover:bg-[#161616] border border-[#222] hover:border-rose-950 text-[#A1A1A1] hover:text-rose-400 font-mono text-xs font-medium rounded transition-all cursor-pointer flex items-center gap-1.5 self-end sm:self-auto shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Borrar Todo
          </button>
        </div>
      )}
    </div>
  );
}
export const DEFAULT_SETTINGS: AppSettings = {
  darkModeOnly: true,
  soundEnabled: true,
  animationsEnabled: true,
  showExplanationOnError: true,
  showSyllables: true,
  showRule: true,
  showLevel: true
};
