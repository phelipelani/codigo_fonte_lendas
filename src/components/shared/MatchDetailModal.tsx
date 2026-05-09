// Arquivo: src/components/shared/MatchDetailModal.tsx
// Modal com detalhes da partida — gols, assistências, placar
import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { X, Goal, HandHelping, Swords, Calendar, Trophy, Shield } from 'lucide-react';
import api from '@/api';
import { cn, formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

interface MatchDetailModalProps {
  partida: any;
  onClose: () => void;
}

const EventRow = React.memo(function EventRow({ evento, side }: { evento: any; side: 'A' | 'B' }) {
  const tipo = evento.tipo ?? 'gol';
  const isGol = tipo === 'gol';
  const isGolContra = tipo === 'gol_contra';

  return (
    <div className={cn(
      'flex items-center gap-2 py-1.5',
      side === 'A' ? 'flex-row' : 'flex-row-reverse',
    )}>
      <div className={cn(
        'flex items-center justify-center w-6 h-6 rounded-lg flex-shrink-0',
        isGolContra ? 'bg-red-400/15' : 'bg-emerald-400/15',
      )}>
        <Goal size={12} className={isGolContra ? 'text-red-400' : 'text-emerald-400'} />
      </div>
      <div className={cn('min-w-0 flex-1', side === 'B' && 'text-right')}>
        <p className="text-xs font-bold text-white truncate">
          {evento.jogador_nome || evento.nome_jogador}
        </p>
        {isGolContra && (
          <p className="text-[9px] text-red-400/60 uppercase font-bold">Gol Contra</p>
        )}
        {(evento.nome_assistente || evento.assist_nome) && (
          <p className="text-[9px] text-cyan-400/50">
            <HandHelping size={8} className="inline mr-0.5" />
            {evento.nome_assistente || evento.assist_nome}
          </p>
        )}
      </div>
      {evento.minuto != null && evento.minuto > 0 && (
        <span className="text-[9px] text-white/20 font-mono flex-shrink-0">{evento.minuto}'</span>
      )}
    </div>
  );
});

const MatchDetailModal = React.memo(function MatchDetailModal({ partida, onClose }: MatchDetailModalProps) {
  const { data: detalhes, isLoading } = useQuery({
    queryKey: ['partida-detalhe', partida.id],
    queryFn: async () => {
      try {
        const res = await api.get(`/partidas/${partida.id || partida.partida_id}/detalhes`);
        return res.data;
      } catch {
        // Se não tiver endpoint de detalhe, retorna a partida básica
        return partida;
      }
    },
    enabled: !!partida.id,
    staleTime: 60000,
  });

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  // A API retorna { partida, eventos, ... } ou diretamente o objeto partida
  const rawPartida = detalhes?.partida || detalhes || partida;
  const data = {
    ...partida,
    ...rawPartida,
    placarA: rawPartida.placarA ?? rawPartida.placar_timeA ?? partida.placarA ?? 0,
    placarB: rawPartida.placarB ?? rawPartida.placar_timeB ?? partida.placarB ?? 0,
    timeA_nome: rawPartida.timeA_nome ?? partida.timeA_nome,
    timeB_nome: rawPartida.timeB_nome ?? partida.timeB_nome,
    timeA_logo: rawPartida.timeA_logo ?? partida.timeA_logo,
    timeB_logo: rawPartida.timeB_logo ?? partida.timeB_logo,
    timeA_id: rawPartida.timeA_id ?? partida.timeA_id,
    timeB_id: rawPartida.timeB_id ?? partida.timeB_id,
  };
  const winA = Number(data.placarA) > Number(data.placarB);
  const winB = Number(data.placarB) > Number(data.placarA);
  const isDraw = Number(data.placarA) === Number(data.placarB);

  const eventos = detalhes?.eventos || data.eventos || [];
  const timeAId = Number(data.timeA_id);
  const timeBId = Number(data.timeB_id);
  const eventosA = eventos.filter((e: any) => Number(e.time_id) === timeAId);
  const eventosB = eventos.filter((e: any) => Number(e.time_id) === timeBId);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleBackdropClick}
        className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'relative w-full sm:max-w-md bg-[#0a1628] border border-white/10 shadow-2xl overflow-hidden',
            'rounded-t-3xl sm:rounded-2xl', // bottom sheet no mobile, modal no desktop
            'max-h-[90vh] overflow-y-auto',
          )}
        >
          {/* Barra de arraste (mobile) */}
          <div className="flex justify-center pt-3 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={16} />
          </button>

          {/* Header — Placar */}
          <div className="relative p-6 pb-4">
            {/* Glow */}
            <div className={cn(
              'absolute top-0 left-1/2 -translate-x-1/2 w-60 h-20 rounded-full blur-3xl opacity-20 pointer-events-none',
              isDraw ? 'bg-amber-400' : 'bg-emerald-400',
            )} />

            {/* Competição */}
            <div className="flex items-center justify-center gap-2 mb-5">
              <Trophy size={12} className="text-amber-400/60" />
              <span className="text-[10px] font-black uppercase tracking-wider text-white/30">
                {data.nome_competicao || 'Partida'}
              </span>
            </div>

            {/* Scoreboard */}
            <div className="flex items-center justify-between gap-4">
              {/* Time A */}
              <div className={cn('flex flex-col items-center gap-2 flex-1', winA && 'scale-105')}>
                <div className={cn(
                  'w-14 h-14 rounded-2xl overflow-hidden border-2 shadow-lg',
                  winA ? 'border-emerald-400/50 shadow-emerald-500/20' : 'border-white/10',
                )}>
                  {data.timeA_logo ? (
                    <img src={data.timeA_logo} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <Shield size={20} className="text-white/20" />
                    </div>
                  )}
                </div>
                <span className={cn('text-xs font-bold text-center', winA ? 'text-white' : 'text-white/50')}>
                  {data.timeA_nome}
                </span>
              </div>

              {/* Placar central */}
              <div className="flex items-center gap-3">
                <span className={cn(
                  'text-4xl font-black tabular-nums',
                  winA ? 'text-emerald-400' : isDraw ? 'text-amber-400' : 'text-white/40',
                )}>
                  {data.placarA ?? data.placar_timeA ?? 0}
                </span>
                <div className="flex flex-col items-center">
                  <Swords size={16} className="text-white/15" />
                  <span className={cn(
                    'text-[8px] font-black uppercase tracking-wider mt-1',
                    isDraw ? 'text-amber-400/50' : 'text-white/15',
                  )}>
                    {isDraw ? 'Empate' : 'Final'}
                  </span>
                </div>
                <span className={cn(
                  'text-4xl font-black tabular-nums',
                  winB ? 'text-emerald-400' : isDraw ? 'text-amber-400' : 'text-white/40',
                )}>
                  {data.placarB ?? data.placar_timeB ?? 0}
                </span>
              </div>

              {/* Time B */}
              <div className={cn('flex flex-col items-center gap-2 flex-1', winB && 'scale-105')}>
                <div className={cn(
                  'w-14 h-14 rounded-2xl overflow-hidden border-2 shadow-lg',
                  winB ? 'border-emerald-400/50 shadow-emerald-500/20' : 'border-white/10',
                )}>
                  {data.timeB_logo ? (
                    <img src={data.timeB_logo} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <Shield size={20} className="text-white/20" />
                    </div>
                  )}
                </div>
                <span className={cn('text-xs font-bold text-center', winB ? 'text-white' : 'text-white/50')}>
                  {data.timeB_nome}
                </span>
              </div>
            </div>

            {/* Data */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <Calendar size={10} className="text-white/20" />
              <span className="text-[10px] text-white/25">
                {data.data ? formatDate(data.data) : ''}
              </span>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* Eventos / Gols */}
          <div className="p-5">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-3/4 rounded-lg" />
              </div>
            ) : eventos.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-white/30 text-center">
                  Eventos da Partida
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className="space-y-1">
                    {eventosA.map((ev: any, i: number) => (
                      <EventRow key={`a-${i}`} evento={ev} side="A" />
                    ))}
                    {eventosA.length === 0 && (
                      <p className="text-[10px] text-white/15 text-center py-2">—</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    {eventosB.map((ev: any, i: number) => (
                      <EventRow key={`b-${i}`} evento={ev} side="B" />
                    ))}
                    {eventosB.length === 0 && (
                      <p className="text-[10px] text-white/15 text-center py-2">—</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Swords size={24} className="mx-auto text-white/10 mb-2" />
                <p className="text-[11px] text-white/20">
                  Detalhes dos eventos em breve
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 pt-0">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/40 text-xs font-bold uppercase tracking-wider hover:bg-white/[0.08] hover:text-white/60 transition-all active:scale-[0.98]"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default MatchDetailModal;
