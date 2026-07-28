import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Límite de error simple alrededor de la app: si algo revienta en render,
 * muestra una pantalla mínima en vez de un lienzo en blanco, con la opción de
 * recargar. No reporta a ningún servicio (la app no tiene backend).
 */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // El proyecto no incluye @types/react, por lo que React.Component se resuelve
  // como `any` y hay que declarar props/state explícitamente.
  declare props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('AcentOS crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid-bg min-h-screen text-[color:var(--color-fg)] flex items-center justify-center px-6">
          <div className="panel max-w-md text-center p-10">
            <div className="hud">
              Error inesperado
            </div>
            <div className="display-md mt-4">Algo salió mal</div>
            <p className="text-[color:var(--color-fg-muted)] text-[13px] mt-4 leading-relaxed">
              La aplicación encontró un problema. Tu progreso guardado no se perdió.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary hud mt-7 px-8 py-3 text-[color:var(--color-canvas)] cursor-pointer"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
