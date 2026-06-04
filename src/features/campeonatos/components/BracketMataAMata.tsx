// ============================================================================
// ARQUIVO: src/features/Campeonatos/components/BracketMataAMata.tsx
// Visual estilo videogame — entrada cinematográfica, glow, eliminação dramática
// Referência estética: EA FC / Rocket League / Valorant tournament bracket
// ============================================================================

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Trophy, Crown, Medal, Swords, ChevronRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface PartidaBracket {
  id: number;
  fase_mata_mata: string;
  ordem_confronto: number;
  status: string;
  placar_timeA: number | null;
  placar_timeB: number | null;
  placar_penaltis_timeA?: number | null;
  placar_penaltis_timeB?: number | null;
  timeA_id: number;
  timeA_nome: string;
  timeA_logo?: string;
  timeB_id: number;
  timeB_nome: string;
  timeB_logo?: string;
  vencedor_id?: number | null;
  perdedor_id?: number | null;
}

interface BracketData {
  semifinais: PartidaBracket[];
  final: PartidaBracket | null;
  terceiro_lugar?: PartidaBracket | null;
}

interface BracketMataAMataProps {
  bracket: BracketData;
  onPartidaClick: (partida: PartidaBracket) => void;
  campeaoId?: number | null;
  temTerceiroLugar?: boolean;
}

interface TimeBracket {
  id: number;
  nome: string;
  logo?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function deriveWinnerId(p: PartidaBracket): number | null {
  if (p.status !== 'finalizada') return null;
  if (p.vencedor_id) return p.vencedor_id;
  const sA = p.placar_timeA ?? 0;
  const sB = p.placar_timeB ?? 0;
  const pA = p.placar_penaltis_timeA ?? 0;
  const pB = p.placar_penaltis_timeB ?? 0;
  if (sA > sB) return p.timeA_id;
  if (sB > sA) return p.timeB_id;
  if (pA > pB) return p.timeA_id;
  if (pB > pA) return p.timeB_id;
  return null;
}

function getWinner(semi: PartidaBracket | null): TimeBracket | null {
  if (!semi || semi.status !== 'finalizada') return null;
  const wId = deriveWinnerId(semi);
  if (!wId) return null;
  if (wId === semi.timeA_id) return { id: semi.timeA_id, nome: semi.timeA_nome, logo: semi.timeA_logo };
  return { id: semi.timeB_id, nome: semi.timeB_nome, logo: semi.timeB_logo };
}

function getLoser(semi: PartidaBracket | null): TimeBracket | null {
  if (!semi || semi.status !== 'finalizada') return null;
  const wId = deriveWinnerId(semi);
  if (!wId) return null;
  if (wId === semi.timeA_id) return { id: semi.timeB_id, nome: semi.timeB_nome, logo: semi.timeB_logo };
  return { id: semi.timeA_id, nome: semi.timeA_nome, logo: semi.timeA_logo };
}

function foiPenaltis(p: PartidaBracket | null): boolean {
  if (!p || p.status !== 'finalizada') return false;
  return (p.placar_penaltis_timeA != null || p.placar_penaltis_timeB != null) &&
    p.placar_timeA === p.placar_timeB;
}

// ─── Fundo com grid ─────────────────────────────────────────────────────────

const BracketGrid = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
    <div
      className="absolute inset-0 opacity-[0.04]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(6,182,212,1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }}
    />
    {/* Scanlines sutis */}
    <div
      className="absolute inset-0 opacity-[0.025]"
      style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,255,255,1) 3px, rgba(0,255,255,1) 4px)',
      }}
    />
  </div>
);

// ─── Placar animado ──────────────────────────────────────────────────────────

