// Arquivo: src/features/perfil/components/PerfilMobile.tsx
import React from "react";
import { motion } from "framer-motion";
import {
  Trophy, Star, Activity, Edit2, Users, Zap,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayerStatsRadar } from "@/features/jogadores/components/PlayerStatsRadar";
import { RarityShield } from "../components/raritySystem";
import {
  MiniStat, StatBox, SectionLabel, ConqBadge,
  type PerfilData, type PerfilComputedData,
} from "./perfilShared";

// Framer Motion variant at module level
const cardEntrance = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

interface PerfilMobileProps {
  perfil: PerfilData;
  computed: PerfilComputedData;
  onEditAvatar: () => void;
  onShare: () => void;
}

const PerfilMobile = React.memo(function PerfilMobile({
  perfil,
  computed,
  onEditAvatar,
  onShare,
}: PerfilMobileProps) {
  const {
    totais, desempenho, titulos, premios, mvpsSemanais, melhorDupla,
    aproveitamento, qtdMvpGeral, rating, rarity,
    mvpsPremios, artilheirosPremios, garconsPremios, peDeRato,
    acc, accRgb,
  } = computed;

  const { stats } = perfil;

  return (
    <div className="lg:hidden min-h-screen flex flex-col relative z-10">

      {/* Card FIFA mobile */}
      <div className="p-4 pb-2">
        <motion.div
          {...cardEntrance}
          className="relative rounded-[20px] overflow-hidden flex flex-col"
          style={{
            height: 500,
            background: rarity.cardBg,
            border: `1.5px solid ${rarity.borderColor}`,
            boxShadow: `0 0 40px ${rarity.glowColor}`,
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: rarity.overlayBg }} />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Header mobile */}
          <div className="relative z-30 px-3 pt-3 pb-1 flex justify-between items-start flex-shrink-0">
            <div className="flex flex-col">
              <span className={cn("text-4xl font-black leading-none bg-gradient-to-b bg-clip-text text-transparent", rarity.textGradient)}>
                {rating}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest mt-0.5" style={{ color: acc }}>{perfil.posicao || "ATA"}</span>
              <div className="mt-1 space-y-0.5">
                <MiniStat label="GOL" value={totais.gols} color={acc} />
                <MiniStat label="ASS" value={totais.assists} color={acc} />
                <MiniStat label="JGS" value={totais.jogos} color={acc} />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <RarityShield rarity={rarity} size={44} showOverall={false} />
              <button onClick={onEditAvatar}
                className="w-8 h-8 rounded-lg bg-black/50 flex items-center justify-center border border-white/10">
                <Edit2 size={12} className="text-white/70" />
              </button>
              <button onClick={onShare}
                className="w-8 h-8 rounded-lg bg-black/50 flex items-center justify-center border border-white/10">
                <Share2 size={12} className="text-white/70" />
              </button>
            </div>
          </div>

          {/* Foto hero mobile */}
          <div className="relative flex-1 min-h-0 overflow-hidden">
            {perfil.foto_url ? (
              <>
                <img
                  src={perfil.foto_url}
                  alt={perfil.nome}
                  className="absolute inset-0 w-full h-full object-cover object-top"
                  style={{ opacity: 0.9 }}
                />
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: `radial-gradient(ellipse 70% 50% at 50% 50%, ${rarity.glowColor}20 0%, transparent 70%)`
                }} />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full blur-2xl opacity-20" style={{ background: acc }} />
                <Users size={48} style={{ color: acc }} className="relative z-10 opacity-30" />
              </div>
            )}
          </div>

          {/* Footer mobile */}
          <div className="relative z-20 px-3 pt-2 pb-4 flex-shrink-0"
            style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.75) 0%, transparent 100%)" }}>
            <div className="flex justify-center mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.1em]"
                style={{ background: `${acc}40`, color: acc, border: `1px solid ${acc}50` }}>
                {rarity.name}
              </span>
            </div>
            <h1 className="text-base font-black text-center uppercase tracking-wide text-white mb-2">{perfil.nome}</h1>
            <div className="flex justify-center gap-3">
              <StatBox label="VIT" value={desempenho.vitorias} color="#22c55e" />
              <StatBox label="EMP" value={desempenho.empates} color="#eab308" />
              <StatBox label="DER" value={desempenho.derrotas} color="#ef4444" />
              <StatBox label="APR" value={`${aproveitamento}%`} color="#06b6d4" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Stats mobile */}
      <div className="p-4 space-y-3 pb-10">
        {/* Nome + badge */}
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-black text-white uppercase">{perfil.nome}</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: acc }}>{rating} pts</span>
              <span className="text-xs" style={{ color: "#A0A0AB" }}>{perfil.posicao || "ATA"}</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Jogos", value: totais.jogos, color: "#F0E6D3" },
            { label: "Gols", value: totais.gols, color: "#4ade80" },
            { label: "Assists", value: totais.assists, color: "#22d3ee" },
            { label: "Aprv.", value: `${aproveitamento}%`, color: acc },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="block text-xl font-black" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: "#A0A0AB" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Radar */}
        <div className="rounded-xl p-4" style={{ background: "rgba(10,20,40,0.8)", border: `1px solid ${acc}15` }}>
          <SectionLabel icon={Activity} label="Performance" accent={acc} />
          <div className="h-[160px]"><PlayerStatsRadar stats={stats} /></div>
        </div>

        {/* Melhor dupla */}
        {melhorDupla && (
          <div className="rounded-xl p-4"
            style={{ background: `linear-gradient(135deg, rgba(${accRgb},0.08), rgba(10,20,40,0.8))`, border: `1px solid ${acc}20` }}>
            <SectionLabel icon={Users} label="Melhor Dupla" accent={acc} />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${acc}15` }}>
                <Users size={16} style={{ color: acc }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-white truncate">{melhorDupla.nome}</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-black" style={{ color: acc }}>{melhorDupla.total}</span>
                <p className="text-[9px]" style={{ color: "#A0A0AB" }}>gols</p>
              </div>
            </div>
          </div>
        )}

        {/* Conquistas */}
        {(titulos.length > 0 || premios.length > 0) && (
          <div className="rounded-xl p-4" style={{ background: "rgba(10,20,40,0.8)", border: `1px solid rgba(255,255,255,0.06)` }}>
            <SectionLabel icon={Trophy} label="Conquistas" accent={acc} />
            <div className="flex flex-wrap gap-2">
              {titulos.map((t: any, i: number) => <ConqBadge key={i} icon="🏆" label={t.nome} color={acc} />)}
              {mvpsPremios.length > 0 && <ConqBadge icon="⭐" label={`MVP ×${mvpsPremios.length}`} color="#a78bfa" />}
              {artilheirosPremios.length > 0 && <ConqBadge icon="👟" label={`Art. ×${artilheirosPremios.length}`} color="#4ade80" />}
              {garconsPremios.length > 0 && <ConqBadge icon="🎯" label={`Garçom ×${garconsPremios.length}`} color="#22d3ee" />}
              {peDeRato.length > 0 && <ConqBadge icon="🐀" label={`Pé de Rato ×${peDeRato.length}`} color="#f87171" />}
            </div>
          </div>
        )}

        {/* MVPs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-4 relative overflow-hidden"
            style={{ background: "rgba(10,20,40,0.8)", border: "1px solid rgba(251,146,60,0.15)" }}>
            <Zap size={14} className="text-orange-400 mb-2" />
            <span className="block text-xl font-black text-orange-400">{mvpsSemanais}</span>
            <span className="text-[9px] uppercase tracking-wider" style={{ color: "#A0A0AB" }}>MVP Rodada</span>
          </div>
          <div className="rounded-xl p-4 relative overflow-hidden"
            style={{ background: "rgba(10,20,40,0.8)", border: "1px solid rgba(167,139,250,0.15)" }}>
            <Star size={14} className="text-purple-400 mb-2" />
            <span className="block text-xl font-black text-purple-400">{qtdMvpGeral}</span>
            <span className="text-[9px] uppercase tracking-wider" style={{ color: "#A0A0AB" }}>MVP Geral</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PerfilMobile;
