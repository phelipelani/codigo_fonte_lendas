import { motion } from 'framer-motion';
import { Heart, Target, Goal, Shield, Crosshair, HandMetal, Users, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PartnershipGridProps {
  parcerias: any;
}

const PartnershipCard = ({ title, icon: Icon, color, parceiro, metric, metricLabel, initials }: any) => {
  if (!parceiro) return null;

  return (
    <div className="flex flex-col p-3 rounded-2xl border border-border/50 bg-surface/30 hover:bg-surface/50 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center border", `bg-${color}/10 border-${color}/20 text-${color}`)}>
          <Icon size={12} />
        </div>
        <span className="text-[9px] uppercase font-bold text-textMuted tracking-wider truncate">{title}</span>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-surfaceElevated border border-border overflow-hidden flex-shrink-0 relative">
          {parceiro.foto_url ? (
            <img src={parceiro.foto_url} alt={parceiro.nome} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-textMuted text-xs font-bold bg-surfaceElevated">
              {initials}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate leading-tight">{parceiro.nome}</p>
          <p className={cn("text-[10px] font-semibold mt-0.5", `text-${color}`)}>
            {metric} <span className="text-textMuted font-normal">{metricLabel}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export function PartnershipGrid({ parcerias }: PartnershipGridProps) {
  if (!parcerias) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-border/50 bg-surface/30 p-5 md:p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Heart size={18} className="text-pink-400" />
        <h3 className="font-bold text-white uppercase tracking-wider text-sm">Parcerias</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <PartnershipCard 
          title="Garçom Favorito" 
          icon={Target} 
          color="cyan-400" 
          parceiro={parcerias.garcomFavorito} 
          metric={parcerias.garcomFavorito?.total} 
          metricLabel="assistências"
          initials={parcerias.garcomFavorito?.nome?.substring(0, 2).toUpperCase()}
        />
        <PartnershipCard 
          title="Artilheiro Favorito" 
          icon={Goal} 
          color="emerald-400" 
          parceiro={parcerias.artilheiroFavorito} 
          metric={parcerias.artilheiroFavorito?.total} 
          metricLabel="gols"
          initials={parcerias.artilheiroFavorito?.nome?.substring(0, 2).toUpperCase()}
        />
        <PartnershipCard 
          title="Zagueiro Sólido" 
          icon={Shield} 
          color="amber-400" 
          parceiro={parcerias.zagueiroSolido} 
          metric={parcerias.zagueiroSolido?.clean_sheets} 
          metricLabel="CS"
          initials={parcerias.zagueiroSolido?.nome?.substring(0, 2).toUpperCase()}
        />
        <PartnershipCard 
          title="Zagueiro Artilheiro" 
          icon={Crosshair} 
          color="purple-400" 
          parceiro={parcerias.zagueiroArtilheiro} 
          metric={parcerias.zagueiroArtilheiro?.gols} 
          metricLabel="gols"
          initials={parcerias.zagueiroArtilheiro?.nome?.substring(0, 2).toUpperCase()}
        />
        <PartnershipCard 
          title="Goleiro de Confiança" 
          icon={HandMetal} 
          color="teal-400" 
          parceiro={parcerias.goleiroConfianca} 
          metric={parcerias.goleiroConfianca?.clean_sheets} 
          metricLabel="CS"
          initials={parcerias.goleiroConfianca?.nome?.substring(0, 2).toUpperCase()}
        />
        <PartnershipCard 
          title="Mais Jogou Junto" 
          icon={Users} 
          color="blue-400" 
          parceiro={parcerias.parceiroFrequente} 
          metric={parcerias.parceiroFrequente?.jogos_juntos} 
          metricLabel="jogos"
          initials={parcerias.parceiroFrequente?.nome?.substring(0, 2).toUpperCase()}
        />
        <PartnershipCard 
          title="Parceiro de Vitórias" 
          icon={Trophy} 
          color="emerald-400" 
          parceiro={parcerias.parceiroVitorias} 
          metric={parcerias.parceiroVitorias?.vitorias_juntos} 
          metricLabel="vitórias"
          initials={parcerias.parceiroVitorias?.nome?.substring(0, 2).toUpperCase()}
        />
      </div>
    </motion.div>
  );
}
