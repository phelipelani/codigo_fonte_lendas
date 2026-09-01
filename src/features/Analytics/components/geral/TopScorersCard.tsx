import { memo } from 'react';
import { motion } from 'framer-motion';
import { Goal } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TopScorersCard = memo(({ artilheiros }: { artilheiros: any[] }) => {
  const top5 = artilheiros?.slice(0, 5) || [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="h-full rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 md:p-5 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Goal size={16} className="text-emerald-400" />
          <div>
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">Artilharia</h3>
            <p className="text-[9px] text-textMuted uppercase">Mais gols marcados</p>
          </div>
        </div>
        <button className="text-[10px] text-emerald-400 font-bold hover:text-emerald-300">Ver todos</button>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-[16px_1fr_30px_30px] gap-2 pb-2 mb-2 border-b border-border/50">
          <div></div>
          <div></div>
          <div className="text-[9px] font-bold text-textMuted text-right uppercase">Gols</div>
          <div className="text-[9px] font-bold text-textMuted text-right uppercase">Méd</div>
        </div>

        {top5.map((a: any, i: number) => (
          <div key={a.id} className="grid grid-cols-[16px_1fr_30px_30px] gap-2 items-center py-1.5">
            <span className={cn("text-[10px] font-black text-center", i === 0 ? "text-amber-400" : "text-textMuted")}>{i+1}</span>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-full overflow-hidden bg-surfaceElevated shrink-0">
                {a.foto_url ? <img src={a.foto_url} className="w-full h-full object-cover" /> : null}
              </div>
              <span className={cn("text-xs font-bold truncate", i === 0 ? "text-white" : "text-slate-300")}>{a.nome}</span>
            </div>
            <span className="text-sm font-black text-emerald-400 text-right">{a.gols}</span>
            <span className="text-[10px] font-bold text-textMuted text-right">{a.media}</span>
          </div>
        ))}

        {top5.length === 0 && <p className="text-xs text-textMuted text-center py-4">Nenhum dado</p>}
      </div>
    </motion.div>
  );
});
