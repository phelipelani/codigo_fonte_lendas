import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export function SynergyHeader() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="mb-8"
    >
      <div className="flex items-center gap-2 mb-2">
        <Zap className="text-amber-400 fill-amber-400/20" size={24} />
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
          SINERGIA DE LENDAS
        </h1>
      </div>
      
      <p className="text-textMuted text-sm sm:text-base mb-6 max-w-lg">
        Descubra quais jogadores potencializam o desempenho uns dos outros.
      </p>

      <div className="bg-surface/50 border border-border/50 rounded-xl p-4 inline-flex flex-col min-w-[200px]">
        <span className="text-white font-bold">- jogadores</span>
        <span className="text-textMuted text-sm">- duplas analisadas</span>
      </div>
    </motion.div>
  );
}
