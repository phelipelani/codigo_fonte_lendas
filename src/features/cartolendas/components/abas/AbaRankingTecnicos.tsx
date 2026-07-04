// AbaRankingTecnicos.tsx — Ranking com pódio Top 3 + tabela completa + filtros
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Trophy, Crown, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { useRankingRodada } from '@/api/cartolendaApi';
import { useRodadasDoCampeonato } from '@/features/rodadas/api/useCampeonatoRodadas';
import { LendaCoin, Avatar, DivisaoBadge, PontosDisplay } from '../shared';

const DIVISOES = ['Todas', 'Bronze', 'Prata', 'Ouro', 'Lenda'] as const;
const DIVISAO_COR: Record<string, string> = {
  Todas: 'bg-purple-600 border-purple-500',
  Bronze: 'bg-amber-800 border-amber-700',
  Prata: 'bg-slate-500 border-slate-400',
  Ouro: 'bg-yellow-600 border-yellow-500',
  Lenda: 'bg-gradient-to-r from-purple-600 to-pink-600 border-purple-500',
};

export function AbaRankingTecnicos({ campeonatoId, membros, onVerEscalacao }: {
  campeonatoId: number;
  membros: any[];
  onVerEscalacao?: (userId: number, rodadaId: number) => void;
}) {
  const [filtroRodada, setFiltroRodada] = useState<number | null>(null);
  const [filtroDivisao, setFiltroDivisao] = useState<string>('Todas');

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
  const dadosBase = filtroRodada ? (rankingRodada ?? []) : (membros ?? []);

  // Filtro de divisão
  const dadosExibir = useMemo(() => {
    if (filtroDivisao === 'Todas') return dadosBase;
    return dadosBase.filter((item: any) => (item.divisao ?? 'Bronze') === filtroDivisao);
  }, [dadosBase, filtroDivisao]);

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

      {/* Filtro de divisão */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={11} className="text-white/30" />
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {DIVISOES.map(d => (
            <button
              key={d}
              onClick={() => setFiltroDivisao(d)}
              className={cn(
                'px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-all',
                filtroDivisao === d
                  ? `${DIVISAO_COR[d]} text-white`
                  : 'bg-white/5 text-white/40 border-white/8 hover:bg-white/10'
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

    {/* ══════ PÓDIO TOP 3 ══════ */}
      {dadosExibir.length >= 3 ? (
        <div className="relative pt-6 px-1">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 animate-bounce-slow">
            <Crown size={28} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
          </div>

          <div className="flex justify-center items-end gap-2 sm:gap-4 h-full">
            <div className="w-[30%] sm:w-32 z-10 translate-y-2">
              <PodiumCard item={dadosExibir[1]} rank={2} isRodada={!!filtroRodada} onClick={() => onVerEscalacao && rodadaId && onVerEscalacao(dadosExibir[1].id ?? dadosExibir[1].usuario_id, rodadaId)} />
            </div>
            <div className="w-[38%] sm:w-40 z-20">
              <PodiumCard item={dadosExibir[0]} rank={1} isRodada={!!filtroRodada} onClick={() => onVerEscalacao && rodadaId && onVerEscalacao(dadosExibir[0].id ?? dadosExibir[0].usuario_id, rodadaId)} />
            </div>
            <div className="w-[30%] sm:w-32 z-10 translate-y-4">
              <PodiumCard item={dadosExibir[2]} rank={3} isRodada={!!filtroRodada} onClick={() => onVerEscalacao && rodadaId && onVerEscalacao(dadosExibir[2].id ?? dadosExibir[2].usuario_id, rodadaId)} />
            </div>
          </div>
        </div>
      ) : dadosExibir.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-3">
          {dadosExibir.map((item: any, i: number) => (
            <div key={item.id ?? item.usuario_id} className="w-[45%]">
              <PodiumCard item={item} rank={i + 1} isRodada={!!filtroRodada} onClick={() => onVerEscalacao && rodadaId && onVerEscalacao(item.id ?? item.usuario_id, rodadaId)} />
            </div>
          ))}
        </div>
      ) : null}

      {/* ══════ TABELA COMPLETA (MOBILE-FIRST) ══════ */}
      {dadosExibir.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-900/60 shadow-lg mt-4">
          <div className="h-1 bg-gradient-to-r from-purple-400 to-indigo-500" />
          
          <div className="flex flex-col">
            {dadosExibir.map((item: any, i: number) => {
              const pontos = parseFloat(item.pontos_total ?? item.total_pontos ?? 0);
              const pontosRodada = parseFloat(item.pontos_rodada ?? item.ultima_pontuacao ?? 0);
              const lc = parseFloat(item.lendas_coins ?? 100);
              const userId = item.id ?? item.usuario_id;
              
              const isLider = i === 0;

              return (
                <div
                  key={userId}
                  onClick={() => onVerEscalacao && rodadaId && onVerEscalacao(userId, rodadaId)}
                  className={cn(
                    'flex items-center justify-between p-3 border-b border-white/5 last:border-0 cursor-pointer transition-all hover:bg-white/[0.04]',
                    isLider ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border-l-2 border-l-yellow-500' : ''
                  )}
                >
                  
                  {/* LADO ESQUERDO: Posição + Avatar + Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    
                    {/* Badge Posição */}
                    <div className={cn(
                      'w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-black shadow-sm',
                      isLider ? 'bg-yellow-500 text-black shadow-yellow-500/20'
                      : i === 1 ? 'bg-slate-300 text-black'
                      : i === 2 ? 'bg-amber-700 text-white'
                      : 'bg-white/10 text-white/50'
                    )}>
                      {i + 1}
                    </div>

                    {/* Avatar */}
                    <Avatar 
                      src={item.foto_url ?? item.avatar_url} 
                      nome={item.jogador_nome ?? item.username} 
                      size={10} 
                      className={cn(
                        'shrink-0 border-2',
                        isLider ? 'border-yellow-500/50' : 'border-white/10'
                      )} 
                    />

                    {/* Nome & Info */}
                    <div className="min-w-0 flex flex-col justify-center">
                      <p className={cn(
                        'font-bold truncate',
                        isLider ? 'text-yellow-400 text-sm' : 'text-white text-sm'
                      )}>
                        {item.jogador_nome ?? item.username}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-0.5">
                        <DivisaoBadge divisao={item.divisao ?? 'Bronze'} />
                        <div className="flex items-center gap-1 bg-black/20 rounded px-1.5 py-0.5">
                          <LendaCoin size={8} />
                          <span className="text-[9px] font-bold text-yellow-500">{lc.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* LADO DIREITO: Pontos em Destaque */}
                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <p className={cn(
                      'font-black leading-none',
                      isLider ? 'text-2xl text-yellow-400' : 'text-xl text-purple-400'
                    )}>
                      {pontos.toFixed(1)}
                    </p>
                    <span className="text-[9px] uppercase font-bold text-white/30 tracking-wider mb-1 mt-0.5">Pontos</span>
                    
                    {/* Variação */}
                    {pontosRodada !== 0 ? (
                       <PontosDisplay valor={pontosRodada} size="xs" showArrow className="px-1.5 py-0.5" />
                    ) : (
                       <div className="px-1.5 py-0.5 text-[10px] text-white/20 bg-white/5 rounded-md">-</div>
                    )}
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
          <p className="text-white/30 font-bold">Nenhum técnico no ranking</p>
          <p className="text-white/20 text-sm mt-1">Os dados aparecerão após as rodadas serem finalizadas.</p>
        </div>
      )}
    </div>
  );
}

// ── Pódio Card Focado no Mobile ────────────────────────────────
function PodiumCard({ item, rank, isRodada, onClick }: {
  item: any; rank: number; isRodada: boolean; onClick: () => void;
}) {
  const pontos = parseFloat(item.pontos_total ?? item.total_pontos ?? 0);
  const lc = parseFloat(item.lendas_coins ?? 100);
  const pontosRodada = parseFloat(item.pontos_rodada ?? item.ultima_pontuacao ?? 0);

  const colors = {
    1: { border: 'border-yellow-500/60', bg: 'from-yellow-900/60 to-yellow-950/80', top: 'from-yellow-400 to-amber-500', badge: 'bg-yellow-500 text-black', text: 'text-yellow-400', shadow: 'shadow-xl shadow-yellow-500/20' },
    2: { border: 'border-slate-400/40', bg: 'from-slate-800/80 to-slate-900/90', top: 'from-slate-300 to-slate-400', badge: 'bg-slate-300 text-black', text: 'text-slate-200', shadow: 'shadow-lg shadow-black/40' },
    3: { border: 'border-amber-700/40', bg: 'from-amber-900/40 to-amber-950/60', top: 'from-amber-600 to-amber-700', badge: 'bg-amber-700 text-white', text: 'text-amber-500', shadow: 'shadow-lg shadow-black/40' },
  }[rank] ?? { border: 'border-white/10', bg: 'from-slate-800/40 to-slate-900/60', top: 'from-white/10 to-white/5', badge: 'bg-white/10 text-white/50', text: 'text-white/50', shadow: '' };

  const isLider = rank === 1;

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-[20px] overflow-hidden border cursor-pointer transition-all hover:scale-[1.03] flex flex-col h-full',
        colors.border,
        colors.shadow
      )}
    >
      <div className={cn('h-1.5 w-full bg-gradient-to-r shrink-0', colors.top)} />
      
      <div className={cn('bg-gradient-to-b p-2.5 sm:p-3 flex flex-col items-center gap-1.5 flex-1 relative', colors.bg, isLider ? 'pt-4 pb-4' : '')}>
        
        {/* Medalha */}
        <div className={cn(
          'absolute -top-3 left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center font-black border-2 border-[#1a1a2e]', 
          colors.badge,
          isLider ? 'w-7 h-7 text-sm' : 'w-6 h-6 text-xs'
        )}>
          {rank}
        </div>

        {/* Avatar */}
        <Avatar
          src={item.foto_url ?? item.avatar_url}
          nome={item.jogador_nome ?? item.username}
          size={isLider ? 14 : 11}
          className={cn('border-2 shadow-lg shrink-0 z-10', isLider ? 'mt-2' : 'mt-1', colors.border)}
        />

        {/* Nome */}
        <div className="text-center w-full min-w-0 mt-0.5">
          <p className={cn('font-bold text-white truncate leading-tight', isLider ? 'text-[13px] sm:text-sm' : 'text-[11px] sm:text-xs')}>
            {(item.jogador_nome ?? item.username)?.split(' ')[0]}
          </p>
          <div className="scale-90 origin-top mt-0.5 flex justify-center">
            <DivisaoBadge divisao={item.divisao ?? 'Bronze'} />
          </div>
        </div>

        {/* Box de Pontos */}
        <div className={cn(
          'rounded-xl px-1 py-1.5 text-center w-full mt-auto',
          isLider ? 'bg-yellow-500/10' : 'bg-black/20'
        )}>
          <p className={cn(
            'font-black leading-none', 
            colors.text,
            isLider ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
          )}>
            {pontos.toFixed(1)}
          </p>
          <p className={cn("text-[9px] font-bold uppercase mt-0.5", isLider ? "text-yellow-500/50" : "text-white/20")}>PTS</p>
        </div>

      </div>
    </div>
  );
}
