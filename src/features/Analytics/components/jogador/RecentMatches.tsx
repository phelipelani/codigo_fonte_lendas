import { motion } from 'framer-motion';
import { Calendar, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface RecentMatchesProps {
  ultimasPartidas: any[];
}

export function RecentMatches({ ultimasPartidas }: RecentMatchesProps) {
  const navigate = useNavigate();

  if (!ultimasPartidas || ultimasPartidas.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-border/50 bg-surface/30 p-5 md:p-6 flex flex-col"
    >
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={18} className="text-cyan-400" />
        <h3 className="font-bold text-white uppercase tracking-wider text-sm">Últimas Partidas</h3>
      </div>

      <div className="space-y-2 flex-1">
        {ultimasPartidas.map((partida: any, i: number) => {
          const isTimeA = partida.time_id === partida.timeA_id;
          const meuTime = isTimeA ? partida.timeA_nome : partida.timeB_nome;
          const adversario = isTimeA ? partida.timeB_nome : partida.timeA_nome;
          const meuPlacar = isTimeA ? partida.placar_timeA : partida.placar_timeB;
          const placarAdv = isTimeA ? partida.placar_timeB : partida.placar_timeA;
          
          const isVitoria = partida.resultado === 'V';
          const isDerrota = partida.resultado === 'D';
          
          return (
            <div 
              key={partida.partida_id || i}
              className="flex items-center gap-3 p-3 rounded-2xl bg-surfaceElevated/30 border border-border/30 hover:border-border/80 transition-colors"
            >
              {/* Resultado Pill */}
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0",
                isVitoria ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : 
                isDerrota ? "bg-red-500/20 text-red-400 border border-red-500/30" : 
                "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              )}>
                {partida.resultado}
              </div>
              
              {/* Infos */}
              <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <p className="text-xs md:text-sm text-white truncate">
                  <span className="font-bold">{meuTime}</span>
                  <span className="text-textMuted mx-2">{meuPlacar} <span className="text-[10px]">x</span> {placarAdv}</span>
                  <span className="text-textMuted/80">{adversario}</span>
                </p>
                
                {/* Stats the player got in this match */}
                <div className="flex gap-3 text-[10px] md:text-xs font-bold">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> {partida.gols} GOLS
                  </span>
                  <span className="flex items-center gap-1 text-cyan-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> {partida.assistencias} ASSIST.
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> {partida.clean_sheet} CS
                  </span>
                </div>
              </div>

              {/* Status Pill Lateral */}
              <div className="hidden md:flex flex-shrink-0">
                 <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-widest",
                    isVitoria ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                    isDerrota ? "bg-red-500/10 text-red-400 border-red-500/20" : 
                    "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  )}>
                    {isVitoria ? 'Vitória' : isDerrota ? 'Derrota' : 'Empate'}
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      <button 
        onClick={() => navigate('/partidas')}
        className="mt-4 w-full py-3 md:py-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400 text-xs md:text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
      >
        Ver Histórico Completo <ExternalLink size={14} />
      </button>
    </motion.div>
  );
}
