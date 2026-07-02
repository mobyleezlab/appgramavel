import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
  error: Error | null;
}

const RELOAD_GUARD_KEY = "gramavel:chunk-reload-guard";

function isChunkLoadError(error: Error): boolean {
  const msg = error?.message || "";
  const name = error?.name || "";
  return (
    name === "ChunkLoadError" ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Always log the raw error so we can inspect stack traces in dev-server / browser console.
    console.error("[ErrorBoundary] captured error:", error, info);

    if (isChunkLoadError(error) && typeof window !== "undefined") {
      try {
        const alreadyReloaded = sessionStorage.getItem(RELOAD_GUARD_KEY);
        if (!alreadyReloaded) {
          sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
          window.location.reload();
          return;
        }
      } catch {
        // ignore storage errors
      }
    }
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm text-center">
          <h1 className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Algo deu errado
          </h1>
          <p className="text-sm text-muted-foreground mb-5">
            Não foi possível carregar esta parte do app. Tente novamente ou volte ao início.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={this.reset}
              className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90 transition"
            >
              Tentar novamente
            </button>
            <button
              onClick={() => {
                try {
                  sessionStorage.removeItem(RELOAD_GUARD_KEY);
                } catch { /* ignore */ }
                window.location.href = "/";
              }}
              className="w-full rounded-xl border border-border bg-background py-2.5 text-sm font-medium hover:bg-muted transition"
            >
              Voltar ao início
            </button>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-4 text-left text-xs text-muted-foreground whitespace-pre-wrap break-words max-h-40 overflow-auto">
              {error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
