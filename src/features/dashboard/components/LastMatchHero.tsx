// Arquivo: src/features/dashboard/components/LastMatchHero.tsx
import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Calendar, ArrowRight, Play, Swords } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import MatchDetailModal from "@/components/shared/MatchDetailModal";
import api from "@/api";
import { cn, formatDate } from "@/lib/utils";
import { fadeUp } from "./dashboardConstants";

const LastMatchHero = React.memo(function LastMatchHero() {
  const [showModal, setShowModal] = useState(false);
  const handleOpenModal = useCallback(() => setShowModal(true), []);
  const handleCloseModal = useCallback(() => setShowModal(false), []);

  const { data: ultimasPartidas, isLoading } = useQuery({
    queryKey: ["partidas", "dashboard-last"],
    queryFn: async () => {
      const res = await api.get("/partidas/globais", { params: { limit: 1 } });
      return res.data;
    },
  });

  if (isLoading)
    return <Skeleton className="h-48 sm:h-52 w-full rounded-2xl" />;

  const lastMatch = ultimasPartidas?.[0];

  if (!lastMatch)
    return (
      <motion.div
        {...fadeUp(0.1)}
        className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10">
          <Trophy className="text-amber-400" size={26} />
        </div>
        <div>
          <h3 className="text-sm font-black text-white mb-1">
            Nenhuma partida ainda
          </h3>
          <p className="text-[11px] text-white/30">
            Crie um campeonato para começar
          </p>
        </div>
        <Link to="/campeonatos">
          <Button
            size="sm"
            className="bg-cyan-500 hover:bg-cyan-400 text-white gap-2 text-xs"
          >
            <Play size={12} /> Criar campeonato
          </Button>
        </Link>
      </motion.div>
    );

  const winA = lastMatch.placarA > lastMatch.placarB;
  const winB = lastMatch.placarB > lastMatch.placarA;
  const isDraw = lastMatch.placarA === lastMatch.placarB;

  return (
    <>
    <motion.div
      {...fadeUp(0.1)}
      whileTap={{ scale: 0.98 }}
      onClick={handleOpenModal}
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] cursor-pointer group"
    >
      {/* glow central */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-24 rounded-full blur-3xl opacity-20 pointer-events-none",
          isDraw ? "bg-amber-400" : "bg-emerald-400",
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-black/25 pointer-events-none" />

      {/* logos dos times no background */}
      {lastMatch.timeA_logo && (
        <img
          src={lastMatch.timeA_logo}
          className="absolute -left-4 top-1/2 -translate-y-1/2 w-36 h-36 object-cover opacity-[0.06] blur-sm pointer-events-none select-none"
          aria-hidden
        />
      )}
      {lastMatch.timeB_logo && (
        <img
          src={lastMatch.timeB_logo}
          className="absolute -right-4 top-1/2 -translate-y-1/2 w-36 h-36 object-cover opacity-[0.06] blur-sm pointer-events-none select-none"
          aria-hidden
        />
      )}

      <div className="relative z-10 p-5 sm:p-6">
        {/* badge header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">
              Último Resultado
            </span>
          </div>
          <span className="text-[9px] text-white/20 font-bold truncate max-w-[130px]">
            {lastMatch.nome_competicao}
          </span>
        </div>

        {/* scoreboard */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Time A */}
          <div
            className={cn(
              "flex flex-col items-center gap-2 flex-1 min-w-0 transition-all duration-300",
              winA && "scale-[1.04]",
            )}
          >
            <div
              className={cn(
                "relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 shadow-xl transition-all group-hover:scale-105",
                winA
                  ? "border-emerald-400/60 shadow-emerald-500/25"
                  : "border-white/10",
              )}
            >
              {lastMatch.timeA_logo ? (
                <img
                  src={lastMatch.timeA_logo}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                  <span className="text-base font-black text-white/40">
                    {lastMatch.timeA_nome?.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              {winA && (
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent" />
              )}
            </div>
            <span
              className={cn(
                "text-xs font-black text-center truncate w-full px-1",
                winA ? "text-white" : "text-white/45",
              )}
            >
              {lastMatch.timeA_nome}
            </span>
            <span
              className={cn(
                "text-4xl sm:text-5xl font-black tabular-nums leading-none",
                winA
                  ? "text-emerald-400"
                  : isDraw
                    ? "text-amber-400/80"
                    : "text-white/35",
              )}
            >
              {lastMatch.placarA}
            </span>
            {winA && (
              <span className="text-[9px] font-black tracking-[0.2em] uppercase text-emerald-400">
                Vencedor
              </span>
            )}
          </div>

          {/* divisor central */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <Swords size={14} className="text-white/25" />
            </div>
            <span
              className={cn(
                "text-[9px] font-black uppercase tracking-[0.18em]",
                isDraw ? "text-amber-400/60" : "text-white/15",
              )}
            >
              {isDraw ? "Empate" : "Final"}
            </span>
          </div>

          {/* Time B */}
          <div
            className={cn(
              "flex flex-col items-center gap-2 flex-1 min-w-0 transition-all duration-300",
              winB && "scale-[1.04]",
            )}
          >
            <div
              className={cn(
                "relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 shadow-xl transition-all group-hover:scale-105",
                winB
                  ? "border-emerald-400/60 shadow-emerald-500/25"
                  : "border-white/10",
              )}
            >
              {lastMatch.timeB_logo ? (
                <img
                  src={lastMatch.timeB_logo}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                  <span className="text-base font-black text-white/40">
                    {lastMatch.timeB_nome?.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              {winB && (
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent" />
              )}
            </div>
            <span
              className={cn(
                "text-xs font-black text-center truncate w-full px-1",
                winB ? "text-white" : "text-white/45",
              )}
            >
              {lastMatch.timeB_nome}
            </span>
            <span
              className={cn(
                "text-4xl sm:text-5xl font-black tabular-nums leading-none",
                winB
                  ? "text-emerald-400"
                  : isDraw
                    ? "text-amber-400/80"
                    : "text-white/35",
              )}
            >
              {lastMatch.placarB}
            </span>
            {winB && (
              <span className="text-[9px] font-black tracking-[0.2em] uppercase text-emerald-400">
                Vencedor
              </span>
            )}
          </div>
        </div>

        {/* rodapé */}
        <div className="flex items-center justify-center gap-2 mt-5 pt-4 border-t border-white/[0.05]">
          <Calendar size={10} className="text-white/20" />
          <span className="text-[10px] text-white/25">
            {formatDate(lastMatch.data)}
          </span>
          <span className="text-white/10 mx-1">·</span>
          <span className="text-[10px] text-white/25 group-hover:text-cyan-400 transition-colors">
            Toque para ver detalhes →
          </span>
        </div>
      </div>
    </motion.div>

    {/* Modal de detalhes da partida */}
    {showModal && (
      <MatchDetailModal partida={lastMatch} onClose={handleCloseModal} />
    )}
    </>
  );
});

export default LastMatchHero;
