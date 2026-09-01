import { cn } from '@/lib/utils';

interface RivalidadeHeaderProps {
  jogadorA?: string;
  jogadorB?: string;
}

export function RivalidadeHeader({ jogadorA, jogadorB }: RivalidadeHeaderProps) {
  return (
    <div className="text-center pb-4 mb-4 border-b border-border/40">
      <h2 className="text-sm font-bold tracking-widest text-textMuted uppercase mb-1">
        Análise de Rivalidades
      </h2>
      <div className="flex items-center justify-center gap-2 text-lg font-black">
        {jogadorA ? (
          <span className="text-cyan-400">{jogadorA.split(' ')[0]}</span>
        ) : (
          <span className="text-textMuted/50">Jogador 1</span>
        )}
        <span className="text-sm text-textMuted/50 font-medium mx-1">VS</span>
        {jogadorB ? (
          <span className="text-purple-400">{jogadorB.split(' ')[0]}</span>
        ) : (
          <span className="text-textMuted/50">Jogador 2</span>
        )}
      </div>
    </div>
  );
}
