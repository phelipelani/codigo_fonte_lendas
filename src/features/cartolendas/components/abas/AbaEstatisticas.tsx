import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/api';
import { cn } from '@/lib/utils';
import { BarChart3, TrendingUp, TrendingDown, Users, Crown, Zap, Trophy, Coins, Star } from 'lucide-react';
import { useRodadasDoCampeonato } from '@/features/rodadas/api/useCampeonatoRodadas';
import { LendaCoin, Avatar, PosicaoBadge, PontosDisplay } from '../shared';
import { getPosicaoTipo } from '@/@types/cartolendas';

export function AbaEstatisticas({ campeonatoId }: { campeonatoId: number }) {
  const [rodadaSelecionada, setRodadaSelecionada] = useState<number | null>(null);

  // Rodadas com número sequencial calculado
  const { data: rodadasRaw } = useRodadasDoCampeonato(campeonatoId);
  const rodadasMap = useMemo(() => {
    if (!rodadasRaw?.length) return new Map<number, number>();
    const sorted = [...rodadasRaw].sort((a: any, b: any) => {
      if (a.data !== b.data) return a.data < b.data ? -1 : 1;
      return a.id - b.id;
    });
    const map = new Map<number, number>();
    sorted.forEach((r: any, i: number) => map.set(r.id, i + 1));
    return map;
  }, [rodadasRaw]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['cartolendas', 'stats', 'rodada', rodadaSelecionada],
    queryFn: async () => (await api.get('/cartolendas/stats/rodada', { params: rodadaSelecionada ? { rodada_id: rodadaSelecionada } : {} })).data,
    staleTime: 60_000,
  });
  const { data: statsMercado } = useQuery({
    queryKey: ['cartolendas', 'stats', 'mercado'],
    queryFn: async () => (await api.get('/cartolendas/stats/mercado', { params: { campeonato_id: campeonatoId } })).data,
    staleTime: 60_000,
  });

  if (isLoading) return <div className="text-center py-12 text-white/30 text-sm">Carregando estatisticas...</div>;
  if (stats?.sem_dados) return (
    <div className="text-center py-12 space-y-3">
      <BarChart3 size={32} className="mx-auto text-white/20" />
      <p className="text-white/40 font-bold">Nenhuma rodada finalizada ainda</p>
      <p className="text-white/25 text-sm">As estatisticas aparecerao apos a primeira rodada ser finalizada.</p>
    </div>
  );

  const resumo = stats?.resumo;

  return (
    <div className="space-y-4">
      {/* Seletor de rodada */}
      {stats?.rodadas_disponiveis?.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-white/40 font-bold">Rodada:</span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {stats.rodadas_disponiveis.map((r: any) => (
              <button key={r.id} onClick={() => setRodadaSelecionada(r.id)} className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all',
                (rodadaSelecionada ?? stats.rodada_id) === r.id
                  ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-900/30'
                  : 'bg-white/5 text-white/40 border-white/8 hover:bg-white/10'
              )}>
                R{rodadasMap.get(r.id) ?? r.numero ?? r.id}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPIs em cards */}
      {resumo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Media', value: `${parseFloat(resumo.media_pontos ?? 0).toFixed(1)}`, sub: 'pts', icon: BarChart3, color: 'text-cyan-400', bgColor: 'from-cyan-900/30 to-cyan-950/50', borderColor: 'border-cyan-500/20', topBar: 'from-cyan-400 to-cyan-600' },
            { label: 'Maior nota', value: `${parseFloat(resumo.maior_pontuacao ?? 0).toFixed(1)}`, sub: 'pts', icon: TrendingUp, color: 'text-emerald-400', bgColor: 'from-emerald-900/30 to-emerald-950/50', borderColor: 'border-emerald-500/20', topBar: 'from-emerald-400 to-emerald-600' },
            { label: 'Menor nota', value: `${parseFloat(resumo.menor_pontuacao ?? 0).toFixed(1)}`, sub: 'pts', icon: TrendingDown, color: 'text-red-400', bgColor: 'from-red-900/30 to-red-950/50', borderColor: 'border-red-500/20', topBar: 'from-red-400 to-red-600' },
            { label: 'Times', value: `${resumo.total_times ?? 0}`, sub: '', icon: Users, color: 'text-purple-400', bgColor: 'from-purple-900/30 to-purple-950/50', borderColor: 'border-purple-500/20', topBar: 'from-purple-400 to-purple-600' },
          ].map(({ label, value, sub, icon: Icon, color, bgColor, borderColor, topBar }) => (
            <div key={label} className={cn('rounded-2xl overflow-hidden border transition-all', borderColor)}>
              <div className={cn('h-0.5 bg-gradient-to-r', topBar)} />
              <div className={cn('bg-gradient-to-b p-3 text-center', bgColor)}>
                <Icon size={16} className={cn('mx-auto mb-1.5', color)} />
                <p className={cn('font-black text-lg', color)}>{value}</p>
                {sub && <p className="text-[8px] text-white/30 uppercase font-bold">{sub}</p>}
                <p className="text-[9px] text-white/30 uppercase font-bold mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════ SELEÇÃO DA RODADA ══════ */}
      {stats?.melhores_jogadores?.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Star size={13} className="text-yellow-400 fill-yellow-400" /> Selecao da Rodada
          </h3>
          <div className="rounded-2xl overflow-hidden border border-yellow-500/20">
            <div className="h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400" />
            <div className="bg-gradient-to-b from-yellow-900/20 to-slate-900/60 p-4">
              {/* Mini campo visual com os melhores */}
              <div className="flex flex-col gap-3">
                {/* Atacantes/Meias (top jogadores de linha) */}
                <div className="flex justify-center gap-3 flex-wrap">
                  {stats.melhores_jogadores.filter((j: any) => {
                    const tipo = getPosicaoTipo(j.posicao_real ?? j.posicao, j.joga_recuado);
                    return tipo === 'linha';
                  }).slice(0, 4).map((j: any) => (
                    <SelecaoCard key={j.id} jogador={j} />
                  ))}
                </div>
                {/* Zagueiros */}
                <div className="flex justify-center gap-3 flex-wrap">
                  {stats.melhores_jogadores.filter((j: any) => {
                    const tipo = getPosicaoTipo(j.posicao_real ?? j.posicao, j.joga_recuado);
                    return tipo === 'zagueiro';
                  }).slice(0, 2).map((j: any) => (
                    <SelecaoCard key={j.id} jogador={j} />
                  ))}
                </div>
                {/* Goleiro */}
                <div className="flex justify-center gap-3">
                  {stats.melhores_jogadores.filter((j: any) => {
                    const tipo = getPosicaoTipo(j.posicao_real ?? j.posicao, j.joga_recuado);
                    return tipo === 'goleiro';
                  }).slice(0, 1).map((j: any) => (
                    <SelecaoCard key={j.id} jogador={j} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Melhores times - cards */}
      {stats?.melhores_times?.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Trophy size={13} className="text-yellow-400" /> Melhores Times
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {stats.melhores_times.map((t: any, i: number) => (
              <div key={t.id} className={cn(
                'rounded-2xl overflow-hidden border transition-all',
                i === 0 ? 'border-yellow-500/30 bg-gradient-to-b from-yellow-900/30 to-yellow-950/50'
                : i === 1 ? 'border-slate-400/20 bg-gradient-to-b from-slate-800/40 to-slate-900/60'
                : i === 2 ? 'border-amber-700/20 bg-gradient-to-b from-amber-900/20 to-amber-950/40'
                : 'border-white/8 bg-gradient-to-b from-slate-800/30 to-slate-900/50'
              )}>
                <div className={cn('h-0.5', i === 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : i === 1 ? 'bg-gradient-to-r from-slate-300 to-slate-400' : i === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-700' : 'bg-white/10')} />
                <div className="p-2.5 flex flex-col items-center gap-1.5">
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px]', i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-slate-400 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-white/40')}>{i + 1}</div>
                  <Avatar src={t.foto_url ?? t.avatar_url} nome={t.jogador_nome ?? t.username} size={9} className="border border-white/10" />
                  <p className="text-[10px] font-bold text-white text-center truncate w-full">{(t.jogador_nome ?? t.username)?.split(' ')[0]}</p>
                  <PontosDisplay valor={parseFloat(t.total_pontos)} size="xs" className="px-2 py-0.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mais escalados - cards */}
      {stats?.mais_escalados?.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Users size={13} className="text-cyan-400" /> Mais Escalados
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {stats.mais_escalados.map((j: any) => {
              const posicaoTipo = getPosicaoTipo(j.posicao_real ?? j.posicao, j.joga_recuado);
              return (
                <div key={j.id} className="rounded-2xl overflow-hidden border border-white/8 bg-gradient-to-b from-slate-800/30 to-slate-900/50">
                  <div className="h-0.5 bg-gradient-to-r from-cyan-500/30 to-cyan-700/30" />
                  <div className="p-2.5 flex flex-col items-center gap-1">
                    <Avatar src={j.foto_url ?? j.avatar_url} nome={j.nome} size={9} className="border border-white/10" />
                    <p className="text-[9px] font-bold text-white text-center truncate w-full">{j.nome?.split(' ')[0]}</p>
                    <PosicaoBadge tipo={posicaoTipo} className="text-[7px] px-1 py-0" />
                    <div className="bg-cyan-500/10 rounded-full px-2 py-0.5">
                      <p className="font-black text-cyan-400 text-[10px]">{j.total_escalacoes}x</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Capitão popular - cards */}
      {stats?.capitao_popular?.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Crown size={13} className="text-yellow-400" /> Capitao Popular
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {stats.capitao_popular.map((j: any) => {
              const posicaoTipo = getPosicaoTipo(j.posicao_real ?? j.posicao, j.joga_recuado);
              return (
                <div key={j.id} className="rounded-2xl overflow-hidden border border-yellow-500/15 bg-gradient-to-b from-yellow-900/20 to-yellow-950/40">
                  <div className="h-0.5 bg-gradient-to-r from-yellow-400/50 to-amber-500/50" />
                  <div className="p-2.5 flex flex-col items-center gap-1">
                    <Avatar src={j.foto_url ?? j.avatar_url} nome={j.nome} size={9} className="border border-white/10" />
                    <p className="text-[9px] font-bold text-white text-center truncate w-full">{j.nome?.split(' ')[0]}</p>
                    <PosicaoBadge tipo={posicaoTipo} className="text-[7px] px-1 py-0" />
                    <div className="bg-yellow-500/10 rounded-full px-2 py-0.5">
                      <p className="font-black text-yellow-400 text-[10px]">{j.total_capitanias}x cap</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Piores jogadores - cards */}
      {stats?.piores_jogadores?.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
            <TrendingDown size={13} className="text-red-400" /> Menores Pontuacoes
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {stats.piores_jogadores.map((j: any) => {
              const posicaoTipo = getPosicaoTipo(j.posicao_real ?? j.posicao, j.joga_recuado);
              return (
                <div key={j.id} className="rounded-2xl overflow-hidden border border-red-500/15 bg-gradient-to-b from-red-900/15 to-red-950/30">
                  <div className="h-0.5 bg-gradient-to-r from-red-500/30 to-red-700/30" />
                  <div className="p-2.5 flex flex-col items-center gap-1">
                    <Avatar src={j.foto_url ?? j.avatar_url} nome={j.nome} size={9} className="border border-white/10" />
                    <p className="text-[9px] font-bold text-white text-center truncate w-full">{j.nome?.split(' ')[0]}</p>
                    <PosicaoBadge tipo={posicaoTipo} className="text-[7px] px-1 py-0" />
                    <PontosDisplay valor={parseFloat(j.pontos)} size="xs" className="px-1 py-0" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mercado - cards */}
      {statsMercado && (
        <div className="space-y-3">
          <h3 className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Coins size={13} className="text-yellow-400" /> Mercado
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {statsMercado.mais_caro && (
              <div className="rounded-2xl overflow-hidden border border-yellow-500/20 bg-gradient-to-b from-yellow-900/20 to-yellow-950/40">
                <div className="h-0.5 bg-gradient-to-r from-yellow-400 to-amber-500" />
                <div className="p-3 flex flex-col items-center gap-1.5">
                  <Avatar src={statsMercado.mais_caro.foto_url} nome={statsMercado.mais_caro.nome} size={10} className="border border-white/10" />
                  <p className="text-[10px] font-bold text-white text-center truncate w-full">{statsMercado.mais_caro.nome?.split(' ')[0]}</p>
                  <PosicaoBadge tipo={getPosicaoTipo(statsMercado.mais_caro.posicao_real ?? statsMercado.mais_caro.posicao, statsMercado.mais_caro.joga_recuado)} className="text-[7px] px-1 py-0" />
                  <span className="text-[8px] text-white/30 font-bold uppercase">Mais caro</span>
                  <div className="flex items-center gap-0.5 text-sm font-black text-yellow-400">
                    <LendaCoin size={12} />{parseFloat(statsMercado.mais_caro.preco).toFixed(1)}
                  </div>
                </div>
              </div>
            )}
            {statsMercado.mais_barato && (
              <div className="rounded-2xl overflow-hidden border border-emerald-500/20 bg-gradient-to-b from-emerald-900/20 to-emerald-950/40">
                <div className="h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                <div className="p-3 flex flex-col items-center gap-1.5">
                  <Avatar src={statsMercado.mais_barato.foto_url} nome={statsMercado.mais_barato.nome} size={10} className="border border-white/10" />
                  <p className="text-[10px] font-bold text-white text-center truncate w-full">{statsMercado.mais_barato.nome?.split(' ')[0]}</p>
                  <PosicaoBadge tipo={getPosicaoTipo(statsMercado.mais_barato.posicao_real ?? statsMercado.mais_barato.posicao, statsMercado.mais_barato.joga_recuado)} className="text-[7px] px-1 py-0" />
                  <span className="text-[8px] text-white/30 font-bold uppercase">Mais barato</span>
                  <div className="flex items-center gap-0.5 text-sm font-black text-emerald-400">
                    <LendaCoin size={12} />{parseFloat(statsMercado.mais_barato.preco).toFixed(1)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Valorizações */}
          {statsMercado.maiores_altas?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-emerald-300/60 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp size={11} /> Maiores Valorizacoes
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {statsMercado.maiores_altas.map((j: any) => (
                  <div key={j.id} className="rounded-xl overflow-hidden border border-emerald-500/15 bg-gradient-to-b from-emerald-900/15 to-emerald-950/30">
                    <div className="h-0.5 bg-gradient-to-r from-emerald-400/50 to-emerald-600/50" />
                    <div className="p-2 flex flex-col items-center gap-1">
                      <Avatar src={j.foto_url} nome={j.nome} size={8} className="border border-white/10" />
                      <p className="text-[9px] font-bold text-white text-center truncate w-full">{j.nome?.split(' ')[0]}</p>
                      <PontosDisplay valor={parseFloat(j.variacao)} size="xs" showArrow className="px-1 py-0 text-[8px]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {statsMercado.maiores_quedas?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-red-300/60 uppercase tracking-wider flex items-center gap-1">
                <TrendingDown size={11} /> Maiores Quedas
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {statsMercado.maiores_quedas.map((j: any) => (
                  <div key={j.id} className="rounded-xl overflow-hidden border border-red-500/15 bg-gradient-to-b from-red-900/15 to-red-950/30">
                    <div className="h-0.5 bg-gradient-to-r from-red-400/50 to-red-600/50" />
                    <div className="p-2 flex flex-col items-center gap-1">
                      <Avatar src={j.foto_url} nome={j.nome} size={8} className="border border-white/10" />
                      <p className="text-[9px] font-bold text-white text-center truncate w-full">{j.nome?.split(' ')[0]}</p>
                      <PontosDisplay valor={parseFloat(j.variacao)} size="xs" showArrow className="px-1 py-0 text-[8px]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Card da Seleção da Rodada ──────────────────────────────────
function SelecaoCard({ jogador }: { jogador: any }) {
  const posicaoTipo = getPosicaoTipo(jogador.posicao_real ?? jogador.posicao, jogador.joga_recuado);
  const pontos = parseFloat(jogador.pontos ?? 0);

  return (
    <div className="flex flex-col items-center w-[70px]">
      <div className="relative">
        <Avatar
          src={jogador.foto_url ?? jogador.avatar_url}
          nome={jogador.nome}
          size={11}
          className={cn(
            'ring-2 shadow-md',
            posicaoTipo === 'goleiro' ? 'ring-blue-400/50'
            : posicaoTipo === 'zagueiro' ? 'ring-emerald-400/50'
            : 'ring-purple-400/50'
          )}
        />
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
          <PosicaoBadge tipo={posicaoTipo} className="text-[7px] px-1 py-0 shadow-md" />
        </div>
      </div>
      <p className="text-[9px] font-bold text-white text-center truncate w-full mt-1.5">
        {jogador.nome?.split(' ')[0]}
      </p>
      <PontosDisplay valor={pontos} size="xs" className="px-1 py-0 mt-0.5" />
    </div>
  );
}
