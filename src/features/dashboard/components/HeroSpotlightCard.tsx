// Arquivo: src/features/dashboard/components/HeroSpotlightCard.tsx
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeUp, ACCENT, type AccentKey } from "./dashboardConstants";

// SVGs de fallback engraçados (pé de rato sem foto)
const PeDeRatoFallback = React.memo(function PeDeRatoFallback() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-orange-950/60 to-red-950/60 gap-1 p-2">
      <span className="text-3xl leading-none">🐀</span>
      <span className="text-[7px] font-black uppercase tracking-wider text-orange-400/70 text-center leading-tight">
        Sem foto
        <br />
        (não merece)
      </span>
    </div>
  );
});

const MVPFallback = React.memo(function MVPFallback() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-amber-950/60 to-yellow-950/60 gap-1 p-2">
      <span className="text-3xl leading-none">⭐</span>
      <span className="text-[7px] font-black uppercase tracking-wider text-amber-400/70 text-center leading-tight">
        Foto
        <br />
        secreta
      </span>
    </div>
  );
});

interface HeroSpotlightCardProps {
  title: string;
  badge: string;
  player: any;
  icon: any;
  color: AccentKey;
  delay?: number;
  isPeDeRato?: boolean;
}

const HeroSpotlightCard = React.memo(function HeroSpotlightCard({
  title,
  badge,
  player,
  icon: Icon,
  color,
  delay = 0,
  isPeDeRato = false,
}: HeroSpotlightCardProps) {
  const a = ACCENT[color] ?? ACCENT.cyan;
  if (!player) return null;

  return (
    <motion.div
      {...fadeUp(delay)}
      className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] group"
    >
      {/* glow de fundo */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none",
          isPeDeRato
            ? "bg-gradient-to-br from-red-900/20 to-transparent"
            : "bg-gradient-to-br from-amber-900/20 to-transparent",
        )}
      />

      <div className="flex items-stretch gap-0">
        {/* FOTO — lado esquerdo, quadrada grande */}
        <div
          className={cn(
            "relative flex-shrink-0 w-24 sm:w-28 overflow-hidden border-r",
            a.border,
          )}
        >
          {player.foto_url ? (
            <>
              <img
                src={player.foto_url}
                className="w-full h-full object-cover object-top"
                loading="lazy"
                alt={player.nome}
                style={{ minHeight: "112px" }}
              />
              {/* overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/40" />
            </>
          ) : (
            <div style={{ minHeight: "112px" }} className="w-full h-full">
              {isPeDeRato ? <PeDeRatoFallback /> : <MVPFallback />}
            </div>
          )}

          {/* badge no canto da foto */}
          <div
            className={cn(
              "absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
              isPeDeRato
                ? "bg-red-500/20 border border-red-500/40 text-red-400"
                : "bg-amber-500/20 border border-amber-500/40 text-amber-400",
            )}
          >
            <Icon size={8} />
            {badge}
          </div>
        </div>

        {/* INFO — lado direito */}
        <div className="flex-1 min-w-0 p-4 flex flex-col justify-center gap-1">
          {/* título da seção */}
          <p
            className={cn(
              "text-[9px] font-black uppercase tracking-[0.18em]",
              a.text,
            )}
          >
            {title}
          </p>

          {/* nome do jogador */}
          <h4 className="text-base sm:text-lg font-black text-white leading-tight truncate">
            {player.nome || "N/A"}
          </h4>

          {/* rodada/competição se disponível */}
          {(player.nome_competicao || player.rodada_data) && (
            <p className="text-[10px] text-white/30 truncate">
              {player.nome_competicao || (player.rodada_data ? `Rodada ${new Date(player.rodada_data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : '')}
            </p>
          )}

          {/* stat se disponível */}
          {(player.total != null || player.valor != null) && (
            <div className={cn("flex items-baseline gap-1 mt-1", a.text)}>
              <span className="text-2xl font-black tabular-nums leading-none">
                {player.total ?? player.valor}
              </span>
              <span className="text-[9px] font-bold text-white/25 uppercase tracking-wide">
                {isPeDeRato ? "erros" : "pts"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* linha acento no topo */}
      <div
        className={cn("absolute top-0 inset-x-0 h-px", a.bg)}
        style={{ opacity: 0.5 }}
      />
    </motion.div>
  );
});

export default HeroSpotlightCard;
