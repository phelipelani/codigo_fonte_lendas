import { Target, Trophy, Shield, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopSynergyRankingsProps {
  sinergiaData: any;
  onVerTodos?: () => void;
}

export function TopSynergyRankings({ sinergiaData, onVerTodos }: TopSynergyRankingsProps) {
  if (!sinergiaData) return null;

  const letal = sinergiaData.topDuplasGols?.[0];
  const vencedora = sinergiaData.maisVenceramJuntos?.[0];
  const defesa = sinergiaData.muralhas?.[0];

  const renderCard = (title: string, rank: number, color: string, icon: any, duo: any, stat1: any, stat2: any, stat3: any) => {
    if (!duo) return null;
    
    const Icon = icon;
    const j1Nome = duo.artilheiro_nome || duo.jogador1_nome || duo.zagueiro1_nome;
    const j2Nome = duo.garcom_nome || duo.jogador2_nome || duo.zagueiro2_nome;
    const j1Foto = duo.artilheiro_foto || duo.jogador1_foto || duo.zagueiro1_foto;
    const j2Foto = duo.garcom_foto || duo.jogador2_foto || duo.zagueiro2_foto;

    return (
      <div className={cn("rounded-2xl border bg-surface/30 p-4 relative overflow-hidden", `border-${color}/30`)}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className={cn("w-6 h-6 rounded flex items-center justify-center text-xs font-black text-white", `bg-${color}`)}>
            {rank}
          </div>
          <span className={cn("text-xs font-black uppercase tracking-wider", `text-${color}`)}>{title}</span>
        </div>

        {/* Players */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              {j1Foto ? <img src={j1Foto} className="w-10 h-10 rounded-full border border-border object-cover" /> : <div className="w-10 h-10 rounded-full border border-border bg-surfaceElevated flex items-center justify-center text-[10px] font-bold">{j1Nome?.substring(0,2)}</div>}
              <span className="text-[10px] font-bold text-white mt-1">{j1Nome?.split(' ')[0]}</span>
            </div>
            
            <div className={cn("flex items-center justify-center w-6 h-6 rounded-full bg-surfaceElevated border", `border-${color}/30`)}>
               <Icon className={cn("w-3 h-3", `text-${color}`)} />
            </div>

            <div className="flex flex-col items-center">
              {j2Foto ? <img src={j2Foto} className="w-10 h-10 rounded-full border border-border object-cover" /> : <div className="w-10 h-10 rounded-full border border-border bg-surfaceElevated flex items-center justify-center text-[10px] font-bold">{j2Nome?.substring(0,2)}</div>}
              <span className="text-[10px] font-bold text-white mt-1">{j2Nome?.split(' ')[0]}</span>
            </div>
          </div>
          
          <div className="text-right">
            <div className={cn("text-3xl font-black leading-none", `text-${color}`)}>{stat1.value || 94}</div>
            <div className="text-[9px] text-textMuted uppercase tracking-wider font-bold">Sinergia</div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/30">
          <div className="text-center">
            <div className={cn("text-lg font-black", `text-${color}`)}>{stat1.val}</div>
            <div className="text-[8px] text-textMuted uppercase tracking-wider">{stat1.label}</div>
          </div>
          <div className="text-center">
            <div className={cn("text-lg font-black", `text-${color}`)}>{stat2.val}</div>
            <div className="text-[8px] text-textMuted uppercase tracking-wider">{stat2.label}</div>
          </div>
          <div className="text-center">
            <div className={cn("text-lg font-black", `text-${color}`)}>{stat3.val}</div>
            <div className="text-[8px] text-textMuted uppercase tracking-wider">{stat3.label}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mb-10 w-full max-w-5xl mx-auto px-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="text-amber-400" size={20} />
          <h2 className="text-lg font-black uppercase tracking-wider text-white">
            TOP 3 SINERGIAS DA TEMPORADA
          </h2>
        </div>
        <button 
          onClick={onVerTodos}
          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
        >
          VER TODOS <ArrowRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderCard(
          "Sinergia Letal", 1, "cyan-500", Target, letal, 
          { val: letal?.gols_juntos || 0, label: "GOLS" },
          { val: "-", label: "ASSIST." },
          { val: "-", label: "JOGOS" }
        )}
        
        {renderCard(
          "Dupla Mais Vencedora", 2, "purple-500", Trophy, vencedora,
          { val: vencedora?.vitorias_juntos || 0, label: "VITÓRIAS" },
          { val: "-", label: "EMPATES" },
          { val: "-", label: "DERROTAS" }
        )}
        
        {renderCard(
          "Melhor Defesa", 3, "emerald-500", Shield, defesa,
          { val: defesa?.clean_sheets_juntos || 0, label: "CLEAN SHEETS" },
          { val: "-", label: "JOGOS" },
          { val: "-", label: "VITÓRIAS" }
        )}
      </div>
    </div>
  );
}