const AnimatedScore = ({ value, isWinner, isLoser }: { value: number | null; isWinner: boolean; isLoser: boolean }) => {
  if (value == null) return null;
  return (
    <motion.span
      key={value}
      initial={{ scale: 2.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={cn(
        'text-xl font-black tabular-nums min-w-[1.5rem] text-center',
        isWinner && 'text-emerald-400',
        isLoser && 'text-white/25',
        !isWinner && !isLoser && 'text-white/80',
      )}
    >
      {value}
    </motion.span>
  );
};

// ─── Linha de um time no card ────────────────────────────────────────────────

interface TeamRowProps {
  team: TimeBracket | null;
  placar?: number | null;
  pens?: number | null;
  isWinner: boolean;
  isLoser: boolean;
  position: 'top' | 'bottom';
  isCampeao?: boolean;
  delay?: number;
}

const TeamRow = ({ team, placar, pens, isWinner, isLoser, position, isCampeao, delay = 0 }: TeamRowProps) => {
  const isTop = position === 'top';

  if (!team) {
    return (
      <div className={cn(
        'flex items-center gap-2.5 px-3 py-3 border border-dashed border-white/[0.07]',
        isTop ? 'rounded-t-lg' : 'rounded-b-lg',
        'bg-white/[0.02]',
      )}>
        <div className="w-7 h-7 rounded bg-white/[0.05] animate-pulse flex-shrink-0" />
        <span className="text-white/20 text-xs italic tracking-wider">A DEFINIR</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: isTop ? -20 : 20 }}
      animate={{
        opacity: isLoser ? 0.25 : 1,
        x: 0,
      }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={cn(
        'relative flex items-center justify-between px-3 py-2.5 transition-colors overflow-hidden',
        isTop ? 'rounded-t-lg' : 'rounded-b-lg',
        isWinner && 'bg-emerald-500/10',
        isLoser && 'bg-black/30',
        !isWinner && !isLoser && 'bg-white/[0.03]',
      )}
      style={isWinner ? {
        boxShadow: 'inset 0 0 20px rgba(52,211,153,0.06)',
      } : undefined}
    >
      {/* Borda lateral colorida no vencedor */}
      {isWinner && (
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.35, delay: delay + 0.15 }}
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-400 origin-top"
        />
      )}
      {isLoser && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-600/50" />
      )}

      <div className="flex items-center gap-2.5 min-w-0">
        {/* Logo */}
        <div className={cn(
          'w-7 h-7 rounded flex items-center justify-center text-[10px] font-black overflow-hidden flex-shrink-0 transition-all',
          isWinner && 'ring-1 ring-emerald-400/60',
          isLoser && 'grayscale opacity-50',
        )}>
          {team.logo
            ? <img src={team.logo} alt={team.nome} className="w-full h-full object-contain" />
            : <span className={isWinner ? 'text-emerald-400' : 'text-white/40'}>{team.nome.substring(0, 2).toUpperCase()}</span>
          }
        </div>

        {/* Nome */}
        <span className={cn(
          'text-sm font-bold tracking-wide truncate uppercase',
          isWinner && 'text-emerald-300',
          isLoser && 'text-white/20 line-through decoration-red-500/50',
          !isWinner && !isLoser && 'text-white/80',
        )}>
          {team.nome}
        </span>

        {/* Badges */}
        {isCampeao && isWinner && (
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: delay + 0.3 }}>
            <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          </motion.div>
        )}
      </div>

      {/* Lado direito: placar + badges */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {isLoser && (
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.2, type: 'spring' }}
            className="text-[9px] font-black tracking-widest text-red-500/70 uppercase border border-red-500/30 px-1.5 py-0.5 rounded"
          >
            OUT
          </motion.span>
        )}
        {isWinner && !isCampeao && placar != null && (
          <motion.span
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.25 }}
            className="text-[9px] font-black tracking-widest text-emerald-400/70 uppercase"
          >
            ✦ WIN
          </motion.span>
        )}
        {pens != null && (
          <span className="text-[10px] text-white/30 font-mono">({pens})</span>
        )}
        {placar != null && (
          <AnimatedScore value={placar} isWinner={isWinner} isLoser={isLoser} />
        )}
      </div>
    </motion.div>
  );
};

