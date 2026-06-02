// Arquivo: src/features/jogadores/components/JogadorCardGrid.tsx
// Card estilo FIFA Ultimate Team — mobile-first, raridade por nível

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Edit, Trash2, Mail, User, Shield, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Jogador } from '@/@types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useGerarConvite } from '../api/useGerarConvite';
import { ConviteModal } from './ConviteModal';
import { SelecionarTipoUsuarioDialog } from './SelecionarTipoUsuarioDialog';

// ── Sistema de raridade por nível ────────────────────────────
const TIERS = {
  LENDA: {
    bg: 'linear-gradient(160deg, #08060A 0%, #150E20 30%, #0D0A00 70%, #08060A 100%)',
    accent: '#FFD700',
    border: 'rgba(255,215,0,0.55)',
    glow: '0 0 28px rgba(255,215,0,0.35)',
    shimmer: 'rgba(255,215,0,0.12)',
    name: 'LENDA',
  },
  ELITE: {
    bg: 'linear-gradient(160deg, #0A0514 0%, #1C0A30 35%, #0F061A 100%)',
    accent: '#C084FC',
    border: 'rgba(168,85,247,0.55)',
    glow: '0 0 28px rgba(192,132,252,0.35)',
    shimmer: 'rgba(168,85,247,0.12)',
    name: 'ELITE',
  },
  OURO: {
    bg: 'linear-gradient(160deg, #0C0900 0%, #1C1500 40%, #0C0900 100%)',
    accent: '#FBBF24',
    border: 'rgba(251,191,36,0.48)',
    glow: '0 0 22px rgba(251,191,36,0.28)',
    shimmer: 'rgba(251,191,36,0.10)',
    name: 'OURO',
  },
  PRATA: {
    bg: 'linear-gradient(160deg, #080C12 0%, #121C28 40%, #080C12 100%)',
    accent: '#94A3B8',
    border: 'rgba(148,163,184,0.38)',
    glow: '0 0 18px rgba(148,163,184,0.2)',
    shimmer: 'rgba(148,163,184,0.07)',
    name: 'PRATA',
  },
  BRONZE: {
    bg: 'linear-gradient(160deg, #0E0700 0%, #1C0F04 40%, #0E0700 100%)',
    accent: '#CD7F32',
    border: 'rgba(205,127,50,0.38)',
    glow: '0 0 18px rgba(205,127,50,0.2)',
    shimmer: 'rgba(205,127,50,0.08)',
    name: 'BRONZE',
  },
} as const;

type TierKey = keyof typeof TIERS;

const getTier = (nivel: number): typeof TIERS[TierKey] => {
  if (nivel >= 10) return TIERS.LENDA;
  if (nivel >= 8)  return TIERS.ELITE;
  if (nivel >= 6)  return TIERS.OURO;
  if (nivel >= 4)  return TIERS.PRATA;
  return TIERS.BRONZE;
};

// nivel 1-10 → overall 50-99
const nivelToOverall = (nivel: number) => Math.round(50 + ((nivel - 1) / 9) * 49);

// ── Componente ────────────────────────────────────────────────
type JogadorCardGridProps = {
  jogador: Jogador;
  onDelete?: (id: number) => void;
  isAdmin?: boolean;
};

