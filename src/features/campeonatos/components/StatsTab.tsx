// Arquivo: src/features/Campeonatos/components/StatsTab.tsx
import { useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStatsAvancadas, useRodadasCampeonato } from '@/api/campeonatoApi';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import {
  Trophy, Footprints, Shield, User, Calendar, Filter,
  ChevronDown, ArrowUpDown, ArrowDown, Star, Zap, Crown,
  Swords, TrendingDown, Target, ShieldCheck, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props { campeonatoId: number; }
type OrdenacaoCampo = 'pontos' | 'gols' | 'assistencias' | 'vitorias';

// ─────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────
const Avatar = memo(({ src, nome, size = 8, className = '' }: {
  src?: string | null; nome: string; size?: number; className?: string;
}) => (
  <div className={cn(
    `w-${size} h-${size} rounded-full bg-surfaceElevated border border-borderLight flex-shrink-0 overflow-hidden`,
    className,
  )}>
    {src
      ? <img src={src} alt={nome} className="w-full h-full object-cover" />
      : <div className="w-full h-full flex items-center justify-center text-textMuted font-bold text-xs">
          {nome.substring(0, 2).toUpperCase()}
        </div>}
  </div>
));

// ─────────────────────────────────────────────────────────────
// Pódio Top 3
// ─────────────────────────────────────────────────────────────
interface PodiumConfig {
  title: string; icon: React.ReactNode;
  campo: 'gols' | 'assistencias' | 'pontos' | 'pontos_inv' | 'clean_sheets';
  unidade: string; gradientFrom: string; gradientTo: string; bgGlow: string;
}

const PodiumTop5 = memo(({ players, config }: { players: any[]; config: PodiumConfig }) => {
  if (!players?.length)
    return (
      <div className="flex items-center justify-center h-52 rounded-2xl border border-white/10 bg-[#060d1a] text-cyan-100/30 text-sm">
        Sem dados disponíveis
      </div>
    );

  const getValue = (j: any) => config.campo === 'pontos_inv' ? j.pontos : j[config.campo as keyof typeof j] ?? 0;

  // Pódio: [2°, 1°, 3°] no topo
  const podioPlayers = [players[1], players[0], players[2]];
  const heights = ['h-32', 'h-48', 'h-24'];
  const ranks = [2, 1, 3];
  const borders = ['border-gray-400', 'border-amber-400', 'border-amber-700'];

  // Lista 4° e 5°
  const extraPlayers = players.slice(3, 5);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#060d1a]">
      <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(ellipse at 50% 100%, ${config.bgGlow} 0%, transparent 70%)` }} />
      <div className="relative z-10 p-4">
        {/* Badge título */}
        <div className={cn('flex items-center gap-2 mb-5 px-2 py-1.5 rounded-lg bg-gradient-to-r w-fit', config.gradientFrom, config.gradientTo)}>
          {config.icon}
          <span className="text-xs font-black text-white uppercase tracking-wider">{config.title}</span>
        </div>

        {/* Pódio top 3 */}
        <div className="flex items-end justify-center gap-2 px-2 pb-2">
          {podioPlayers.map((p, i) => {
            if (!p) return <div key={i} className="w-[30%]" />;
            return (
              <motion.div key={p.id + '_' + i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="flex flex-col items-center gap-1 w-[30%]">
                <div className="relative">
                  {ranks[i] === 1 && (
                    <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute -top-5 left-1/2 -translate-x-1/2 text-yellow-400">
                      <Crown size={14} />
                    </motion.div>
                  )}
                  <Avatar src={p.foto_url} nome={p.nome} size={12} className={cn('border-2 shadow-lg', borders[i], ranks[i] === 1 && 'shadow-amber-400/40')} />
                </div>
                <p className="text-xs font-bold text-white text-center line-clamp-1 w-full mt-1">{p.nome}</p>
                <p className="text-[10px] text-textMuted text-center line-clamp-1 w-full">{p.time_nome}</p>
                <div className={cn('flex flex-col items-center justify-end rounded-t-xl w-full pt-2 bg-gradient-to-t opacity-90', heights[i], config.gradientFrom, config.gradientTo)}>
                  <span className="text-2xl font-black text-white">{getValue(p)}</span>
                  <span className="text-[10px] text-white/70 mb-1">{config.unidade}</span>
                  <span className="w-5 h-5 rounded-full bg-black/30 flex items-center justify-center text-xs font-black text-white mb-2">{ranks[i]}º</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 4° e 5° lugar — lista compacta */}
        {extraPlayers.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
            {extraPlayers.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06 }}
                className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors">
                <span className="text-xs font-black text-white/30 w-5 text-center">{i + 4}º</span>
                <Avatar src={p.foto_url} nome={p.nome} size={7} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{p.nome}</p>
                  <p className="text-[10px] text-textMuted truncate">{p.time_nome}</p>
                </div>
                <div className={cn('px-2 py-0.5 rounded-lg text-xs font-black text-white bg-gradient-to-r', config.gradientFrom, config.gradientTo)}>
                  {getValue(p)} <span className="text-[9px] font-normal opacity-70">{config.unidade}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <div className="h-3 bg-gradient-to-t from-[#060d1a] to-transparent relative z-10" />
    </div>
  );
});

// alias para compatibilidade
const PodiumTop3 = PodiumTop5;

// ─────────────────────────────────────────────────────────────
// SortableHeader
// ─────────────────────────────────────────────────────────────
const SortableHeader = memo(({ campo, label, className = '', ordenacao, onOrdenar }: {
  campo: OrdenacaoCampo; label: string; className?: string;
  ordenacao: OrdenacaoCampo; onOrdenar: (c: OrdenacaoCampo) => void;
}) => (
  <th className={cn('px-3 py-3 text-center cursor-pointer hover:bg-white/5 transition-colors select-none group', className)} onClick={() => onOrdenar(campo)}>
    <div className="flex items-center justify-center gap-1">
      <span>{label}</span>
      {ordenacao === campo ? <ArrowDown size={11} className="text-cyan-400" /> : <ArrowUpDown size={11} className="opacity-0 group-hover:opacity-50 transition-opacity" />}
    </div>
  </th>
));

// ─────────────────────────────────────────────────────────────
// StatBadge — badge colorido reutilizável
// ─────────────────────────────────────────────────────────────
const StatBadge = memo(({ val, label, color }: { val: number | string; label: string; color: string }) => (
  <div className={cn('flex flex-col items-center px-3 py-2 rounded-xl border', color)}>
    <span className="text-lg font-black">{val}</span>
    <span className="text-[10px] uppercase tracking-wider opacity-70">{label}</span>
  </div>
));

// ─────────────────────────────────────────────────────────────
// DestaqueMini — card de destaque do time (artilheiro, garçom...)
// ─────────────────────────────────────────────────────────────
const DestaqueMini = memo(({ label, icon, iconBg, cor, player, stat }: {
  label: string; icon: React.ReactNode; iconBg: string; cor: string;
  player: any | null; stat: string | null;
}) => (
  <div className={cn('p-4 rounded-2xl border flex items-center gap-3', cor)}>
    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
      {icon}
    </div>
    {player && stat ? (
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Avatar src={player.foto_url} nome={player.nome} size={6} />
          <p className="font-bold text-white truncate text-sm">{player.nome}</p>
        </div>
        <p className="text-xs text-textMuted mt-0.5">{stat}</p>
      </div>
    ) : (
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</p>
        <p className="text-xs text-textMuted mt-1">Sem dados ainda</p>
      </div>
    )}
  </div>
));

// ─────────────────────────────────────────────────────────────
// TimeCard — perfil completo do time
// ─────────────────────────────────────────────────────────────
const TimeCard = memo(({ time, todosJogadores, todosGoleiros, todosTimesTotais, confrontosTimes }: {
  time: any; todosJogadores: any[]; todosGoleiros: any[];
  todosTimesTotais: any[]; confrontosTimes: any[];
}) => {
  const timeId = Number(time.id);

  // Jogadores de linha deste time — ordena por pontos
  const jogadoresDoTime = useMemo(
    () => [...todosJogadores.filter((j: any) => Number(j.time_id) === timeId)]
            .sort((a: any, b: any) => b.pontos - a.pontos),
    [todosJogadores, timeId],
  );

  // Goleiros deste time — ordena por jogos desc
  const goleirosDoTime = useMemo(
    () => [...todosGoleiros.filter((g: any) => Number(g.time_id) === timeId)]
            .sort((a: any, b: any) => b.jogos - a.jogos),
    [todosGoleiros, timeId],
  );

  const stats = todosTimesTotais.find((t: any) => Number(t.id) === timeId);

  // Destaques — sem filtro de >0 para sempre mostrar alguém
  const artilheiro = useMemo(
    () => [...jogadoresDoTime].sort((a, b) => b.gols - a.gols)[0] ?? null,
    [jogadoresDoTime],
  );
  const top3Garcons = useMemo(
    () => [...jogadoresDoTime].sort((a, b) => b.assistencias - a.assistencias).slice(0, 3),
    [jogadoresDoTime],
  );
  const ponteiro = useMemo(
    () => [...jogadoresDoTime].sort((a, b) => b.pontos - a.pontos)[0] ?? null,
    [jogadoresDoTime],
  );

  // Confrontos vs outros times
  const confrontos = useMemo(() => {
    const mapa: Record<number, { id: number; nome: string; logo_url: string; jogos: number; v: number; e: number; d: number; gp: number; gc: number }> = {};
    confrontosTimes.forEach((r: any) => {
      const isA = Number(r.timeA_id) === timeId;
      const isB = Number(r.timeB_id) === timeId;
      if (!isA && !isB) return;
      const advId   = isA ? Number(r.timeB_id)  : Number(r.timeA_id);
      const advNome = isA ? r.timeB_nome         : r.timeA_nome;
      const advLogo = isA ? r.timeB_logo         : r.timeA_logo;
      const v  = isA ? Number(r.vitoriasA) : Number(r.vitoriasB);
      const d  = isA ? Number(r.vitoriasB) : Number(r.vitoriasA);
      const e  = Number(r.empates);
      const gp = isA ? Number(r.golsA || 0) : Number(r.golsB || 0);
      const gc = isA ? Number(r.golsB || 0) : Number(r.golsA || 0);
      if (!mapa[advId]) mapa[advId] = { id: advId, nome: advNome, logo_url: advLogo, jogos: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 };
      mapa[advId].jogos += v + d + e;
      mapa[advId].v += v; mapa[advId].e += e; mapa[advId].d += d;
      mapa[advId].gp += gp; mapa[advId].gc += gc;
    });
    return Object.values(mapa).sort((a, b) => b.jogos - a.jogos);
  }, [confrontosTimes, timeId]);

  const totalJogos = Number(stats?.jogos ?? 0);
  const aproveitamento = stats && totalJogos > 0
    ? Math.round(((Number(stats.vitorias) * 3 + Number(stats.empates)) / (totalJogos * 3)) * 100) : 0;
  const saldo = stats ? (Number(stats.gp ?? 0) - Number(stats.gc ?? 0)) : 0;

  return (
    <motion.div key={timeId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

      {/* ── HEADER ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d1f35] to-[#060d1a] p-5">
        <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(ellipse at 0% 50%, #22d3ee 0%, transparent 60%)' }} />
        <div className="relative flex items-center gap-4">
          <Avatar src={time.logo_url} nome={time.nome} size={16} className="border-2 border-accentPrimary/50 shadow-xl shadow-accentPrimary/20" />
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-black text-white truncate">{time.nome}</h3>
            {stats && (
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">{stats.vitorias}V</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">{stats.empates}E</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">{stats.derrotas}D</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">⚽ {stats.gp ?? 0} gols</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-accentPrimary/10 text-accentPrimary border border-accentPrimary/20">{aproveitamento}% aproveit.</span>
              </div>
            )}
          </div>
          {stats && (
            <div className="flex gap-3 flex-shrink-0">
              <StatBadge val={Number(stats.vitorias) * 3 + Number(stats.empates)} label="pts" color="bg-accentPrimary/10 border-accentPrimary/20 text-accentPrimary" />
              <StatBadge val={saldo >= 0 ? `+${saldo}` : String(saldo)} label="saldo" color={saldo >= 0 ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} />
            </div>
          )}
        </div>
      </div>

      {/* ── SEÇÃO: DESTAQUES DO TIME ── */}
      <Card className="border-border bg-surface overflow-hidden">
        <div className="bg-surfaceElevated px-4 py-3 border-b border-border flex items-center gap-2">
          <Star size={16} className="text-amber-400" />
          <h4 className="font-bold text-base">Destaques do Time</h4>
        </div>
        <div className="p-4 space-y-5">

          {/* Artilheiro destaque */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400 mb-2 flex items-center gap-1.5">
              <Target size={12} /> Artilheiro da Temporada
            </p>
            {artilheiro ? (
              <div className="flex items-center gap-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                <Avatar src={artilheiro.foto_url} nome={artilheiro.nome} size={12} className="border-2 border-emerald-500/40" />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-white text-lg leading-tight truncate">{artilheiro.nome}</p>
                  <p className="text-xs text-textMuted mt-0.5">{artilheiro.jogos} jogos disputados</p>
                </div>
                <div className="flex gap-3 flex-shrink-0">
                  <div className="flex flex-col items-center px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <span className="text-2xl font-black text-emerald-400">{artilheiro.gols}</span>
                    <span className="text-[10px] uppercase text-textMuted">gols</span>
                  </div>
                  <div className="flex flex-col items-center px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <span className="text-2xl font-black text-blue-400">{artilheiro.assistencias}</span>
                    <span className="text-[10px] uppercase text-textMuted">assists</span>
                  </div>
                  <div className="flex flex-col items-center px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <span className="text-2xl font-black text-amber-400">{artilheiro.pontos}</span>
                    <span className="text-[10px] uppercase text-textMuted">pts</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-surface border border-border text-center text-sm text-textMuted">Nenhum gol registrado ainda.</div>
            )}
          </div>

          {/* Top 3 Garçons */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-1.5">
              <Footprints size={12} /> Top 3 — Assistências
            </p>
            {top3Garcons.length === 0 ? (
              <div className="p-3 rounded-xl bg-surface border border-border text-center text-sm text-textMuted">Nenhuma assistência registrada.</div>
            ) : (
              <div className="space-y-2">
                {top3Garcons.map((g: any, i: number) => {
                  const pct = top3Garcons[0]?.assistencias > 0 ? Math.round((g.assistencias / top3Garcons[0].assistencias) * 100) : 0;
                  const rankColors = ['text-amber-400', 'text-gray-300', 'text-amber-700'];
                  const bgColors   = ['bg-amber-500/10 border-amber-500/20', 'bg-gray-500/10 border-gray-500/20', 'bg-amber-700/10 border-amber-700/20'];
                  return (
                    <div key={g.id} className={cn('flex items-center gap-3 p-2.5 rounded-xl border', bgColors[i])}>
                      <span className={cn('text-lg font-black w-6 text-center flex-shrink-0', rankColors[i])}>{i + 1}</span>
                      <Avatar src={g.foto_url} nome={g.nome} size={8} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-sm">{g.nome}</p>
                        <div className="mt-1 h-1.5 bg-surfaceElevated rounded-full overflow-hidden">
                          <div style={{ width: `${pct}%` }} className="h-full bg-blue-500 rounded-full transition-all" />
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="text-lg font-black text-blue-400">{g.assistencias}</span>
                        <span className="text-xs text-textMuted block">assists</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </Card>

      {/* ── SEÇÃO: GOLEIROS ── */}
      <Card className="border-border bg-surface overflow-hidden">
        <div className="bg-surfaceElevated px-4 py-3 border-b border-border flex items-center gap-2">
          <Shield size={16} className="text-yellow-400" />
          <h4 className="font-bold text-base">Goleiros</h4>
          <span className="ml-auto text-xs text-textMuted bg-surfaceElevated border border-border rounded-full px-2 py-0.5">
            {goleirosDoTime.length} {goleirosDoTime.length === 1 ? 'goleiro' : 'goleiros'}
          </span>
        </div>
        {goleirosDoTime.length === 0 ? (
          <div className="py-10 text-center text-sm text-textMuted">
            <Shield size={32} className="mx-auto opacity-20 mb-2" />
            Nenhum goleiro encontrado para este time.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-textMuted uppercase text-[11px] bg-surfaceElevated/60">
                <tr>
                  <th className="px-4 py-2.5 text-left">Goleiro</th>
                  <th className="px-3 py-2.5 text-center">Jogos</th>
                  <th className="px-3 py-2.5 text-center text-green-400">V</th>
                  <th className="px-3 py-2.5 text-center text-yellow-400">E</th>
                  <th className="px-3 py-2.5 text-center text-red-400">D</th>
                  <th className="px-3 py-2.5 text-center text-yellow-300">CS</th>
                  <th className="px-3 py-2.5 text-center text-red-400">GS</th>
                  <th className="px-3 py-2.5 text-center text-textMuted hidden sm:table-cell">Média</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {goleirosDoTime.map((g: any, i: number) => (
                  <tr key={g.id} className={cn('hover:bg-white/5 transition-colors', i === 0 && 'bg-yellow-500/5')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <Avatar src={g.foto_url} nome={g.nome} size={9} className="border border-yellow-500/30" />
                          {i === 0 && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center">
                              <Star size={8} className="text-black" fill="currentColor" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold leading-tight">{g.nome}</p>
                          {i === 0 && <span className="text-[10px] text-yellow-400 font-bold">Titular</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-bold">{g.jogos}</td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">{g.vitorias}</td>
                    <td className="px-3 py-3 text-center text-yellow-400">{g.empates}</td>
                    <td className="px-3 py-3 text-center text-red-400">{g.derrotas}</td>
                    <td className="px-3 py-3 text-center text-yellow-300 font-bold">{g.clean_sheets}</td>
                    <td className="px-3 py-3 text-center text-red-400">{g.gols_sofridos}</td>
                    <td className="px-3 py-3 text-center text-textMuted hidden sm:table-cell">{g.media_gols ?? '0.00'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── SEÇÃO: HISTÓRICO DE CONFRONTOS ── */}
      <Card className="border-border bg-surface overflow-hidden">
        <div className="bg-surfaceElevated px-4 py-3 border-b border-border flex items-center gap-2">
          <Swords size={16} className="text-purple-400" />
          <h4 className="font-bold text-base">Histórico de Confrontos</h4>
          {confrontos.length > 0 && (
            <span className="ml-auto text-xs text-textMuted bg-surfaceElevated border border-border rounded-full px-2 py-0.5">
              vs {confrontos.length} {confrontos.length === 1 ? 'time' : 'times'}
            </span>
          )}
        </div>
        {confrontos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-textMuted">
            <Swords size={32} className="opacity-20 mb-2" />
            <p className="text-sm">Nenhum confronto registrado ainda.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {confrontos.map((c) => {
              const total = c.v + c.e + c.d;
              const pctV  = total > 0 ? Math.round((c.v / total) * 100) : 0;
              const pctD  = total > 0 ? Math.round((c.d / total) * 100) : 0;
              const domina = c.v > c.d ? 'domina' : c.d > c.v ? 'perde' : 'empata';
              return (
                <div key={c.id} className="px-4 py-3 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar src={c.logo_url} nome={c.nome} size={9} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{c.nome}</p>
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                          domina === 'domina' ? 'bg-green-500/15 text-green-400' :
                          domina === 'perde'  ? 'bg-red-500/15 text-red-400' :
                          'bg-yellow-500/15 text-yellow-400')}>
                          {domina === 'domina' ? '↑ domina' : domina === 'perde' ? '↓ perde' : '= equil.'}
                        </span>
                      </div>
                      <p className="text-xs text-textMuted mt-0.5">
                        {total} {total === 1 ? 'confronto' : 'confrontos'} • {c.gp} marcados • {c.gc} sofridos
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {[{val: c.v, color: 'text-green-400', label: 'V'}, {val: c.e, color: 'text-yellow-400', label: 'E'}, {val: c.d, color: 'text-red-400', label: 'D'}].map(b => (
                        <div key={b.label} className="flex flex-col items-center w-7">
                          <span className={cn('text-sm font-black', b.color)}>{b.val}</span>
                          <span className="text-[9px] text-textMuted">{b.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {total > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-surfaceElevated overflow-hidden flex">
                        <div style={{ width: `${pctV}%` }} className="h-full bg-green-500" />
                        <div style={{ width: `${100 - pctV - pctD}%` }} className="h-full bg-yellow-500/60" />
                        <div style={{ width: `${pctD}%` }} className="h-full bg-red-500" />
                      </div>
                      <span className="text-[10px] text-textMuted flex-shrink-0">{pctV}% vitórias</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── SEÇÃO: ELENCO COMPLETO ── */}
      <Card className="border-border bg-surface overflow-hidden">
        <div className="bg-surfaceElevated px-4 py-3 border-b border-border flex items-center gap-2">
          <User size={16} className="text-accentPrimary" />
          <h4 className="font-bold text-base">Elenco — Estatísticas Individuais</h4>
          <span className="ml-auto text-xs text-textMuted bg-surfaceElevated border border-border rounded-full px-2 py-0.5">
            {jogadoresDoTime.length} jogadores
          </span>
        </div>
        {jogadoresDoTime.length === 0 ? (
          <div className="py-10 text-center text-sm text-textMuted">
            <User size={32} className="mx-auto opacity-20 mb-2" />
            Nenhum jogador registrado para este time.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-textMuted uppercase text-[11px] bg-surfaceElevated/60">
                <tr>
                  <th className="px-4 py-2.5 text-left">Jogador</th>
                  <th className="px-3 py-2.5 text-center">J</th>
                  <th className="px-3 py-2.5 text-center text-amber-400">PTS</th>
                  <th className="px-3 py-2.5 text-center text-green-400">G</th>
                  <th className="px-3 py-2.5 text-center text-blue-400">A</th>
                  <th className="px-3 py-2.5 text-center text-yellow-300 hidden sm:table-cell">CS</th>
                  <th className="px-3 py-2.5 text-center text-green-400 hidden sm:table-cell">V</th>
                  <th className="px-3 py-2.5 text-center text-textMuted hidden md:table-cell">E</th>
                  <th className="px-3 py-2.5 text-center text-red-400 hidden md:table-cell">D</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {jogadoresDoTime.map((j: any, idx: number) => (
                  <tr key={`${j.id}_${j.time_id}`} className={cn('hover:bg-white/5 transition-colors', idx === 0 && 'bg-amber-500/5')}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <Avatar src={j.foto_url} nome={j.nome} size={8} />
                          {idx === 0 && (
                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 flex items-center justify-center">
                              <Crown size={8} className="text-black" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate leading-tight">{j.nome}</p>
                          {j.joga_recuado && <span className="text-[10px] text-purple-400">recuado</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-textMuted">{j.jogos}</td>
                    <td className="px-3 py-2.5 text-center font-black text-amber-400">{j.pontos}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-green-400">{j.gols}</td>
                    <td className="px-3 py-2.5 text-center text-blue-400">{j.assistencias}</td>
                    <td className="px-3 py-2.5 text-center text-yellow-300 hidden sm:table-cell">{j.clean_sheets ?? 0}</td>
                    <td className="px-3 py-2.5 text-center text-green-400 hidden sm:table-cell">{j.vitorias}</td>
                    <td className="px-3 py-2.5 text-center text-textMuted hidden md:table-cell">{j.empates}</td>
                    <td className="px-3 py-2.5 text-center text-red-400 hidden md:table-cell">{j.derrotas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
export function StatsTab({ campeonatoId }: Props) {
  const [subTab, setSubTab]             = useState<'jogadores' | 'times'>('jogadores');
  const [timeAtivoId, setTimeAtivoId]   = useState<number | null>(null);
  const [rodadaSelecionada, setRodadaSelecionada] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [ordenacao, setOrdenacao]       = useState<OrdenacaoCampo>('pontos');

  const { data: rodadas }   = useRodadasCampeonato(campeonatoId);
  const { data, isLoading } = useStatsAvancadas(campeonatoId, rodadaSelecionada);

  const rodadasFinalizadas = useMemo(
    () => (rodadas ?? [])
      .filter((r: any) => r.status === 'finalizada')
      .sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime()),
    [rodadas],
  );

  // Usa T12:00 para evitar problema de timezone (date-only é interpretado como UTC meia-noite)
  const fmtDate = useCallback((s: string) => {
    if (!s) return '';
    const d = new Date(s.length === 10 ? s + 'T12:00:00' : s);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }, []);
  const rodadaAtual = rodadas?.find((r: any) => r.id === rodadaSelecionada);
  const rodadaLabel = rodadaSelecionada ? `Rodada ${fmtDate(rodadaAtual?.data ?? '')}` : 'Todas as Rodadas';

  const processados = useMemo(() => {
    if (!data) return null;
    const { jogadores = [], goleiros = [], zagueiros = [], times = { totais: [] }, confrontos_times = [] } = data as any;
    const jogadoresArr: any[] = Array.isArray(jogadores) ? jogadores : [];

    // Unifica jogadores avulsos que jogaram por vários times: agrupa por id e soma stats
    const jogadoresMap = new Map<number, any>();
    for (const j of jogadoresArr) {
      const id = Number(j.id);
      if (jogadoresMap.has(id)) {
        const prev = jogadoresMap.get(id)!;
        prev.pontos       += Number(j.pontos ?? 0);
        prev.jogos        += Number(j.jogos ?? 0);
        prev.vitorias     += Number(j.vitorias ?? 0);
        prev.empates      += Number(j.empates ?? 0);
        prev.derrotas     += Number(j.derrotas ?? 0);
        prev.gols         += Number(j.gols ?? 0);
        prev.assistencias += Number(j.assistencias ?? 0);
        // Acumula nomes de times únicos
        if (!prev._times.includes(j.time_nome)) prev._times.push(j.time_nome);
        prev.time_nome = prev._times.join(', ');
      } else {
        jogadoresMap.set(id, {
          ...j,
          pontos:       Number(j.pontos ?? 0),
          jogos:        Number(j.jogos ?? 0),
          vitorias:     Number(j.vitorias ?? 0),
          empates:      Number(j.empates ?? 0),
          derrotas:     Number(j.derrotas ?? 0),
          gols:         Number(j.gols ?? 0),
          assistencias: Number(j.assistencias ?? 0),
          _times:       [j.time_nome],
        });
      }
    }
    const ranking: any[] = Array.from(jogadoresMap.values());

    const maxJogos  = Math.max(...ranking.map((j: any) => Number(j.jogos)), 1);
    // Quando filtrado por rodada todos têm 1 jogo — sem mínimo de jogos
    const minJogos  = rodadaSelecionada ? 1 : Math.ceil(maxJogos * 0.5);
    const artilheiros = [...ranking].sort((a, b) => b.gols - a.gols || b.pontos - a.pontos).slice(0, 5);
    const garcons     = [...ranking].sort((a, b) => b.assistencias - a.assistencias || b.pontos - a.pontos).slice(0, 5);
    const pontuacao   = [...ranking].sort((a, b) => b.pontos - a.pontos).slice(0, 5);
    const peDeRato    = [...ranking].filter(j => Number(j.jogos) >= minJogos).sort((a, b) => a.pontos - b.pontos).slice(0, 5);

    // Times únicos ordenados por pontos
    const seen = new Set<number>();
    const timesUnicos: any[] = [];
    (times.totais ?? []).forEach((t: any) => {
      const tid = Number(t.id);
      if (!seen.has(tid)) { seen.add(tid); timesUnicos.push(t); }
    });

    // Unifica goleiros por id (mesmo jogador em times diferentes)
    const goleirosMap = new Map<number, any>();
    for (const g of (goleiros as any[])) {
      const id = Number(g.id);
      if (goleirosMap.has(id)) {
        const prev = goleirosMap.get(id)!;
        prev.jogos         += Number(g.jogos ?? 0);
        prev.clean_sheets  += Number(g.clean_sheets ?? 0);
        prev.gols_sofridos += Number(g.gols_sofridos ?? 0);
        prev.pontos        += Number(g.pontos ?? 0);
        prev.media_gols     = prev.jogos > 0 ? +(prev.gols_sofridos / prev.jogos).toFixed(2) : 0;
        if (!prev._times.includes(g.time_nome)) prev._times.push(g.time_nome);
        prev.time_nome = prev._times.join(', ');
      } else {
        goleirosMap.set(id, { ...g, jogos: Number(g.jogos ?? 0), clean_sheets: Number(g.clean_sheets ?? 0), gols_sofridos: Number(g.gols_sofridos ?? 0), pontos: Number(g.pontos ?? 0), _times: [g.time_nome] });
      }
    }
    const goleirosUnificados = Array.from(goleirosMap.values());

    // Unifica zagueiros por id
    const zagueirosMap = new Map<number, any>();
    for (const z of (zagueiros as any[])) {
      const id = Number(z.id);
      if (zagueirosMap.has(id)) {
        const prev = zagueirosMap.get(id)!;
        prev.jogos        += Number(z.jogos ?? 0);
        prev.clean_sheets += Number(z.clean_sheets ?? 0);
        prev.pontos       += Number(z.pontos ?? 0);
        if (!prev._times.includes(z.time_nome)) prev._times.push(z.time_nome);
        prev.time_nome = prev._times.join(', ');
      } else {
        zagueirosMap.set(id, { ...z, jogos: Number(z.jogos ?? 0), clean_sheets: Number(z.clean_sheets ?? 0), pontos: Number(z.pontos ?? 0), _times: [z.time_nome] });
      }
    }
    const zagueirosUnificados = Array.from(zagueirosMap.values());

    // Melhor goleiro: mais pontos (CS + V/E/D)
    const melhorGoleiro = [...goleirosUnificados].sort((a, b) => b.pontos - a.pontos || a.media_gols - b.media_gols).slice(0, 5);
    // Melhor zagueiro: mais clean sheets, depois pontos
    const melhorZagueiro = [...zagueirosUnificados].sort((a, b) => b.clean_sheets - a.clean_sheets || b.pontos - a.pontos).slice(0, 5);

    return { ranking, artilheiros, garcons, pontuacao, peDeRato, goleiros: goleirosUnificados, zagueiros: zagueirosUnificados, timesUnicos, confrontosTimes: confrontos_times, melhorGoleiro, melhorZagueiro };
  }, [data, rodadaSelecionada]);

  const rankingOrdenado = useMemo(() => {
    if (!processados) return [];
    return [...processados.ranking].sort((a, b) => {
      switch (ordenacao) {
        case 'gols':         return b.gols - a.gols || b.pontos - a.pontos;
        case 'assistencias': return b.assistencias - a.assistencias || b.pontos - a.pontos;
        case 'vitorias':     return b.vitorias - a.vitorias || b.pontos - a.pontos;
        default:             return b.pontos - a.pontos;
      }
    });
  }, [processados, ordenacao]);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-lg" />;
  if (!processados || !data) return (
    <div className="flex flex-col items-center justify-center text-textMuted p-16 border border-dashed border-border rounded-2xl">
      <Trophy size={48} className="opacity-20 mb-4" />
      <p className="font-semibold">Nenhum dado disponível ainda.</p>
      <p className="text-xs mt-1 opacity-60">Finalize partidas para ver as estatísticas.</p>
    </div>
  );

  const { artilheiros, garcons, pontuacao, peDeRato, goleiros, zagueiros, timesUnicos, confrontosTimes, melhorGoleiro, melhorZagueiro } = processados;
  const timeAtivo = timesUnicos.find((t: any) => Number(t.id) === timeAtivoId) ?? timesUnicos[0] ?? null;

  const podiums: { config: PodiumConfig; players: any[] }[] = [
    { players: pontuacao,      config: { title: 'Top Pontuadores', icon: <Trophy size={13} className="text-white" />,       campo: 'pontos',        unidade: 'pts',  gradientFrom: 'from-amber-500',   gradientTo: 'to-yellow-600',   bgGlow: '#f59e0b' } },
    { players: artilheiros,    config: { title: 'Artilheiros',     icon: <Zap size={13} className="text-white" />,           campo: 'gols',          unidade: 'gols', gradientFrom: 'from-emerald-500', gradientTo: 'to-green-600',    bgGlow: '#10b981' } },
    { players: garcons,        config: { title: 'Garçons',         icon: <Footprints size={13} className="text-white" />,    campo: 'assistencias',  unidade: 'ast',  gradientFrom: 'from-blue-500',    gradientTo: 'to-cyan-600',     bgGlow: '#3b82f6' } },
    { players: peDeRato,       config: { title: 'Pé de Rato',      icon: <TrendingDown size={13} className="text-white" />,  campo: 'pontos_inv',    unidade: 'pts',  gradientFrom: 'from-red-500',     gradientTo: 'to-orange-600',   bgGlow: '#ef4444' } },
    { players: melhorGoleiro,  config: { title: 'Muralha',         icon: <Shield size={13} className="text-white" />,        campo: 'clean_sheets',  unidade: 'cs',   gradientFrom: 'from-violet-500',  gradientTo: 'to-purple-700',   bgGlow: '#8b5cf6' } },
    { players: melhorZagueiro, config: { title: 'Xerife',          icon: <Shield size={13} className="text-white" />,        campo: 'clean_sheets',  unidade: 'cs',   gradientFrom: 'from-slate-500',   gradientTo: 'to-slate-700',    bgGlow: '#64748b' } },
  ];

  return (
    <div className="space-y-5">
      {/* ─── Header: Sub-Abas + Filtro por Rodada ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="bg-surface border border-border rounded-full p-1 flex gap-1">
          <button
            onClick={() => setSubTab('jogadores')}
            className={cn('px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2',
              subTab === 'jogadores' ? 'bg-accentPrimary text-white shadow-lg' : 'text-textMuted hover:text-white')}
          >
            <User size={14} /> Jogadores
          </button>
          <button
            onClick={() => setSubTab('times')}
            className={cn('px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2',
              subTab === 'times' ? 'bg-accentSecondary text-black shadow-lg' : 'text-textMuted hover:text-white')}
          >
            <Swords size={14} /> Times
          </button>
        </div>

        {/* Filtro */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg border transition-all',
              rodadaSelecionada ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' : 'bg-surface border-border text-textMuted hover:border-cyan-500/40')}
          >
            <Filter size={14} />
            <span className="text-sm font-medium">{rodadaLabel}</span>
            <ChevronDown size={14} className={cn('transition-transform', showDropdown && 'rotate-180')} />
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-52 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-2 border-b border-border">
                <span className="text-xs text-textMuted font-bold uppercase">Filtrar por Rodada</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <button onClick={() => { setRodadaSelecionada(null); setShowDropdown(false); }}
                  className={cn('w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-cyan-500/10', !rodadaSelecionada && 'bg-cyan-500/10 text-cyan-400')}>
                  <div className={cn('w-1.5 h-1.5 rounded-full', !rodadaSelecionada ? 'bg-cyan-400' : 'bg-borderLight')} />
                  Todas as Rodadas
                </button>
                {rodadasFinalizadas.map((r: any, idx: number) => (
                  <button key={r.id} onClick={() => { setRodadaSelecionada(r.id); setShowDropdown(false); }}
                    className={cn('w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-cyan-500/10', rodadaSelecionada === r.id && 'bg-cyan-500/10 text-cyan-400')}>
                    <div className={cn('w-1.5 h-1.5 rounded-full', rodadaSelecionada === r.id ? 'bg-cyan-400' : 'bg-borderLight')} />
                    <Calendar size={13} className="text-textMuted" />
                    <span>Rodada {idx + 1}</span>
                    <span className="ml-auto text-xs text-textMuted">{fmtDate(r.data)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Banner rodada */}
      {rodadaSelecionada && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-cyan-500/8 border border-cyan-500/20 rounded-lg">
          <Calendar size={14} className="text-cyan-400 flex-shrink-0" />
          <span className="text-sm text-cyan-300">Dados de: <strong>{rodadaLabel}</strong></span>
          <button onClick={() => setRodadaSelecionada(null)} className="ml-auto text-xs text-cyan-400 hover:text-cyan-200 underline">Ver todas</button>
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ════════════════════════════════════════ */}
        {/* ABA: JOGADORES                          */}
        {/* ════════════════════════════════════════ */}
        {subTab === 'jogadores' && (
          <motion.div key="jogadores" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

            {/* Pódios */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Star size={15} className="text-amber-400" />
                <h2 className="font-black text-lg">Destaques da Temporada</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {podiums.slice(0, 3).map((p) => <PodiumTop3 key={p.config.title} players={p.players} config={p.config} />)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                {podiums.slice(3, 6).map((p) => <PodiumTop3 key={p.config.title} players={p.players} config={p.config} />)}
              </div>
            </div>

            {/* Ranking Geral */}
            <Card className="border-border bg-surface overflow-hidden">
              <div className="bg-surfaceElevated p-4 border-b border-border flex items-center gap-2">
                <Trophy className="text-amber-400" size={17} />
                <h3 className="font-bold text-lg">Ranking Geral</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-textMuted bg-surfaceElevated uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-center w-10">#</th>
                      <th className="px-4 py-3">Jogador</th>
                      <SortableHeader campo="pontos"       label="PTS" ordenacao={ordenacao} onOrdenar={setOrdenacao} className="text-accentPrimary" />
                      <th className="px-3 py-3 text-center hidden sm:table-cell">J</th>
                      <SortableHeader campo="vitorias"     label="V"   ordenacao={ordenacao} onOrdenar={setOrdenacao} className="hidden sm:table-cell text-green-400" />
                      <th className="px-3 py-3 text-center hidden sm:table-cell text-textMuted">E</th>
                      <th className="px-3 py-3 text-center hidden sm:table-cell text-red-400">D</th>
                      <SortableHeader campo="gols"         label="G"   ordenacao={ordenacao} onOrdenar={setOrdenacao} className="hidden md:table-cell" />
                      <SortableHeader campo="assistencias" label="A"   ordenacao={ordenacao} onOrdenar={setOrdenacao} className="hidden md:table-cell" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {rankingOrdenado.length === 0 ? (
                      <tr><td colSpan={9} className="text-center text-textMuted py-10">Nenhum dado disponível</td></tr>
                    ) : rankingOrdenado.map((j: any, idx: number) => (
                      <tr key={j.id} className={cn('hover:bg-white/5 transition-colors', idx < 3 && 'bg-amber-500/5')}>
                        <td className="px-4 py-3 text-center">
                          {idx === 0 ? <Crown size={15} className="text-amber-400 mx-auto" />
                           : idx === 1 ? <span className="text-gray-400 font-bold text-sm">2</span>
                           : idx === 2 ? <span className="text-amber-700 font-bold text-sm">3</span>
                           : <span className="text-textMuted text-xs">{idx + 1}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar src={j.foto_url} nome={j.nome} size={8} />
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{j.nome}</p>
                              <p className="text-xs text-textMuted truncate">
                                {j.time_nome}
                                {j.joga_recuado && <span className="ml-1 text-purple-400">(rec.)</span>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className={cn('px-3 py-3 text-center font-black text-base', ordenacao === 'pontos' ? 'text-accentPrimary bg-accentPrimary/5' : 'text-accentPrimary')}>{j.pontos}</td>
                        <td className="px-3 py-3 text-center hidden sm:table-cell text-textMuted">{j.jogos}</td>
                        <td className={cn('px-3 py-3 text-center hidden sm:table-cell', ordenacao === 'vitorias' ? 'text-cyan-400 font-bold' : 'text-green-400')}>{j.vitorias}</td>
                        <td className="px-3 py-3 text-center hidden sm:table-cell text-textMuted">{j.empates}</td>
                        <td className="px-3 py-3 text-center hidden sm:table-cell text-red-400">{j.derrotas}</td>
                        <td className={cn('px-3 py-3 text-center hidden md:table-cell', ordenacao === 'gols' ? 'text-cyan-400 font-black' : 'font-bold')}>{j.gols}</td>
                        <td className={cn('px-3 py-3 text-center hidden md:table-cell', ordenacao === 'assistencias' ? 'text-cyan-400 font-bold' : '')}>{j.assistencias}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Goleiros */}
            <Card className="border-border bg-surface overflow-hidden">
              <div className="bg-surfaceElevated px-4 py-3 border-b border-border flex items-center gap-2">
                <Shield className="text-yellow-400" size={17} />
                <h3 className="font-bold text-lg">Muralhas (Goleiros)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-textMuted bg-surfaceElevated uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">Goleiro</th>
                      <th className="px-3 py-3 text-center">J</th>
                      <th className="px-3 py-3 text-center text-yellow-400">CS</th>
                      <th className="px-3 py-3 text-center text-red-400">GS</th>
                      <th className="px-3 py-3 text-center text-accentPrimary">Média</th>
                      <th className="px-3 py-3 text-center text-amber-400">PTS</th>
                      <th className="px-4 py-3 hidden lg:table-cell text-red-400">Algoz 😈</th>
                      <th className="px-4 py-3 hidden lg:table-cell text-green-400">Vítima 😅</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {goleiros.length === 0 ? (
                      <tr><td colSpan={8} className="text-center text-textMuted py-8">Nenhum goleiro registrado</td></tr>
                    ) : goleiros.map((g: any) => (
                      <tr key={g.id} className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar src={g.foto_url} nome={g.nome} size={7} />
                            <div><p className="font-semibold leading-tight">{g.nome}</p><p className="text-xs text-textMuted">{g.time_nome}</p></div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-textMuted">{g.jogos}</td>
                        <td className="px-3 py-3 text-center text-yellow-400 font-bold">{g.clean_sheets}</td>
                        <td className="px-3 py-3 text-center text-red-400">{g.gols_sofridos}</td>
                        <td className="px-3 py-3 text-center font-bold text-accentPrimary">{g.media_gols ?? '-'}</td>
                        <td className="px-3 py-3 text-center font-black text-amber-400">{g.pontos ?? 0}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {g.algoz ? <div className="flex items-center gap-2"><Avatar src={g.algoz.foto_url} nome={g.algoz.nome} size={6} /><div><p className="text-xs font-semibold">{g.algoz.nome}</p><p className="text-xs text-red-400">{g.algoz.total_gols} gols</p></div></div> : <span className="text-textMuted text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {g.vitima ? <div className="flex items-center gap-2"><Avatar src={g.vitima.foto_url} nome={g.vitima.nome} size={6} /><div><p className="text-xs font-semibold">{g.vitima.nome}</p><p className="text-xs text-green-400">{g.vitima.total_gols} gols</p></div></div> : <span className="text-textMuted text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* ─── Zagueiros com mais clean sheets ─── */}
            {zagueiros.length > 0 && (
              <Card className="border-border bg-surface overflow-hidden">
                <div className="bg-surfaceElevated px-4 py-3 border-b border-border flex items-center gap-2">
                  <ShieldCheck className="text-cyan-400" size={17} />
                  <h3 className="font-bold text-lg">Muralhas de Linha (Zagueiros)</h3>
                  <span className="ml-auto text-xs text-textMuted">partidas sem sofrer gol</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-textMuted bg-surfaceElevated uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3">Jogador</th>
                        <th className="px-3 py-3 text-center hidden sm:table-cell">Time</th>
                        <th className="px-3 py-3 text-center">J</th>
                        <th className="px-3 py-3 text-center text-yellow-300">CS</th>
                        <th className="px-3 py-3 text-center text-green-400">V</th>
                        <th className="px-3 py-3 text-center text-textMuted hidden sm:table-cell">E</th>
                        <th className="px-3 py-3 text-center text-red-400 hidden sm:table-cell">D</th>
                        <th className="px-3 py-3 text-center text-amber-400">PTS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {zagueiros.map((z: any, idx: number) => (
                        <tr key={z.id} className={cn('hover:bg-white/5 transition-colors', idx === 0 && 'bg-cyan-500/5')}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar src={z.foto_url} nome={z.nome} size={7} />
                              <div>
                                <p className="font-semibold leading-tight">{z.nome}</p>
                                <p className="text-xs text-textMuted">{z.time_nome}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center hidden sm:table-cell">
                            <span className="text-xs text-textMuted">{z.time_nome}</span>
                          </td>
                          <td className="px-3 py-3 text-center text-textMuted">{z.jogos}</td>
                          <td className="px-3 py-3 text-center font-black text-yellow-300">{z.clean_sheets}</td>
                          <td className="px-3 py-3 text-center text-green-400 font-bold">{z.vitorias}</td>
                          <td className="px-3 py-3 text-center text-textMuted hidden sm:table-cell">{z.empates}</td>
                          <td className="px-3 py-3 text-center text-red-400 hidden sm:table-cell">{z.derrotas}</td>
                          <td className="px-3 py-3 text-center font-black text-amber-400">{z.pontos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

          </motion.div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* ABA: TIMES — uma aba por time           */}
        {/* ════════════════════════════════════════ */}
        {subTab === 'times' && (
          <motion.div key="times" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            {timesUnicos.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-textMuted py-16 border border-dashed border-border rounded-2xl">
                <Swords size={40} className="opacity-20 mb-3" />
                <p>Nenhum time com dados ainda.</p>
              </div>
            ) : (
              <>
                {/* Seletor de times */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {timesUnicos.map((t: any) => {
                    const ativo = Number(t.id) === (timeAtivoId ?? Number(timesUnicos[0]?.id));
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTimeAtivoId(Number(t.id))}
                        className={cn(
                          'flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border font-bold text-sm whitespace-nowrap transition-all flex-shrink-0',
                          ativo
                            ? 'bg-accentPrimary/15 border-accentPrimary/50 text-accentPrimary shadow-lg shadow-accentPrimary/10'
                            : 'bg-surface border-border text-textMuted hover:border-accentPrimary/30 hover:text-white'
                        )}
                      >
                        <Avatar src={t.logo_url} nome={t.nome} size={6} />
                        {t.nome}
                        {ativo && <ChevronRight size={14} className="opacity-60" />}
                      </button>
                    );
                  })}
                </div>

                {/* Card do time ativo */}
                {timeAtivo && (
                  <TimeCard
                    key={timeAtivo.id}
                    time={timeAtivo}
                    todosJogadores={processados.ranking}
                    todosGoleiros={goleiros}
                    todosTimesTotais={timesUnicos}
                    confrontosTimes={confrontosTimes}
                  />
                )}
              </>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}