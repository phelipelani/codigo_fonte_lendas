import { Target, Trophy, Swords, Zap, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PairMetricsProps {
  parceria: any;
  jogadorA_nome: string;
  jogadorB_nome: string;
}

export function PairMetrics({ parceria, jogadorA_nome, jogadorB_nome }: PairMetricsProps) {
  if (!parceria) return null;

  const nomeA = jogadorA_nome.split(' ')[0];
  const nomeB = jogadorB_nome.split(' ')[0];

  const jogos = Number(parceria.jogos_juntos) || 0;
  const vitorias = Number(parceria.vitorias_juntos) || 0;
  const empates = Number(parceria.empates_juntos) || 0; // Se não vier da API, será 0
  const derrotas = jogos - vitorias - empates;
  
  const gols_A_assist_B = Number(parceria.gols_A_assistidos_por_B) || 0;
  const gols_B_assist_A = Number(parceria.gols_B_assistidos_por_A) || 0;
  const assistencias_entre_si = gols_A_assist_B + gols_B_assist_A;
  
  // Gols combinados (se tivéssemos o total deles em campo, usaríamos. Como não temos, usamos assistências)
  const gols_combinados = assistencias_entre_si; 

  const aproveitamento = jogos > 0 ? Math.round(((vitorias * 3 + empates) / (jogos * 3)) * 100) : 0;

  return (
    <div className="mt-8 mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="text-cyan-400" size={20} />
        <h3 className="text-lg font-black uppercase tracking-wider text-white">DESEMPENHO DA DUPLA</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Jogos Juntos */}
        <div className="bg-surface/30 border border-border/50 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-textMuted uppercase tracking-wider font-bold">Jogos Juntos</span>
          </div>
          <span className="text-3xl font-black text-white">{jogos}</span>
        </div>

        {/* Gols Combinados */}
        <div className="bg-surface/30 border border-border/50 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-textMuted uppercase tracking-wider font-bold">Gols Combinados</span>
          </div>
          <span className="text-3xl font-black text-white">{gols_combinados > 0 ? gols_combinados : '-'}</span>
        </div>

        {/* Aproveitamento */}
        <div className="bg-surface/30 border border-border/50 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-textMuted uppercase tracking-wider font-bold">Aproveitamento</span>
          </div>
          <span className="text-3xl font-black text-white">{aproveitamento}%</span>
        </div>

        {/* Vitórias */}
        <div className="bg-surface/30 border border-border/50 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-textMuted uppercase tracking-wider font-bold">Vitórias</span>
          </div>
          <span className="text-3xl font-black text-emerald-400">{vitorias}</span>
        </div>

        {/* Empates */}
        <div className="bg-surface/30 border border-border/50 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-textMuted uppercase tracking-wider font-bold">Empates</span>
          </div>
          <span className="text-3xl font-black text-amber-400">{empates > 0 ? empates : '-'}</span>
        </div>

        {/* Derrotas */}
        <div className="bg-surface/30 border border-border/50 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-textMuted uppercase tracking-wider font-bold">Derrotas</span>
          </div>
          <span className="text-3xl font-black text-red-400">{derrotas > 0 ? derrotas : '-'}</span>
        </div>
      </div>

      {/* Assistências entre si (Destaque conforme PDF) */}
      <div className="mt-4 bg-surface/30 border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Target className="text-pink-400" size={16} />
          <span className="text-[10px] text-white uppercase tracking-wider font-bold">Assistências entre si</span>
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          <span className="text-4xl font-black text-white">{assistencias_entre_si > 0 ? assistencias_entre_si : '-'}</span>
        </div>

        {assistencias_entre_si > 0 && (
          <div className="flex flex-col gap-2 bg-surfaceElevated rounded-lg p-3 border border-border/30">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-textMuted">{nomeA} → {nomeB}</span>
              <span className="text-white font-bold">{gols_B_assist_A} <span className="text-textMuted font-normal text-[10px]">assistências</span></span>
            </div>
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-textMuted">{nomeB} → {nomeA}</span>
              <span className="text-white font-bold">{gols_A_assist_B} <span className="text-textMuted font-normal text-[10px]">assistências</span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
