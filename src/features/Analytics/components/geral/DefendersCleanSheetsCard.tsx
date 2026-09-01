import { memo } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DefendersCleanSheetsCard = memo(({ zagueiros }: { zagueiros: any[] }) => {
  const top5 = zagueiros?.slice(0, 5) || [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-emerald-500/20 bg-surfaceElevated/50 p-4 md:p-5 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-emerald-400" />
          <div>
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">Zagueiros</h3>
            <p className="text-[9px] text-emerald-400 uppercase">Clean Sheets</p>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="grid grid-cols-[16px_1fr_30px_30px] gap-2 pb-2 mb-2 border-b border-border/50">
          <div></div>
          <div className="text-[9px] font-bold text-textMuted uppercase">Jogador</div>
          <div className="text-[9px] font-bold text-textMuted text-right uppercase">CS</div>
          <div className="text-[9px] font-bold text-textMuted text-right uppercase">%</div>
        </div>

        {top5.map((a: any, i: number) => {
          const perc = a.jogos > 0 ? Math.round((a.clean_sheets / a.jogos) * 100) : 0;
          return (
            <div key={a.id} className="grid grid-cols-[16px_1fr_30px_30px] gap-2 items-center py-1.5">
              <span className={cn("text-[10px] font-black text-center", i === 0 ? "text-amber-400" : "text-textMuted")}>{i+1}</span>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-surface/50 shrink-0">
                  {a.foto_url ? <img src={a.foto_url} className="w-full h-full object-cover" /> : null}
                </div>
                <span className="text-xs font-bold text-white truncate">{a.nome}</span>
              </div>
              <span className="text-sm font-black text-emerald-400 text-right">{a.clean_sheets}</span>
              <span className="text-[10px] font-bold text-emerald-400/50 text-right">{perc}%</span>
            </div>
          );
        })}
        {top5.length === 0 && <p className="text-xs text-textMuted text-center py-4">Nenhum dado</p>}
      </div>
    </motion.div>
  );
});
