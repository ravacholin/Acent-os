# Plan de mejoras profundas — AcentOS

Este documento es el plan de ejecución completo para la próxima etapa de AcentOS.
Está pensado para ejecutarse **fase por fase, en orden, una fase por PR**. Cada fase
es autocontenida: deja la app funcionando, compila (`npm run lint`) y, a partir de la
Fase 1, pasa los tests (`npm test`).

## Principios rectores (no negociables)

1. **Cero menúes nuevos.** La app es minimalista y así se queda. Ningún ejercicio
   nuevo agrega tarjetas, pantallas ni opciones a `PracticeSelector`: todos entran
   por la rotación adaptativa de formatos (Fase 4).
2. **Cero contenido manual nuevo.** Los ejercicios nuevos se generan desde los datos
   que ya existen en `src/data/words.ts` (`syllables[]`, `stressedSyllableIdx`,
   `rule`, `sense`, `example`, homófonos indexados en `WORDS_BY_CLEAN`).
3. **Cada fase se mergea sola.** Nada de mega-PRs. Si una fase crece, se parte.
4. **Sin cambios visuales no pedidos.** El look brutalista monocromo actual se
   conserva tal cual; la Fase 2 solo cambia *cómo* se aplican los estilos, no cómo
   se ven.

## Estado actual (diagnóstico)

| Problema | Dónde |
|---|---|
| God component: motor SRS + scoring + logros + selección + timers + todas las pantallas | `src/App.tsx` (~1000 líneas) |
| Los 6 formatos de ejercicio en un solo archivo, con duplicación entre `escribi-tilde` y `dictado` | `src/components/ExerciseCard.tsx` (~555 líneas) |
| Cero tests, con lógica lingüística artesanal de alto riesgo | todo el repo |
| localStorage sin versionado ni migraciones (claves sueltas `acentos-*`) | `src/App.tsx:136-173` |
| Dependencias muertas: `@google/genai`, `express`, `dotenv`, `@types/express`, `tsx`, `esbuild` | `package.json` |
| README boilerplate de AI Studio que no describe la app | `README.md` |
| Tokens y clases `.brutal-*` definidos pero ignorados; hex hardcodeados inline | `src/index.css` vs. componentes |
| Tipo muerto `SpacedRepetitionData` que duplica al SRS real con otro shape | `src/types.ts:131-137` |

---

## Fase 0 — Limpieza (baja fricción, alto valor)

**Objetivo:** sacar el ruido antes de refactorizar.

1. En `package.json`:
   - Quitar dependencias: `@google/genai`, `express`, `dotenv`.
   - Quitar devDependencies: `@types/express`, `tsx`, `esbuild` (verificar antes con
     grep que nada las importa; hoy nada lo hace).
   - Quitar el script `clean` (referencia un `server.js` que no existe).
2. Limpiar `.env.example` (referencias a `GEMINI_API_KEY`/`APP_URL` sin uso) y
   `metadata.json` (capability `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` sin uso).
3. Reescribir `README.md`: qué es AcentOS, stack (React 19 + Vite 6 + Tailwind 4 +
   PWA), cómo correr (`npm install && npm run dev`, puerto 3000), estructura de
   carpetas, y que la persistencia es 100 % localStorage (sin backend).
4. En `src/types.ts`: borrar `SpacedRepetitionData` (líneas 131-137, no se usa en
   ningún lado). Tipar `history[].userAnswer` (hoy `any`) como
   `string | boolean | number`.
5. En `src/App.tsx`: eliminar el cast `as any` de la inicialización de
   `categoryStats` (línea ~35) y hacer que `CATEGORIES_LIST` (línea 44) incluya las
   18 categorías de `WordCategory`, no solo 10 (hoy el resto se crea lazy y queda
   inconsistente).

**Criterios de aceptación:** `npm install` limpio, `npm run lint` verde,
`npm run build` verde, la app corre igual que antes.

---

## Fase 1 — Arquitectura: extraer el motor a módulos puros y testeables

**Objetivo:** que toda la lógica del juego sea código puro, sin React, importable
desde tests. `App.tsx` queda como shell de ~250 líneas.

### Nueva estructura

```
src/engine/
  srs.ts          ← Leitner: promote/demote, intervalos, palabras "due"
  selection.ts    ← selectSessionWords + ring buffer de recientes
  scoring.ts      ← XP, combo, nivel
  achievements.ts ← reglas de desbloqueo + INITIAL_ACHIEVEMENTS
  session.ts      ← reducer puro de sesión
src/storage/
  index.ts        ← load/save tipado con versión de esquema y migraciones
src/hooks/
  useGameSession.ts    ← useReducer(session) + efectos (timer, audio)
  usePersistentState.ts
```

