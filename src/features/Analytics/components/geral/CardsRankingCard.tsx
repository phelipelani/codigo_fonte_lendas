import { memo } from 'react';
import { motion } from 'framer-motion';
import { Square } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CardsRankingCard = memo(({ cartoes }: { cartoes: any[] }) => {
  const top5 = cartoes?.slice(0, 5) || [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl border border-yellow-500/20 bg-surfaceElevated/50 p-4 md:p-5 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Square size={14} fill="currentColor" className="text-yellow-400" />
          <div>
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">Cartões</h3>
            <p className="text-[9px] text-textMuted uppercase">Estatísticas disciplinares</p>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="grid grid-cols-[16px_1fr_20px_20px_30px] gap-2 pb-2 mb-2 border-b border-border/50 items-end">
          <div></div>
          <div></div>
          <div className="flex justify-center"><Square size={8} fill="currentColor" className="text-yellow-400" /></div>
          <div className="flex justify-center"><Square size={8} fill="currentColor" className="text-red-500" /></div>
          <div className="text-[9px] font-bold text-textMuted text-right uppercase">Total</div>
        </div>

        {top5.map((a: any, i: number) => (
          <div key={a.id} className="grid grid-cols-[16px_1fr_20px_20px_30px] gap-2 items-center py-1.5">
            <span className={cn("text-[10px] font-black text-center", i === 0 ? "text-amber-400" : "text-textMuted")}>{i+1}</span>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-full overflow-hidden bg-surface/50 shrink-0">
                {a.foto_url ? <img src={a.foto_url} className="w-full h-full object-cover" /> : null}
              </div>
              <span className="text-xs font-bold text-white truncate">{a.nome}</span>
            </div>
            <span className="text-xs font-bold text-yellow-400 text-center">{a.amarelos}</span>
            <span className="text-xs font-bold text-red-500 text-center">{a.vermelhos}</span>
            <span className="text-sm font-black text-slate-300 text-right">{a.total}</span>
          </div>
        ))}
        {top5.length === 0 && <p className="text-xs text-textMuted text-center py-4">Nenhum dado</p>}
      </div>
    </motion.div>
  );
});
