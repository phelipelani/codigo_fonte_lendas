import { motion } from 'framer-motion';
import { Gamepad2, Goal, Target, Shield, Trophy, TrendingDown, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerStatGridProps {
  totais: any;
  desempenho: any;
  titulos: any[];
}

export function PlayerStatGrid({ totais, desempenho, titulos }: PlayerStatGridProps) {
  const stats = [
    { label: 'Jogos', value: totais.jogos, icon: Gamepad2, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Gols', value: totais.gols, icon: Goal, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Assistências', value: totais.assists, icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Clean Sheets', value: totais.clean_sheets, icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Vitórias', value: desempenho.vitorias, icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Derrotas', value: desempenho.derrotas, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Títulos', value: titulos.length, icon: Medal, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={cn(
            "rounded-2xl border border-border/50 bg-surface/40 p-4 md:p-5 flex flex-col items-center justify-center text-center transition-all hover:bg-surface/60",
            i === 6 ? "col-span-2 md:col-span-1" : "" // Last item on mobile spans 2 cols to center
          )}
        >
          <div className={cn("w-10 h-10 rounded-xl mb-2 flex items-center justify-center", stat.bg, stat.color)}>
            <stat.icon size={20} strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-black text-white">{stat.value}</span>
          <span className="text-[10px] md:text-xs font-bold text-textMuted uppercase tracking-wider mt-1">{stat.label}</span>
        </motion.div>
      ))}
    </div>
  );
}
