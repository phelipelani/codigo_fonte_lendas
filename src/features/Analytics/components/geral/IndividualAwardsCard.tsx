import { memo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Frown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const IndividualAwardsCard = memo(({ premios }: { premios: { mvps: any[], pe_de_rato: any[] } }) => {
  const topMvps = premios?.mvps?.slice(0, 3) || [];
  const topPes = premios?.pe_de_rato?.slice(0, 2) || [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="rounded-2xl border border-amber-500/20 bg-surfaceElevated/50 p-4 md:p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={16} className="text-amber-400" />
        <h3 className="font-bold text-white text-xs uppercase tracking-wider">Prêmios Indiv.</h3>
      </div>

      <div className="flex-1 flex flex-col justify-between gap-4">
        {/* MVP Section */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Star size={12} className="text-purple-400" fill="currentColor" />
            <span className="text-[10px] font-bold text-textMuted uppercase">MVP</span>
          </div>
          {topMvps.map((a: any, i: number) => (
            <div key={a.id} className="grid grid-cols-[16px_1fr_30px] gap-2 items-center py-1">
              <span className={cn("text-[10px] font-black text-center", i === 0 ? "text-amber-400" : "text-textMuted")}>{i+1}</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-bold text-white truncate">{a.nome}</span>
              </div>
              <span className="text-xs font-black text-purple-400 text-right">{a.mvps}</span>
            </div>
          ))}
          {topMvps.length === 0 && <p className="text-[10px] text-textMuted">Sem dados</p>}
        </div>

        {/* Pé de Rato Section */}
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Frown size={12} className="text-amber-600" />
            <span className="text-[10px] font-bold text-textMuted uppercase">Pé de Rato</span>
          </div>
          {topPes.map((a: any, i: number) => (
            <div key={a.id} className="grid grid-cols-[16px_1fr_30px] gap-2 items-center py-1">
              <span className={cn("text-[10px] font-black text-center", i === 0 ? "text-amber-400" : "text-textMuted")}>{i+1}</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-bold text-white truncate">{a.nome}</span>
              </div>
              <span className="text-xs font-black text-amber-600 text-right">{a.pe_de_rato}</span>
            </div>
          ))}
          {topPes.length === 0 && <p className="text-[10px] text-textMuted">Sem dados</p>}
        </div>
      </div>
    </motion.div>
  );
});
