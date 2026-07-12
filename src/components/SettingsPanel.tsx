import React from 'react';
import { AppSettings } from '../types';

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

  const options: {
    key: keyof AppSettings;
    label: string;
    description: string;
    isLocked: boolean;
    value: boolean;
  }[] = [
    {
      key: 'soundEnabled',
      label: 'Efectos de sonido',
      description: 'Microtonos procedimentales de acierto, error y clic.',
      isLocked: false,
      value: settings.soundEnabled
    },
    {
      key: 'animationsEnabled',
      label: 'Animaciones de transición',
      description: 'Cortes rápidos de 100–150ms para feedback instantáneo.',
      isLocked: false,
      value: settings.animationsEnabled
    },
    {
      key: 'showExplanationOnError',
      label: 'Explicación breve tras error',
      description: 'Justificación gramatical corta al equivocarte.',
      isLocked: false,
      value: settings.showExplanationOnError
    },
    {
      key: 'showSyllables',
      label: 'División silábica',
      description: 'Muestra las sílabas separadas en la corrección.',
      isLocked: false,
      value: settings.showSyllables
    },
    {
      key: 'showRule',
      label: 'Regla ortográfica',
      description: 'Enuncia la regla de acentuación aplicable.',
      isLocked: false,
      value: settings.showRule
    },
    {
      key: 'showLevel',
      label: 'Etiqueta de nivel MCER',
      description: 'Muestra el nivel de vocabulario (A1–C2) junto a cada palabra.',
      isLocked: false,
      value: settings.showLevel
    }
  ];

  return (
    <div id="settings-panel">
      <div className="border-b border-[#1a1a1a] pb-[22px] mb-8">
        <div className="display-brutal text-[34px] sm:text-[40px]">Ajustes</div>
        <p className="text-[#888] text-[11px] mt-2">Feedback visual y apoyo pedagógico</p>
      </div>

      <div className="flex flex-col border-t border-[#1a1a1a]">
        {options.map((option) => (
          <div key={option.key} className="border-b border-[#1a1a1a] py-5 flex justify-between items-center gap-5" id={`settings-item-${option.key}`}>
            <div>
              <div className="text-[13px] flex items-center gap-2">
                {option.label}
                {option.isLocked && (
                  <span className="text-[9px] text-[#666] border border-[#2a2a2a] px-1.5 py-0.5">FIJO</span>
                )}
              </div>
              <p className="text-[#888] text-[11px] mt-1.5 max-w-[520px] leading-relaxed">{option.description}</p>
            </div>

            <button
              onClick={() => handleToggle(option.key)}
              disabled={option.isLocked}
              className="relative w-[38px] h-5 border shrink-0 focus:outline-none"
              style={{
                borderColor: option.isLocked ? '#262626' : option.value ? '#F5F5F0' : '#2a2a2a',
                cursor: option.isLocked ? 'default' : 'pointer',
                opacity: option.isLocked ? 0.5 : 1
              }}
            >
              <span
                className="absolute top-[1px] left-[1px] w-4 h-4 transition-all"
                style={{
                  background: option.value ? '#000' : '#555',
                  left: option.value ? '19px' : '1px'
                }}
              />
            </button>
          </div>
        ))}
      </div>

      {onResetStats && (
        <div className="flex justify-between items-center mt-9 pt-6 border-t border-[#1a1a1a] gap-5 flex-wrap">
          <div>
            <div className="text-[13px]">Reiniciar base de datos local</div>
            <p className="text-[#888] text-[11px] mt-1.5 max-w-[420px]">Borra XP, rachas, logros e historial de este navegador.</p>
          </div>
          <button
            onClick={() => {
              if (window.confirm('¿Estás absolutamente seguro de que quieres restablecer todo el progreso? Perderás tus estadísticas acumuladas.')) {
                onResetStats();
              }
            }}
            className="px-5 py-2.5 border border-[#2a2a2a] text-[#999] text-[11px] tracking-[0.08em] cursor-pointer hover:border-[#F5F5F0] hover:text-[#F5F5F0] transition-colors"
          >
            Borrar todo
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
