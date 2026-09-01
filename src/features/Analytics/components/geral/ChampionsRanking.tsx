import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ChampionsRanking = memo(({ campeoes }: { campeoes: any[] }) => {
  const [aba, setAba] = useState<'corridos'|'copas'>('corridos');

  const formatoFilter = aba === 'corridos' ? 'pontos_corridos' : 'mata_mata';
  
  const displayData = campeoes
    .filter(c => (c.formato || '').toLowerCase().replace('-', '_') === formatoFilter || (c.formato === null && aba === 'corridos')) // fallback
    .sort((a, b) => b.titulos - a.titulos)
    .slice(0, 5);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="w-full rounded-2xl border border-amber-500/20 bg-surface/30 p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={18} className="text-amber-400" />
        <div>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider">Ranking de Times - Campeões</h3>
          <p className="text-[10px] text-textMuted uppercase">Títulos conquistados nas competições</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 border-b border-border/50 pb-2">
        <button 
          onClick={() => setAba('corridos')}
          className={cn(
            "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all",
            aba === 'corridos' ? "bg-amber-500/20 text-amber-400 border border-amber-500/50" : "text-textMuted hover:text-white"
          )}
        >
          Pontos Corridos
        </button>
        <button 
          onClick={() => setAba('copas')}
          className={cn(
            "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all",
            aba === 'copas' ? "bg-amber-500/20 text-amber-400 border border-amber-500/50" : "text-textMuted hover:text-white"
          )}
        >
          Copas
        </button>
      </div>

      <div className="grid grid-cols-[16px_1fr_40px] gap-2 pb-2 mb-2 border-b border-border/50">
        <div></div>
        <div className="text-[9px] font-bold text-textMuted uppercase">Time</div>
        <div className="text-[9px] font-bold text-textMuted text-center uppercase">Títulos</div>
      </div>

      <div className="space-y-1">
        {displayData.map((a: any, i: number) => (
          <div key={a.id} className="grid grid-cols-[16px_1fr_40px] gap-2 items-center py-2 hover:bg-white/5 rounded-lg px-1 transition-colors">
            <span className={cn("text-[10px] font-black text-center", i === 0 ? "text-amber-400" : "text-textMuted")}>{i+1}</span>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-surfaceElevated shrink-0 border border-border/50 p-0.5">
                {a.escudo_url ? <img src={a.escudo_url} className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-textMuted">{a.nome?.substring(0,2)}</div>}
              </div>
              <span className="text-xs font-bold text-white truncate">{a.nome}</span>
            </div>
            <span className="text-sm font-black text-amber-400 text-center">{a.titulos}</span>
          </div>
        ))}
        {displayData.length === 0 && <p className="text-xs text-textMuted text-center py-6">Nenhum título registrado</p>}
      </div>
      
      <button className="w-full mt-4 py-3 text-[10px] font-bold text-textMuted hover:text-white border border-border/50 rounded-lg hover:bg-surfaceElevated transition-all flex items-center justify-center gap-1">
        Ver Histórico Completo <ChevronRight size={12} />
      </button>
    </motion.div>
  );
});
