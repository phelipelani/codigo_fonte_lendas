import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Conquista {
  nome: string;
  data: string;
}

interface Campeao {
  id: number;
  nome: string;
  escudo_url: string;
  formato: string;
  titulos: number;
  conquistas: Conquista[];
}

const themeColors = {
  1: {
    border: 'border-[#D4A72C]/50',
    bg: 'bg-gradient-to-b from-[#8A6415]/20 to-surfaceElevated',
    glow: 'shadow-[0_0_30px_rgba(255,201,64,0.15)]',
    badgeBg: 'bg-gradient-to-b from-[#FFF1A8] to-[#D4A72C]',
    badgeText: 'text-[#8A6415]',
    titleText: 'text-[#FFD86A]',
    radial: 'radial-gradient(circle at top center, rgba(255,201,64,0.15) 0%, transparent 60%)',
    trophyIcon: 'text-[#D4A72C]'
  },
  2: {
    border: 'border-[#AEB7C2]/50',
    bg: 'bg-gradient-to-b from-[#68737F]/20 to-surfaceElevated',
    glow: 'shadow-[0_0_20px_rgba(190,200,210,0.1)]',
    badgeBg: 'bg-gradient-to-b from-[#E2E7EC] to-[#AEB7C2]',
    badgeText: 'text-[#68737F]',
    titleText: 'text-[#E2E7EC]',
    radial: 'radial-gradient(circle at top center, rgba(190,200,210,0.1) 0%, transparent 60%)',
    trophyIcon: 'text-[#AEB7C2]'
  },
  3: {
    border: 'border-[#D39A62]/40',
    bg: 'bg-gradient-to-b from-[#704326]/20 to-surfaceElevated',
    glow: 'shadow-[0_0_20px_rgba(180,112,61,0.1)]',
    badgeBg: 'bg-gradient-to-b from-[#D39A62] to-[#A96F3D]',
    badgeText: 'text-[#502810]',
    titleText: 'text-[#D39A62]',
    radial: 'radial-gradient(circle at top center, rgba(180,112,61,0.1) 0%, transparent 60%)',
    trophyIcon: 'text-[#A96F3D]'
  }
};

