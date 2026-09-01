import { motion } from 'framer-motion';

interface SynergyOverallScoreProps {
  score: number;
}

export function SynergyOverallScore({ score }: SynergyOverallScoreProps) {
  let label = "MÉDIA";
  let color = "text-amber-400";
  
  if (score >= 85) {
    label = "EXCELENTE";
    color = "text-emerald-400";
  } else if (score >= 70) {
    label = "ALTA";
    color = "text-emerald-400";
  } else if (score < 50 && score >= 30) {
    label = "BAIXA";
    color = "text-orange-400";
  } else if (score < 30) {
    label = "MUITO BAIXA";
    color = "text-red-400";
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className="flex flex-col items-center justify-center py-6 border-b border-border/30"
    >
      <div className="text-[10px] text-textMuted font-bold uppercase tracking-widest mb-1">
        Sinergia Geral
      </div>
      <div className="text-6xl font-black text-white leading-none mb-2">
        {score}
      </div>
      <div className={`text-xs font-black uppercase tracking-widest ${color} bg-surfaceElevated px-3 py-1 rounded-full border border-border`}>
        {label}
      </div>
    </motion.div>
  );
}
