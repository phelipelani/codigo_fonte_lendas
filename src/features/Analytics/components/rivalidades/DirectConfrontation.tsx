import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Swords } from 'lucide-react';

interface DirectConfrontationProps {
  confronto: any;
  jogadorA_nome: string;
  jogadorB_nome: string;
}

export function DirectConfrontation({ confronto, jogadorA_nome, jogadorB_nome }: DirectConfrontationProps) {
  if (!confronto || confronto.jogos === 0) return null;

  const total = confronto.gols_A + confronto.gols_B;
  const pctGolsA = total > 0 ? (confronto.gols_A / total) * 100 : 50;
  const pctGolsB = total > 0 ? (confronto.gols_B / total) * 100 : 50;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Swords className="text-red-400 w-4 h-4" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Confronto Direto</h3>
      </div>

      <div className="bg-surface/30 rounded-2xl p-5 border border-border/50">
        <div className="text-center mb-6">
          <span className="text-xs uppercase tracking-widest text-textMuted">{confronto.jogos} Jogos</span>
        </div>

        <div className="flex justify-between items-end mb-8 text-center px-2 sm:px-6">
          <div className="flex-1">
            <div className="text-xs text-textMuted uppercase mb-2 truncate max-w-[80px] mx-auto">{jogadorA_nome.split(' ')[0]}</div>
            <div className="text-3xl font-black text-cyan-400">{confronto.vitorias_A}</div>
            <div className="text-[9px] text-textMuted uppercase mt-1">Vitórias</div>
          </div>
          
          <div className="flex-1">
            <div className="text-xs text-textMuted uppercase mb-2">Empates</div>
            <div className="text-2xl font-bold text-white/80">{confronto.empates}</div>
            <div className="text-[9px] text-textMuted uppercase mt-1 opacity-0">.</div>
          </div>
          
          <div className="flex-1">
            <div className="text-xs text-textMuted uppercase mb-2 truncate max-w-[80px] mx-auto">{jogadorB_nome.split(' ')[0]}</div>
            <div className="text-3xl font-black text-purple-400">{confronto.vitorias_B}</div>
            <div className="text-[9px] text-textMuted uppercase mt-1">Vitórias</div>
          </div>
        </div>

        <div className="pt-5 border-t border-border/30">
          <div className="text-[10px] text-textMuted uppercase tracking-wider mb-2 text-center">Gols nos Confrontos</div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-cyan-400 w-6 text-right">{confronto.gols_A}</span>
            <div className="flex-1 h-2 flex rounded-full overflow-hidden bg-surfaceElevated">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${pctGolsA}%` }}
                className="bg-cyan-500 h-full"
              />
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${pctGolsB}%` }}
                className="bg-purple-500 h-full"
              />
            </div>
            <span className="text-sm font-bold text-purple-400 w-6">{confronto.gols_B}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