// ─── Card de partida ─────────────────────────────────────────────────────────

interface MatchCardProps {
  label: string;
  labelIcon?: React.ReactNode;
  partida: PartidaBracket | null;
  teamA?: TimeBracket | null;
  teamB?: TimeBracket | null;
  onClick?: () => void;
  isFinal?: boolean;
  isTerceiroLugar?: boolean;
  campeaoId?: number | null;
  entranceDelay?: number;
  entranceFrom?: 'left' | 'right';
}

const MatchCard = ({
  label, labelIcon, partida, teamA, teamB, onClick,
  isFinal, isTerceiroLugar, campeaoId, entranceDelay = 0, entranceFrom = 'left',
}: MatchCardProps) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  const isFinalizada = partida?.status === 'finalizada';
  const pens = foiPenaltis(partida ?? null);

  const tA: TimeBracket | null = partida
    ? (partida.timeA_id ? { id: partida.timeA_id, nome: partida.timeA_nome, logo: partida.timeA_logo } : null)
    : (teamA ?? null);
  const tB: TimeBracket | null = partida
    ? (partida.timeB_id ? { id: partida.timeB_id, nome: partida.timeB_nome, logo: partida.timeB_logo } : null)
    : (teamB ?? null);

  const winnerId = partida ? deriveWinnerId(partida) : null;
  const timeAVenceu = isFinalizada && !!winnerId && winnerId === partida?.timeA_id;
  const timeBVenceu = isFinalizada && !!winnerId && winnerId === partida?.timeB_id;

  // Só permite clicar se a partida existe, não está finalizada E os dois times estão definidos
  const teamsReady = !!(tA && tB);
  const canClick = !!partida && !isFinalizada && teamsReady;

  const borderColor = isFinal
    ? 'border-amber-500/50'
    : isTerceiroLugar
    ? 'border-orange-400/30'
    : isFinalizada
    ? 'border-emerald-500/25'
    : 'border-cyan-500/20';

  const glowStyle = isFinalizada && isFinal
    ? { boxShadow: '0 0 30px rgba(245,158,11,0.12), 0 0 60px rgba(245,158,11,0.06)' }
    : isFinalizada
    ? { boxShadow: '0 0 20px rgba(52,211,153,0.08)' }
    : {};

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: entranceFrom === 'left' ? -40 : 40, scale: 0.95 }}
      animate={inView ? { opacity: 1, x: 0, scale: 1 } : {}}
      transition={{ type: 'spring', stiffness: 180, damping: 20, delay: entranceDelay }}
      whileHover={canClick ? { scale: 1.02 } : undefined}
      whileTap={canClick ? { scale: 0.98 } : undefined}
      onClick={canClick && onClick ? onClick : undefined}
      className={cn(
        'relative rounded-lg overflow-hidden border transition-all',
        borderColor,
        canClick && 'cursor-pointer',
        isFinal && 'ring-1 ring-amber-500/10',
      )}
      style={glowStyle}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-3 py-1.5 border-b',
        isFinal
          ? 'bg-gradient-to-r from-amber-500/15 via-yellow-600/10 to-amber-500/15 border-amber-500/20'
          : isTerceiroLugar
          ? 'bg-orange-500/10 border-orange-400/20'
          : isFinalizada
          ? 'bg-emerald-500/8 border-emerald-500/15'
          : 'bg-cyan-500/5 border-cyan-500/10',
      )}>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'text-[10px]',
            isFinal ? 'text-amber-400' : isTerceiroLugar ? 'text-orange-400' : isFinalizada ? 'text-emerald-400' : 'text-cyan-400',
          )}>
            {labelIcon ?? <Swords size={10} />}
          </span>
          <span className={cn(
            'text-[10px] font-black uppercase tracking-[0.15em]',
            isFinal ? 'text-amber-300' : isTerceiroLugar ? 'text-orange-300' : isFinalizada ? 'text-emerald-300' : 'text-cyan-300',
          )}>
            {label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {pens && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/15 text-amber-400 tracking-wider">
              PEN.
            </span>
          )}
          {partida ? (
            <span className={cn(
              'text-[9px] font-black px-1.5 py-0.5 rounded border tracking-wider uppercase',
              isFinalizada
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400/60',
            )}>
              {isFinalizada ? 'FIM' : 'AO VIVO'}
            </span>
          ) : (tA || tB) ? (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded border border-white/[0.08] text-white/25 tracking-wider uppercase">
              AGUARDA
            </span>
          ) : null}
        </div>
      </div>

      {/* Times */}
      <div className="flex flex-col">
        <TeamRow
          team={tA}
          placar={partida?.placar_timeA}
          pens={pens ? partida?.placar_penaltis_timeA : null}
          isWinner={timeAVenceu}
          isLoser={timeBVenceu}
          position="top"
          isCampeao={campeaoId != null && campeaoId === tA?.id}
          delay={entranceDelay + 0.08}
        />
        <div className="h-px bg-white/[0.04]" />
        <TeamRow
          team={tB}
          placar={partida?.placar_timeB}
          pens={pens ? partida?.placar_penaltis_timeB : null}
          isWinner={timeBVenceu}
          isLoser={timeAVenceu}
          position="bottom"
          isCampeao={campeaoId != null && campeaoId === tB?.id}
          delay={entranceDelay + 0.14}
        />
      </div>

      {/* Flash de finalização */}
      {isFinalizada && (
        <motion.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8, delay: entranceDelay + 0.2 }}
          className="absolute inset-0 bg-emerald-400/10 pointer-events-none"
        />
      )}
    </motion.div>
  );
};