const PodiumCard = ({ team, pos, isMobile }: { team: Campeao, pos: 1 | 2 | 3, isMobile: boolean }) => {
  const theme = themeColors[pos];
  const isFirst = pos === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * pos }}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative flex flex-col items-center rounded-2xl border p-4 transition-all duration-300",
        theme.border,
        theme.bg,
        theme.glow,
        isFirst && !isMobile ? "z-10 scale-105 shadow-[0_10px_40px_rgba(255,201,64,0.2)]" : "z-0",
        isMobile ? "w-full mb-4" : "flex-1"
      )}
      style={{ backgroundImage: theme.radial }}
    >
      {/* Badge Posicao */}
      <div className={cn(
        "absolute -top-3 flex items-center justify-center font-black shadow-lg",
        theme.badgeBg,
        theme.badgeText,
        isFirst ? "w-10 h-10 text-xl rounded-lg rotate-3" : "w-8 h-8 text-sm rounded-md"
      )}>
        {pos}
      </div>

      {/* Escudo */}
      <div className={cn(
        "relative rounded-full overflow-hidden bg-black/40 border-2 backdrop-blur-sm p-2 flex items-center justify-center mt-4 mb-3",
        theme.border,
        isFirst ? "w-24 h-24" : "w-16 h-16"
      )}>
        {team.escudo_url ? (
          <img src={team.escudo_url} alt={team.nome} className="w-full h-full object-contain drop-shadow-lg" />
        ) : (
          <span className="text-xl font-bold text-white/50">{team.nome.substring(0,2).toUpperCase()}</span>
        )}
      </div>

      {/* Nome e Titulos */}
      <div className="text-center w-full mb-4">
        <h4 className={cn("font-black text-white truncate px-2", isFirst ? "text-lg" : "text-base")}>
          {team.nome}
        </h4>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <span className={cn("font-black", isFirst ? "text-xl" : "text-lg", theme.titleText)}>
            {team.titulos}
          </span>
          <span className={cn("text-xs font-bold uppercase tracking-wider", theme.titleText, "opacity-80")}>
            {team.titulos === 1 ? 'TÍtulo' : 'TÍtulos'}
          </span>
        </div>
      </div>

      {/* Trofeus */}
      <div className={cn(
        "flex flex-wrap justify-center gap-2 w-full mt-auto",
        (team.conquistas?.length || 0) > 3 ? "overflow-x-auto pb-2 scrollbar-thin" : ""
      )}>
        {team.conquistas?.map((c, i) => (
          <div key={i} className="flex flex-col items-center bg-black/30 rounded-lg p-2 min-w-[70px] border border-white/5">
            <Trophy size={isFirst ? 24 : 18} className={cn("mb-1", theme.trophyIcon)} />
            <span className="text-[9px] font-bold text-white text-center leading-tight line-clamp-2 max-w-[80px]">
              {c.nome}
            </span>
            {c.data && (
              <span className="text-[8px] text-white/50 mt-0.5">
                {new Date(c.data).getFullYear()}
              </span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export const ChampionsRanking = memo(({ campeoes }: { campeoes: Campeao[] }) => {
  const [aba, setAba] = useState<'corridos'|'copas'>('corridos');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatoFilter = aba === 'corridos' ? 'pontos_corridos' : 'mata_mata';
  
  const displayData = (campeoes || [])
    .filter(c => (c.formato || '').toLowerCase().replace('-', '_') === formatoFilter || (c.formato === null && aba === 'corridos'))
    .sort((a, b) => b.titulos - a.titulos)
    .slice(0, 3);

  const hasData = displayData.length > 0;

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#0d1623] p-4 md:p-6 shadow-xl relative overflow-hidden">
      
      {/* Background sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 relative z-10">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Trophy size={24} className="text-amber-400" />
          </div>
          <div>
            <h3 className="font-black text-white text-lg md:text-xl uppercase tracking-wider flex items-center gap-2">
              Ranking de Times <span className="text-amber-400/80">—</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">Campeões</span>
            </h3>
            <p className="text-xs text-textMuted uppercase mt-0.5 font-bold tracking-wide">
              Títulos conquistados nas competições
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-full md:w-auto">
          <button
            onClick={() => setAba('corridos')}
            className={cn(
              "flex-1 md:flex-none px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all duration-300",
              aba === 'corridos' 
                ? "bg-gradient-to-r from-[#18D7E8]/20 to-[#18D7E8]/10 text-[#18D7E8] shadow-[0_0_15px_rgba(24,215,232,0.15)] border border-[#18D7E8]/30" 
                : "text-textMuted hover:text-white"
            )}
          >
            Pontos Corridos
          </button>
          <button
            onClick={() => setAba('copas')}
            className={cn(
              "flex-1 md:flex-none px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all duration-300",
              aba === 'copas' 
                ? "bg-gradient-to-r from-[#D4A72C]/20 to-[#D4A72C]/10 text-[#D4A72C] shadow-[0_0_15px_rgba(212,167,44,0.15)] border border-[#D4A72C]/30" 
                : "text-textMuted hover:text-white"
            )}
          >
            Copas
          </button>
        </div>
      </div>

      {/* Podium Area */}
      <div className="relative z-10 w-full">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy size={48} className="text-white/10 mb-4" />
            <h4 className="text-lg font-bold text-white/50 mb-2">Ainda não há campeões</h4>
            <p className="text-sm text-textMuted max-w-sm">
              Quando o primeiro campeonato deste formato for finalizado, o Hall dos Campeões será iniciado.
            </p>
          </div>
        ) : (
          <div className={cn(
            "flex",
            isMobile ? "flex-col gap-4" : "flex-row items-end justify-center gap-6 pt-10"
          )}>
            <AnimatePresence mode="popLayout">
              {/* No Desktop, a ordem visual eh 2-1-3. No Mobile, eh 1-2-3. */}
              {isMobile ? (
                <>
                  {displayData[0] && <PodiumCard key={displayData[0].id} team={displayData[0]} pos={1} isMobile={isMobile} />}
                  {displayData[1] && <PodiumCard key={displayData[1].id} team={displayData[1]} pos={2} isMobile={isMobile} />}
                  {displayData[2] && <PodiumCard key={displayData[2].id} team={displayData[2]} pos={3} isMobile={isMobile} />}
                </>
              ) : (
                <>
                  {displayData[1] && <div className="flex-1 max-w-[280px]"><PodiumCard key={displayData[1].id} team={displayData[1]} pos={2} isMobile={isMobile} /></div>}
                  {displayData[0] && <div className="flex-1 max-w-[320px]"><PodiumCard key={displayData[0].id} team={displayData[0]} pos={1} isMobile={isMobile} /></div>}
                  {displayData[2] && <div className="flex-1 max-w-[280px]"><PodiumCard key={displayData[2].id} team={displayData[2]} pos={3} isMobile={isMobile} /></div>}
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

    </div>
  );
});
