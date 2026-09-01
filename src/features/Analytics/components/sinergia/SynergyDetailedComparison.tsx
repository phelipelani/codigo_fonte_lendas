import { motion } from 'framer-motion';
import { Calendar, Users, Goal, Target, Trophy, Equal, X, Activity, Atom } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SynergyDetailedComparisonProps {
  parceria: any;
  jogadorA: any;
  jogadorB: any;
  aproveitamento: number;
}

export function SynergyDetailedComparison({ parceria, jogadorA, jogadorB, aproveitamento }: SynergyDetailedComparisonProps) {
  if (!parceria || !jogadorA || !jogadorB) return null;

  const jogos = Number(parceria.jogos_juntos) || 0;
  const vitorias = Number(parceria.vitorias_juntos) || 0;
  const empates = Number(parceria.empates_juntos) || 0;
  const derrotas = Math.max(0, jogos - vitorias - empates);
  
  const golsA_assistB = Number(parceria.gols_A_assistidos_por_B) || 0;
  const golsB_assistA = Number(parceria.gols_B_assistidos_por_A) || 0;
  const assistencias = golsA_assistB + golsB_assistA;
  const golsComb = assistencias;

  const scoreLabel = aproveitamento >= 70 ? 'ALTA' : aproveitamento >= 50 ? 'MÉDIA' : 'BAIXA';
  const scoreColor = aproveitamento >= 70 ? 'bg-cyan-500/20 text-cyan-400' : aproveitamento >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400';

  const rows = [
    { icon: Users, title: 'JOGOS JUNTOS', desc: 'Partidas em que atuaram juntos', valA: jogos, valB: jogos, pctA: 100, pctB: 100 },
    { icon: Goal, title: `GOLS COMBINADOS (TOTAL ${golsComb})`, desc: 'Gols com participação direta da dupla', valA: golsA_assistB, valB: golsB_assistA, pctA: golsComb ? (golsA_assistB/golsComb)*100 : 0, pctB: golsComb ? (golsB_assistA/golsComb)*100 : 0 },
    { icon: Target, title: `ASSISTÊNCIAS UM PARA O OUTRO (TOTAL ${assistencias})`, desc: 'Assistências que um deu para o outro', valA: golsB_assistA, valB: golsA_assistB, pctA: assistencias ? (golsB_assistA/assistencias)*100 : 0, pctB: assistencias ? (golsA_assistB/assistencias)*100 : 0 },
    { icon: Trophy, title: 'VITÓRIAS JUNTOS', desc: 'Vitórias nas partidas que jogaram juntos', valA: vitorias, valB: vitorias, pctA: jogos ? (vitorias/jogos)*100 : 0, pctB: jogos ? (vitorias/jogos)*100 : 0 },
    { icon: Equal, title: 'EMPATES JUNTOS', desc: 'Empates nas partidas que jogaram juntos', valA: empates, valB: empates, pctA: jogos ? (empates/jogos)*100 : 0, pctB: jogos ? (empates/jogos)*100 : 0 },
    { icon: X, title: 'DERROTAS JUNTOS', desc: 'Derrotas nas partidas que jogaram juntos', valA: derrotas, valB: derrotas, pctA: jogos ? (derrotas/jogos)*100 : 0, pctB: jogos ? (derrotas/jogos)*100 : 0 },
    { icon: Activity, title: 'APROVEITAMENTO JUNTOS', desc: 'Percentual de pontos conquistados', valA: `${aproveitamento}%`, valB: `${aproveitamento}%`, pctA: aproveitamento, pctB: aproveitamento },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 mb-8">
      <div className="bg-[#0f172a]/80 border border-border/50 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-[#1e293b]/50">
          <div className="flex items-center gap-2">
            <Activity className="text-cyan-400" size={16} />
            <h3 className="text-sm font-bold text-cyan-400">COMPARATIVO DETALHADO</h3>
          </div>
          <div className="flex items-center gap-2 text-textMuted text-xs">
            <Calendar size={14} />
            Últimos {jogos} jogos juntos
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[1fr_2fr_1fr] items-center p-4 border-b border-border/30 bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <img src={jogadorA.foto_url} className="w-10 h-10 rounded-full border border-cyan-500/50 object-cover" />
            <div>
              <div className="font-bold text-white text-sm">{jogadorA.nome.split(' ')[0]}</div>
              <div className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded mt-1 inline-block">{jogadorA.posicao || 'JOGADOR'}</div>
            </div>
          </div>
          <div className="text-center text-xs font-bold text-textMuted uppercase tracking-widest">INDICADOR</div>
          <div className="flex items-center justify-end gap-3">
            <div className="text-right">
              <div className="font-bold text-white text-sm">{jogadorB.nome.split(' ')[0]}</div>
              <div className="text-[10px] uppercase font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded mt-1 inline-block">{jogadorB.posicao || 'JOGADOR'}</div>
            </div>
            <img src={jogadorB.foto_url} className="w-10 h-10 rounded-full border border-purple-500/50 object-cover" />
          </div>
        </div>

        {/* Rows */}
        <div className="flex flex-col">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_1fr] items-center p-4 border-b border-border/20 hover:bg-[#1e293b]/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-black">{i+1}</div>
                <div className="text-xl font-black text-cyan-400">{row.valA}</div>
                <div className="flex-1 h-1.5 bg-surfaceElevated rounded-full overflow-hidden flex justify-end">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${row.pctA}%` }} className="bg-cyan-500 h-full" />
                </div>
              </div>

              <div className="flex items-center gap-3 px-6">
                <row.icon className="text-textMuted flex-shrink-0" size={18} />
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">{row.title}</div>
                  <div className="text-[10px] text-textMuted">{row.desc}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 justify-end">
                <div className="flex-1 h-1.5 bg-surfaceElevated rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${row.pctB}%` }} className="bg-purple-500 h-full" />
                </div>
                <div className="text-xl font-black text-purple-400">{row.valB}</div>
              </div>
            </div>
          ))}

          {/* Sinergia Geral Row */}
          <div className="grid grid-cols-[1fr_2fr_1fr] items-center p-4 bg-[#1e293b]/20">
            <div className="flex items-center gap-4">
              <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-black">{rows.length + 1}</div>
              <div className="w-10 h-10 rounded-full border-2 border-red-500/50 flex items-center justify-center text-red-400 font-black text-lg">{aproveitamento}</div>
              <div className={cn("text-[9px] font-bold px-2 py-0.5 rounded uppercase", scoreColor)}>{scoreLabel}</div>
            </div>

            <div className="flex items-center gap-3 px-6">
              <Atom className="text-textMuted flex-shrink-0" size={18} />
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-wider">QUALIDADE DE SINERGIA GERAL</div>
                <div className="text-[10px] text-textMuted">Score calculado com base em todos os indicadores</div>
              </div>
            </div>

            <div className="flex items-center gap-4 justify-end">
              <div className={cn("text-[9px] font-bold px-2 py-0.5 rounded uppercase", scoreColor)}>{scoreLabel}</div>
              <div className="w-10 h-10 rounded-full border-2 border-red-500/50 flex items-center justify-center text-red-400 font-black text-lg">{aproveitamento}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
