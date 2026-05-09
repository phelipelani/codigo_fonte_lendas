// AbaRankingTecnicos.tsx — Ranking com pódio Top 3 + tabela completa + filtro de rodada
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Trophy, Crown, Users, TrendingUp, TrendingDown, Medal } from 'lucide-react';
import { useRankingRodada } from '@/api/cartolendaApi';
import { useRodadasDoCampeonato } from '@/features/rodadas/api/useCampeonatoRodadas';
import { LendaCoin, Avatar, DivisaoBadge } from '../shared';

export function AbaRankingTecnicos({ campeonatoId, membros, onVerEscalacao }: {
  campeonatoId: number;
  membros: any[];
  onVerEscalacao?: (userId: number, rodadaId: number) => void;
}) {
  const [filtroRodada, setFiltroRodada] = useState<number | null>(null);

  // Rodadas com número sequencial
  const { data: rodadasRaw } = useRodadasDoCampeonato(campeonatoId);
  const rodadas = useMemo(() => {
    if (!rodadasRaw?.length) return [];
    const sorted = [...rodadasRaw].sort((a: any, b: any) => {
      if (a.data !== b.data) return a.data < b.data ? -1 : 1;
      return a.id - b.id;
    });
    return sorted.map((r: any, i: number) => ({ ...r, numero: i + 1 }));
  }, [rodadasRaw]);
  const rodadasFinalizadas = useMemo(() => rodadas.filter(r => r.status === 'finalizada').sort((a, b) => b.numero - a.numero), [rodadas]);

  const rodadaId = filtroRodada ?? rodadasFinalizadas[0]?.id ?? null;
  const { data: rankingRodada } = useRankingRodada(filtroRodada ? filtroRodada : null);

  // Dados a exibir: se filtrou por rodada, usa ranking da rodada; senão, usa membros (geral)
  const dadosExibir = filtroRodada ? (rankingRodada ?? []) : (membros ?? []);

  return (
    <div className="space-y-5">
      {/* Filtro de rodada */}
      {rodadasFinalizadas.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-white/30 font-bold uppercase">Rodada:</span>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setFiltroRodada(null)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-all',
                !filtroRodada ? 'bg-purple-600 text-white border-purple-500' : 'bg-white/5 text-white/40 border-white/8 hover:bg-white/10'
              )}
            >
              Geral
            </button>
            {rodadasFinalizadas.map((r: any) => (
              <button
                key={r.id}
                onClick={() => setFiltroRodada(r.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-all',
                  filtroRodada === r.id ? 'bg-purple-600 text-white border-purple-500' : 'bg-white/5 text-white/40 border-white/8 hover:bg-white/10'
                )}
              >
                R{r.numero}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════ PÓDIO TOP 3 ══════ */}
      {dadosExibir.length >= 3 ? (
        <div className="relative pt-6">
          {/* Coroa para o primeiro */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
            <Crown size={24} className="text-yellow-400 drop-shadow-lg" />
          </div>

          <div className="grid grid-cols-3 gap-2 items-end">
            {/* 2º lugar */}
            <PodiumCard item={dadosExibir[1]} rank={2} isRodada={!!filtroRodada}
              onClick={() => onVerEscalacao && rodadaId && onVerEscalacao(dadosExibir[1].id ?? dadosExibir[1].usuario_id, rodadaId)} />
            {/* 1º lugar */}
            <PodiumCard item={dadosExibir[0]} rank={1} isRodada={!!filtroRodada}
              onClick={() => onVerEscalacao && rodadaId && onVerEscalacao(dadosExibir[0].id ?? dadosExibir[0].usuario_id, rodadaId)} />
            {/* 3º lugar */}
            <PodiumCard item={dadosExibir[2]} rank={3} isRodada={!!filtroRodada}
              onClick={() => onVerEscalacao && rodadaId && onVerEscalacao(dadosExibir[2].id ?? dadosExibir[2].usuario_id, rodadaId)} />
          </div>
        </div>
      ) : dadosExibir.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {dadosExibir.map((item: any, i: number) => (
            <PodiumCard key={item.id ?? item.usuario_id} item={item} rank={i + 1} isRodada={!!filtroRodada}
              onClick={() => onVerEscalacao && rodadaId && onVerEscalacao(item.id ?? item.usuario_id, rodadaId)} />
          ))}
        </div>
      ) : null}

      {/* ══════ TABELA COMPLETA ══════ */}
      {dadosExibir.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-white/10">
          <div className="h-1 bg-gradient-to-r from-purple-400 to-indigo-500" />
          <div className="bg-gradient-to-b from-slate-800/30 to-slate-900/50">
            {/* Header da tabela */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-white/8 text-[10px] font-bold text-white/30 uppercase">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Tecnico</div>
              <div className="col-span-3 text-right">Pontos</div>
              <div className="col-span-3 text-right">Saldo</div>
            </div>

            {/* Linhas */}
            {dadosExibir.map((item: any, i: number) => {
              const pontos = parseFloat(item.pontos_total ?? item.total_pontos ?? 0);
              const lc = parseFloat(item.lendas_coins ?? 100);
              const userId = item.id ?? item.usuario_id;

              return (
                <div
                  key={userId}
                  onClick={() => onVerEscalacao && rodadaId && onVerEscalacao(userId, rodadaId)}
                  className={cn(
                    'grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/5 last:border-0 cursor-pointer transition-all hover:bg-white/[0.03]',
                    i < 3 && 'bg-white/[0.02]'
                  )}
                >
                  {/* Posição */}
                  <div className="col-span-1 flex items-center">
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black',
                      i === 0 ? 'bg-yellow-500 text-black'
                      : i === 1 ? 'bg-slate-400 text-black'
                      : i === 2 ? 'bg-amber-700 text-white'
                      : 'bg-white/10 text-white/40'
                    )}>
                      {i + 1}
                    </div>
                  </div>

                  {/* Técnico */}
                  <div className="col-span-5 flex items-center gap-2 min-w-0">
                    <Avatar src={item.foto_url ?? item.avatar_url} nome={item.jogador_nome ?? item.username} size={8} className="border border-white/10 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{item.jogador_nome ?? item.username}</p>
                      <DivisaoBadge divisao={item.divisao ?? 'Bronze'} />
                    </div>
                  </div>

                  {/* Pontos */}
                  <div className="col-span-3 flex items-center justify-end">
                    <p className="font-black text-sm text-purple-400">{pontos.toFixed(1)}</p>
                  </div>

                  {/* Saldo LC */}
                  <div className="col-span-3 flex items-center justify-end gap-0.5">
                    <p className="font-bold text-sm text-yellow-400">{lc.toFixed(0)}</p>
                    <LendaCoin size={11} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dadosExibir.length === 0 && (
        <div className="text-center py-12">
          <Trophy size={32} className="mx-auto text-white/15 mb-3" />
          <p className="text-white/30 font-bold">Nenhum tecnico no ranking</p>
          <p className="text-white/20 text-sm mt-1">Os dados aparecerao apos as rodadas serem finalizadas.</p>
        </div>
      )}
    </div>
  );
}

// ── Pódio Card ─────────────────────────────────────────────────
function PodiumCard({ item, rank, isRodada, onClick }: {
  item: any; rank: number; isRodada: boolean; onClick: () => void;
}) {
  const pontos = parseFloat(item.pontos_total ?? item.total_pontos ?? 0);
  const lc = parseFloat(item.lendas_coins ?? 100);

  const colors = {
    1: { border: 'border-yellow-500/40', bg: 'from-yellow-900/40 to-yellow-950/60', top: 'from-yellow-400 to-amber-500', badge: 'bg-yellow-500 text-black', text: 'text-yellow-400' },
    2: { border: 'border-slate-400/30', bg: 'from-slate-800/60 to-slate-900/80', top: 'from-slate-300 to-slate-400', badge: 'bg-slate-400 text-black', text: 'text-slate-300' },
    3: { border: 'border-amber-700/30', bg: 'from-amber-900/30 to-amber-950/50', top: 'from-amber-600 to-amber-700', badge: 'bg-amber-700 text-white', text: 'text-amber-500' },
  }[rank] ?? { border: 'border-white/10', bg: 'from-slate-800/40 to-slate-900/60', top: 'from-white/10 to-white/5', badge: 'bg-white/10 text-white/50', text: 'text-white/50' };

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl overflow-hidden border cursor-pointer transition-all hover:scale-[1.02]',
        colors.border,
        rank === 1 ? 'shadow-lg shadow-yellow-500/10' : ''
      )}
    >
      <div className={cn('h-1.5 bg-gradient-to-r', colors.top)} />
      <div className={cn('bg-gradient-to-b p-4 flex flex-col items-center gap-2', colors.bg, rank === 1 && 'pb-5')}>
        {/* Medalha */}
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center font-black text-sm', colors.badge)}>
          {rank}°
        </div>

        {/* Avatar */}
        <Avatar
          src={item.foto_url ?? item.avatar_url}
          nome={item.jogador_nome ?? item.username}
          size={rank === 1 ? 16 : 12}
          className={cn('border-2 shadow-lg', colors.border)}
        />

        {/* Nome */}
        <div className="text-center w-full">
          <p className={cn('font-bold text-white truncate', rank === 1 ? 'text-sm' : 'text-xs')}>
            {(item.jogador_nome ?? item.username)?.split(' ')[0]}
          </p>
          <DivisaoBadge divisao={item.divisao ?? 'Bronze'} />
        </div>

        {/* Pontos */}
        <div className="bg-purple-500/10 rounded-xl px-4 py-2 text-center w-full">
          <p className={cn('font-black text-purple-400', rank === 1 ? 'text-xl' : 'text-lg')}>{pontos.toFixed(1)}</p>
          <p className="text-[8px] text-purple-300/50 font-bold uppercase">pontos</p>
        </div>

        {/* LC */}
        <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-400">
          <LendaCoin size={10} />
          {lc.toFixed(0)} LC
        </div>
      </div>
    </div>
  );
}