export const JogadorCardGrid = memo(({ jogador, onDelete, isAdmin = false }: JogadorCardGridProps) => {
  const [selecionarTipoOpen, setSelecionarTipoOpen] = useState(false);
  const [conviteModalOpen, setConviteModalOpen] = useState(false);
  const gerarConviteMutation = useGerarConvite();

  const tier = getTier(jogador.nivel ?? 1);
  const overall = nivelToOverall(jogador.nivel ?? 1);
  const isGoleiro = jogador.posicao === 'goleiro';
  const temContaAtiva = jogador.usuario?.tem_conta_ativa ?? false;
  const isJogadorAdmin = jogador.usuario?.role === 'admin';

  const getInitials = (nome: string) => {
    const parts = nome.trim().split(' ');
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : nome.substring(0, 2).toUpperCase();
  };

  const handleConviteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelecionarTipoOpen(true);
  };

  const handleTipoSelecionado = async (tipo: 'user' | 'admin') => {
    setSelecionarTipoOpen(false);
    const result = await gerarConviteMutation.mutateAsync({ jogador_id: jogador.id, tipo_usuario: tipo });
    if (result) setConviteModalOpen(true);
  };

  return (
    <>
      <motion.div
        whileTap={{ scale: 0.96 }}
        className="relative"
      >
        <Link to={`/perfil/${jogador.id}`} className="block">
          <div
            className="relative overflow-hidden rounded-2xl select-none"
            style={{
              background: tier.bg,
              border: `1px solid ${tier.border}`,
              boxShadow: tier.glow,
            }}
          >
            {/* Shimmer diagonal overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${tier.shimmer} 0%, transparent 50%, ${tier.shimmer} 100%)`,
              }}
            />

            {/* ── Header: overall + posição + tier ────── */}
            <div className="relative z-10 flex items-start justify-between px-2.5 pt-2.5 pb-0">
              {/* Overall */}
              <div className="flex flex-col items-center leading-none">
                <span
                  className="text-xl font-black tabular-nums leading-none"
                  style={{
                    color: tier.accent,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    textShadow: `0 0 10px ${tier.accent}80`,
                  }}
                >
                  {overall}
                </span>
                <span
                  className="text-[7px] font-black uppercase tracking-wider mt-0.5"
                  style={{ color: `${tier.accent}90`, fontFamily: "'Rajdhani', sans-serif" }}
                >
                  {isGoleiro ? 'GOL' : 'LN'}
                </span>
              </div>

              {/* Tier badge */}
              <span
                className="text-[7px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full"
                style={{
                  color: tier.accent,
                  background: `${tier.shimmer}`,
                  border: `1px solid ${tier.border}`,
                  fontFamily: "'Rajdhani', sans-serif",
                }}
              >
                {tier.name}
              </span>
            </div>

            {/* ── Foto ────────────────────────────── */}
            <div className="relative z-10 flex justify-center pt-1 pb-1.5 px-3">
              <div
                className="relative w-16 h-16 rounded-xl overflow-hidden"
                style={{
                  border: `2px solid ${tier.border}`,
                  boxShadow: `0 0 14px ${tier.accent}30`,
                }}
              >
                {jogador.foto_url ? (
                  <img
                    src={jogador.foto_url}
                    alt={jogador.nome}
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: `${tier.shimmer}` }}
                  >
                    {isGoleiro
                      ? <Shield size={22} style={{ color: tier.accent, opacity: 0.7 }} />
                      : <User size={22} style={{ color: tier.accent, opacity: 0.7 }} />
                    }
                    <span
                      className="absolute text-base font-black"
                      style={{ color: tier.accent, fontFamily: "'Barlow Condensed', sans-serif" }}
                    >
                      {getInitials(jogador.nome)}
                    </span>
                  </div>
                )}

                {/* Gradiente inferior na foto */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-6"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }}
                />

                {/* Badge admin */}
                {isJogadorAdmin && (
                  <div
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: '#FFD700', boxShadow: '0 0 6px rgba(255,215,0,0.6)' }}
                  >
                    <Crown size={8} className="text-black" fill="currentColor" />
                  </div>
                )}
              </div>
            </div>

            {/* ── Nome ────────────────────────────── */}
            <div className="relative z-10 text-center px-2 pb-1">
              <p
                className="text-sm font-black text-white truncate leading-tight uppercase"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  letterSpacing: '0.04em',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                }}
              >
                {jogador.nome}
              </p>

              {/* Linha acento */}
              <div
                className="mx-auto mt-1 h-px w-10 rounded-full"
                style={{ background: `linear-gradient(90deg, transparent, ${tier.accent}, transparent)` }}
              />
            </div>

            {/* ── Ações admin ────────────────────── */}
            {isAdmin && (
              <div
                className="relative z-10 flex items-center justify-center gap-1 px-2 pb-2.5 pt-1"
                onClick={(e) => e.preventDefault()}
              >
                {!temContaAtiva && (
                  <button
                    onClick={handleConviteClick}
                    disabled={gerarConviteMutation.isPending}
                    className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all active:scale-90"
                    style={{
                      background: `${tier.accent}20`,
                      border: `1px solid ${tier.accent}40`,
                      color: tier.accent,
                    }}
                  >
                    <Mail size={8} /> Convite
                  </button>
                )}
                <Link
                  to={`/jogadores/${jogador.id}/edit`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide text-white/40 transition-all active:scale-90"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Edit size={8} /> Edit
                </Link>
                {onDelete && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(jogador.id); }}
                    className="flex items-center justify-center w-6 h-6 rounded-lg transition-all active:scale-90"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <Trash2 size={9} className="text-red-400" />
                  </button>
                )}
              </div>
            )}

            {/* Barra de acento na base */}
            <div
              className="absolute bottom-0 left-0 right-0 h-[2px]"
              style={{ background: `linear-gradient(90deg, transparent, ${tier.accent}90, transparent)` }}
            />
          </div>
        </Link>
      </motion.div>

      <SelecionarTipoUsuarioDialog
        open={selecionarTipoOpen}
        onOpenChange={setSelecionarTipoOpen}
        onSelect={handleTipoSelecionado}
        jogadorNome={jogador.nome}
        isLoading={gerarConviteMutation.isPending}
      />
      <ConviteModal
        open={conviteModalOpen}
        onOpenChange={setConviteModalOpen}
        convite={gerarConviteMutation.data?.convite || null}
      />
    </>
  );
});