### Detalle por módulo (origen del código actual)

- **`engine/srs.ts`** — mover la lógica inline de `App.tsx:396-462`:
  cajas 1-5, arranque neutral en caja 3, intervalos `[30s, 2m, 10m, 1h, 1d]`,
  promoción en acierto, democión a caja 1 en fallo (reaparición a 15 s, o 5 s con
  `failCount >= 2`). API sugerida:
  `applyAnswer(entry: SRSEntry | undefined, correct: boolean, now: number): SRSEntry`
  y `isDue(entry, now): boolean`.
- **`engine/selection.ts`** — mover `selectSessionWords` (`App.tsx:193-269`) y el
  ring buffer de recientes (`App.tsx:72-104`, clave `acentos-recent-words`, cap 120).
  Mantener el diseño de dos cuotas: ~40 % repaso (falladas + due) y el resto variedad
  fresca con sesgo a categorías débiles (`getWeakCategories` de
  `src/utils/errorAnalysis.ts`).
- **`engine/scoring.ts`** — `10 XP × multiplicador` con
  `multiplicador = min(3, 1 + floor(racha/5))` (`App.tsx:373-374`) y
  `nivel = floor(xp/150) + 1` (`App.tsx:487`).
- **`engine/achievements.ts`** — mover `INITIAL_ACHIEVEMENTS` desde
  `src/components/AchievementsPanel.tsx` y `checkUnlockAchievements` desde
  `App.tsx:615-659`. `AchievementsPanel` pasa a ser solo UI.
- **`engine/session.ts`** — reducer puro con acciones
  `start / answer / next / tick / wrapUp` que reemplaza los `setState` entrelazados
  de `handleAnswerReceived` (`App.tsx:367-528`) y el `setInterval` de supervivencia
  (`App.tsx:322-337`), que hoy dispara `triggerSessionWrapUp` desde adentro del
  updater. El timer vive en `useGameSession` como efecto que despacha `tick`.
  Reglas de supervivencia a conservar: 30 s iniciales, acierto +3 s (+bonus por
  racha), error −5 s.
- **`storage/index.ts`** — un único objeto versionado:

  ```ts
  interface PersistedStateV2 {
    version: 2;
    stats: UserStats;
    settings: AppSettings;
    achievements: Achievement[];
    recentWords: string[];
  }
  ```

  bajo una sola clave `acentos-state`. **Migración obligatoria** desde las claves
  legacy (`acentos-user-stats`, `acentos-settings`, `acentos-achievements`,
  `acentos-recent-words`): si existe la clave nueva se usa; si no, se leen las
  legacy, se arma el objeto v2, se guarda y se borran las legacy. Nunca perder el
  progreso de un usuario que vuelve. Las claves `daily-challenge-YYYY-MM-DD` de
  `src/components/DailyChallenge.tsx` pueden quedar como están en esta fase.
- **Robustez:** agregar un `ErrorBoundary` simple alrededor de `<App/>` en
  `src/main.tsx`, y reemplazar `alert()` (`App.tsx:297`) y `window.confirm()`
  (`src/components/StatsDashboard.tsx:288`) por el sistema de toasts que ya existe
  (para el confirm de reset: botón con doble-tap de confirmación en el propio botón,
  sin modal nuevo).

### Tests (Vitest)

- Agregar `vitest` como devDependency y script `"test": "vitest run"`.
- Suites mínimas:
  - `srs.test.ts`: promoción/democión, intervalos, `isDue`, arranque en caja 3.
  - `selection.test.ts`: cuotas repaso/variedad, exclusión de recientes, shuffle
    estable con seed inyectable.
  - `scoring.test.ts`: multiplicadores, niveles, bordes (racha 0, racha 50).
  - `session.test.ts`: ciclo completo de sesión; supervivencia llega a 0 → wrapUp.
  - `words.test.ts`: `stripAccents`, `getMisaccentedForm` (acentúa la vocal de la
    sílaba tónica), `getHomophonePartner`, y un test masivo de consistencia sobre
    las 254 palabras: `syllables.join('') === word`, `stressedSyllableIdx` en rango,
    `hasTilde` coincide con la regex.

**Criterios de aceptación:** comportamiento idéntico al actual (mismo scoring, mismo
SRS, mismos logros), `App.tsx` sin lógica de dominio, tests verdes, migración de
storage verificada a mano (poblar claves legacy → recargar → progreso intacto bajo
`acentos-state`).

---

## Fase 2 — Partir `ExerciseCard` y adoptar los tokens de diseño

**Objetivo:** un archivo por formato, primitivas compartidas, y que cambiar el
estilo global sea tocar un solo archivo.