// ─── Conector SVG animado ────────────────────────────────────────────────────

const AnimatedConnector = ({ hasWinners }: { hasWinners: boolean }) => {
  const color = hasWinners ? 'rgba(52,211,153,0.5)' : 'rgba(6,182,212,0.25)';
  const arrowColor = hasWinners ? 'rgba(52,211,153,0.8)' : 'rgba(6,182,212,0.5)';

  return (
    <div className="hidden sm:flex flex-col justify-center items-center self-stretch w-10 flex-shrink-0">
      <svg width="40" height="130" viewBox="0 0 40 130" fill="none" className="overflow-visible">
        {/* Linha top semi → nó */}
        <motion.path d="M 0 32 L 20 32" stroke={color} strokeWidth="1.5"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }} />

        {/* Linha bottom semi → nó */}
        <motion.path d="M 0 98 L 20 98" stroke={color} strokeWidth="1.5"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }} />

        {/* Vertical unindo os dois */}
        <motion.path d="M 20 32 L 20 98" stroke={color} strokeWidth="1.5"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.85 }} />

        {/* Linha para a final */}
        <motion.path d="M 20 65 L 40 65" stroke={arrowColor} strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 1.3 }} />

        {/* Ponta de seta */}
        <motion.path d="M 33 60 L 40 65 L 33 70" stroke={arrowColor} strokeWidth="1.5" fill="none"
          initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.55, type: 'spring', stiffness: 400 }} />

        {/* Nó central pulsante */}
        <motion.circle cx="20" cy="65" r="3" fill={color}
          animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1.4 }} />
      </svg>
    </div>
  );
};

// ─── Banner épico do campeão ─────────────────────────────────────────────────

const CONFETTI_COLORS = ['bg-amber-400', 'bg-yellow-300', 'bg-emerald-400', 'bg-cyan-400', 'bg-red-400', 'bg-pink-400'];
const CONFETTI = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  left: `${6 + i * 6}%`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  duration: 2.2 + (i % 5) * 0.4,
  delay: (i % 8) * 0.18,
  xDrift: (i % 2 === 0 ? 1 : -1) * (10 + (i % 4) * 8),
}));

