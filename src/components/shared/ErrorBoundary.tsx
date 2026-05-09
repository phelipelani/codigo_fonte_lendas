// Arquivo: src/components/shared/ErrorBoundary.tsx
import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Quando um deploy novo sobe, os chunks JS recebem hashes diferentes.
// Se o browser tem o index.html antigo em cache, ele vai pedir chunks com
// hashes que nao existem mais — o React lazy() rejeita com mensagens
// como estas. Ao detectar, recarregamos a pagina silenciosamente.
const CHUNK_ERROR_PATTERNS = [
  /Loading chunk \d+ failed/i,
  /Loading CSS chunk \d+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /ChunkLoadError/i,
];

const isChunkError = (error: unknown): boolean => {
  if (!error) return false;
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? `${error.name} ${error.message}`
        : String(error);
  return CHUNK_ERROR_PATTERNS.some((re) => re.test(message));
};

const RELOAD_FLAG_KEY = "__chunk_reload_attempted";

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Erros de chunk = deploy novo. Recarrega silenciosamente uma vez.
    if (isChunkError(error) && typeof window !== "undefined") {
      try {
        const alreadyReloaded =
          sessionStorage.getItem(RELOAD_FLAG_KEY) === "1";
        if (!alreadyReloaded) {
          sessionStorage.setItem(RELOAD_FLAG_KEY, "1");
          // location.reload tem que rodar fora do ciclo de render
          setTimeout(() => window.location.reload(), 0);
          return { hasError: true, error: null };
        }
      } catch {
        /* sessionStorage indisponível — segue pro fallback normal */
      }
    }
    return { hasError: true, error };
  }

  componentDidMount() {
    // Limpa o flag em mount bem-sucedido.
    try {
      sessionStorage.removeItem(RELOAD_FLAG_KEY);
    } catch {
      /* ignore */
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (!isChunkError(error)) {
      // Logs uteis para debug local; em prod e silencioso.
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error("[ErrorBoundary]", error, errorInfo);
      }
    }
  }

  handleReload = () => {
    try {
      sessionStorage.removeItem(RELOAD_FLAG_KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Caso especial: detectamos chunk error e ja disparamos reload — exibe
      // apenas um loader minimo enquanto o reload acontece.
      if (this.state.error === null) {
        return (
          <div className="flex min-h-screen items-center justify-center bg-[#030611]">
            <div className="flex flex-col items-center gap-3 text-cyan-100/60">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <p className="text-sm">Atualizando…</p>
            </div>
          </div>
        );
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-[#030611] px-4">
          <div className="flex max-w-md flex-col items-center gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">
                Algo deu errado
              </h1>
              <p className="text-sm text-white/50">
                Ocorreu um erro inesperado. Tente recarregar a página.
              </p>
              {import.meta.env.DEV && this.state.error && (
                <pre className="mt-3 max-h-40 overflow-auto rounded bg-black/40 p-2 text-left text-xs text-red-300/80">
                  {this.state.error.message}
                </pre>
              )}
            </div>

            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-400"
            >
              <RefreshCw className="h-4 w-4" />
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
