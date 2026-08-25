import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import VecinalApp from "./VecinalApp";
import "./globals.css";

type ErrorBoundaryState = { hasError: boolean; message: string };

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Ocurrió un error inesperado",
    };
  }

  componentDidCatch(error: unknown) {
    console.error("Error al mostrar el panel administrativo", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="fatal-error" role="alert">
          <div>
            <span>!</span>
            <h1>No se pudo mostrar el panel</h1>
            <p>La información está segura. Recargue la página para intentarlo nuevamente.</p>
            <button type="button" onClick={() => window.location.reload()}>Recargar panel</button>
            <small>{this.state.message}</small>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <VecinalApp />
    </AppErrorBoundary>
  </StrictMode>,
);
