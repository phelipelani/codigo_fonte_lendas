import { motion } from 'framer-motion';
import { Zap, Target, Trophy, Shield, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SynergyProfileProps {
  scores?: {
    letal?: number;
    atletica?: number;
    criativa?: number;
    vencedora?: number;
    defensiva?: number;
  };
}

export function SynergyProfile({ scores = {} }: SynergyProfileProps) {
  const categories = [
    { id: 'letal', label: 'Letal', icon: Target, color: 'bg-amber-400', textColor: 'text-amber-400', value: scores.letal },
    { id: 'atletica', label: 'Atlética', icon: Users, color: 'bg-orange-400', textColor: 'text-orange-400', value: scores.atletica },
    { id: 'criativa', label: 'Criativa', icon: Zap, color: 'bg-pink-400', textColor: 'text-pink-400', value: scores.criativa },
    { id: 'vencedora', label: 'Vencedora', icon: Trophy, color: 'bg-purple-400', textColor: 'text-purple-400', value: scores.vencedora },
    { id: 'defensiva', label: 'Defensiva', icon: Shield, color: 'bg-teal-400', textColor: 'text-teal-400', value: scores.defensiva },
  ];

  const getLabel = (val?: number) => {
    if (val === undefined || val === null) return '-';
    if (val >= 85) return 'EXCELENTE';
    if (val >= 70) return 'ALTA';
    if (val >= 50) return 'MÉDIA';
    if (val >= 30) return 'BAIXA';
    return 'MUITO BAIXA';
  };

  return (
    <div className="mt-8 mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="text-amber-400 fill-amber-400/20" size={20} />
        <h3 className="text-lg font-black uppercase tracking-wider text-white">PERFIL DA SINERGIA</h3>
      </div>

      <div className="flex flex-col gap-3">
        {categories.map((cat, i) => {
          const hasValue = cat.value !== undefined && cat.value !== null;
          const displayValue = hasValue ? cat.value : '-';
          const label = getLabel(cat.value);
          const pct = hasValue ? `${cat.value}%` : '0%';

          return (
            <div key={cat.id} className="bg-surface/30 border border-border/50 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <cat.icon className={cn("w-4 h-4", cat.textColor)} />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{cat.label}</span>
                </div>
                <span className={cn("text-lg font-black", hasValue ? "text-white" : "text-textMuted")}>
                  {displayValue}
                </span>
              </div>
              
              <div className="flex items-center justify-between mt-1">
                <span className={cn("text-[9px] uppercase tracking-widest font-black", hasValue ? cat.textColor : "text-textMuted")}>
                  {label}
                </span>
              </div>

              <div className="w-full h-1.5 bg-surfaceElevated rounded-full overflow-hidden mt-1 flex">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: pct }} 
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  className={cn("h-full", hasValue ? cat.color : "bg-transparent")}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
