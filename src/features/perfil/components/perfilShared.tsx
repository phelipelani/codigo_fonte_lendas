// Arquivo: src/features/perfil/components/perfilShared.tsx
import React from "react";
import { motion } from "framer-motion";

// ─── PARTÍCULAS ADAPTADAS À RARIDADE ─────────────────────────────────────────
const particleConfig = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  x: 5 + (i * 6.1) % 90,
  y: 10 + (i * 7.9) % 80,
  size: 1 + (i % 3),
  dur: 6 + (i % 5) * 2,
  delay: (i * 0.6) % 7,
}));

const particleAnimate = { y: [0, -50, 0], opacity: [0, 0.8, 0] };

export const RarityParticles = React.memo(function RarityParticles({ accentRgb }: { accentRgb: string }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {particleConfig.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            background: `rgba(${accentRgb},0.8)`,
            boxShadow: `0 0 4px rgba(${accentRgb},0.5)`,
          }}
          animate={particleAnimate}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
});

// ─── DIAGONAL LINES BG ────────────────────────────────────────────────────────
export const DiagBg = React.memo(function DiagBg({ accentRgb }: { accentRgb: string }) {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <div className="absolute inset-0" style={{
        backgroundImage: `repeating-linear-gradient(135deg, rgba(${accentRgb},0.025) 0px, rgba(${accentRgb},0.025) 1px, transparent 1px, transparent 50px)`,
      }} />
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 70% 50% at 50% 40%, rgba(${accentRgb},0.06) 0%, transparent 70%)`,
      }} />
    </div>
  );
});

// ─── MINI STAT (card FIFA) ────────────────────────────────────────────────────
export const MiniStat = React.memo(function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-white/35 font-bold text-[10px]">{label}</span>
      <span className="font-black text-sm" style={{ color }}>{value}</span>
    </div>
  );
});

// ─── STAT BOX (fundo do card FIFA) ───────────────────────────────────────────
export const StatBox = React.memo(function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="text-center px-2">
      <div className="text-base font-black" style={{ color }}>{value}</div>
      <div className="text-[8px] text-white/35 font-bold uppercase tracking-wider">{label}</div>
    </div>
  );
});

// ─── LABEL DE SEÇÃO ───────────────────────────────────────────────────────────
export const SectionLabel = React.memo(function SectionLabel({ icon: Icon, label, accent }: { icon: any; label: string; accent: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <Icon size={13} style={{ color: accent }} />
      <span className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: accent }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${accent}40, transparent)` }} />
    </div>
  );
});

// ─── BADGE DE CONQUISTA ───────────────────────────────────────────────────────
export const ConqBadge = React.memo(function ConqBadge({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
      style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}
    >
      <span>{icon}</span> {label}
    </div>
  );
});

// ─── Tipos compartilhados ────────────────────────────────────────────────────
export interface PerfilData {
  nome: string;
  foto_url?: string;
  posicao?: string;
  stats: any;
}

export interface PerfilComputedData {
  totais: any;
  desempenho: any;
  titulos: any[];
  premios: any[];
  mvpsSemanais: number;
  melhorDupla: any;
  aproveitamento: number;
  qtdMvpGeral: number;
  rating: number;
  rarity: any;
  pilares: any;
  mvpsPremios: any[];
  artilheirosPremios: any[];
  garconsPremios: any[];
  peDeRato: any[];
  acc: string;
  accRgb: string;
}
