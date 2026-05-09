import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Trophy, TrendingUp, TrendingDown, Zap, Users, Crown, Medal } from 'lucide-react';
import { useRankingRodada, useRankingJogadores } from '@/api/cartolendaApi';
import { useRodadasDoCampeonato } from '@/features/rodadas/api/useCampeonatoRodadas';
import { LendaCoin, Avatar, DivisaoBadge } from '../shared';

type SubAba = 'tecnicos_geral' | 'tecnicos_rodada' | 'jogadores_pontos' | 'jogadores_valorizacao';

const medalColors = [
  'from-yellow-400 to-amber-500 text-black border-yellow-300',
  'from-slate-300 to-slate-400 text-black border-slate-200',
  'from-amber-600 to-amber-700 text-white border-amber-500',
];

export function AbaRankingCompleto({ campeonatoId, membros, onVerEscalacao }: { campeonatoId: number; membros: any[]; onVerEscalacao?: (userId: number, rodadaId: number) => void }) {
  const [subAba, setSubAba] = useState<SubAba>('tecnicos_geral');
  const [rodadaSelId, setRodadaSelId] = useState<number | null>(null);
  const { data: rodadasRaw } = useRodadasDoCampeonato(campeonatoId);

  // Rodadas com número sequencial calculado
  const rodadas = useMemo(() => {
    if (!rodadasRaw?.length) return [];
    const sorted = [...rodadasRaw].sort((a: any, b: any) => {
      if (a.data !== b.data) return a.data < b.data ? -1 : 1;
      return a.id - b.id;
    });
    return sorted.map((r: any, i: number) => ({ ...r, numero: i + 1 }));
  }, [rodadasRaw]);

  const rodadasFinalizadas = useMemo(() => rodadas.filter((r: any) => r.status === 'finalizada').sort((a: any, b: any) => b.numero - a.numero), [rodadas]);
  const rodadaId = rodadaSelId ?? rodadasFinalizadas[0]?.id ?? null;

  const { data: rankingRodada } = useRankingRodada(subAba === 'tecnicos_rodada' ? rodadaId : null);
  const { data: jogadoresPontos } = useRankingJogadores(
    subAba === 'jogadores_pontos' ? { tipo: 'pontos', escopo: rodadaId && rodadaSelId ? 'rodada' : 'geral', rodada_id: rodadaSelId ?? undefined } : { tipo: 'pontos', escopo: 'geral' }
  );
  const { data: jogadoresVal } = useRankingJogadores(
    subAba === 'jogadores_valorizacao' ? { tipo: 'valorizacao', escopo: rodadaId && rodadaSelId ? 'rodada' : 'geral', rodada_id: rodadaSelId ?? undefined } : { tipo: 'valorizacao', escopo: 'geral' }
  );

  const subAbas: { key: SubAba; label: string; icon: any }[] = [
    { key: 'tecnicos_geral', label: 'Tecnicos', icon: Trophy },
    { key: 'tecnicos_rodada', label: 'Rodada', icon: Users },
    { key: 'jogadores_pontos', label: 'Pontos', icon: Zap },
    { key: 'jogadores_valorizacao', label: 'Valor', icon: TrendingUp },
  ];

  // Encontrar numero da rodada pelo ID
  const getNumeroRodada = (id: number) => {
    const r = rodadas.find((r: any) => r.id === id);
    return r?.numero ?? '?';
  };

  const RodadaSelector = () => rodadasFinalizadas.length > 0 ? (
    <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-none">
      {subAba !== 'tecnicos_geral' && (
        <button onClick={() => setRodadaSelId(null)} className={cn(
          'px-3.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-all',
          !rodadaSelId ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-900/30' : 'bg-white/5 text-white/40 border-white/8 hover:bg-white/10'
        )}>Geral</button>
      )}
      {rodadasFinalizadas.map((r: any) => (
        <button key={r.id} onClick={() => setRodadaSelId(r.id)} className={cn(
          'px-3.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-all',
          rodadaSelId === r.id ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-900/30' : 'bg-white/5 text-white/40 border-white/8 hover:bg-white/10'
        )}>
          R{r.numero}
        </button>
      ))}
    </div>
  ) : null;

  // ── Card de Técnico (gerente/treinador) ──
  const TecnicoCard = ({ item, rank, onClick }: { item: any; rank: number; onClick?: () => void }) => {
    const pontos = parseFloat(item.pontos_total ?? item.total_pontos ?? 0);
    const lc = parseFloat(item.lendas_coins ?? 100);
    const isPodio = rank < 3;

    return (
      <div
        onClick={onClick}
        className={cn(
          'relative rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer hover:scale-[1.02]',
          rank === 0 ? 'bg-gradient-to-b from-yellow-900/40 to-yellow-950/60 border-yellow-500/30 shadow-lg shadow-yellow-500/10'
          : rank === 1 ? 'bg-gradient-to-b from-slate-800/60 to-slate-900/80 border-slate-400/20'
          : rank === 2 ? 'bg-gradient-to-b from-amber-900/30 to-amber-950/50 border-amber-700/20'
          : 'bg-gradient-to-b from-slate-800/40 to-slate-900/70 border-white/8 hover:border-purple-500/20'
        )}
      >
        {/* Topo colorido */}
        <div className={cn(
          'h-1',
          rank === 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
          : rank === 1 ? 'bg-gradient-to-r from-slate-300 to-slate-400'
          : rank === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-700'
          : 'bg-gradient-to-r from-purple-500/50 to-purple-700/50'
        )} />

        <div className="p-3 flex flex-col items-center gap-2">
          {/* Posição */}
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center font-black text-xs border',
            isPodio ? `bg-gradient-to-br ${medalColors[rank]}` : 'bg-white/10 text-white/40 border-white/10'
          )}>
            {rank + 1}
          </div>

          {/* Avatar */}
          <Avatar
            src={item.foto_url ?? item.avatar_url}
            nome={item.jogador_nome ?? item.username}
            size={12}
            className="border-2 border-white/10 shadow-lg"
          />

          {/* Nome */}
          <div className="text-center w-full">
            <p className="text-xs font-bold text-white truncate">{(item.jogador_nome ?? item.username)?.split(' ')[0]}</p>
            <DivisaoBadge divisao={item.divisao ?? 'Bronze'} />
          </div>

          {/* Pontos */}
          <div className="bg-purple-500/10 rounded-lg px-3 py-1.5 text-center w-full">
            <p className="font-black text-purple-400 text-sm">{pontos.toFixed(1)}</p>
            <p className="text-[8px] text-purple-300/50 font-bold uppercase">pontos</p>
          </div>

          {/* LendaCoins */}
          <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-400">
            <LendaCoin size={10} />
            {lc.toFixed(1)}
          </div>
        </div>
      </div>
    );
  };

  // ── Card de Jogador ──
  const JogadorCard = ({ item, rank, tipo }: { item: any; rank: number; tipo: 'pontos' | 'valorizacao' }) => {
    const isPontos = tipo === 'pontos';
    const valor = isPontos
      ? parseFloat(item.pontos ?? item.total_pontos ?? 0)
      : parseFloat(item.variacao ?? item.valorizacao_total ?? 0);
    const preco = parseFloat(item.preco ?? item.preco_atual ?? 10);
    const isPodio = rank < 3;

    return (
      <div className={cn(
        'relative rounded-2xl overflow-hidden border transition-all duration-200',
        rank === 0 ? 'bg-gradient-to-b from-yellow-900/40 to-yellow-950/60 border-yellow-500/30 shadow-lg shadow-yellow-500/10'
        : rank === 1 ? 'bg-gradient-to-b from-slate-800/60 to-slate-900/80 border-slate-400/20'
        : rank === 2 ? 'bg-gradient-to-b from-amber-900/30 to-amber-950/50 border-amber-700/20'
        : 'bg-gradient-to-b from-slate-800/40 to-slate-900/70 border-white/8'
      )}>
        {/* Topo colorido */}
        <div className={cn(
          'h-1',
          rank === 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
          : rank === 1 ? 'bg-gradient-to-r from-slate-300 to-slate-400'
          : rank === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-700'
          : isPontos ? 'bg-gradient-to-r from-purple-500/50 to-purple-700/50' : 'bg-gradient-to-r from-emerald-500/50 to-emerald-700/50'
        )} />

        <div className="p-3 flex flex-col items-center gap-1.5">
          {/* Posição */}
          <div className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] border',
            isPodio ? `bg-gradient-to-br ${medalColors[rank]}` : 'bg-white/10 text-white/40 border-white/10'
          )}>
            {rank + 1}
          </div>

          {/* Avatar */}
          <Avatar
            src={item.foto_url ?? item.avatar_url}
            nome={item.nome}
            size={10}
            className="border border-white/15 shadow-md"
          />

          {/* Nome + posição */}
          <div className="text-center w-full">
            <p className="text-[10px] font-bold text-white truncate">{item.nome?.split(' ')[0]}</p>
            <p className="text-[8px] text-white/25 capitalize">{item.posicao}</p>
          </div>

          {/* Valor principal */}
          {isPontos ? (
            <div className="bg-purple-500/10 rounded-lg px-2.5 py-1 text-center w-full">
              <p className="font-black text-purple-400 text-xs">{valor.toFixed(1)}</p>
              <p className="text-[7px] text-purple-300/50 font-bold uppercase">pts</p>
            </div>
          ) : (
            <div className={cn(
              'rounded-lg px-2.5 py-1 text-center w-full',
              valor > 0 ? 'bg-emerald-500/10' : valor < 0 ? 'bg-red-500/10' : 'bg-white/5'
            )}>
              <p className={cn('font-black text-xs flex items-center justify-center gap-0.5',
                valor > 0 ? 'text-emerald-400' : valor < 0 ? 'text-red-400' : 'text-white/30'
              )}>
                {valor > 0 ? <TrendingUp size={9} /> : valor < 0 ? <TrendingDown size={9} /> : null}
                {valor > 0 ? '+' : ''}{valor.toFixed(2)}
              </p>
              <p className="text-[7px] text-white/30 font-bold uppercase">var</p>
            </div>
          )}

          {/* Preço */}
          <div className="flex items-center gap-0.5 text-[9px] font-bold text-yellow-400">
            <LendaCoin size={8} />
            {preco.toFixed(1)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Sub-abas */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {subAbas.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setSubAba(key)} className={cn(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-all',
            subAba === key
              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shadow-sm shadow-yellow-900/20'
              : 'bg-white/5 text-white/40 border-white/8 hover:bg-white/10 hover:text-white/60'
          )}>
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* ══════ TÉCNICOS GERAL ══════ */}
      {subAba === 'tecnicos_geral' && (
        <div>
          {/* Top 3 destaque */}
          {(membros ?? []).length >= 3 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {/* 2º lugar */}
              <div className="pt-6">
                <TecnicoCard
                  item={membros[1]}
                  rank={1}
                  onClick={() => onVerEscalacao && rodadasFinalizadas[0] && onVerEscalacao(membros[1].id, rodadasFinalizadas[0].id)}
                />
              </div>
              {/* 1º lugar */}
              <div>
                <div className="flex justify-center mb-1">
                  <Crown size={18} className="text-yellow-400" />
                </div>
                <TecnicoCard
                  item={membros[0]}
                  rank={0}
                  onClick={() => onVerEscalacao && rodadasFinalizadas[0] && onVerEscalacao(membros[0].id, rodadasFinalizadas[0].id)}
                />
              </div>
              {/* 3º lugar */}
              <div className="pt-8">
                <TecnicoCard
                  item={membros[2]}
                  rank={2}
                  onClick={() => onVerEscalacao && rodadasFinalizadas[0] && onVerEscalacao(membros[2].id, rodadasFinalizadas[0].id)}
                />
              </div>
            </div>
          )}

          {/* Resto do ranking em grid de cards */}
          {(membros ?? []).length > 3 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(membros ?? []).slice(3).map((m: any, i: number) => (
                <TecnicoCard
                  key={m.id}
                  item={m}
                  rank={i + 3}
                  onClick={() => onVerEscalacao && rodadasFinalizadas[0] && onVerEscalacao(m.id, rodadasFinalizadas[0].id)}
                />
              ))}
            </div>
          )}

          {/* Poucos membros */}
          {(membros ?? []).length > 0 && (membros ?? []).length < 3 && (
            <div className="grid grid-cols-2 gap-2">
              {(membros ?? []).map((m: any, i: number) => (
                <TecnicoCard
                  key={m.id}
                  item={m}
                  rank={i}
                  onClick={() => onVerEscalacao && rodadasFinalizadas[0] && onVerEscalacao(m.id, rodadasFinalizadas[0].id)}
                />
              ))}
            </div>
          )}

          {(!membros || membros.length === 0) && (
            <div className="text-center py-12">
              <Trophy size={28} className="mx-auto text-white/15 mb-2" />
              <p className="text-white/30 text-sm">Nenhum tecnico no ranking</p>
            </div>
          )}
        </div>
      )}

      {/* ══════ TÉCNICOS RODADA ══════ */}
      {subAba === 'tecnicos_rodada' && (
        <>
          <RodadaSelector />
          {(rankingRodada ?? []).length > 0 ? (
            <div>
              {/* Top 3 destaque */}
              {rankingRodada!.length >= 3 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="pt-6">
                    <TecnicoCard
                      item={rankingRodada![1]}
                      rank={1}
                      onClick={() => onVerEscalacao && rodadaId && onVerEscalacao(rankingRodada![1].usuario_id, rodadaId)}
                    />
                  </div>
                  <div>
                    <div className="flex justify-center mb-1">
                      <Crown size={18} className="text-yellow-400" />
                    </div>
                    <TecnicoCard
                      item={rankingRodada![0]}
                      rank={0}
                      onClick={() => onVerEscalacao && rodadaId && onVerEscalacao(rankingRodada![0].usuario_id, rodadaId)}
                    />
                  </div>
                  <div className="pt-8">
                    <TecnicoCard
                      item={rankingRodada![2]}
                      rank={2}
                      onClick={() => onVerEscalacao && rodadaId && onVerEscalacao(rankingRodada![2].usuario_id, rodadaId)}
                    />
                  </div>
                </div>
              )}

              {rankingRodada!.length > 3 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {rankingRodada!.slice(3).map((t: any, i: number) => (
                    <TecnicoCard
                      key={t.usuario_id}
                      item={t}
                      rank={i + 3}
                      onClick={() => onVerEscalacao && rodadaId && onVerEscalacao(t.usuario_id, rodadaId)}
                    />
                  ))}
                </div>
              )}

              {rankingRodada!.length > 0 && rankingRodada!.length < 3 && (
                <div className="grid grid-cols-2 gap-2">
                  {rankingRodada!.map((t: any, i: number) => (
                    <TecnicoCard
                      key={t.usuario_id}
                      item={t}
                      rank={i}
                      onClick={() => onVerEscalacao && rodadaId && onVerEscalacao(t.usuario_id, rodadaId)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users size={28} className="mx-auto text-white/15 mb-2" />
              <p className="text-white/30 text-sm">Selecione uma rodada finalizada</p>
            </div>
          )}
        </>
      )}

      {/* ══════ JOGADORES POR PONTOS ══════ */}
      {subAba === 'jogadores_pontos' && (
        <>
          <RodadaSelector />
          {(jogadoresPontos ?? []).length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(jogadoresPontos ?? []).slice(0, 20).map((j: any, i: number) => (
                <JogadorCard key={j.id} item={j} rank={i} tipo="pontos" />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Zap size={28} className="mx-auto text-white/15 mb-2" />
              <p className="text-white/30 text-sm">Sem dados</p>
            </div>
          )}
        </>
      )}

      {/* ══════ JOGADORES POR VALORIZAÇÃO ══════ */}
      {subAba === 'jogadores_valorizacao' && (
        <>
          <RodadaSelector />
          {(jogadoresVal ?? []).length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(jogadoresVal ?? []).slice(0, 20).map((j: any, i: number) => (
                <JogadorCard key={j.id} item={j} rank={i} tipo="valorizacao" />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp size={28} className="mx-auto text-white/15 mb-2" />
              <p className="text-white/30 text-sm">Sem dados</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
