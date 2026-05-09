// Arquivo: src/features/rodadas/components/RodadaFinalizadaView.tsx
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Trophy, Users, Loader2 } from 'lucide-react';
import api from '@/api';
import { cn } from '@/lib/utils';

export function RodadaFinalizadaView({ rodadaId }: { rodadaId: number }) {
  const { data: partidas, isLoading } = useQuery({
    queryKey: ['rodada', rodadaId, 'partidas'],
    queryFn: async () => (await api.get(`/campeonatos/rodada/${rodadaId}/partidas`)).data
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-cyan-100/50 text-sm">Carregando partidas...</p>
        </div>
      </div>
    );
  }

  if (!partidas || partidas.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="text-center p-6 rounded-xl border border-cyan-500/20 bg-[#0a1628]/40">
          <Users className="mx-auto mb-3 h-10 w-10 text-cyan-400/30" />
          <p className="text-cyan-100/50">Nenhuma partida registrada nesta rodada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <Trophy className="h-5 w-5 text-emerald-400" />
          <span className="text-emerald-300 font-bold">{partidas.length} partidas realizadas</span>
        </div>
      </div>

      {/* Grid de Partidas */}
      <div className="grid gap-4 md:grid-cols-2">
        {partidas.map((p: any, index: number) => {
          const isTime1Winner = p.placar_timeA > p.placar_timeB;
          const isTime2Winner = p.placar_timeB > p.placar_timeA;
          const isEmpate = p.placar_timeA === p.placar_timeB;

          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 backdrop-blur-md p-4 hover:border-cyan-500/40 transition-all"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Time A */}
                <div className={cn(
                  "flex items-center gap-3 flex-1 justify-end transition-all",
                  isTime1Winner && "scale-105"
                )}>
                  <div className="text-right min-w-0">
                    <span className={cn(
                      "font-bold block truncate",
                      isTime1Winner ? "text-emerald-400" : "text-white"
                    )}>
                      {p.nome_timeA}
                    </span>
                    {isTime1Winner && (
                      <span className="text-[10px] text-emerald-400/60">VENCEDOR</span>
                    )}
                  </div>
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border-2 flex-shrink-0",
                    isTime1Winner 
                      ? "border-emerald-500/50 bg-emerald-500/10" 
                      : "border-cyan-500/20 bg-[#0d1f35]"
                  )}>
                    {p.timeA_logo_url ? (
                      <img src={p.timeA_logo_url} className="w-full h-full object-cover"/>
                    ) : (
                      <span className="text-xs font-bold text-cyan-300">
                        {(p.nome_timeA || "??").substring(0, 2)}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Placar */}
                <div className={cn(
                  "px-4 py-2 rounded-xl font-mono font-black text-2xl min-w-[90px] text-center border",
                  isEmpate 
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    : "bg-black/30 border-cyan-500/20 text-white"
                )}>
                  {p.placar_timeA} <span className="text-cyan-500 text-lg">×</span> {p.placar_timeB}
                </div>

                {/* Time B */}
                <div className={cn(
                  "flex items-center gap-3 flex-1 justify-start transition-all",
                  isTime2Winner && "scale-105"
                )}>
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border-2 flex-shrink-0",
                    isTime2Winner 
                      ? "border-emerald-500/50 bg-emerald-500/10" 
                      : "border-cyan-500/20 bg-[#0d1f35]"
                  )}>
                    {p.timeB_logo_url ? (
                      <img src={p.timeB_logo_url} className="w-full h-full object-cover"/>
                    ) : (
                      <span className="text-xs font-bold text-cyan-300">
                        {(p.nome_timeB || "??").substring(0, 2)}
                      </span>
                    )}
                  </div>
                  <div className="text-left min-w-0">
                    <span className={cn(
                      "font-bold block truncate",
                      isTime2Winner ? "text-emerald-400" : "text-white"
                    )}>
                      {p.nome_timeB}
                    </span>
                    {isTime2Winner && (
                      <span className="text-[10px] text-emerald-400/60">VENCEDOR</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}