# AcentOS

**Entrenador de acentuación ortográfica del español.** Sesiones cortas (de 2 a 10
minutos) para saber, sin dudar, cuándo una palabra lleva tilde: agudas, graves,
esdrújulas, hiatos, diptongos, tildes diacríticas e interrogativas.

La app es minimalista (estética brutalista monocroma), funciona offline como PWA y
guarda **todo el progreso en el navegador** — no hay backend, cuentas ni claves de API.

## Stack

- **React 19** + **Vite 6**
- **Tailwind CSS 4** (tokens de diseño en `src/index.css`)
- **motion** para animaciones
- **vite-plugin-pwa** (instalable / offline)
- **Vitest** para los tests del motor de juego
- Persistencia: **100 % `localStorage`** (sin servidor)

## Cómo correr

**Requisitos:** Node.js 18+

```bash
npm install
npm run dev      # http://localhost:3000
```

Otros scripts:

```bash
npm run build    # build de producción (PWA)
npm run preview  # sirve el build
npm run lint     # chequeo de tipos (tsc --noEmit)
npm test         # tests del motor (Vitest)
```

## Estructura

```
src/
  App.tsx              Shell de la app: navegación, sesión activa, resultados
  main.tsx             Punto de entrada + ErrorBoundary
  types.ts             Tipos compartidos (Word, GameMode, UserStats…)
  index.css            Tokens de diseño y clases .brutal-*
  data/
    words.ts           Banco de palabras y helpers lingüísticos
  engine/              Lógica de juego pura (sin React, testeable)
    srs.ts             Repetición espaciada (cajas Leitner)
    selection.ts       Selección de palabras por sesión
    scoring.ts         XP, combo y nivel
    achievements.ts    Reglas de logros
    session.ts         Reducer puro de sesión
    formats.ts         Escalera adaptativa de formatos por palabra
    corrector.ts       Generador de texto para "Cazador de erratas"
  storage/
    index.ts           Estado persistido versionado + migraciones
  hooks/               Hooks de React sobre el motor
  components/          UI (ejercicios, paneles, selector)
    exercises/         Un archivo por formato de ejercicio + primitivas
  utils/               Audio y análisis de errores
```

## Persistencia

Todo el estado del usuario (estadísticas, logros, repetición espaciada y palabras
recientes) vive bajo una única clave `acentos-state` versionada en `localStorage`.
El progreso se puede **exportar e importar** como JSON desde la pestaña Progreso.
