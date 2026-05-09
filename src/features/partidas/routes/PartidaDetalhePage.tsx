// src/features/partidas/routes/PartidaDetalhePage.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Swords, Star, Target, Shield, Zap, Clock, Trophy, Users, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { PartidaEditModal } from '../components/PartidaEditModal';
import { useAuth } from '@/hooks/useAuth';
import api from '@/api';

// ── Paleta Riot ────────────────────────────────────────────────────────────────
const GOLD   = '#C89B3C';
const GOLD2  = '#F0E6D3';
const DARK   = '#010A13';
const DARK2  = '#0A1628';
const CYAN   = '#0BC4E3';

// ── Corner decoration ─────────────────────────────────────────────────────────
const Corner = ({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) => {
  const base = 'absolute w-4 h-4 pointer-events-none';
  const styles: Record<string, React.CSSProperties> = {
    tl: { top: 6, left: 6, borderTop: `1px solid ${GOLD}`, borderLeft: `1px solid ${GOLD}` },
    tr: { top: 6, right: 6, borderTop: `1px solid ${GOLD}`, borderRight: `1px solid ${GOLD}` },
    bl: { bottom: 6, left: 6, borderBottom: `1px solid ${GOLD}`, borderLeft: `1px solid ${GOLD}` },
    br: { bottom: 6, right: 6, borderBottom: `1px solid ${GOLD}`, borderRight: `1px solid ${GOLD}` },
  };
  return <div className={base} style={styles[pos]} />;
};

// ── Section divider ───────────────────────────────────────────────────────────
const SectionDiv = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <div className="flex items-center gap-3 my-6">
    <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}40)` }} />
    <div className="flex items-center gap-2 px-3 py-1 rounded-sm"
      style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25` }}>
      <Icon size={11} style={{ color: GOLD }} />
      <span className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: GOLD }}>{label}</span>
    </div>
    <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${GOLD}40, transparent)` }} />
  </div>
);

// ── Team logo ─────────────────────────────────────────────────────────────────
const TeamLogo = ({ logo, nome, size = 64 }: { logo?: string; nome?: string; size?: number }) => (
  <div className="rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
    style={{
      width: size, height: size,
      background: logo ? 'transparent' : `${GOLD}15`,
      border: `1.5px solid ${GOLD}25`,
      boxShadow: `0 0 20px ${GOLD}15`,
    }}>
    {logo
      ? <img src={logo} className="w-full h-full object-cover" />
      : <span className="font-black text-sm" style={{ color: GOLD }}>{nome?.substring(0, 2)}</span>
    }
  </div>
);

// ── Player row ────────────────────────────────────────────────────────────────
const PlayerRow = ({ player, isWinner, accent, isMvp }: any) => {
  const gols = parseInt(player.gols) || 0;
  const assists = parseInt(player.assistencias) || 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-all"
      style={{
        background: isMvp ? `${GOLD}08` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isMvp ? GOLD + '30' : 'rgba(255,255,255,0.04)'}`,
      }}
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
        style={{ background: `${accent}15`, border: `1.5px solid ${accent}25` }}>
        {player.foto_url
          ? <img src={player.foto_url} className="w-full h-full object-cover" />
          : <Users size={14} style={{ color: accent }} />
        }
      </div>

      {/* Nome + posição */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {isMvp && <Star size={10} style={{ color: GOLD }} className="flex-shrink-0" />}
          <span className="text-sm font-bold text-white truncate">{player.nome}</span>
        </div>
        <span className="text-[10px] capitalize" style={{ color: `${GOLD2}50` }}>
          {player.is_goleiro ? 'goleiro' : player.joga_recuado ? 'defesa' : (player.posicao || 'linha')}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {gols > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-sm font-black" style={{ color: '#4ade80' }}>{gols}</span>
            <span className="text-[9px]" style={{ color: '#4ade8060' }}>⚽</span>
          </div>
        )}
        {assists > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-sm font-black" style={{ color: CYAN }}>{assists}</span>
            <span className="text-[9px]" style={{ color: `${CYAN}60` }}>🎯</span>
          </div>
        )}
        {gols === 0 && assists === 0 && (
          <span className="text-[10px]" style={{ color: `${GOLD2}25` }}>—</span>
        )}
      </div>
    </motion.div>
  );
};

