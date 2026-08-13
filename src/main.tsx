import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import {warmUpTts} from './utils/audio.ts';
import './index.css';

// Precargar las voces de TTS cuanto antes para que el primer dictado ya use la
// voz española correcta (y no la voz por defecto del sistema, a menudo inglesa).
warmUpTts();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
