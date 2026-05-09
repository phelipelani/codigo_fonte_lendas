// Arquivo: src/features/perfil/components/PerfilDesktop.tsx
import React from "react";
import { motion } from "framer-motion";
import {
  Trophy, Star, Activity, Edit2, Users, Zap,
  Share2, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayerStatsRadar } from "@/features/jogadores/components/PlayerStatsRadar";
import { RarityShield, PilarBar } from "../components/raritySystem";
import {
  MiniStat, StatBox, SectionLabel, ConqBadge,
  type PerfilData, type PerfilComputedData,
} from "./perfilShared";

// Framer Motion variants at module level
const col1Anim = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0 },
  transition: { delay: 0.2, duration: 0.7 },
};

const col2Anim = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.35, duration: 0.8 },
};

const col3Anim = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  transition: { delay: 0.5, duration: 0.7 },
};

interface PerfilDesktopProps {
  perfil: PerfilData;
  computed: PerfilComputedData;
  isOwner: boolean;
  onEdit: () => void;
  onShare: () => void;
}

const PerfilDesktop = React.memo(function PerfilDesktop({
  perfil,
  computed,
  isOwner,
  onEdit,
  onShare,
}: PerfilDesktopProps) {
  const {
    totais, desempenho, titulos, mvpsSemanais, melhorDupla,
    aproveitamento, qtdMvpGeral, rating, rarity, pilares,
    mvpsPremios, artilheirosPremios, garconsPremios, peDeRato,
    acc, accRgb,
  } = computed;

  const { stats } = perfil;

  return (
    <div className="hidden lg:block min-h-screen relative z-10">
      {/* ── Hero section ── */}
      <div className="relative min-h-screen flex items-center">
        {/* Gradiente lateral esquerdo sobre o avatar */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, #010A13 0%, transparent 35%, transparent 65%, #010A13 100%)`,
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background: "linear-gradient(0deg, #010A13, transparent)" }}
        />

        {/* Grid de conteúdo */}
        <div className="container mx-auto px-6 xl:px-8 grid grid-cols-[1fr_380px_320px] xl:grid-cols-[1fr_420px_360px] gap-6 xl:gap-8 items-center py-12 xl:py-16">

          {/* ── COLUNA 1: INFO DO JOGADOR ── */}
          <motion.div {...col1Anim} className="flex flex-col justify-center gap-6">
            {/* Label topo */}
            <div className="flex items-center gap-3">
              <div className="h-px w-10" style={{ background: acc }} />
              <span className="text-[10px] font-black tracking-[0.4em] uppercase" style={{ color: acc }}>
                FutLendas · Perfil
              </span>
            </div>

            {/* Nome + Escudo */}
            <div className="flex items-start gap-5">
              <RarityShield rarity={rarity} size={90} showOverall />
              <div className="flex-1">
                <h1
                  className="text-5xl md:text-6xl font-black uppercase leading-none tracking-tighter"
                  style={{
                    background: `linear-gradient(170deg, #FFFFFF 0%, #F0E6D3 40%, ${acc} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {perfil.nome}
                </h1>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span
                    className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-sm"
                    style={{ background: acc, color: "#010A13" }}
                  >
                    {rarity.name}
                  </span>
                  <span className="text-xl font-black" style={{ color: acc }}>{rating}</span>
                  <span className="text-sm font-bold" style={{ color: "#A0A0AB" }}>{perfil.posicao || "ATA"}</span>
                </div>
              </div>
            </div>

            {/* Pilares do overall */}
            <div
              className="rounded-xl p-4 space-y-2"
              style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${acc}15` }}
            >
              <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-3" style={{ color: `${acc}80` }}>
                Atributos
              </p>
              <PilarBar label="Ataque"  value={pilares.ataque}       accent={acc} icon="⚽" />
              <PilarBar label="Criação" value={pilares.criacao}       accent={acc} icon="🎯" />
              <PilarBar label="Vitórias" value={pilares.vitorias}     accent={acc} icon="🏆" />
              <PilarBar label="Experiên." value={pilares.experiencia} accent={acc} icon="📈" />
              <PilarBar label="Conquist." value={pilares.conquistas}  accent={acc} icon="🎖️" />
              <PilarBar label="Consiste." value={pilares.consistencia} accent={acc} icon="⭐" />
            </div>

            {/* Stats principais */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Jogos", value: totais.jogos, color: "#F0E6D3" },
                { label: "Gols", value: totais.gols, color: "#4ade80" },
                { label: "Assists", value: totais.assists, color: "#22d3ee" },
                { label: "Aproveit.", value: `${aproveitamento}%`, color: acc },
              ].map(s => (
                <div
                  key={s.label}
                  className="rounded-xl p-4 text-center"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span className="block text-2xl font-black" style={{ color: s.color }}>{s.value}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#A0A0AB" }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* W/D/L bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#A0A0AB" }}>Desempenho</span>
                <div className="flex gap-3 text-[11px] font-bold">
                  <span style={{ color: "#4ade80" }}>{desempenho.vitorias}V</span>
                  <span style={{ color: "#eab308" }}>{desempenho.empates}E</span>
                  <span style={{ color: "#f87171" }}>{desempenho.derrotas}D</span>
                </div>
              </div>
              {totais.jogos > 0 && (
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                  <div className="rounded-full" style={{ width: `${(desempenho.vitorias / totais.jogos) * 100}%`, background: "#4ade80" }} />
                  <div className="rounded-full" style={{ width: `${(desempenho.empates / totais.jogos) * 100}%`, background: "#eab308" }} />
                  <div className="rounded-full" style={{ width: `${(desempenho.derrotas / totais.jogos) * 100}%`, background: "#f87171" }} />
                </div>
              )}
            </div>

            {/* Conquistas compactas */}
            {(titulos.length > 0 || mvpsPremios.length > 0 || artilheirosPremios.length > 0) && (
              <div>
                <SectionLabel icon={Trophy} label="Conquistas" accent={acc} />
                <div className="flex flex-wrap gap-2">
                  {titulos.map((t: any, i: number) => (
                    <ConqBadge key={i} icon="🏆" label={t.nome} color={acc} />
                  ))}
                  {mvpsPremios.length > 0 && (
                    <ConqBadge icon="⭐" label={`MVP ×${mvpsPremios.length}`} color="#a78bfa" />
                  )}
                  {artilheirosPremios.length > 0 && (
                    <ConqBadge icon="👟" label={`Art. ×${artilheirosPremios.length}`} color="#4ade80" />
                  )}
                  {garconsPremios.length > 0 && (
                    <ConqBadge icon="🎯" label={`Garçom ×${garconsPremios.length}`} color="#22d3ee" />
                  )}
                  {peDeRato.length > 0 && (
                    <ConqBadge icon="🐀" label={`Pé de Rato ×${peDeRato.length}`} color="#f87171" />
                  )}
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex gap-3">
              <button
                onClick={isOwner ? onEdit : undefined}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
                style={{ background: `${acc}18`, border: `1px solid ${acc}30`, color: acc }}
              >
                <Edit2 size={14} /> Editar Perfil
              </button>
              <button
                onClick={onShare}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#A0A0AB" }}
              >
                <Share2 size={14} /> Compartilhar
              </button>
            </div>
          </motion.div>

          {/* ── COLUNA 2: CARD FIFA COM FOTO HERO ── */}
          <motion.div {...col2Anim} className="relative flex justify-center">
            {/* Glow externo */}
            <div
              className="absolute -inset-10 rounded-[40px] blur-3xl opacity-60 pointer-events-none"
              style={{ background: `radial-gradient(ellipse, ${rarity.glowColor} 0%, transparent 65%)` }}
            />

            {/* O CARD */}
            <div
              className="relative w-[340px] h-[540px] rounded-[24px] overflow-hidden"
              style={{
                background: rarity.cardBg,
                border: `1.5px solid ${rarity.borderColor}`,
                boxShadow: `0 0 80px ${rarity.glowColor}, inset 0 1px 0 rgba(255,255,255,0.10)`,
              }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: rarity.overlayBg }} />
              <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.5) 35px, rgba(255,255,255,0.5) 70px)`
              }} />
              <div className="absolute top-0 left-0 right-0 h-px" style={{
                background: `linear-gradient(90deg, transparent, ${acc}80, transparent)`
              }} />

              {/* FOTO HERO */}
              {perfil.foto_url ? (
                <>
                  <img
                    src={perfil.foto_url}
                    alt={perfil.nome}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                    style={{ opacity: 0.92 }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none" style={{
                    background: `linear-gradient(0deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)`
                  }} />
                  <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none" style={{
                    background: `linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 100%)`
                  }} />
                  <div className="absolute inset-0 pointer-events-none" style={{
                    background: `radial-gradient(ellipse 60% 40% at 50% 60%, ${rarity.glowColor}25 0%, transparent 70%)`
                  }} />
                </>
              ) : (
                <div className="absolute inset-0 flex items-end justify-center pb-20">
                  <div className="w-48 h-48 rounded-full blur-2xl opacity-20 absolute top-1/3"
                    style={{ background: acc }} />
                  <div className="relative z-10 flex flex-col items-center gap-2 opacity-30">
                    <Users size={64} style={{ color: acc }} />
                  </div>
                </div>
              )}

              {/* HEADER FLUTUANTE */}
              <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-4 flex justify-between items-start">
                <div className="flex flex-col drop-shadow-lg">
                  <span
                    className={cn("text-5xl font-black leading-none bg-gradient-to-b bg-clip-text text-transparent", rarity.textGradient)}
                    style={{ filter: `drop-shadow(0 0 12px ${rarity.glowColor})` }}
                  >
                    {rating}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest mt-0.5 drop-shadow"
                    style={{ color: acc }}>
                    {perfil.posicao || "ATA"}
                  </span>
                  <div className="mt-1.5 space-y-0.5">
                    <MiniStat label="GOL" value={totais.gols} color={acc} />
                    <MiniStat label="ASS" value={totais.assists} color={acc} />
                    <MiniStat label="JGS" value={totais.jogos} color={acc} />
                  </div>
                </div>
                <RarityShield rarity={rarity} size={52} showOverall={false} />
              </div>

              {/* FOOTER FLUTUANTE */}
              <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-5 pt-2">
                <div className="flex justify-center mb-2">
                  <span
                    className="px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
                    style={{
                      background: `linear-gradient(135deg, ${acc}50, ${acc}25)`,
                      color: acc,
                      border: `1px solid ${acc}60`,
                      boxShadow: `0 0 8px ${acc}30`,
                    }}
                  >
                    {rarity.name}
                  </span>
                </div>
                <h1
                  className="text-lg font-black text-center uppercase tracking-wide mb-2.5"
                  style={{
                    background: `linear-gradient(180deg, #fff 0%, ${acc}CC 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: 'none',
                    filter: `drop-shadow(0 0 6px ${acc}50)`,
                  }}
                >
                  {perfil.nome}
                </h1>
                <div className="flex justify-center gap-2">
                  <StatBox label="VIT" value={desempenho.vitorias} color="#22c55e" />
                  <StatBox label="EMP" value={desempenho.empates} color="#eab308" />
                  <StatBox label="DER" value={desempenho.derrotas} color="#ef4444" />
                  <StatBox label="APR" value={`${aproveitamento}%`} color="#06b6d4" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── COLUNA 3: STATS ── */}
          <motion.div {...col3Anim} className="flex flex-col gap-4">
            {/* Radar */}
            <div
              className="rounded-xl p-5"
              style={{ background: "rgba(10,20,40,0.8)", border: `1px solid ${acc}18` }}
            >
              <SectionLabel icon={Activity} label="Performance" accent={acc} />
              <div className="h-[180px]">
                <PlayerStatsRadar stats={stats} />
              </div>
            </div>

            {/* Melhor dupla */}
            {melhorDupla && (
              <div
                className="rounded-xl p-4"
                style={{
                  background: `linear-gradient(135deg, rgba(${accRgb},0.08), rgba(10,20,40,0.8))`,
                  border: `1px solid ${acc}20`,
                }}
              >
                <SectionLabel icon={Users} label="Melhor Dupla" accent={acc} />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${acc}15` }}>
                    <Users size={16} style={{ color: acc }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-white truncate">{melhorDupla.nome}</p>
                    <p className="text-[10px]" style={{ color: "#A0A0AB" }}>Parceiro de jogo</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black" style={{ color: acc }}>{melhorDupla.total}</span>
                    <p className="text-[9px] uppercase" style={{ color: "#A0A0AB" }}>gols juntos</p>
                  </div>
                </div>
              </div>
            )}

            {/* MVP counters */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "MVP Rodada", value: mvpsSemanais, color: "#fb923c", icon: Zap },
                { label: "MVP Geral", value: qtdMvpGeral, color: "#a78bfa", icon: Star },
              ].map(s => (
                <div
                  key={s.label}
                  className="rounded-xl p-4 relative overflow-hidden"
                  style={{ background: "rgba(10,20,40,0.8)", border: `1px solid ${s.color}18` }}
                >
                  <s.icon size={14} style={{ color: s.color }} className="mb-2" />
                  <span className="block text-xl font-black" style={{ color: s.color }}>{s.value}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#A0A0AB" }}>{s.label}</span>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: `linear-gradient(90deg, ${s.color}50, transparent)` }} />
                </div>
              ))}
            </div>

            {/* Clean sheets */}
            {(totais.clean_sheets > 0) && (
              <div
                className="rounded-xl p-4 flex items-center gap-4"
                style={{ background: "rgba(10,20,40,0.8)", border: `1px solid #2dd4bf18` }}
              >
                <Shield size={20} style={{ color: "#2dd4bf" }} />
                <div>
                  <span className="block text-xl font-black" style={{ color: "#2dd4bf" }}>{totais.clean_sheets}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#A0A0AB" }}>Clean Sheets</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
});

export default PerfilDesktop;
