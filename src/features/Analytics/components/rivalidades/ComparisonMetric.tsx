import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ComparisonMetricProps {
  label: string;
  valueA: number;
  valueB: number;
  jogadorA_nome?: string;
  jogadorB_nome?: string;
  higherIsBetter?: boolean;
  suffix?: string;
}

export function ComparisonMetric({ 
  label, 
  valueA, 
  valueB, 
  jogadorA_nome = 'JOGADOR 1', 
  jogadorB_nome = 'JOGADOR 2',
  higherIsBetter = true,
  suffix = ''
}: ComparisonMetricProps) {
  const isTie = valueA === valueB;
  let advantage = isTie ? 'tie' : valueA > valueB ? 'A' : 'B';
  
  if (!higherIsBetter && !isTie) {
    advantage = valueA < valueB ? 'A' : 'B';
  }

  // Calculate percentages for the visual bars
  const total = Math.max(valueA, valueB) * 1.2 || 1; // 1.2 gives a bit of headroom
  const pctA = Math.min((valueA / total) * 100, 100);
  const pctB = Math.min((valueB / total) * 100, 100);

  return (
    <div className="py-4 border-b border-border/30 last:border-0">
      <div className="text-center mb-3">
        <span className="text-[10px] uppercase tracking-widest text-textMuted font-bold">{label}</span>
      </div>

      {isTie && valueA > 0 ? (
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center justify-center w-full gap-4 mb-2">
            <span className="text-lg font-bold text-white">{valueA}{suffix}</span>
            <span className="text-xs font-black text-amber-500 uppercase px-2 py-0.5 rounded bg-amber-500/10">Empate</span>
            <span className="text-lg font-bold text-white">{valueB}{suffix}</span>
          </div>
          <div className="w-full flex gap-1 h-1.5 opacity-50">
            <div className="flex-1 bg-surfaceElevated rounded-l-full overflow-hidden flex justify-end">
               <motion.div initial={{ width: 0 }} animate={{ width: `${pctA}%` }} className="bg-amber-500 h-full" />
            </div>
            <div className="flex-1 bg-surfaceElevated rounded-r-full overflow-hidden">
               <motion.div initial={{ width: 0 }} animate={{ width: `${pctB}%` }} className="bg-amber-500 h-full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          {/* Player A side */}
          <div className="flex-1 flex flex-col items-end gap-1">
            <span className={cn(
              "text-lg font-black transition-colors", 
              advantage === 'A' ? "text-cyan-400" : "text-textMuted"
            )}>
              {valueA}{suffix}
            </span>
            <div className="w-full h-1.5 bg-surfaceElevated rounded-full overflow-hidden flex justify-end">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${pctA}%` }} 
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={cn("h-full", advantage === 'A' ? "bg-cyan-500" : "bg-cyan-500/30")}
              />
            </div>
            <span className="text-[9px] uppercase text-textMuted/50 tracking-wider mt-1">
              {jogadorA_nome.split(' ')[0]}
            </span>
          </div>

          <div className="w-4 flex-shrink-0" />

          {/* Player B side */}
          <div className="flex-1 flex flex-col items-start gap-1">
            <span className={cn(
              "text-lg font-black transition-colors", 
              advantage === 'B' ? "text-purple-400" : "text-textMuted"
            )}>
              {valueB}{suffix}
            </span>
            <div className="w-full h-1.5 bg-surfaceElevated rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${pctB}%` }} 
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={cn("h-full", advantage === 'B' ? "bg-purple-500" : "bg-purple-500/30")}
              />
            </div>
            <span className="text-[9px] uppercase text-textMuted/50 tracking-wider mt-1">
              {jogadorB_nome.split(' ')[0]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
