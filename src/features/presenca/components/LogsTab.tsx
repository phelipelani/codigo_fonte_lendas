// Arquivo: src/features/presenca/components/LogsTab.tsx
import * as React from 'react';
import { Loader2, ScrollText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePresencaLogs } from '../api/presencaApi';
import { useQueryClient } from '@tanstack/react-query';

export const LogsTab: React.FC = () => {
  const { data, isLoading } = usePresencaLogs();
  const qc = useQueryClient();
  const ref = React.useRef<HTMLPreElement>(null);

  // auto-scroll pro final quando recebe logs novos
  React.useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [data]);

  const linhas = data?.logs ?? [];

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-[#0a1628]/60 backdrop-blur-md p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-cyan-300" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-cyan-200/80">
            Logs do bot ({linhas.length} linhas)
          </h3>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => qc.invalidateQueries({ queryKey: ['presenca', 'logs'] })}
          className="border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </div>
      ) : linhas.length === 0 ? (
        <p className="text-center text-cyan-100/40 italic text-sm py-8">
          Nenhum log registrado ainda.
        </p>
      ) : (
        <pre
          ref={ref}
          className="max-h-[60vh] overflow-auto rounded-lg bg-black/40 border border-white/5 p-3 text-[11px] sm:text-xs leading-relaxed text-cyan-100/80 font-mono whitespace-pre-wrap break-all"
        >
          {linhas.join('\n')}
        </pre>
      )}

      <p className="text-[10px] text-cyan-100/40 italic">
        Atualiza automaticamente a cada 10 segundos.
      </p>
    </div>
  );
};
