import { motion } from 'framer-motion';
import { Crosshair } from 'lucide-react';

interface AverageStatsCardProps {
  mediaGols: string;
  mediaAssists: string;
  mediaGA: string;
}

export function AverageStatsCard({ mediaGols, mediaAssists, mediaGA }: AverageStatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-border/50 bg-surface/30 p-5 md:p-6 flex flex-col h-full"
    >
      <div className="flex items-center gap-2 mb-6">
        <Crosshair size={18} className="text-purple-400" />
        <h3 className="font-bold text-white uppercase tracking-wider text-sm">Médias por Jogo</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-1 sm:gap-2 flex-1 items-center">
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-3xl md:text-3xl lg:text-4xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]">{mediaGols}</span>
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-textMuted tracking-wider mt-2 border-t border-border/50 pt-2 w-full truncate px-1">Gols</span>
        </div>
        
        <div className="flex flex-col items-center justify-center text-center border-l border-r border-border/50 px-1 sm:px-2">
          <span className="text-3xl md:text-3xl lg:text-4xl font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">{mediaAssists}</span>
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-textMuted tracking-wider mt-2 border-t border-border/50 pt-2 w-full truncate px-1">Assist.</span>
        </div>
        
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-3xl md:text-3xl lg:text-4xl font-black text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.2)]">{mediaGA}</span>
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-textMuted tracking-wider mt-2 border-t border-border/50 pt-2 w-full truncate px-1">C/HA</span>
        </div>
      </div>
    </motion.div>
  );
}