interface CampeaoTrophyProps {
  timeNome?: string;
  timeLogo?: string;
}

const CampeaoTrophy = ({ timeNome, timeLogo }: CampeaoTrophyProps) => (
  <motion.div
    initial={{ opacity: 0, y: -20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.1 }}
    className="relative mb-5 rounded-2xl overflow-hidden"
    style={{ border: '1px solid rgba(251,191,36,0.3)' }}
  >
    {/* Fundo */}
    <div className="absolute inset-0 bg-gradient-to-br from-[#1a0f00] via-[#2a1800] to-[#1a0f00]" />

    {/* Shimmer scanline */}
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.08) 50%, transparent 100%)',
      }}
      animate={{ x: ['-100%', '200%'] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
    />

    {/* Borda pulsante */}
    <motion.div
      className="absolute inset-0 rounded-2xl pointer-events-none"
      style={{ border: '1px solid rgba(251,191,36,0.6)' }}
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 2.5, repeat: Infinity }}
    />

    {/* Confetti caindo */}
    {CONFETTI.map(p => (
      <motion.div
        key={p.id}
        className={`absolute w-1.5 h-1.5 rounded-full ${p.color} pointer-events-none`}
        style={{ left: p.left, top: 0 }}
        animate={{ y: ['0px', '90px'], x: [`0px`, `${p.xDrift}px`], opacity: [1, 0], rotate: [0, 270] }}
        transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeIn' }}
      />
    ))}

    {/* Conteúdo */}
    <div className="relative z-10 px-5 py-5 flex flex-col items-center gap-3">
      {/* Label */}
      <motion.p
        initial={{ letterSpacing: '0.2em', opacity: 0 }}
        animate={{ letterSpacing: '0.5em', opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.3 }}
        className="text-[9px] font-black text-amber-400/70 uppercase tracking-[0.5em]"
      >
        ★ CAMPEÃO ★
      </motion.p>

      {/* Troféu + Logo lado a lado */}
      <div className="flex items-center gap-5">
        {/* Troféu animado */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.4 }}
        >
          <motion.div
            animate={{ rotate: [-4, 4, -4], y: [0, -4, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)',
              boxShadow: '0 0 30px rgba(251,191,36,0.5), 0 0 60px rgba(251,191,36,0.2)',
            }}
          >
            <Trophy className="w-9 h-9 text-white drop-shadow-lg" />
          </motion.div>
        </motion.div>

        {/* Logo do time */}
        {timeLogo && (
          <motion.div
            initial={{ scale: 0, rotate: 360 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 140, delay: 0.6 }}
            className="relative"
          >
            <div
              className="w-16 h-16 rounded-full overflow-hidden"
              style={{ border: '3px solid rgba(251,191,36,0.7)', boxShadow: '0 0 20px rgba(251,191,36,0.4)' }}
            >
              <img src={timeLogo} alt={timeNome} className="w-full h-full object-contain" />
            </div>
            {/* Crown no topo do logo */}
            <motion.div
              className="absolute -top-2 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center"
              style={{ border: '2px solid #030611', boxShadow: '0 0 8px rgba(251,191,36,0.6)' }}
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              <Crown className="w-2.5 h-2.5 text-white" />
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Nome do time */}
      {timeNome && (
        <motion.h2
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 180, delay: 0.85 }}
          className="text-xl font-black uppercase text-center text-white tracking-widest"
          style={{ textShadow: '0 0 25px rgba(251,191,36,0.6), 0 2px 4px rgba(0,0,0,0.8)' }}
        >
          {timeNome}
        </motion.h2>
      )}

      {/* Estrelinhas decorativas */}
      <motion.div
        className="flex items-center gap-1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
      >
        {['★', '★', '★'].map((s, i) => (
          <motion.span
            key={i}
            className="text-amber-400 text-xs"
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          >
            {s}
          </motion.span>
        ))}
      </motion.div>
    </div>
  </motion.div>
);

// ─── Componente principal ────────────────────────────────────────────────────

