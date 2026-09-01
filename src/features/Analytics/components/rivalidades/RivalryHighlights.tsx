import { Trophy, Goal, Target } from 'lucide-react';

interface RivalryHighlightsProps {
  jogadorA_nome: string;
  jogadorB_nome: string;
  desA: any;
  desB: any;
  statsA: any;
  statsB: any;
}

export function RivalryHighlights({ jogadorA_nome, jogadorB_nome, desA, desB, statsA, statsB }: RivalryHighlightsProps) {
  const nomeA = jogadorA_nome.split(' ')[0];
  const nomeB = jogadorB_nome.split(' ')[0];

  const maiorVencedor = (desA.vitorias || 0) > (desB.vitorias || 0) 
    ? { nome: nomeA, valor: desA.vitorias, label: 'vitórias' } 
    : (desB.vitorias || 0) > (desA.vitorias || 0) 
      ? { nome: nomeB, valor: desB.vitorias, label: 'vitórias' } 
      : null;

  const maisGols = (statsA.gols || 0) > (statsB.gols || 0) 
    ? { nome: nomeA, valor: statsA.gols, label: 'gols' } 
    : (statsB.gols || 0) > (statsA.gols || 0) 
      ? { nome: nomeB, valor: statsB.gols, label: 'gols' } 
      : null;

  const maisAssists = (statsA.assists || 0) > (statsB.assists || 0) 
    ? { nome: nomeA, valor: statsA.assists, label: 'assistências' } 
    : (statsB.assists || 0) > (statsA.assists || 0) 
      ? { nome: nomeB, valor: statsB.assists, label: 'assistências' } 
      : null;

  return (
    <div className="mt-8 space-y-3">
      {maiorVencedor && (
        <div className="bg-surface/50 border border-border/50 rounded-xl p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] text-textMuted uppercase tracking-wider mb-2">
            <Trophy className="w-3 h-3 text-amber-400" /> Maior Vencedor Geral
          </div>
          <div className="text-sm font-bold text-white">{maiorVencedor.nome}</div>
          <div className="text-xs text-textMuted">{maiorVencedor.valor} {maiorVencedor.label}</div>
        </div>
      )}

      {maisGols && (
        <div className="bg-surface/50 border border-border/50 rounded-xl p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] text-textMuted uppercase tracking-wider mb-2">
            <Goal className="w-3 h-3 text-cyan-400" /> Mais Gols
          </div>
          <div className="text-sm font-bold text-white">{maisGols.nome}</div>
          <div className="text-xs text-textMuted">{maisGols.valor} {maisGols.label}</div>
        </div>
      )}

      {maisAssists && (
        <div className="bg-surface/50 border border-border/50 rounded-xl p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] text-textMuted uppercase tracking-wider mb-2">
            <Target className="w-3 h-3 text-red-400" /> Mais Assistências
          </div>
          <div className="text-sm font-bold text-white">{maisAssists.nome}</div>
          <div className="text-xs text-textMuted">{maisAssists.valor} {maisAssists.label}</div>
        </div>
      )}
    </div>
  );
}