1. Nueva carpeta `src/components/exercises/`:
   - `LlevaTilde.tsx` (con los gestos de swipe y teclas S/N/1/2 actuales),
     `EscribiTilde.tsx`, `EncontraError.tsx`, `DondeVaTilde.tsx`,
     `Clasificacion.tsx`, `Dictado.tsx`.
   - Primitivas compartidas:
     - `AccentInput.tsx`: input + botones `á é í ó ú ü ñ` + submit. Hoy ese bloque
       está duplicado casi idéntico en `ExerciseCard.tsx:334-373` y `:450-496`.
     - `FeedbackPanel.tsx`: el panel de correcto/incorrecto + regla + explicación.
     - `ExerciseShell.tsx`: layout común de la tarjeta (encabezado, `sense` +
       ejemplo para ambiguas, progreso).
   - `ExerciseCard.tsx` queda como router delgado: `mode → componente`.
2. **Tokens:** reemplazar los valores arbitrarios inline (`bg-[#F5F5F0]`,
   `border-[#2a2a2a]`, etc.) por los tokens de `src/index.css` (`--color-ink`,
   `--color-fg`, `--color-paper`, greys) y las clases `.brutal-card`, `.brutal-btn`,
   `.brutal-btn-ghost` ya definidas. Aplica a todos los componentes, no solo a los
   ejercicios. Arreglar de paso el alias engañoso `--font-mono: Inter`.

**Criterios de aceptación:** cero cambios visuales (comparar a ojo las 6 pantallas de
ejercicio + home + progreso), `grep -r "#F5F5F0\|#2a2a2a" src/components` sin
resultados, lint y tests verdes.

---

## Fase 3 — Cuatro ejercicios nuevos (novedosos, sin menú nuevo)

**Objetivo:** cuadruplicar la variedad pedagógica usando solo datos existentes.
Se agregan al union `GameMode` en `src/types.ts` y al router de ejercicios;
**no** se agregan a la grilla de `PracticeSelector`. Hasta la Fase 4 se incorporan a
`META_ROTATION` (`App.tsx:63`) para que ya aparezcan en supervivencia/infinito.

### 3.1 `silaba-tonica` — «¿Dónde suena?»
- Se muestran las sílabas de la palabra (`word.syllables`) como botones grandes; el
  usuario toca la tónica. Correcto = índice `stressedSyllableIdx`.
- Opcional: botón de TTS (`speakWord` de `src/utils/audio.ts`) para escucharla.
- Es el paso pedagógico previo a toda regla de tildación; hoy no existe.
- Elegibilidad: cualquier palabra con 2+ sílabas.

### 3.2 `la-regla` — «¿Por qué?»
- Se muestra la palabra correcta y 3 reglas candidatas: la real (`word.rule`) + 2
  distractoras tomadas del catálogo `R` (`src/data/words.ts:59`). Los distractores
  se eligen de reglas *plausibles* (mismo grupo: acentuación general vs. diacríticas
  vs. hiatos) para que no sea trivial.
- Metacognitivo: entrena el *porqué*, no solo el reflejo.

### 3.3 `contexto` — «El contexto manda»
- Para pares diacríticos/interrogativos (`AMBIGUOUS_CATEGORIES`,
  `src/data/words.ts:413`): se muestra la oración de `word.example` con la palabra
  reemplazada por un hueco, y dos botones: `word.word` y
  `getHomophonePartner(word)` (p. ej. `él` / `el`).
- Resuelve la mayor debilidad pedagógica actual: los diacríticos son casi
  inentrenables fuera de contexto (hoy se los parchea mostrando el `sense`).
- Prerrequisito de datos: auditar que toda palabra de categorías ambiguas tenga
  `example` con la palabra incluida; completar las que falten (dato menor).
- Elegibilidad: solo palabras ambiguas con `example` válido.

### 3.4 `corrector` — «Cazador de erratas»
- Se arma un micro-texto de 2-3 oraciones concatenando los `example` de la palabra
  actual y 1-2 palabras más de la sesión. De las palabras objetivo, 1-2 se sabotean
  con `getMisaccentedForm` (o quitándoles la tilde). El usuario toca las palabras
  mal escritas; las palabras del texto se renderizan como spans clickeables.
- Acierto = marcar todas las erratas sin falsos positivos (permitir deseleccionar).
- Es el formato más innovador: lectura real en vez de palabra aislada, y se genera
  100 % desde datos existentes.
- Implementar el generador como función pura en `src/engine/corrector.ts`
  (`buildCorrectorText(words: Word[], rng): {tokens, errorIndexes}`) **con tests**
  (el sabotaje nunca debe producir la forma correcta; los tokens deben reconstruir
  el texto).