export function BracketMataAMata({ bracket, onPartidaClick, campeaoId, temTerceiroLugar }: BracketMataAMataProps) {
  const { semifinais, final, terceiro_lugar } = bracket;
  const containerRef = useRef(null);

  const semi1 = semifinais[0] ?? null;
  const semi2 = semifinais[1] ?? null;

  const winner1 = getWinner(semi1);
  const winner2 = getWinner(semi2);
  const loser1 = getLoser(semi1);
  const loser2 = getLoser(semi2);

  const hasWinners = !!(winner1 || winner2);
  const mostrarTerceiro = temTerceiroLugar || terceiro_lugar != null;

  if (!semi1 && !semi2) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <Swords className="w-14 h-14 text-cyan-500/20 mb-4" />
        </motion.div>
        <h3 className="text-base font-black text-white/50 uppercase tracking-widest">Mata-Mata não iniciado</h3>
        <p className="text-white/30 text-sm mt-1">Finalize a fase de grupos para gerar o chaveamento.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full overflow-x-auto rounded-xl -mx-1 px-1">
      {/* Fundo com grid */}
      <div className="relative bg-[#030611]/60 rounded-xl border border-white/[0.04] overflow-hidden">
        <BracketGrid />

        <div className="relative z-10 p-4 min-w-[300px] max-w-xl mx-auto">

          {/* Título */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-5"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5">
              <Zap size={12} className="text-cyan-400" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
                Chaveamento Mata-Mata
              </span>
              <Zap size={12} className="text-cyan-400" />
            </div>
          </motion.div>

          {/* Troféu */}
          {campeaoId && <CampeaoTrophy />}

          {/* Bracket */}
          <div className="flex items-stretch gap-2">

            {/* Coluna esquerda: Semifinais */}
            <div className="flex-1 flex flex-col gap-3 min-w-0">
              {semi1 && (
                <MatchCard
                  label="Semifinal 1"
                  partida={semi1}
                  onClick={() => onPartidaClick(semi1)}
                  entranceDelay={0.1}
                  entranceFrom="left"
                />
              )}
              {semi2 && (
                <MatchCard
                  label="Semifinal 2"
                  partida={semi2}
                  onClick={() => onPartidaClick(semi2)}
                  entranceDelay={0.2}
                  entranceFrom="left"
                />
              )}
            </div>

            {/* Conector animado */}
            <AnimatedConnector hasWinners={hasWinners} />

            {/* Coluna direita: Final + 3º Lugar */}
            <div className="flex-1 flex flex-col gap-3 min-w-0 justify-center">
              <MatchCard
                label="Final"
                labelIcon={<Trophy size={10} />}
                partida={final}
                teamA={winner1}
                teamB={winner2}
                onClick={final ? () => onPartidaClick(final) : undefined}
                isFinal
                campeaoId={campeaoId}
                entranceDelay={0.35}
                entranceFrom="right"
              />

              {mostrarTerceiro && (
                <MatchCard
                  label="3º Lugar"
                  labelIcon={<Medal size={10} />}
                  partida={terceiro_lugar ?? null}
                  teamA={loser1}
                  teamB={loser2}
                  onClick={terceiro_lugar ? () => onPartidaClick(terceiro_lugar) : undefined}
                  isTerceiroLugar
                  entranceDelay={0.45}
                  entranceFrom="right"
                />
              )}
            </div>
          </div>

          {/* Legenda */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="flex items-center justify-center gap-5 mt-5 pt-4 border-t border-white/[0.05]"
          >
            {[
              { color: 'bg-emerald-500', label: 'VENCEDOR' },
              { color: 'bg-cyan-500/40', label: 'PENDENTE' },
              { color: 'bg-white/15', label: 'ELIMINADO' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={cn('w-2 h-2 rounded-full', color)} />
                <span className="text-[9px] font-black tracking-widest text-white/25 uppercase">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default BracketMataAMata;
