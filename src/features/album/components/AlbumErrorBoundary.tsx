// Arquivo: src/features/album/components/AlbumErrorBoundary.tsx
//
// Captura erros de renderização no álbum e exibe um botão de recarregar
// em vez de deixar a tela em branco/travada.

import * as React from 'react';
import { RefreshCw } from 'lucide-react';

type State = { erro: boolean };

export class AlbumErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { erro: false };
  }

  static getDerivedStateFromError(): State {
    return { erro: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AlbumErrorBoundary]', error, info);
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
          <p className="text-cyan-100/60 text-sm">
            Ocorreu um erro ao carregar esta página do álbum.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ erro: false });
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-[#0d1f35] px-4 py-2.5 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/10"
          >
            <RefreshCw className="h-4 w-4" />
            Recarregar álbum
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