**Criterios de aceptación:** los 4 formatos juegan bien con teclado y touch, dan
feedback con regla/explicación como los demás, alimentan el SRS y las stats por
categoría igual que los formatos existentes, tests del generador de `corrector`
verdes.

---

## Fase 4 — Escalera adaptativa de formatos (la mejora estrella)

**Objetivo:** conectar el SRS con el formato del ejercicio. La caja Leitner de cada
palabra decide qué formato le toca, en una escalera
**reconocimiento → discriminación → producción**. La dificultad del *formato*
acompaña el dominio de la *palabra*: una palabra nueva se reconoce; una dominada se
produce de memoria al dictado.

| Caja Leitner | Formatos elegibles |
|---|---|
| 1 (recién fallada) | `silaba-tonica`, `lleva-tilde` |
| 2–3 (aprendiendo) | `encontra-error`, `clasificacion`, `donde-va-tilde`, `contexto`* |
| 4 (consolidando) | `la-regla`, `escribi-tilde`, `corrector` |
| 5 (dominada) | `dictado`, `escribi-tilde` |

\* `contexto` solo si la palabra es ambigua con `example`; para ambiguas, `dictado` y
`escribi-tilde` siguen excluidos como hoy.

1. **`src/engine/formats.ts`**: función pura
   `pickFormat(word: Word, srs: SRSEntry | undefined, opts): GameMode` que aplica la
   tabla, filtra por elegibilidad (sílabas, ambigüedad, `hasTilde` para
   `donde-va-tilde`) y rota dentro de la caja para no repetir formato dos veces
   seguidas. Reemplaza a `META_ROTATION`/`resolveRenderMode` (`App.tsx:63-69`).
   **Con tests** (tabla completa + casos de elegibilidad).
2. **Home:** el hero pasa a un único CTA primario **«ENTRENAR»** que lanza la sesión
   adaptativa (selección de palabras de Fase 1 + `pickFormat` por palabra). La
   grilla actual de modos **se conserva intacta** debajo, bajo el rótulo «Práctica
   dirigida». Resultado: la puerta de entrada es *un* botón; no se agrega ningún
   menú.
3. Los modos meta (`supervivencia`, `infinito`, `personalizado`) pasan a usar
   `pickFormat` en vez de la rotación fija de 3 formatos → más variedad gratis.
4. El Desafío Diario (`src/components/DailyChallenge.tsx`) también usa la escalera
   (determinista: el seed diario alimenta la rotación) en vez de solo `lleva-tilde`.

**Criterios de aceptación:** una sesión adaptativa mezcla formatos coherentes con el
dominio de cada palabra; nunca aparece un formato inelegible (p. ej. `dictado` con
una ambigua, `donde-va-tilde` con palabra sin tilde); tests de `pickFormat` verdes.

---

## Fase 5 — Progreso portable + detalles

1. **Exportar/Importar progreso:** en la pestaña Progreso, dos acciones discretas
   (texto pequeño, sin menú): «Exportar» descarga el objeto versionado de
   `storage/index.ts` como `acentos-progreso.json`; «Importar» lo lee con
   validación de `version` + migración si viene de una versión vieja. Sin cuentas,
   sin backend: fiel al minimalismo.
2. **Racha visible:** si `currentStreak > 0`, mostrarla en el hero (dato ya existe
   en `UserStats`); nada de notificaciones ni nags.
3. Mover las claves `daily-challenge-*` al objeto versionado de storage (limpieza
   pendiente de Fase 1).

**Criterios de aceptación:** exportar en un navegador e importar en otro reproduce
exactamente stats, logros y SRS; importar un JSON corrupto muestra toast de error y
no toca el estado.

---

## Orden de ejecución y verificación global

- **Orden:** 0 → 1 → 2 → 3 → 4 → 5. Un PR por fase. No empezar una fase con la
  anterior sin mergear.
- **Verificación en cada fase:**
  1. `npm run lint` (tsc) verde.
  2. `npm test` verde (desde Fase 1).
  3. `npm run dev` + smoke manual: completar una sesión de cada modo tocado,
     recargar la página y verificar que el progreso persiste (y que un usuario con
     datos viejos migra sin pérdida).
  4. `npm run build` verde (el build PWA no debe romperse).
- **Riesgos a vigilar:**
  - Fase 1 es la más grande: si se complica, partirla en 1a (engine + tests) y
    1b (storage versionado + hooks).
  - La migración de localStorage es el único punto con riesgo de pérdida de datos
    de usuarios reales: testearla con datos legacy reales copiados de producción.
  - En Fase 4, cuidar que `personalizado` con filtros muy estrechos siga teniendo
    formatos elegibles (fallback: `lleva-tilde`, que acepta cualquier palabra).
