import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Trophy, ChevronRight, X } from 'lucide-react';
import { cn, formatDateYear } from '@/lib/utils';

interface Conquista {
  nome: string;
  data: string;
}

export interface CampeaoTime {
  id: number;
  nome: string;
  escudo_url?: string;
  cor?: string;
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

const PodiumCard = ({ team, pos, isMobile }: { team: CampeaoTime; pos: 1 | 2 | 3; isMobile: boolean }) => {
  const theme = themeColors[pos];
  const isFirst = pos === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * pos }}
      whileHover={{ y: -4 }}
      className={cn(
        "relative flex flex-col items-center rounded-2xl border p-3.5 transition-all duration-300",
        theme.border,
        theme.bg,
        theme.glow,
        isFirst && !isMobile ? "z-10 scale-105 shadow-[0_10px_40px_rgba(255,201,64,0.2)]" : "z-0",
        isMobile ? "w-full mb-3" : "flex-1"
      )}
      style={{ backgroundImage: theme.radial }}
    >
      {/* Badge Posição */}
      <div className={cn(
        "absolute -top-3 flex items-center justify-center font-black shadow-lg",
        theme.badgeBg,
        theme.badgeText,
        isFirst ? "w-8 h-8 text-base rounded-lg rotate-3" : "w-7 h-7 text-xs rounded-md"
      )}>
        {pos}
      </div>

      {/* Escudo */}
      <div className={cn(
        "relative rounded-full overflow-hidden bg-black/40 border-2 backdrop-blur-sm p-1.5 flex items-center justify-center mt-3 mb-2",
        theme.border,
        isFirst ? "w-20 h-20" : "w-14 h-14"
      )}>
        {team.escudo_url ? (
          <img src={team.escudo_url} alt={team.nome} className="w-full h-full object-contain drop-shadow-lg" />
        ) : (
          <span className="text-lg font-bold text-white/50">{team.nome.substring(0, 2).toUpperCase()}</span>
        )}
      </div>

      {/* Nome e Títulos */}
      <div className="text-center w-full mb-3">
        <h4 className={cn("font-black text-white truncate px-1", isFirst ? "text-base" : "text-sm")}>
          {team.nome}
        </h4>
        <div className="flex items-center justify-center gap-1 mt-0.5">
          <span className={cn("font-black", isFirst ? "text-lg" : "text-base", theme.titleText)}>
            {team.titulos}
          </span>
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", theme.titleText, "opacity-80")}>
            {team.titulos === 1 ? 'TÍTULO' : 'TÍTULOS'}
          </span>
        </div>
      </div>

      {/* Lista de Conquistas */}
      <div className="flex flex-col gap-1.5 w-full mt-auto">
        {team.conquistas?.slice(0, 3).map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 bg-black/30 rounded-lg px-2 py-1 border border-white/5">
            <Trophy size={13} className={cn("shrink-0", theme.trophyIcon)} />
            <span className="text-[10px] font-bold text-white truncate flex-1 leading-tight">
              {c.nome}
            </span>
            {c.data && (
              <span className="text-[9px] text-white/50 shrink-0">
                {formatDateYear(c.data)}
              </span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export const LeaguesRanking = memo(({ campeoes }: { campeoes: CampeaoTime[] }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filtra apenas ligas (pontos corridos)
  const ligasCampeoes = (campeoes || [])
    .filter(c => {
      const f = (c.formato || '').toLowerCase().replace('-', '_');
      return f === 'pontos_corridos' || f === 'liga' || c.formato === null;
    })
    .sort((a, b) => b.titulos - a.titulos);

  const displayData = ligasCampeoes.slice(0, 3);
  const hasData = displayData.length > 0;

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#0d1623] p-4 md:p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
      {/* Background sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Shield size={22} className="fill-amber-400/20" />
          </div>
          <div>
            <h3 className="font-black text-white text-base md:text-lg uppercase tracking-wider flex items-center gap-2">
              LIGAS
            </h3>
            <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider">
              RANKING DE TIMES CAMPEÕES
            </p>
          </div>
        </div>

        {ligasCampeoes.length > 0 && (
          <button
            onClick={() => setModalOpen(true)}
            className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 rounded-lg px-2.5 py-1.5 hover:bg-cyan-500/10 transition-all flex items-center gap-1 shrink-0"
          >
            Ver ranking completo <ChevronRight size={13} />
          </button>
        )}
      </div>

      {/* Podium Area */}
      <div className="relative z-10 w-full flex-1 flex items-end">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-12 text-center w-full">
            <Trophy size={40} className="text-white/10 mb-3" />
            <h4 className="text-base font-bold text-white/50 mb-1">Ainda não há campeões de liga</h4>
            <p className="text-xs text-textMuted max-w-xs">
              Quando a primeira liga for finalizada, o ranking dos times será exibido aqui.
            </p>
          </div>
        ) : (
          <div className={cn(
            "w-full flex",
            isMobile ? "flex-col gap-3" : "flex-row items-end justify-center gap-4 pt-6"
          )}>
            <AnimatePresence mode="popLayout">
              {isMobile ? (
                <>
                  {displayData[0] && <PodiumCard key={displayData[0].id} team={displayData[0]} pos={1} isMobile={isMobile} />}
                  {displayData[1] && <PodiumCard key={displayData[1].id} team={displayData[1]} pos={2} isMobile={isMobile} />}
                  {displayData[2] && <PodiumCard key={displayData[2].id} team={displayData[2]} pos={3} isMobile={isMobile} />}
                </>
              ) : (
                <>
                  {displayData[1] && <div className="flex-1 max-w-[240px]"><PodiumCard key={displayData[1].id} team={displayData[1]} pos={2} isMobile={isMobile} /></div>}
                  {displayData[0] && <div className="flex-1 max-w-[270px]"><PodiumCard key={displayData[0].id} team={displayData[0]} pos={1} isMobile={isMobile} /></div>}
                  {displayData[2] && <div className="flex-1 max-w-[240px]"><PodiumCard key={displayData[2].id} team={displayData[2]} pos={3} isMobile={isMobile} /></div>}
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal Ranking Completo de Ligas */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0d1623] border border-white/10 rounded-2xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Shield size={20} className="text-amber-400" />
                  <h3 className="font-bold text-white text-base">Ranking Completo de Ligas</h3>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {ligasCampeoes.map((time, idx) => (
                  <div
                    key={time.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surfaceElevated/40 border border-white/5 hover:border-amber-400/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center text-xs font-black",
                        idx === 0 ? "bg-amber-400 text-black" :
                        idx === 1 ? "bg-slate-300 text-black" :
                        idx === 2 ? "bg-amber-700 text-white" : "bg-white/5 text-white/50"
                      )}>
                        {idx + 1}
                      </span>
                      {time.escudo_url ? (
                        <img src={time.escudo_url} alt={time.nome} className="w-8 h-8 object-contain rounded-full bg-black/40 p-1" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-xs font-bold text-white/60">
                          {time.nome.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-white text-sm">{time.nome}</h4>
                        <p className="text-[10px] text-textMuted">
                          {time.conquistas?.map(c => c.nome).join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black text-sm">
                      <Trophy size={14} />
                      <span>{time.titulos}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});