// ── Timeline event ────────────────────────────────────────────────────────────
const EventoItem = ({ evento, isTimeA }: { evento: any; isTimeA: boolean }) => {
  const isGol = evento.tipo === 'gol' || evento.tipo === 'gol_contra';
  const isContra = evento.tipo === 'gol_contra';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 ${isTimeA ? 'flex-row' : 'flex-row-reverse'}`}
    >
      {/* Minuto */}
      <div className="w-10 flex-shrink-0 text-center">
        <span className="text-[10px] font-black" style={{ color: `${GOLD}80` }}>{evento.minuto}'</span>
      </div>

      {/* Ícone */}
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: isGol ? (isContra ? '#ef444420' : '#4ade8020') : `${GOLD}15`,
          border: `1px solid ${isGol ? (isContra ? '#ef444440' : '#4ade8040') : `${GOLD}30`}`,
        }}>
        <span className="text-[13px]">{isGol ? (isContra ? '🥅' : '⚽') : '🎯'}</span>
      </div>

      {/* Info */}
      <div className={`flex flex-col ${isTimeA ? 'items-start' : 'items-end'} min-w-0 flex-1`}>
        <span className="text-sm font-bold text-white truncate">{evento.nome_jogador}</span>
        {evento.nome_assistente && (
          <span className="text-[10px]" style={{ color: `${CYAN}80` }}>
            assist: {evento.nome_assistente}
          </span>
        )}
        {isContra && <span className="text-[9px] text-red-400">gol contra</span>}
      </div>
    </motion.div>
  );
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function PartidaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['partida-detalhe', id],
    queryFn: async () => (await api.get(`/partidas/${id}/detalhes`)).data,
    enabled: !!id,
  });

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: DARK }}>
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-2 border-transparent"
          style={{ borderTopColor: GOLD, borderRightColor: `${GOLD}40` }}
        />
        <span className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: `${GOLD}60` }}>
          Carregando partida
        </span>
      </div>
    </div>
  );

  if (isError || !data) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: DARK }}>
      <div className="text-center">
        <p className="text-white/40 mb-4">Partida não encontrada</p>
        <button onClick={() => navigate(-1)} className="text-sm font-bold" style={{ color: GOLD }}>
          ← Voltar
        </button>
      </div>
    </div>
  );

  const { partida, timeA, timeB, eventos, mvp } = data;
  const vencedorA = partida.placar_timeA > partida.placar_timeB;
  const vencedorB = partida.placar_timeB > partida.placar_timeA;
  const empate    = partida.placar_timeA === partida.placar_timeB;

  const golsA = eventos?.filter((e: any) => e.lado === 'timeA' && (e.tipo === 'gol' || e.tipo === 'gol_contra')) || [];
  const golsB = eventos?.filter((e: any) => e.lado === 'timeB' && (e.tipo === 'gol' || e.tipo === 'gol_contra')) || [];

  const durMin = partida.duracao_segundos ? Math.floor(partida.duracao_segundos / 60) : null;

  return (
    <div className="min-h-screen relative" style={{ background: DARK }}>

      {/* ── Background atmospheric ── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {/* Radial glow central dourado */}
        <div className="absolute inset-0" style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 20%, ${GOLD}08 0%, transparent 70%)`
        }} />
        {/* Linhas diagonais */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `repeating-linear-gradient(135deg, ${GOLD} 0px, ${GOLD} 1px, transparent 1px, transparent 60px)`
        }} />
        {/* Blur de time A (esquerda) */}
        {partida.timeA_logo && (
          <div className="absolute left-0 top-0 bottom-0 w-1/2 opacity-[0.04]"
            style={{ backgroundImage: `url(${partida.timeA_logo})`, backgroundSize: '200px', backgroundRepeat: 'no-repeat', backgroundPosition: '10% 30%', filter: 'blur(40px) saturate(0.3)' }} />
        )}
        {/* Blur de time B (direita) */}
        {partida.timeB_logo && (
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-[0.04]"
            style={{ backgroundImage: `url(${partida.timeB_logo})`, backgroundSize: '200px', backgroundRepeat: 'no-repeat', backgroundPosition: '90% 30%', filter: 'blur(40px) saturate(0.3)' }} />
        )}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 pb-20">

        {/* ── TOP BAR: BACK + EDIT ── */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 group">
            <ArrowLeft size={16} style={{ color: `${GOLD}80` }} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: `${GOLD}60` }}>
              Voltar
            </span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}25`, color: GOLD }}
            >
              <Edit2 size={12} /> Editar Súmula
            </button>
          )}
        </motion.div>

        {/* ══════════════════════════════════════════════
            HERO CARD — PLACAR PRINCIPAL
        ══════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl overflow-hidden mb-6"
          style={{
            background: `linear-gradient(180deg, ${DARK2} 0%, ${DARK} 100%)`,
            border: `1px solid ${GOLD}20`,
          }}
        >
          <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />

          {/* Top gold line */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${GOLD}80, transparent)` }} />

          {/* Badge competição + data */}
          <div className="flex justify-center pt-5 pb-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full"
              style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}25` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4ade80' }} />
              <span className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
                {partida.campeonato_nome || 'Partida'} · {partida.rodada_data ? new Date(partida.rodada_data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
              </span>
            </div>
          </div>

          {/* Times + Placar */}
          <div className="flex items-center justify-between px-3 sm:px-6 py-4 gap-2 sm:gap-4 overflow-hidden">

            {/* TIME A */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex flex-col items-center gap-2 flex-1 min-w-0"
            >
              <div className="relative">
                <TeamLogo logo={partida.timeA_logo} nome={partida.timeA_nome} size={72} />
                {vencedorA && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade8060' }}>
                    <Trophy size={10} className="text-black" />
                  </div>
                )}
              </div>
              <span className="text-xs sm:text-sm font-black text-center text-white uppercase tracking-wide leading-tight max-w-[90px] sm:max-w-[160px] truncate">
                {partida.timeA_nome}
              </span>
              {vencedorA && (
                <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: '#4ade80' }}>
                  • vencedor
                </span>
              )}
            </motion.div>

            {/* PLACAR CENTRAL */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, duration: 0.5, type: 'spring', stiffness: 200 }}
              className="flex flex-col items-center gap-1 px-2 sm:px-4 shrink-0"
            >
              <div className="flex items-center gap-3">
                {/* Score A */}
                <span
                  className="text-4xl sm:text-6xl md:text-7xl font-black leading-none tabular-nums"
                  style={{
                    color: vencedorA ? '#4ade80' : GOLD2,
                    textShadow: vencedorA ? '0 0 30px #4ade8060' : `0 0 20px ${GOLD}40`,
                  }}
                >
                  {partida.placar_timeA}
                </span>

                {/* Divider */}
                <div className="flex flex-col items-center gap-0.5">
                  <Swords size={16} style={{ color: `${GOLD}60` }} />
                  <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: `${GOLD}50` }}>
                    {empate ? 'empate' : 'final'}
                  </span>
                </div>

                {/* Score B */}
                <span
                  className="text-4xl sm:text-6xl md:text-7xl font-black leading-none tabular-nums"
                  style={{
                    color: vencedorB ? '#4ade80' : GOLD2,
                    textShadow: vencedorB ? '0 0 30px #4ade8060' : `0 0 20px ${GOLD}40`,
                  }}
                >
                  {partida.placar_timeB}
                </span>
              </div>

              {/* Duração */}
              {durMin && (
                <div className="flex items-center gap-1 mt-1">
                  <Clock size={9} style={{ color: `${GOLD}50` }} />
                  <span className="text-[9px]" style={{ color: `${GOLD}50` }}>{durMin} min</span>
                </div>
              )}

              {/* Placar de pênaltis */}
              {(partida.placar_penaltis_timeA > 0 || partida.placar_penaltis_timeB > 0) && (
                <div className="mt-1 px-2 py-0.5 rounded text-[9px] font-bold"
                  style={{ background: `${GOLD}10`, color: `${GOLD}80`, border: `1px solid ${GOLD}20` }}>
                  pên. {partida.placar_penaltis_timeA} – {partida.placar_penaltis_timeB}
                </div>
              )}
            </motion.div>

            {/* TIME B */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex flex-col items-center gap-2 flex-1 min-w-0"
            >
              <div className="relative">
                <TeamLogo logo={partida.timeB_logo} nome={partida.timeB_nome} size={72} />
                {vencedorB && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade8060' }}>
                    <Trophy size={10} className="text-black" />
                  </div>
                )}
              </div>
              <span className="text-xs sm:text-sm font-black text-center text-white uppercase tracking-wide leading-tight max-w-[90px] sm:max-w-[160px] truncate">
                {partida.timeB_nome}
              </span>
              {vencedorB && (
                <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: '#4ade80' }}>
                  • vencedor
                </span>
              )}
            </motion.div>
          </div>

          {/* Goleiros */}
          {(partida.goleiro_timeA_nome || partida.goleiro_timeB_nome) && (
            <div className="flex justify-between px-6 pb-4 mt-1">
              {[
                { nome: partida.goleiro_timeA_nome, foto: partida.goleiro_timeA_foto },
                { nome: partida.goleiro_timeB_nome, foto: partida.goleiro_timeB_foto },
              ].map((g, i) => g.nome ? (
                <div key={i} className={`flex items-center gap-2 ${i === 1 ? 'flex-row-reverse' : ''}`}>
                  <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center"
                    style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                    {g.foto
                      ? <img src={g.foto} className="w-full h-full object-cover" />
                      : <Shield size={10} style={{ color: CYAN }} />
                    }
                  </div>
                  <div>
                    <span className="text-[9px] block" style={{ color: `${CYAN}70` }}>goleiro</span>
                    <span className="text-[11px] font-bold text-white">{g.nome}</span>
                  </div>
                </div>
              ) : <div key={i} />)}
            </div>
          )}

          {/* Bottom line */}
          <div className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${GOLD}30, transparent)` }} />
        </motion.div>

        {/* ══════════════════════════════════════════════
            MVP DA PARTIDA
        ══════════════════════════════════════════════ */}
        {mvp && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative rounded-xl p-4 mb-6 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${GOLD}12, ${DARK2})`,
              border: `1px solid ${GOLD}30`,
            }}
          >
            <Corner pos="tl" /><Corner pos="br" />
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

            <div className="flex items-center gap-4">
              {/* Avatar MVP */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-xl overflow-hidden"
                  style={{ border: `2px solid ${GOLD}50`, boxShadow: `0 0 20px ${GOLD}30` }}>
                  {mvp.foto_url
                    ? <img src={mvp.foto_url} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center" style={{ background: `${GOLD}15` }}>
                        <Star size={20} style={{ color: GOLD }} />
                      </div>
                  }
                </div>
                {/* Star badge */}
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: GOLD, boxShadow: `0 0 8px ${GOLD}60` }}>
                  <Star size={10} className="text-black" fill="black" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: `${GOLD}70` }}>
                    MVP da Partida
                  </span>
                </div>
                <h3 className="text-lg font-black text-white truncate">{mvp.nome}</h3>
                <div className="flex items-center gap-3 mt-0.5">
                  {parseInt(mvp.gols) > 0 && (
                    <span className="text-xs font-bold" style={{ color: '#4ade80' }}>{mvp.gols} gol{parseInt(mvp.gols) > 1 ? 's' : ''}</span>
                  )}
                  {parseInt(mvp.assistencias) > 0 && (
                    <span className="text-xs font-bold" style={{ color: CYAN }}>{mvp.assistencias} assist</span>
                  )}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="text-3xl font-black" style={{ color: GOLD }}>{mvp.pts}</span>
                <p className="text-[8px] uppercase tracking-wider" style={{ color: `${GOLD}60` }}>pts</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            TIMELINE DE GOLS
        ══════════════════════════════════════════════ */}
        {eventos && eventos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative rounded-xl p-5 mb-6"
            style={{ background: DARK2, border: `1px solid ${GOLD}15` }}
          >
            <Corner pos="tl" /><Corner pos="br" />
            <SectionDiv icon={Target} label="Lances da Partida" />

            <div className="space-y-3 relative">
              {/* Linha central */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
                style={{ background: `${GOLD}15` }} />

              {eventos.map((ev: any, i: number) => (
                <EventoItem key={ev.id || i} evento={ev} isTimeA={ev.lado === 'timeA'} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            ELENCOS DOS TIMES (SIDE BY SIDE)
        ══════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* TIME A */}
          <div className="relative rounded-xl p-4"
            style={{ background: DARK2, border: `1px solid ${vencedorA ? '#4ade8025' : `${GOLD}15`}` }}>
            <Corner pos="tl" />

            {/* Header time */}
            <div className="flex items-center gap-3 mb-3">
              <TeamLogo logo={partida.timeA_logo} nome={partida.timeA_nome} size={36} />
              <div>
                <h3 className="font-black text-white text-sm uppercase">{partida.timeA_nome}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black" style={{ color: vencedorA ? '#4ade80' : GOLD2 }}>
                    {partida.placar_timeA}
                  </span>
                  {vencedorA && <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: '#4ade80' }}>vencedor</span>}
                </div>
              </div>
            </div>

            <div className="h-px mb-3" style={{ background: `${GOLD}15` }} />

            <div className="space-y-1.5">
              {timeA?.map((p: any, i: number) => (
                <PlayerRow
                  key={p.jogador_id}
                  player={p}
                  isWinner={vencedorA}
                  accent={vencedorA ? '#4ade80' : GOLD}
                  isMvp={mvp?.jogador_id === p.jogador_id}
                />
              ))}
              {(!timeA || timeA.length === 0) && (
                <p className="text-center py-4 text-xs" style={{ color: `${GOLD2}30` }}>Sem dados de elenco</p>
              )}
            </div>
          </div>

          {/* TIME B */}
          <div className="relative rounded-xl p-4"
            style={{ background: DARK2, border: `1px solid ${vencedorB ? '#4ade8025' : `${GOLD}15`}` }}>
            <Corner pos="tr" />

            {/* Header time */}
            <div className="flex items-center gap-3 mb-3">
              <TeamLogo logo={partida.timeB_logo} nome={partida.timeB_nome} size={36} />
              <div>
                <h3 className="font-black text-white text-sm uppercase">{partida.timeB_nome}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black" style={{ color: vencedorB ? '#4ade80' : GOLD2 }}>
                    {partida.placar_timeB}
                  </span>
                  {vencedorB && <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: '#4ade80' }}>vencedor</span>}
                </div>
              </div>
            </div>

            <div className="h-px mb-3" style={{ background: `${GOLD}15` }} />

            <div className="space-y-1.5">
              {timeB?.map((p: any, i: number) => (
                <PlayerRow
                  key={p.jogador_id}
                  player={p}
                  isWinner={vencedorB}
                  accent={vencedorB ? '#4ade80' : GOLD}
                  isMvp={mvp?.jogador_id === p.jogador_id}
                />
              ))}
              {(!timeB || timeB.length === 0) && (
                <p className="text-center py-4 text-xs" style={{ color: `${GOLD2}30` }}>Sem dados de elenco</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Estatísticas comparativas ── */}
        {(timeA?.length > 0 || timeB?.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="relative rounded-xl p-5 mt-4"
            style={{ background: DARK2, border: `1px solid ${GOLD}15` }}
          >
            <Corner pos="tl" /><Corner pos="br" />
            <SectionDiv icon={Zap} label="Comparativo" />

            {[
              {
                label: 'Gols',
                a: timeA?.reduce((s: number, p: any) => s + (parseInt(p.gols) || 0), 0) || 0,
                b: timeB?.reduce((s: number, p: any) => s + (parseInt(p.gols) || 0), 0) || 0,
                color: '#4ade80',
              },
              {
                label: 'Assistências',
                a: timeA?.reduce((s: number, p: any) => s + (parseInt(p.assistencias) || 0), 0) || 0,
                b: timeB?.reduce((s: number, p: any) => s + (parseInt(p.assistencias) || 0), 0) || 0,
                color: CYAN,
              },
            ].map(stat => {
              const total = stat.a + stat.b || 1;
              const pctA = Math.round((stat.a / total) * 100);
              const pctB = 100 - pctA;
              return (
                <div key={stat.label} className="mb-4 last:mb-0">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-black" style={{ color: stat.color }}>{stat.a}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: `${GOLD2}50` }}>{stat.label}</span>
                    <span className="text-sm font-black" style={{ color: stat.color }}>{stat.b}</span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                    <div className="rounded-full transition-all" style={{ width: `${pctA}%`, background: vencedorA ? '#4ade80' : stat.color }} />
                    <div className="rounded-full transition-all" style={{ width: `${pctB}%`, background: vencedorB ? '#4ade80' : `${stat.color}50` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[8px]" style={{ color: `${GOLD2}30` }}>{partida.timeA_nome}</span>
                    <span className="text-[8px]" style={{ color: `${GOLD2}30` }}>{partida.timeB_nome}</span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* ── EDIT MODAL ── */}
      {editOpen && data && (
        <PartidaEditModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          partida={{ partida_id: Number(id), ...data.partida }}
        />
      )}
    </div>
  );
}