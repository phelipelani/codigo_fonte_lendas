// Arquivo: src/features/Analytics/components/AnalyticsSinergiaView.tsx
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '@/api';
import { 
  Goal, Trophy, Users, Shield, Target, Loader2, Heart, Swords, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Avatar do jogador
const PlayerAvatar = ({ foto, nome, size = 'md' }: { foto?: string; nome: string; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-[9px]',
    md: 'w-10 h-10 text-[10px]',
    lg: 'w-12 h-12 text-xs'
  };
  
  return (
    <div className={cn(
      "rounded-full bg-surfaceElevated border border-border overflow-hidden flex-shrink-0",
      sizeClasses[size]
    )}>
      {foto ? (
        <img src={foto} className="w-full h-full object-cover" alt={nome} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-textMuted font-bold">
          {nome?.substring(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
};

// Card de dupla (responsivo: vertical no mobile, horizontal no desktop)
const DuplaCard = ({
  jogador1,
  jogador2,
  metric,
  metricLabel,
  color,
  rank,
  connectionIcon: ConnectionIcon = Heart
}: any) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: rank * 0.05 }}
    className={cn(
      "rounded-xl border transition-all p-3",
      "bg-surface/50 border-border hover:border-cyan-500/30 hover:bg-surface/80"
    )}
  >
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Rank */}
      <div className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0",
        rank === 0 ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30" :
        rank === 1 ? "bg-gray-400/20 text-gray-300" :
        rank === 2 ? "bg-orange-600/20 text-orange-400" :
        "bg-surfaceElevated text-textMuted"
      )}>
        {rank + 1}
      </div>

      {/* Jogador 1 */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <PlayerAvatar foto={jogador1.foto} nome={jogador1.nome} size="sm" />
        <span className="text-xs sm:text-sm font-medium text-white truncate">{jogador1.nome}</span>
      </div>

      {/* Ícone de conexão */}
      <div className={cn("w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0", `bg-${color}/10`)}>
        <ConnectionIcon size={12} className={`text-${color}`} />
      </div>

      {/* Jogador 2 */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
        <span className="text-xs sm:text-sm font-medium text-white truncate text-right">{jogador2.nome}</span>
        <PlayerAvatar foto={jogador2.foto} nome={jogador2.nome} size="sm" />
      </div>

      {/* Métrica */}
      <div className={cn(
        "px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-center min-w-[50px] sm:min-w-[70px] flex-shrink-0",
        `bg-${color}/10 border border-${color}/20`
      )}>
        <span className={cn("text-base sm:text-lg font-black block", `text-${color}`)}>{metric}</span>
        <span className="text-[8px] sm:text-[9px] uppercase text-textMuted tracking-wider">{metricLabel}</span>
      </div>
    </div>
  </motion.div>
);

// Seção de ranking
const RankingSection = ({ 
  title, 
  subtitle,
  icon: Icon, 
  color, 
  data, 
  metricKey, 
  metricLabel,
  connectionIcon,
  delay = 0,
  jogador1Key = 'jogador1',
  jogador2Key = 'jogador2'
}: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="rounded-xl border border-border bg-surface/30 backdrop-blur-md overflow-hidden"
  >
    {/* Header */}
    <div className={cn(
      "p-4 border-b border-border flex items-center gap-3",
      `bg-gradient-to-r from-${color}/10 via-${color}/5 to-transparent`
    )}>
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center",
        `bg-${color}/20 text-${color}`
      )}>
        <Icon size={20} />
      </div>
      <div>
        <h3 className="font-bold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-textMuted">{subtitle}</p>}
      </div>
    </div>

    {/* Lista */}
    <div className="p-3 space-y-2">
      {data?.slice(0, 5).map((item: any, i: number) => {
        const j1 = {
          nome: item[`${jogador1Key}_nome`],
          foto: item[`${jogador1Key}_foto`]
        };
        const j2 = {
          nome: item[`${jogador2Key}_nome`],
          foto: item[`${jogador2Key}_foto`]
        };
        
        return (
          <DuplaCard
            key={i}
            jogador1={j1}
            jogador2={j2}
            metric={item[metricKey]}
            metricLabel={metricLabel}
            color={color}
            rank={i}
            connectionIcon={connectionIcon}
          />
        );
      })}
      
      {(!data || data.length === 0) && (
        <div className="text-center py-8 text-textMuted">
          <Users className="mx-auto mb-2 opacity-30" size={32} />
          <p className="text-sm">Nenhuma dupla encontrada</p>
        </div>
      )}
    </div>
  </motion.div>
);

export function AnalyticsSinergiaView() {
  const { data: sinergia, isLoading } = useQuery({
    queryKey: ['analytics', 'sinergia-geral'],
    queryFn: async () => {
      const res = await api.get('/analytics/sinergia');
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20 mb-3">
          <Heart size={16} className="text-pink-400" />
          <span className="text-sm font-bold text-pink-400">Química entre Jogadores</span>
        </div>
        <h2 className="text-2xl font-black">
          <span className="bg-gradient-to-r from-pink-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
            Análise de Sinergia
          </span>
        </h2>
        <p className="text-textMuted text-sm mt-1">Descubra as melhores parcerias do seu time</p>
      </motion.div>

      {/* Grid de Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Top Duplas Gols (Artilheiro + Garçom) */}
        <RankingSection
          title="Conexão Letal"
          subtitle="Duplas com mais gols assistidos"
          icon={Target}
          color="emerald-400"
          data={sinergia?.topDuplasGols}
          metricKey="gols_juntos"
          metricLabel="gols"
          connectionIcon={Target}
          jogador1Key="artilheiro"
          jogador2Key="garcom"
          delay={0}
        />

        {/* Mais Letais (mais gols combinados) */}
        <RankingSection
          title="Duplas Artilheiras"
          subtitle="Mais gols combinados"
          icon={Zap}
          color="amber-400"
          data={sinergia?.maisLetais}
          metricKey="gols_combinados"
          metricLabel="gols"
          connectionIcon={Zap}
          delay={0.1}
        />

        {/* Mais Jogaram Juntos */}
        <RankingSection
          title="Parceiros Inseparáveis"
          subtitle="Mais jogaram juntos no mesmo time"
          icon={Users}
          color="cyan-400"
          data={sinergia?.maisJogaramJuntos}
          metricKey="jogos_juntos"
          metricLabel="jogos"
          connectionIcon={Users}
          delay={0.2}
        />

        {/* Mais Venceram Juntos */}
        <RankingSection
          title="Duplas Vencedoras"
          subtitle="Mais vitórias juntos"
          icon={Trophy}
          color="purple-400"
          data={sinergia?.maisVenceramJuntos}
          metricKey="vitorias_juntos"
          metricLabel="vitórias"
          connectionIcon={Trophy}
          delay={0.3}
        />

        {/* Muralhas (Zagueiros com Clean Sheets) */}
        <RankingSection
          title="Muralhas"
          subtitle="Duplas de zagueiros com mais clean sheets"
          icon={Shield}
          color="teal-400"
          data={sinergia?.muralhas}
          metricKey="clean_sheets_juntos"
          metricLabel="CS"
          connectionIcon={Shield}
          delay={0.4}
        />

      </div>

      {/* Info adicional */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 0.5 }}
        className="text-center py-4"
      >
        <p className="text-xs text-textMuted">
          💡 Dica: Use essas informações para montar times com boa química!
        </p>
      </motion.div>

    </div>
  );
}