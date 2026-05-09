// Arquivo: src/features/HallDaFama/routes/HallDaFamaPage.tsx
import { useState, useRef, memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useScroll, useTransform } from 'framer-motion';
import api from '@/api';
import {
  Trophy, Star, Crown, Shield, Flame, TrendingUp,
  Target, Goal, Users, Zap, Award, Activity, Swords, Heart,
  Medal, Sparkles, Hand
} from 'lucide-react';
import { cn } from '@/lib/utils';
import icHallDaFama from '@/assets/icones/halldafama.webp';

// ─── PALETA RIOT ──────────────────────────────────────────
// Ouro:    #C89B3C  /  #F0E6D3
// Escuro:  #010A13  /  #0A1428
// Prata:   #A0A0AB
// Accent:  #C8AA6E (ouro claro)
// ──────────────────────────────────────────────────────────

// Partículas douradas flutuantes
const GoldParticles = () => {
  const pts = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: 5 + (i * 4.7) % 90,
    y: 10 + (i * 7.3) % 80,
    size: 1 + (i % 3),
    dur: 7 + (i % 5) * 2,
    delay: (i * 0.8) % 8,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {pts.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            background: '#C89B3C',
            boxShadow: '0 0 4px #C89B3C',
          }}
          animate={{ y: [0, -60, 0], opacity: [0, 0.7, 0] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
};

// Divisor temático entre seções
const GoldDivider = () => (
  <div className="flex items-center gap-4 my-16">
    <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #C89B3C40)' }} />
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 rotate-45 bg-[#C89B3C]" />
      <Crown size={14} style={{ color: '#C89B3C' }} fill="currentColor" />
      <div className="w-1.5 h-1.5 rotate-45 bg-[#C89B3C]" />
    </div>
    <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #C89B3C40, transparent)' }} />
  </div>
);

// Label de capítulo estilo Riot
const ChapterLabel = ({ num, title, subtitle }: { num: string; title: string; subtitle?: string }) => (
  <motion.div
    initial={{ opacity: 0, x: -40 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
    className="flex items-start gap-5 mb-10"
  >
    {/* Número grande decorativo */}
    <div className="flex-shrink-0 flex flex-col items-center pt-1">
      <span className="text-[9px] font-black tracking-[0.35em] uppercase" style={{ color: '#C89B3C80' }}>Capítulo</span>
      <span
        className="text-6xl font-black leading-none"
        style={{
          color: 'transparent',
          WebkitTextStroke: '1px #C89B3C30',
          fontVariantNumeric: 'tabular-nums',
        }}
      >{num}</span>
    </div>

    {/* Linha vertical */}
    <div className="w-px self-stretch mt-1" style={{ background: 'linear-gradient(180deg, #C89B3C, #C89B3C20)' }} />

    {/* Texto */}
    <div className="flex-1 pt-2">
      <h2
        className="text-2xl md:text-4xl font-black uppercase leading-none tracking-tight"
        style={{
          background: 'linear-gradient(180deg, #F0E6D3 0%, #C89B3C 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >{title}</h2>
      {subtitle && (
        <p className="text-sm mt-1.5 font-medium" style={{ color: '#A0A0AB' }}>{subtitle}</p>
      )}
    </div>

    {/* Linha horizontal */}
    <div className="hidden md:block flex-1 self-center h-px" style={{ background: 'linear-gradient(90deg, #C89B3C30, transparent)' }} />
  </motion.div>
);

// Avatar
const Av = ({ foto, nome, size = 'md', ring = false, ringColor = '#C89B3C', className = '' }: any) => {
  const s: Record<string, string> = {
    xs: 'w-6 h-6 text-[8px]', sm: 'w-9 h-9 text-[10px]',
    md: 'w-12 h-12 text-sm', lg: 'w-16 h-16 text-base',
    xl: 'w-20 h-20 text-lg', hero: 'w-36 h-36 md:w-48 md:h-48 text-2xl',
  };
  return (
    <div
      className={cn('rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center', s[size], className)}
      style={{
        background: '#0A1428',
        outline: ring ? `2px solid ${ringColor}` : 'none',
        outlineOffset: ring ? '3px' : '0',
        boxShadow: ring ? `0 0 20px ${ringColor}40` : 'none',
      }}
    >
      {foto
        ? <img src={foto} className="w-full h-full object-cover" alt={nome} />
        : <span className="font-black" style={{ color: '#C89B3C' }}>{(nome || '??').substring(0, 2).toUpperCase()}</span>}
    </div>
  );
};

// ─── GOAT HERO ────────────────────────────────────────────
const GoatHero = ({ goat }: any) => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const fgOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  if (!goat) return null;

  return (
    <div ref={heroRef} className="relative min-h-screen flex items-end pb-20 overflow-hidden">
      {/* Fundo atmosférico */}
      <motion.div style={{ y: bgY }} className="absolute inset-0">
        {/* Base escura */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #010A13 0%, #0A1428 60%, #010A13 100%)' }} />
        {/* Textura de linhas diagonais */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(135deg, #C89B3C 0px, #C89B3C 1px, transparent 1px, transparent 40px)',
          }}
        />
        {/* Vigência central */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(200,155,60,0.12) 0%, transparent 70%)',
          }}
        />
        {/* Foto do GOAT em destaque */}
        {goat.foto_url && (
          <div className="absolute inset-0 flex justify-center">
            <div className="relative w-full max-w-lg h-full">
              <img
                src={goat.foto_url}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[85%] object-contain object-bottom"
                style={{ filter: 'drop-shadow(0 0 60px rgba(200,155,60,0.3))', opacity: 0.85 }}
                alt={goat.nome}
              />
              {/* Fade inferior */}
              <div
                className="absolute bottom-0 left-0 right-0 h-48"
                style={{ background: 'linear-gradient(0deg, #010A13 0%, transparent 100%)' }}
              />
            </div>
          </div>
        )}
        {/* Fade de borda */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, #010A13 0%, transparent 30%, transparent 70%, #010A13 100%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-64" style={{ background: 'linear-gradient(0deg, #010A13, transparent)' }} />
      </motion.div>

      {/* Conteúdo do hero */}
      <motion.div style={{ opacity: fgOpacity }} className="relative z-10 w-full container-main px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">

          {/* Lado esquerdo: texto */}
          <div>
            {/* Label topo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 mb-6"
            >
              <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, transparent, #C89B3C)' }} />
              <span className="text-[10px] font-black tracking-[0.4em] uppercase" style={{ color: '#C89B3C' }}>
                Panteão das Lendas · FutLendas
              </span>
            </motion.div>

            {/* Título principal */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="flex items-center gap-3 sm:gap-4 mb-4"
            >
              <img src={icHallDaFama} alt="" className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 drop-shadow-lg" />
              <h1
                className="text-5xl sm:text-7xl md:text-9xl uppercase leading-none tracking-tighter"
                style={{
                  fontFamily: "'Montserrat', Arial, sans-serif",
                  fontWeight: 900,
                  background: 'linear-gradient(170deg, #FFFFFF 0%, #F0E6D3 30%, #C89B3C 70%, #8B6914 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: 'none',
                }}
              >
                Hall<br />da<br />Fama
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-base mb-10"
              style={{ color: '#A0A0AB' }}
            >
              Onde lendas são imortalizadas para sempre
            </motion.p>

            {/* Card GOAT */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.7 }}
            >
              {/* Tag */}
              <div
                className="inline-flex items-center gap-2 px-3 py-1 mb-3 text-[10px] font-black uppercase tracking-widest rounded-sm"
                style={{ background: '#C89B3C', color: '#010A13' }}
              >
                <Crown size={11} fill="currentColor" /> G.O.A.T — Greatest of All Time
              </div>

              {/* Card glassmorphism */}
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(200,155,60,0.12) 0%, rgba(10,20,40,0.9) 100%)',
                  border: '1px solid rgba(200,155,60,0.3)',
                  boxShadow: '0 0 80px rgba(200,155,60,0.1), inset 0 1px 0 rgba(200,155,60,0.15)',
                }}
              >
                <div className="p-5 flex items-center gap-5">
                  <div className="relative">
                    <Av foto={goat.foto_url} nome={goat.nome} size="xl" ring ringColor="#C89B3C" />
                    {/* Badge coroa */}
                    <div
                      className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: '#C89B3C', boxShadow: '0 0 16px #C89B3C60' }}
                    >
                      <Crown size={14} className="text-[#010A13]" fill="currentColor" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-3xl font-black text-white uppercase tracking-tight truncate">{goat.nome}</p>
                    <p className="text-sm font-bold mb-3" style={{ color: '#C89B3C' }}>#1 All-Time · Score Lendário</p>

                    <div className="flex flex-wrap gap-2">
                      {[
                        { v: goat.score_lendario, l: 'Score', c: '#C89B3C' },
                        { v: goat.total_gols, l: 'Gols', c: '#4ade80' },
                        { v: goat.total_assists, l: 'Assists', c: '#22d3ee' },
                        { v: goat.qtd_titulos, l: 'Títulos', c: '#a78bfa' },
                        { v: goat.total_jogos, l: 'Jogos', c: '#F0E6D3' },
                      ].map(s => (
                        <div
                          key={s.l}
                          className="px-3 py-1.5 rounded text-center"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                          <span className="block text-lg font-black leading-none" style={{ color: s.c }}>{s.v}</span>
                          <span className="text-[9px] uppercase tracking-wider" style={{ color: '#A0A0AB' }}>{s.l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Barra inferior dourada */}
                <div className="h-0.5" style={{ background: 'linear-gradient(90deg, #C89B3C, #8B6914, transparent)' }} />
              </div>
            </motion.div>
          </div>

          {/* Lado direito: vazio (espaço para a foto de fundo ocupar) */}
          <div className="hidden lg:block h-[500px]" />
        </div>
      </motion.div>

      {/* Scroll nudge */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        <span className="text-[9px] font-bold tracking-[0.35em] uppercase" style={{ color: '#C89B3C50' }}>Explorar</span>
        <div className="w-px h-10" style={{ background: 'linear-gradient(180deg, #C89B3C60, transparent)' }} />
      </motion.div>
    </div>
  );
};

// ─── RANKING CARD (linha por linha) ──────────────────────
const LegendRow = memo(({ item, rank, valueKey = 'total', valueLabel = '', accentColor = '#C89B3C', delay = 0 }: any) => {
  const medals = ['👑', '🥈', '🥉'];
  const isTop3 = rank <= 3;
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.35 }}
      className="group flex items-center gap-3 px-4 py-2.5 rounded-lg relative overflow-hidden transition-all duration-200"
      style={{
        background: isTop3
          ? `linear-gradient(90deg, ${accentColor}10, transparent)`
          : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isTop3 ? accentColor + '20' : 'rgba(255,255,255,0.04)'}`,
      }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: `linear-gradient(90deg, ${accentColor}08, transparent)` }} />
      {isTop3 && <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full" style={{ background: accentColor }} />}

      <span className="w-7 text-center flex-shrink-0 relative z-10">
        {rank <= 3
          ? <span className="text-base">{medals[rank - 1]}</span>
          : <span className="text-xs font-black" style={{ color: '#A0A0AB60' }}>{rank}</span>}
      </span>

      <Av foto={item.foto_url || item.logo_url} nome={item.nome} size="sm" ring={isTop3} ringColor={accentColor} className="relative z-10" />

      <span className="flex-1 text-sm font-bold text-white truncate relative z-10 group-hover:text-[#F0E6D3] transition-colors">
        {item.nome || 'Desconhecido'}
      </span>

      <div className="text-right relative z-10">
        <span className="text-base font-black" style={{ color: isTop3 ? accentColor : '#e2e8f0' }}>
          {item[valueKey] ?? item.total}
        </span>
        {valueLabel && <p className="text-[9px] uppercase tracking-wider" style={{ color: '#A0A0AB' }}>{valueLabel}</p>}
      </div>
    </motion.div>
  );
});

const RankBlock = memo(({ title, icon: Icon, accentColor = '#C89B3C', data, valueKey = 'total', valueLabel = '', delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    className="rounded-xl overflow-hidden"
    style={{
      background: 'linear-gradient(180deg, rgba(10,20,40,0.9) 0%, rgba(1,10,19,0.95) 100%)',
      border: `1px solid ${accentColor}18`,
      boxShadow: `0 4px 24px rgba(0,0,0,0.4)`,
    }}
  >
    <div
      className="px-4 py-3 flex items-center gap-2.5"
      style={{
        borderBottom: `1px solid ${accentColor}15`,
        background: `linear-gradient(90deg, ${accentColor}12, transparent)`,
      }}
    >
      <Icon size={15} style={{ color: accentColor }} />
      <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#F0E6D3' }}>{title}</span>
    </div>
    <div className="p-2 space-y-1">
      {data?.slice(0, 5).map((item: any, i: number) => (
        <LegendRow key={item.id || i} item={item} rank={i + 1}
          valueKey={valueKey} valueLabel={valueLabel}
          accentColor={accentColor} delay={delay + i * 0.04} />
      ))}
      {(!data || data.length === 0) && (
        <p className="py-8 text-center text-sm" style={{ color: '#A0A0AB60' }}>Sem dados ainda</p>
      )}
    </div>
  </motion.div>
));

// ─── RECORD BADGE ─────────────────────────────────────────
const RecordBadge = memo(({ title, player, value, label, icon: Icon, accentColor = '#C89B3C', delay = 0 }: any) => {
  if (!player) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="relative overflow-hidden rounded-xl group"
      style={{
        background: 'linear-gradient(135deg, rgba(10,20,40,0.95), rgba(1,10,19,0.98))',
        border: `1px solid ${accentColor}20`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Glow corner */}
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-15 group-hover:opacity-25 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle, ${accentColor}, transparent)` }} />

      <div className="relative z-10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: `${accentColor}18` }}>
            <Icon size={14} style={{ color: accentColor }} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: accentColor }}>{title}</span>
        </div>

        <div className="flex items-center gap-3">
          <Av foto={player.foto_url} nome={player.nome} size="md" ring ringColor={accentColor} />
          <div className="flex-1 min-w-0">
            <p className="font-black text-white truncate">{player.nome}</p>
            {player.campeonato_nome && (
              <p className="text-[10px] truncate" style={{ color: '#A0A0AB' }}>{player.campeonato_nome}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-black leading-none" style={{ color: accentColor }}>{value ?? player.recorde}</p>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: '#A0A0AB' }}>{label}</p>
          </div>
        </div>
      </div>

      <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${accentColor}70, transparent)` }} />
    </motion.div>
  );
});

// ─── DUPLA LENDÁRIA ───────────────────────────────────────
const DuplaHero = ({ title, dupla, icon: Icon, accentColor, label, delay = 0 }: any) => {
  if (!dupla) return null;
  const j1n = dupla.artilheiro_nome || dupla.jogador1_nome;
  const j1f = dupla.artilheiro_foto || dupla.jogador1_foto;
  const j2n = dupla.garcom_nome || dupla.jogador2_nome;
  const j2f = dupla.garcom_foto || dupla.jogador2_foto;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="relative overflow-hidden rounded-xl p-5"
      style={{
        background: `linear-gradient(135deg, rgba(10,20,40,0.95), rgba(1,10,19,0.98))`,
        border: `1px solid ${accentColor}25`,
        boxShadow: `0 0 40px ${accentColor}08`,
      }}
    >
      <div className="absolute inset-0 opacity-10"
        style={{ background: `radial-gradient(ellipse at 50% 110%, ${accentColor}, transparent 70%)` }} />

      <p className="text-[10px] font-black uppercase tracking-widest mb-5 relative z-10" style={{ color: accentColor }}>{title}</p>

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex flex-col items-center gap-2 flex-1">
          <Av foto={j1f} nome={j1n} size="lg" ring ringColor={accentColor} />
          <span className="text-xs font-bold text-white text-center truncate w-full max-w-[80px]">{j1n}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
            <Icon size={18} style={{ color: accentColor }} />
          </div>
          <span className="text-2xl font-black" style={{ color: accentColor }}>{dupla.total}</span>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: '#A0A0AB' }}>{label}</span>
        </div>

        <div className="flex flex-col items-center gap-2 flex-1">
          <Av foto={j2f} nome={j2n} size="lg" ring ringColor={accentColor} />
          <span className="text-xs font-bold text-white text-center truncate w-full max-w-[80px]">{j2n}</span>
        </div>
      </div>
    </motion.div>
  );
};

// ─── PARTIDA HISTÓRICA ────────────────────────────────────
const PartidaCard = ({ title, partida, icon: Icon, accentColor, value, label, delay = 0 }: any) => {
  if (!partida) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="relative overflow-hidden rounded-xl p-5"
      style={{
        background: 'linear-gradient(135deg, rgba(10,20,40,0.95), rgba(1,10,19,0.98))',
        border: `1px solid ${accentColor}20`,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={13} style={{ color: accentColor }} />
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: accentColor }}>{title}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded"
          style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}25` }}>
          <span className="text-lg font-black" style={{ color: accentColor }}>{value}</span>
          <span className="text-[9px] uppercase" style={{ color: '#A0A0AB' }}>{label}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <Av foto={partida.timeA_logo} nome={partida.timeA_nome} size="md" />
          <span className="text-xs font-bold text-white text-center truncate w-full max-w-[70px]">{partida.timeA_nome}</span>
        </div>

        <div className="px-4 py-2 rounded-lg text-center"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="text-2xl font-black tracking-widest text-white">
            {partida.placar_timeA ?? 0}
            <span className="mx-2 text-lg" style={{ color: '#A0A0AB' }}>×</span>
            {partida.placar_timeB ?? 0}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1.5 flex-1">
          <Av foto={partida.timeB_logo} nome={partida.timeB_nome} size="md" />
          <span className="text-xs font-bold text-white text-center truncate w-full max-w-[70px]">{partida.timeB_nome}</span>
        </div>
      </div>

      {partida.campeonato_nome && (
        <p className="text-center text-[10px] mt-3" style={{ color: '#A0A0AB60' }}>{partida.campeonato_nome}</p>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}50, transparent)` }} />
    </motion.div>
  );
};

// ─── ESTATÍSTICAS GERAIS ──────────────────────────────────
const StatPillar = memo(({ value, label, color, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    className="relative flex flex-col items-center py-6 rounded-xl overflow-hidden"
    style={{
      background: 'linear-gradient(180deg, rgba(10,20,40,0.8), rgba(1,10,19,0.9))',
      border: '1px solid rgba(200,155,60,0.1)',
    }}
  >
    <div className="absolute bottom-0 left-0 right-0 h-0.5"
      style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
    <span className="text-4xl font-black mb-1.5" style={{ color }}>{value ?? 0}</span>
    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#A0A0AB' }}>{label}</span>
  </motion.div>
));

// =============================================================================
// PÁGINA PRINCIPAL
// =============================================================================
export function HallDaFamaPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['hall-da-fama'],
    queryFn: async () => (await api.get('/stats/hall-da-fama')).data,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#010A13' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
          <Crown size={48} style={{ color: '#C89B3C' }} />
        </motion.div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#010A13' }}>
        <Trophy size={64} style={{ color: '#C89B3C30' }} />
        <p style={{ color: '#A0A0AB' }}>Erro ao carregar o Panteão das Lendas</p>
      </div>
    );
  }

  const { goat, rankings, premios, goleiros, muralhas, recordesPartida, eficiencia, partidasHistoricas, times, duplas, estatisticasGerais } = data;

  return (
    <div className="relative" style={{ background: '#010A13', minHeight: '100vh' }}>
      <GoldParticles />

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <GoatHero goat={goat} />

      {/* ══ CONTEÚDO ══════════════════════════════════════════ */}
      <div className="relative z-10" style={{ background: 'linear-gradient(180deg, #010A13 0%, #050E1A 100%)' }}>
        <div className="container-main section-padding pb-32 space-y-0">

          {/* ── CAP 01: Números da Eternidade ── */}
          {estatisticasGerais && (
            <section className="pt-16">
              <ChapterLabel num="01" title="Números da Eternidade" subtitle="A história toda em dados" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { v: estatisticasGerais.total_partidas, l: 'Partidas', c: '#22d3ee' },
                  { v: estatisticasGerais.total_gols, l: 'Gols', c: '#4ade80' },
                  { v: estatisticasGerais.media_gols, l: 'Média/Jogo', c: '#C89B3C' },
                  { v: estatisticasGerais.total_jogadores, l: 'Jogadores', c: '#a78bfa' },
                  { v: estatisticasGerais.total_campeonatos, l: 'Campeonatos', c: '#f59e0b' },
                  { v: estatisticasGerais.total_times, l: 'Times', c: '#60a5fa' },
                ].map((s, i) => <StatPillar key={s.l} value={s.v} label={s.l} color={s.c} delay={i * 0.07} />)}
              </div>
            </section>
          )}

          <GoldDivider />

          {/* ── CAP 02: Recordes de Partida ── */}
          <section>
            <ChapterLabel num="02" title="Recordes de Partida" subtitle="Maiores feitos em um único jogo" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <RecordBadge title="Hat-Trick King" player={recordesPartida?.hatTrickKing}
                value={recordesPartida?.hatTrickKing?.recorde} label="Gols" icon={Goal} accentColor="#4ade80" delay={0.1} />
              <RecordBadge title="Assistente Real" player={recordesPartida?.assistenteReal}
                value={recordesPartida?.assistenteReal?.recorde} label="Assists" icon={Target} accentColor="#22d3ee" delay={0.15} />
              <RecordBadge title="Show Completo" player={recordesPartida?.showCompleto}
                value={recordesPartida?.showCompleto?.recorde} label="G+A" icon={Zap} accentColor="#a78bfa" delay={0.2} />
            </div>
          </section>

          <GoldDivider />

          {/* ── CAP 03: Rankings Imortais ── */}
          <section>
            <ChapterLabel num="03" title="Rankings Imortais" subtitle="Os maiores de todos os tempos" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <RankBlock title="Maiores Campeões" icon={Trophy} accentColor="#C89B3C"
                data={rankings?.maioresCampeoes} valueLabel="títulos" delay={0.05} />
              <RankBlock title="Artilheiros All-Time" icon={Goal} accentColor="#4ade80"
                data={rankings?.artilheirosAllTime} valueLabel="gols" delay={0.1} />
              <RankBlock title="Garçons All-Time" icon={Target} accentColor="#22d3ee"
                data={rankings?.garconsAllTime} valueLabel="assists" delay={0.15} />
              <RankBlock title="Participações G+A" icon={Zap} accentColor="#a78bfa"
                data={rankings?.participacoesDecisivas} valueLabel="G+A" delay={0.2} />
              <RankBlock title="Os Incansáveis" icon={Activity} accentColor="#60a5fa"
                data={rankings?.incansaveis} valueKey="jogos" valueLabel="jogos" delay={0.25} />
            </div>
          </section>

          <GoldDivider />

          {/* ── CAP 04: Premiações ── */}
          <section>
            <ChapterLabel num="04" title="Premiações" subtitle="MVPs, destaque e infâmia" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <RankBlock title="🏆 MVP do Campeonato" icon={Star} accentColor="#fbbf24"
                data={premios?.mvpCampeonato} delay={0.05} />
              <RankBlock title="⭐ Craque da Semana" icon={Sparkles} accentColor="#C89B3C"
                data={premios?.mvpSemanal} delay={0.1} />
              <RankBlock title="👟 Chuteiras de Ouro" icon={Award} accentColor="#fb923c"
                data={premios?.chuteirasOuro} delay={0.15} />
              <RankBlock title="🧤 Luvas de Ouro" icon={Hand} accentColor="#22d3ee"
                data={premios?.luvasOuro} delay={0.2} />
              <RankBlock title="🎯 Artilheiro da Semana" icon={Target} accentColor="#4ade80"
                data={premios?.artilheiroSemanal} delay={0.22} />
              <RankBlock title="🅰️ Garçom da Semana" icon={Target} accentColor="#60a5fa"
                data={premios?.garcomSemanal} delay={0.24} />
              <RankBlock title="🧤 Melhor Goleiro (Camp)" icon={Shield} accentColor="#2dd4bf"
                data={premios?.melhorGoleiroCamp} delay={0.26} />
              <RankBlock title="🛡️ Melhor Zagueiro (Camp)" icon={Shield} accentColor="#a78bfa"
                data={premios?.melhorZagueiroCamp} delay={0.28} />
              <RankBlock title="🧤 Goleiro da Semana" icon={Shield} accentColor="#34d399"
                data={premios?.melhorGoleiroSemanal} delay={0.3} />
              <RankBlock title="🛡️ Zagueiro da Semana" icon={Shield} accentColor="#818cf8"
                data={premios?.melhorZagueiroSemanal} delay={0.32} />
              <RankBlock title="🐀 Pé de Rato (Camp)" icon={Medal} accentColor="#f87171"
                data={premios?.peDeRatoCampeonato} delay={0.34} />
              <RankBlock title="🦶 Pé de Rato (Semanal)" icon={Medal} accentColor="#fb7185"
                data={premios?.peDeRatoSemanal} delay={0.36} />
            </div>
          </section>

          <GoldDivider />

          {/* ── CAP 04b: Destaques da Última Rodada ── */}
          {(premios?.mvpUltimaRodada || premios?.peDeRatoUltimaRodada || premios?.artilheiroUltimaRodada || premios?.garcomUltimaRodada) && (
            <>
              <section>
                <ChapterLabel num="04½" title="Última Rodada" subtitle="Os destaques mais recentes" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <RecordBadge title="MVP da Rodada" player={premios?.mvpUltimaRodada}
                    value={premios?.mvpUltimaRodada?.total} label="Pontos" icon={Star} accentColor="#fbbf24" delay={0.05} />
                  <RecordBadge title="Artilheiro da Rodada" player={premios?.artilheiroUltimaRodada}
                    value={premios?.artilheiroUltimaRodada?.total} label="Gols" icon={Target} accentColor="#4ade80" delay={0.1} />
                  <RecordBadge title="Garçom da Rodada" player={premios?.garcomUltimaRodada}
                    value={premios?.garcomUltimaRodada?.total} label="Assists" icon={Target} accentColor="#22d3ee" delay={0.15} />
                  <RecordBadge title="Goleiro da Rodada" player={premios?.goleiroUltimaRodada}
                    value={premios?.goleiroUltimaRodada?.total} label="Pontos" icon={Shield} accentColor="#2dd4bf" delay={0.2} />
                  <RecordBadge title="Zagueiro da Rodada" player={premios?.zagueiroUltimaRodada}
                    value={premios?.zagueiroUltimaRodada?.total} label="Pontos" icon={Shield} accentColor="#a78bfa" delay={0.25} />
                  <RecordBadge title="Pé de Rato da Rodada" player={premios?.peDeRatoUltimaRodada}
                    value={premios?.peDeRatoUltimaRodada?.total} label="Pontos" icon={Medal} accentColor="#f87171" delay={0.3} />
                </div>
              </section>
              <GoldDivider />
            </>
          )}

          {/* ── CAP 05: Eficiência ── */}
          <section>
            <ChapterLabel num="05" title="Eficiência" subtitle="Melhores médias históricas — mínimo 5 jogos" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <RecordBadge title="Melhor Média de Gols" player={eficiencia?.melhorMediaGols}
                value={eficiencia?.melhorMediaGols?.media} label="Gols/Jogo" icon={Goal} accentColor="#4ade80" delay={0.1} />
              <RecordBadge title="Melhor Média de Assists" player={eficiencia?.melhorMediaAssists}
                value={eficiencia?.melhorMediaAssists?.media} label="Assists/Jogo" icon={Target} accentColor="#22d3ee" delay={0.15} />
              <RecordBadge title="Melhor Aproveitamento" player={eficiencia?.melhorAproveitamento}
                value={`${eficiencia?.melhorAproveitamento?.aproveitamento}%`} label="Aproveitamento" icon={Trophy}
                accentColor="#C89B3C" delay={0.2} />
            </div>
          </section>

          <GoldDivider />

          {/* ── CAP 06: Guardiões ── */}
          <section>
            <ChapterLabel num="06" title="Guardiões & Muralhas" subtitle="Os intransponíveis entre os postes" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <RankBlock title="Mais Jogos no Gol" icon={Activity} accentColor="#60a5fa"
                data={goleiros?.lendarios} valueKey="jogos" valueLabel="jogos" delay={0.05} />
              <RankBlock title="Mais Clean Sheets" icon={Shield} accentColor="#2dd4bf"
                data={goleiros?.cleanSheets} valueLabel="CS" delay={0.1} />
              <RankBlock title="Melhor Média (GS/J)" icon={TrendingUp} accentColor="#4ade80"
                data={goleiros?.melhorMedia} valueKey="media" valueLabel="g/j" delay={0.15} />
            </div>
            {muralhas && muralhas.length > 0 && (
              <div className="max-w-md">
                <RankBlock title="Muralhas — Zagueiros" icon={Shield} accentColor="#a78bfa"
                  data={muralhas} delay={0.2} />
              </div>
            )}
          </section>

          <GoldDivider />

          {/* ── CAP 07: Duplas Lendárias ── */}
          <section>
            <ChapterLabel num="07" title="Duplas Lendárias" subtitle="Parcerias que reescreveram a história" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DuplaHero title="Conexão Perfeita" dupla={duplas?.conexao}
                icon={Target} accentColor="#ec4899" label="gols juntos" delay={0.1} />
              <DuplaHero title="Parceiros Inseparáveis" dupla={duplas?.inseparavel}
                icon={Users} accentColor="#22d3ee" label="jogos juntos" delay={0.15} />
              <DuplaHero title="Dupla Vencedora" dupla={duplas?.vencedora}
                icon={Trophy} accentColor="#C89B3C" label="vitórias juntos" delay={0.2} />
            </div>
          </section>

          <GoldDivider />

          {/* ── CAP 08: Partidas Históricas ── */}
          <section>
            <ChapterLabel num="08" title="Partidas Históricas" subtitle="Clássicos que marcaram época" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PartidaCard title="Jogo com Mais Gols" partida={partidasHistoricas?.maisGols}
                icon={Goal} accentColor="#4ade80" value={partidasHistoricas?.maisGols?.total_gols} label="gols" delay={0.1} />
              <PartidaCard title="Maior Goleada" partida={partidasHistoricas?.maiorGoleada}
                icon={Zap} accentColor="#f87171" value={partidasHistoricas?.maiorGoleada?.diferenca} label="dif." delay={0.15} />
              <PartidaCard title="Empate Épico" partida={partidasHistoricas?.empateMaisGols}
                icon={Flame} accentColor="#fb923c" value={partidasHistoricas?.empateMaisGols?.total_gols} label="gols" delay={0.2} />
            </div>
          </section>

          <GoldDivider />

          {/* ── CAP 09: Dinastias ── */}
          <section>
            <ChapterLabel num="09" title="Dinastias" subtitle="Os maiores coletivos da história" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Dinastia', sub: 'Time mais campeão', d: times?.dinastia, v: times?.dinastia?.total, l: 'Títulos', icon: Crown, c: '#C89B3C' },
                { title: 'Ataque Letal', sub: 'Mais gols', d: times?.artilheiro, v: times?.artilheiro?.total, l: 'Gols', icon: Goal, c: '#4ade80' },
                { title: 'Defesa de Ferro', sub: 'Menos gols sofridos', d: times?.melhorDefesa, v: times?.melhorDefesa?.media, l: 'G/Jogo', icon: Shield, c: '#2dd4bf' },
                { title: 'Máquina de Vitórias', sub: 'Mais vitórias', d: times?.maisVitorias, v: times?.maisVitorias?.total, l: 'Vitórias', icon: Trophy, c: '#a78bfa' },
              ].filter(t => t.d).map((t, i) => (
                <motion.div
                  key={t.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="relative overflow-hidden rounded-xl p-5 group"
                  style={{
                    background: 'linear-gradient(135deg, rgba(10,20,40,0.95), rgba(1,10,19,0.98))',
                    border: `1px solid ${t.c}18`,
                  }}
                >
                  <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-300"
                    style={{ background: `radial-gradient(circle, ${t.c}, transparent)` }} />

                  <div className="flex items-center gap-2 mb-1">
                    <t.icon size={13} style={{ color: t.c }} />
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: t.c }}>{t.title}</span>
                  </div>
                  <p className="text-[10px] mb-3" style={{ color: '#A0A0AB' }}>{t.sub}</p>

                  <div className="flex items-center gap-3">
                    <Av foto={t.d.logo_url} nome={t.d.nome} size="md" ring ringColor={t.c} />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-sm truncate">{t.d.nome}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-2xl font-black" style={{ color: t.c }}>{t.v}</span>
                      <p className="text-[9px] uppercase tracking-wider" style={{ color: '#A0A0AB' }}>{t.l}</p>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: `linear-gradient(90deg, ${t.c}80, transparent)` }} />
                </motion.div>
              ))}
            </div>
          </section>

          {/* ── Rodapé ── */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="pt-20 pb-4 text-center"
            style={{ borderTop: '1px solid rgba(200,155,60,0.12)' }}
          >
            <div className="flex items-center justify-center gap-4 mb-3">
              <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, transparent, #C89B3C)' }} />
              <Crown size={20} style={{ color: '#C89B3C' }} fill="currentColor" />
              <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, #C89B3C, transparent)' }} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: '#A0A0AB40' }}>
              FutLendas · Hall da Fama · Onde lendas são imortalizadas
            </p>
          </motion.div>

        </div>
      </div>
    </div>
  );
}