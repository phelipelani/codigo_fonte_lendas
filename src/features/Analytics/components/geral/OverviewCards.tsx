import { memo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Goal, Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const KPICard = memo(({ 
  title, value, subtitle, icon: Icon, color, delay = 0 
}: { 
  title: string; value: string | number; subtitle?: string; icon: any; color: string; delay?: number; 
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }} 
    transition={{ delay }} 
    className="relative overflow-hidden rounded-2xl border p-4 md:p-5 bg-surfaceElevated/50 backdrop-blur-md border-border"
  >
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-surface/50 border border-white/5", `text-${color}`)}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-[10px] md:text-xs uppercase font-bold tracking-wider text-textMuted mb-1">{title}</p>
      <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter">
        {value}
      </h3>
      {subtitle && <p className="text-[10px] text-textMuted mt-1 font-medium">{subtitle}</p>}
    </div>
  </motion.div>
));

export function OverviewCards({ totais }: { totais: any }) {
  const mediaGols = totais?.total_jogos > 0 ? (totais.total_gols / totais.total_jogos).toFixed(1) : '0.0';

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={20} className="text-cyan-400" />
        <div>
          <h2 className="text-lg md:text-xl font-black text-white tracking-tight uppercase">Visão Panorâmica</h2>
          <p className="text-[10px] text-textMuted uppercase tracking-wider">Estatísticas gerais de todas as competições</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KPICard 
          title="Total de Jogos" 
          value={totais?.total_jogos || 0} 
          subtitle={`Média ${mediaGols} por jogador`}
          icon={Calendar} 
          color="cyan-400" 
          delay={0} 
        />
        <KPICard 
          title="Gols Marcados" 
          value={totais?.total_gols || 0} 
          subtitle={`Média ${mediaGols} por jogo`}
          icon={Goal} 
          color="emerald-400" 
          delay={0.05} 
        />
        <KPICard 
          title="Média de Gols" 
          value={mediaGols} 
          subtitle={`Total de ${totais?.total_gols || 0} gols`}
          icon={Activity} 
          color="purple-400" 
          delay={0.1} 
        />
        <KPICard 
          title="Jogadores" 
          value={totais?.total_jogadores || '-'} 
          subtitle="Ativos nas competições"
          icon={Users} 
          color="amber-400" 
          delay={0.15} 
        />
      </div>
    </div>
  );
}
