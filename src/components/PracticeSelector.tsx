import React, { useEffect, useState } from 'react';
import { GameMode, LevelMCER, PracticePack, Word, WordCategory } from '../types';
import { motion } from 'motion/react';
import { WORDS_DATABASE, stripAccents } from '../data/words';
import { createPack, packUrl, MAX_PACK_WORDS } from '../engine/pack';
import QrCode, { downloadQrPng } from './QrCode';

/**
 * Toma al azar hasta `n` ids de una lista de palabras (Fisher-Yates sobre una
 * copia, sin mutar la entrada). Es la base de la selección automática del pack:
 * a partir de los niveles y categorías elegidos, llenamos el pack con palabras
 * sorteadas en vez de pedirle al docente que las tilde una por una.
 */
function sampleWordIds(words: Word[], n: number): string[] {
  const pool = words.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n).map((w) => w.id);
}

interface PracticeSelectorProps {
  onSelectMode: (mode: GameMode, customOptions?: { levels: LevelMCER[]; categories: WordCategory[]; timeLimit?: number }) => void;
  onOpenDaily?: () => void;
  onStartPack?: (pack: PracticePack) => void;
}

export default function PracticeSelector({ onSelectMode, onOpenDaily, onStartPack }: PracticeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);

  // Constructor de packs compartibles.
  const [packOpen, setPackOpen] = useState(false);
  const [packSelected, setPackSelected] = useState<Set<string>>(new Set());
  const [packName, setPackName] = useState('');
  const [packSearch, setPackSearch] = useState('');
  const [packLink, setPackLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  // --- Constructor de pack -------------------------------------------------
  // Reutiliza los filtros de nivel/categoría del panel personalizado para
  // acotar la lista visible; el docente tilda las palabras que entran al pack.
  const packCandidates = WORDS_DATABASE.filter((w) => {
    if (!customLevels.includes(w.level) || !customCategories.includes(w.category)) return false;
    const q = stripAccents(packSearch.trim()).toLowerCase();
    if (!q) return true;
    return stripAccents(w.wordClean).toLowerCase().includes(q);
  });

  // Pool completo de la selección automática: todas las palabras que entran por
  // nivel + categoría (sin el filtro de búsqueda, que solo acota lo que se ve en
  // pantalla). De acá salen las 40 que se sortean.
  const autoPool = WORDS_DATABASE.filter(
    (w) => customLevels.includes(w.level) && customCategories.includes(w.category)
  );

  const atPackCap = packSelected.size >= MAX_PACK_WORDS;

  // Selección automática: al abrir el constructor y cada vez que cambian los
  // niveles o las categorías, llenamos el pack con hasta 40 palabras al azar del
  // pool resultante. El docente después puede sacar o agregar a mano; volver a
  // tocar un filtro vuelve a sortear.
  useEffect(() => {
    if (!packOpen) return;
    setPackSelected(new Set(sampleWordIds(autoPool, MAX_PACK_WORDS)));
    setPackLink(null);
    setCopied(false);
    // autoPool se recalcula en cada render; lo que dispara el re-sorteo es un
    // cambio real de niveles/categorías (o abrir el panel), no cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packOpen, customLevels, customCategories]);

  // Re-sortea 40 palabras nuevas con los mismos filtros, sin tener que tocarlos.
  const reshufflePack = () => {
    setPackSelected(new Set(sampleWordIds(autoPool, MAX_PACK_WORDS)));
    setPackLink(null);
    setCopied(false);
  };

  const togglePackWord = (id: string) => {
    setPackLink(null);
    setCopied(false);
    setPackSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_PACK_WORDS) next.add(id);
      return next;
    });
  };

  const resetPackBuilder = () => {
    setPackOpen(false);
    setPackSelected(new Set());
    setPackName('');
    setPackSearch('');
    setPackLink(null);
    setCopied(false);
  };

  const handleGeneratePackLink = () => {
    if (packSelected.size === 0) return;
    const pack = createPack([...packSelected], packName);
    setPackLink(packUrl(pack));
    setCopied(false);
  };

  const handleCopyPackLink = async () => {
    if (!packLink) return;
    try {
      await navigator.clipboard.writeText(packLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Sin permiso de portapapeles: el input de solo lectura permite copiar a mano. */
    }
  };

  const handleDownloadQr = async () => {
    if (!packLink) return;
    const slug = packName.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').toLowerCase();
    try {
      await downloadQrPng(packLink, `${slug || 'pack'}-qr.png`);
    } catch {
      /* Si la descarga falla, el QR en pantalla sigue siendo escaneable. */
    }
  };

  const handleTestPack = () => {
    if (packSelected.size === 0 || !onStartPack) return;
    onStartPack(createPack([...packSelected], packName));
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

  if (packOpen) {
    return (
      <div id="pack-builder-panel">
        <div className="flex justify-between items-baseline border-b border-[var(--color-line-soft)] pb-[22px] mb-8 gap-4 flex-wrap">
          <div>
            <div className="display-lg">Crear pack</div>
            <p className="text-[var(--color-fg-muted)] text-[13px] mt-2.5">Elegí niveles y categorías: las {MAX_PACK_WORDS} palabras se sortean solas. Sacá las que no quieras y compartí el enlace.</p>
          </div>
          <button type="button" onClick={resetPackBuilder} className="index-nav shrink-0">
            <span className="index-nav-num">←</span>
            Volver
          </button>
        </div>

        {/* Filtros de nivel + categoría para acotar la lista. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-7">
          <div>
            <div className="flex items-center justify-between mb-3.5 gap-3">
              <div className="hud"><span className="num text-[var(--color-fg-soft)] mr-2">01</span>Filtrar por nivel</div>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setCustomLevels([...ALL_LEVELS])} disabled={allLevelsSelected} className="bulk-toggle">Todo</button>
                <button type="button" onClick={() => setCustomLevels([])} disabled={customLevels.length === 0} className="bulk-toggle">Ninguno</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_LEVELS.map((lvl) => (
                <span key={lvl} onClick={() => handleToggleLevel(lvl)} className={chipClass(customLevels.includes(lvl))}>{lvl}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="hud mb-3.5"><span className="num text-[var(--color-fg-soft)] mr-2">02</span>Buscar palabra</div>
            <input
              type="text"
              value={packSearch}
              onChange={(e) => setPackSearch(e.target.value)}
              placeholder="Escribí para filtrar…"
              className="w-full bg-transparent border border-[var(--color-line-soft)] px-3.5 py-2.5 text-[13px] outline-none focus:border-[var(--color-fg-soft)] transition-colors"
              id="pack-search"
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-3.5 gap-3 flex-wrap">
            <div className="hud"><span className="num text-[var(--color-fg-soft)] mr-2">03</span>Categorías</div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setCustomCategories([...allCategoryIds])} disabled={allCategoriesSelected} className="bulk-toggle">Todo</button>
              <button type="button" onClick={() => setCustomCategories([])} disabled={customCategories.length === 0} className="bulk-toggle">Ninguno</button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {categoryOptions.map((cat) => (
              <span key={cat.id} onClick={() => handleToggleCategory(cat.id)} className={chipClass(customCategories.includes(cat.id))}>{cat.label}</span>
            ))}
          </div>
        </div>

        {/* Lista de palabras candidatas (según filtros). Las tildadas salieron
            del sorteo automático; el docente saca o agrega a mano. */}
        <div className="flex items-center justify-between mb-2.5 gap-3 flex-wrap">
          <div className="hud">Palabras · {packCandidates.length}</div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={reshufflePack}
              disabled={autoPool.length === 0}
              className="bulk-toggle"
              id="pack-reshuffle"
            >
              Sortear otras
            </button>
            <div className="hud num" id="pack-count">{packSelected.size}/{MAX_PACK_WORDS} elegidas</div>
          </div>
        </div>
        {atPackCap && (
          <p className="text-[var(--color-accent-err)] text-[11px] mb-2">Llegaste al máximo de {MAX_PACK_WORDS} palabras por pack.</p>
        )}
        <div className="divide-y divide-[var(--color-line-soft)] border-y border-[var(--color-line-soft)] max-h-72 overflow-y-auto pr-1 mb-7">
          {packCandidates.length === 0 ? (
            <p className="text-[var(--color-fg-muted)] text-[13px] py-6 text-center">No hay palabras para esta combinación de filtros.</p>
          ) : (
            packCandidates.map((w) => {
              const on = packSelected.has(w.id);
              const disabled = !on && atPackCap;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => togglePackWord(w.id)}
                  disabled={disabled}
                  aria-pressed={on}
                  className={`w-full flex justify-between items-center gap-4 px-2 py-2.5 text-left transition-colors ${on ? 'bg-[var(--color-surface)]' : 'hover:bg-[var(--color-surface)]'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-[13px] w-4" aria-hidden="true">{on ? '✓' : '+'}</span>
                    <span className="display-sm">{w.word}</span>
                  </span>
                  <span className="hud text-[var(--color-fg-muted)]">{w.classification} · {w.level}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Nombre + generación de enlace. */}
        <div className="border-t border-[var(--color-line-soft)] pt-[26px]">
          <div className="hud mb-3.5"><span className="num text-[var(--color-fg-soft)] mr-2">04</span>Nombre del pack (opcional)</div>
          <input
            type="text"
            value={packName}
            onChange={(e) => { setPackName(e.target.value); setPackLink(null); setCopied(false); }}
            placeholder="Repaso semana 3"
            className="w-full bg-transparent border border-[var(--color-line-soft)] px-3.5 py-2.5 text-[13px] outline-none focus:border-[var(--color-fg-soft)] transition-colors mb-5"
            id="pack-name"
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleGeneratePackLink}
              disabled={packSelected.size === 0}
              className="btn-primary hud flex-1 py-3.5 text-[var(--color-canvas)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              id="pack-generate"
            >
              Generar enlace
            </button>
            {onStartPack && (
              <button
                onClick={handleTestPack}
                disabled={packSelected.size === 0}
                className="btn-ghost hud flex-1 py-3.5 hover:text-[var(--color-canvas)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                id="pack-test"
              >
                Probar pack
              </button>
            )}
          </div>

          {packLink && (
            <div className="panel p-4 mt-5" id="pack-link-box">
              <div className="hud mb-2">Enlace para compartir</div>
              <div className="flex gap-2 flex-col sm:flex-row">
                <input
                  type="text"
                  readOnly
                  value={packLink}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 bg-transparent border border-[var(--color-line-soft)] px-3 py-2.5 text-[12px] outline-none"
                  id="pack-link-input"
                />
                <button onClick={handleCopyPackLink} className="btn-primary hud px-6 py-2.5 text-[var(--color-canvas)] cursor-pointer shrink-0">
                  {copied ? 'Copiado ✓' : 'Copiar'}
                </button>
              </div>

              {/* QR del mismo enlace: el alumno lo escanea con la cámara y entra sin tipear. */}
              <div className="flex flex-col sm:flex-row items-center gap-4 mt-5" id="pack-qr">
                <div className="bg-white p-2.5 rounded-md shrink-0" style={{ width: 148, height: 148 }}>
                  <QrCode value={packLink} className="w-full h-full block" label="Código QR para abrir el pack" />
                </div>
                <div className="text-center sm:text-left">
                  <div className="hud mb-1.5">Código QR</div>
                  <p className="text-[var(--color-fg-muted)] text-[11px] mb-3">Los alumnos lo escanean con la cámara del celular para abrir el pack.</p>
                  <button
                    onClick={handleDownloadQr}
                    className="btn-ghost hud px-5 py-2.5 hover:text-[var(--color-canvas)] cursor-pointer"
                    id="pack-qr-download"
                  >
                    Descargar QR
                  </button>
                </div>
              </div>

              <p className="text-[var(--color-fg-muted)] text-[11px] mt-4">Quien lo abra practica estas {packSelected.size} palabras. El progreso se guarda en el dispositivo de cada alumno.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

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

        {/* Modo docente: armar un set de palabras y compartirlo por enlace. */}
        <button
          type="button"
          className="rep-row w-full"
          id="mode-card-crear-pack"
          onClick={() => setPackOpen(true)}
        >
          <span className="rep-n" aria-hidden="true">＋</span>
          <span className="rep-body">
            <span className="rep-title">Crear pack para compartir</span>
            <span className="rep-spec">Docente · Enlace de práctica</span>
          </span>
          <span className="rep-arrow" aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
