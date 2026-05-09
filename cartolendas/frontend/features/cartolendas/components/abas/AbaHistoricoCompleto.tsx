// AbaHistoricoCompleto.tsx — Aba Histórico com sub-abas: Valorização Jogadores + Histórico Técnico
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/api';
import { cn } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, Users, Zap, Search,
  ChevronRight, Star, AlertTriangle, Repeat, Award, ChevronDown
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import { useRodadasDoCampeonato } from '@/features/rodadas/api/useCampeonatoRodadas';
import { LendaCoin, Avatar } from '../shared';

export function AbaHistoricoCompleto({ campeonatoId }: { campeonatoId: number }) {
  const [subAba, setSubAba] = useState<'valorizacao' | 'tecnico'>('valorizacao');

  return (
    <div className="space-y-4">
      {/* Sub-abas */}
      <div className="flex gap-2">
        <button onClick={() => setSubAba('valorizacao')} className={cn(
          'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border transition-all',
          subAba === 'valorizacao' ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/30' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
        )}>
          <TrendingUp size={14} /> Valorizacao Jogadores
        </button>
        <button onClick={() => setSubAba('tecnico')} className={cn(
          'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border transition-all',
          subAba === 'tecnico' ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-900/30' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
        )}>
          <Users size={14} /> Historico Tecnico
        </button>
      </div>

      {subAba === 'valorizacao' && <SubAbaValorizacao campeonatoId={campeonatoId} />}
      {subAba === 'tecnico' && <SubAbaHistoricoTecnico campeonatoId={campeonatoId} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-ABA: VALORIZAÇÃO DOS JOGADORES
// ═══════════════════════════════════════════════════════════════
function SubAbaValorizacao({ campeonatoId }: { campeonatoId: number }) {
  const [busca, setBusca] = useState('');
  const [filtroRodada, setFiltroRodada] = useState<number | null>(null);

  // Rodadas sequenciais
  const { data: rodadasRaw } = useRodadasDoCampeonato(campeonatoId);
  const rodadas = useMemo(() => {
    if (!rodadasRaw?.length) return [];
    const sorted = [...rodadasRaw].sort((a: any, b: any) => {
      if (a.data !== b.data) return a.data < b.data ? -1 : 1;
      return a.id - b.id;
    });
    return sorted.map((r: any, i: number) => ({ ...r, numero: i + 1 }));
  }, [rodadasRaw]);
  const rodadasFinalizadas = useMemo(() => rodadas.filter(r => r.status === 'finalizada'), [rodadas]);

  const { data: meuHist, isLoading: loadMeu } = useQuery({
    queryKey: ['cartolendas', 'meu-historico', campeonatoId],
    queryFn: async () => (await api.get(`/cartolendas/meu-historico?campeonato_id=${campeonatoId}`)).data,
  });

  const { data: histJogadores, isLoading: loadJog } = useQuery({
    queryKey: ['cartolendas', 'historico-jogadores', campeonatoId],
    queryFn: async () => (await api.get(`/cartolendas/historico-jogadores?campeonato_id=${campeonatoId}`)).data,
  });

  const jogadoresFiltrados = useMemo(() => {
    if (!histJogadores?.jogadores) return [];
    let lista = histJogadores.jogadores;
    if (busca) lista = lista.filter((j: any) => j.nome?.toLowerCase().includes(busca.toLowerCase()));
    // Filtrar por rodada selecionada: recalcular valorização para a rodada específica
    if (filtroRodada && lista.length > 0) {
      lista = lista.map((j: any) => {
        const rodadaData = j.rodadas?.find((r: any) => r.rodada_id === filtroRodada);
        return {
          ...j,
          valorizacao_total: rodadaData?.variacao ?? 0,
          preco_atual: rodadaData?.preco ?? j.preco_atual ?? 10,
        };
      }).filter((j: any) => j.valorizacao_total !== 0 || j.rodadas?.some((r: any) => r.rodada_id === filtroRodada));
    }
    return lista;
  }, [histJogadores, busca, filtroRodada]);

  // Filtrar minha_valorizacao por rodada selecionada
  const minhaValorizacaoFiltrada = useMemo(() => {
    if (!meuHist?.minha_valorizacao?.length) return [];
    if (!filtroRodada) return meuHist.minha_valorizacao;
    return meuHist.minha_valorizacao.filter((v: any) => v.rodada_id === filtroRodada);
  }, [meuHist, filtroRodada]);

  // Mais valorizado e menos valorizado (usa lista já filtrada por rodada)
  const maisValorizado = useMemo(() => {
    if (!jogadoresFiltrados.length) return null;
    return [...jogadoresFiltrados].sort((a: any, b: any) => (b.valorizacao_total ?? 0) - (a.valorizacao_total ?? 0))[0];
  }, [jogadoresFiltrados]);

  const menosValorizado = useMemo(() => {
    if (!jogadoresFiltrados.length) return null;
    return [...jogadoresFiltrados].sort((a: any, b: any) => (a.valorizacao_total ?? 0) - (b.valorizacao_total ?? 0))[0];
  }, [jogadoresFiltrados]);

  // Resumo do meu time
  const rendimentoTotal = useMemo(() => {
    if (!meuHist?.evolucao) return 0;
    return meuHist.evolucao.reduce((s: number, e: any) => s + parseFloat(e.total_pontos || 0), 0);
  }, [meuHist]);

  if (loadMeu || loadJog) return <div className="text-center py-12 text-white/30 text-sm">Carregando...</div>;

  return (
    <div className="space-y-5">
      {/* Filtro de rodada */}
      <RodadaFilter rodadas={rodadasFinalizadas} selecionada={filtroRodada} onSelect={setFiltroRodada} />

      {/* ══════ SEÇÃO 1: MEUS JOGADORES ══════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-emerald-500 rounded-full" />
          <h3 className="font-black text-white text-sm uppercase tracking-wider">Meus Jogadores</h3>
        </div>

        {/* Resumo do time */}
        <div className="rounded-2xl overflow-hidden border border-emerald-500/20">
          <div className="h-1 bg-gradient-to-r from-emerald-400 to-green-500" />
          <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-950/35 p-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <p className="font-black text-xl text-purple-400">{parseFloat(meuHist?.ranking?.pontos_total ?? 0).toFixed(1)}</p>
                <p className="text-[9px] text-white/30 uppercase font-bold">Pontos Total</p>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <p className="font-black text-xl text-yellow-400">{parseFloat(meuHist?.ranking?.lendas_coins ?? 100).toFixed(0)}</p>
                  <LendaCoin size={14} />
                </div>
                <p className="text-[9px] text-white/30 uppercase font-bold">Patrimonio</p>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <p className={cn('font-black text-xl', rendimentoTotal > 0 ? 'text-emerald-400' : rendimentoTotal < 0 ? 'text-red-400' : 'text-white/40')}>
                  {rendimentoTotal > 0 ? '+' : ''}{rendimentoTotal.toFixed(1)}
                </p>
                <p className="text-[9px] text-white/30 uppercase font-bold">Rendimento</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cards dos meus jogadores */}
        {minhaValorizacaoFiltrada.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {minhaValorizacaoFiltrada.map((v: any, i: number) => {
              const variacao = parseFloat(v.variacao ?? 0);
              const precoAtual = parseFloat(v.preco ?? 0);
              // Calcular preco anterior
              const precoAnterior = precoAtual - variacao;
              return (
                <div key={i} className="rounded-xl overflow-hidden border border-white/8 bg-gradient-to-b from-slate-800/40 to-slate-900/60">
                  <div className={cn('h-0.5', variacao > 0 ? 'bg-gradient-to-r from-emerald-400 to-green-500' : variacao < 0 ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-white/10')} />
                  <div className="p-3 flex items-center gap-3">
                    <Avatar src={v.foto_url ?? v.avatar_url} nome={v.nome ?? `Jogador ${i + 1}`} size={10} className="border border-white/10 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{v.nome ?? `Jogador ${i + 1}`}</p>
                      <p className="text-[10px] text-white/30">R{v.numero}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-white/40">{precoAnterior.toFixed(1)}</span>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-0.5',
                        variacao > 0 ? 'bg-emerald-500/15 text-emerald-400'
                        : variacao < 0 ? 'bg-red-500/15 text-red-400'
                        : 'bg-white/5 text-white/30'
                      )}>
                        {variacao > 0 ? <TrendingUp size={9} /> : variacao < 0 ? <TrendingDown size={9} /> : null}
                        {variacao > 0 ? '+' : ''}{variacao.toFixed(2)}
                      </span>
                      <span className="text-xs font-bold text-yellow-400 flex items-center gap-0.5">
                        {precoAtual.toFixed(1)} <LendaCoin size={9} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════ SEÇÃO 2: DEMAIS JOGADORES ══════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-purple-500 rounded-full" />
          <h3 className="font-black text-white text-sm uppercase tracking-wider">Demais Jogadores</h3>
        </div>

        {/* Destaques */}
        {(maisValorizado || menosValorizado) && (
          <div className="grid grid-cols-2 gap-2">
            {maisValorizado && (
              <div className="rounded-2xl overflow-hidden border border-emerald-500/20">
                <div className="h-1 bg-gradient-to-r from-emerald-400 to-green-500" />
                <div className="bg-gradient-to-b from-emerald-900/20 to-emerald-950/35 p-3 flex flex-col items-center gap-1.5">
                  <Star size={14} className="text-emerald-400" />
                  <Avatar src={maisValorizado.foto_url ?? maisValorizado.avatar_url} nome={maisValorizado.nome} size={10} className="border border-emerald-500/30" />
                  <p className="text-[10px] font-bold text-white text-center truncate w-full">{maisValorizado.nome?.split(' ')[0]}</p>
                  <p className="text-[8px] text-emerald-400 font-bold uppercase">Mais valorizado</p>
                  <p className="font-black text-emerald-400 text-sm">+{(maisValorizado.valorizacao_total ?? 0).toFixed(2)}</p>
                </div>
              </div>
            )}
            {menosValorizado && (
              <div className="rounded-2xl overflow-hidden border border-red-500/20">
                <div className="h-1 bg-gradient-to-r from-red-400 to-red-600" />
                <div className="bg-gradient-to-b from-red-900/20 to-red-950/35 p-3 flex flex-col items-center gap-1.5">
                  <AlertTriangle size={14} className="text-red-400" />
                  <Avatar src={menosValorizado.foto_url ?? menosValorizado.avatar_url} nome={menosValorizado.nome} size={10} className="border border-red-500/30" />
                  <p className="text-[10px] font-bold text-white text-center truncate w-full">{menosValorizado.nome?.split(' ')[0]}</p>
                  <p className="text-[8px] text-red-400 font-bold uppercase">Menos valorizado</p>
                  <p className="font-black text-red-400 text-sm">{(menosValorizado.valorizacao_total ?? 0).toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Busca */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar jogador..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-purple-500/50" />
        </div>

        {/* Grid de cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {jogadoresFiltrados.map((j: any) => {
            const val = j.valorizacao_total ?? 0;
            return (
              <div key={j.id} className="rounded-xl overflow-hidden border border-white/8 bg-gradient-to-b from-slate-800/40 to-slate-900/60">
                <div className={cn('h-0.5', val > 0 ? 'bg-gradient-to-r from-emerald-400 to-green-500' : val < 0 ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-white/10')} />
                <div className="p-3 flex items-center gap-3">
                  <Avatar src={j.foto_url ?? j.avatar_url} nome={j.nome} size={10} className="border border-white/10 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{j.nome}</p>
                    <p className="text-[10px] text-white/30 capitalize">{j.posicao} · {j.rodadas?.length ?? 0} rod.</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-0.5',
                      val > 0 ? 'bg-emerald-500/15 text-emerald-400' : val < 0 ? 'bg-red-500/15 text-red-400' : 'bg-white/5 text-white/30'
                    )}>
                      {val > 0 ? '+' : ''}{val.toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-yellow-400 flex items-center gap-0.5">
                      {(j.preco_atual ?? 10).toFixed(1)} <LendaCoin size={9} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {jogadoresFiltrados.length === 0 && (
          <p className="text-center text-white/30 py-8 text-sm">Nenhum jogador encontrado</p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-ABA: HISTÓRICO DO TÉCNICO
// ═══════════════════════════════════════════════════════════════
function SubAbaHistoricoTecnico({ campeonatoId }: { campeonatoId: number }) {
  const [filtroRodada, setFiltroRodada] = useState<number | null>(null);

  const { data: rodadasRaw } = useRodadasDoCampeonato(campeonatoId);
  const rodadas = useMemo(() => {
    if (!rodadasRaw?.length) return [];
    const sorted = [...rodadasRaw].sort((a: any, b: any) => {
      if (a.data !== b.data) return a.data < b.data ? -1 : 1;
      return a.id - b.id;
    });
    return sorted.map((r: any, i: number) => ({ ...r, numero: i + 1 }));
  }, [rodadasRaw]);
  const rodadasFinalizadas = useMemo(() => rodadas.filter(r => r.status === 'finalizada'), [rodadas]);

  const { data: meuHist, isLoading } = useQuery({
    queryKey: ['cartolendas', 'meu-historico', campeonatoId],
    queryFn: async () => (await api.get(`/cartolendas/meu-historico?campeonato_id=${campeonatoId}`)).data,
  });

  // Filtrar evolução por rodada selecionada
  const evolucaoFiltrada = useMemo(() => {
    if (!meuHist?.evolucao) return [];
    if (!filtroRodada) return meuHist.evolucao;
    return meuHist.evolucao.filter((e: any) => e.rodada_id === filtroRodada);
  }, [meuHist, filtroRodada]);

  // Dados para gráfico de patrimônio (sempre mostra todas rodadas, mas destaca a selecionada)
  const chartData = useMemo(() => {
    if (!meuHist?.evolucao) return [];
    return meuHist.evolucao.map((e: any) => {
      const lc = parseFloat(e.saldo_lc || 100);
      const pts = parseFloat(e.total_pontos || 0);
      return {
        rodada: `R${e.numero}`,
        rodada_id: e.rodada_id,
        patrimonio: lc,
        pontos: pts,
      };
    });
  }, [meuHist]);

  // Resumo recalculado para rodada específica
  const resumoFiltrado = useMemo(() => {
    if (!filtroRodada || !evolucaoFiltrada.length) return null;
    const e = evolucaoFiltrada[0];
    return {
      pontos: parseFloat(e.total_pontos || 0),
      patrimonio: parseFloat(e.saldo_lc || 100),
      rodadas_jogadas: 1,
    };
  }, [filtroRodada, evolucaoFiltrada]);

  if (isLoading) return <div className="text-center py-12 text-white/30 text-sm">Carregando...</div>;
  if (!meuHist) return <div className="text-center py-12 text-white/30 text-sm">Sem dados disponíveis</div>;

  const ranking = meuHist.ranking;
  const evolucao = meuHist.evolucao ?? [];

  return (
    <div className="space-y-5">
      {/* Filtro de rodada */}
      <RodadaFilter rodadas={rodadasFinalizadas} selecionada={filtroRodada} onSelect={setFiltroRodada} />

      {/* ══════ RESUMO DO TÉCNICO ══════ */}
      {ranking && (
        <div className="rounded-2xl overflow-hidden border border-purple-500/20">
          <div className="h-1 bg-gradient-to-r from-purple-400 to-indigo-500" />
          <div className="bg-gradient-to-br from-purple-900/25 to-purple-950/40 p-4">
            {filtroRodada && resumoFiltrado ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/20 rounded-xl p-3 text-center">
                  <p className="font-black text-xl text-purple-400">{resumoFiltrado.pontos.toFixed(1)}</p>
                  <p className="text-[9px] text-white/30 uppercase font-bold">Pontos Rodada</p>
                </div>
                <div className="bg-black/20 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <p className="font-black text-xl text-yellow-400">{resumoFiltrado.patrimonio.toFixed(0)}</p>
                    <LendaCoin size={14} />
                  </div>
                  <p className="text-[9px] text-white/30 uppercase font-bold">Patrimonio na Rod.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-black/20 rounded-xl p-3 text-center">
                  <p className="font-black text-xl text-purple-400">{parseFloat(ranking.pontos_total ?? 0).toFixed(1)}</p>
                  <p className="text-[9px] text-white/30 uppercase font-bold">Pontuacao</p>
                </div>
                <div className="bg-black/20 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <p className="font-black text-xl text-yellow-400">{parseFloat(ranking.lendas_coins ?? 100).toFixed(0)}</p>
                    <LendaCoin size={14} />
                  </div>
                  <p className="text-[9px] text-white/30 uppercase font-bold">Patrimonio</p>
                </div>
                <div className="bg-black/20 rounded-xl p-3 text-center">
                  <p className="font-black text-xl text-cyan-400">{ranking.rodadas_jogadas ?? 0}</p>
                  <p className="text-[9px] text-white/30 uppercase font-bold">Rodadas</p>
                </div>
                <div className="bg-black/20 rounded-xl p-3 text-center">
                  <p className="font-black text-xl text-emerald-400">{parseFloat(ranking.melhor_rodada_pts ?? 0).toFixed(1)}</p>
                  <p className="text-[9px] text-white/30 uppercase font-bold">Melhor Rod.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ GRÁFICO DE OSCILAÇÃO ══════ */}
      {chartData.length > 1 && (
        <div className="rounded-2xl overflow-hidden border border-white/10">
          <div className="h-1 bg-gradient-to-r from-yellow-400 to-amber-500" />
          <div className="bg-gradient-to-b from-slate-800/40 to-slate-900/60 p-4">
            <h4 className="text-xs font-bold text-white/50 uppercase mb-3 flex items-center gap-1.5">
              <TrendingUp size={13} className="text-yellow-400" /> Oscilacao do Patrimonio
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="patrimonioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="rodada" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{ background: '#0d1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                  itemStyle={{ color: '#eab308' }}
                  formatter={(value: any) => [`${parseFloat(value).toFixed(1)} LC`, 'Patrimonio']}
                />
                <Area type="monotone" dataKey="patrimonio" stroke="#eab308" strokeWidth={2} fill="url(#patrimonioGrad)" dot={{ fill: '#eab308', r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ══════ GRÁFICO DE PONTOS POR RODADA ══════ */}
      {chartData.length > 1 && (
        <div className="rounded-2xl overflow-hidden border border-white/10">
          <div className="h-1 bg-gradient-to-r from-purple-400 to-indigo-500" />
          <div className="bg-gradient-to-b from-slate-800/40 to-slate-900/60 p-4">
            <h4 className="text-xs font-bold text-white/50 uppercase mb-3 flex items-center gap-1.5">
              <Zap size={13} className="text-purple-400" /> Pontos por Rodada
            </h4>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pontosGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="rodada" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{ background: '#0d1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                  formatter={(value: any) => [`${parseFloat(value).toFixed(1)} pts`, 'Pontos']}
                />
                <Area type="monotone" dataKey="pontos" stroke="#a855f7" strokeWidth={2} fill="url(#pontosGrad)" dot={{ fill: '#a855f7', r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ══════ JOGADOR MAIS ESCALADO / MAIS RENDEU / MENOS RENDEU ══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatHighlightCard
          title="Mais escalado"
          icon={<Repeat size={14} className="text-cyan-400" />}
          jogadores={meuHist?.mais_escalado ?? []}
          campo="vezes_escalado"
          sufixo="x"
          color="cyan"
        />
        <StatHighlightCard
          title="Mais rendeu"
          icon={<TrendingUp size={14} className="text-emerald-400" />}
          jogadores={meuHist?.mais_rendeu ?? []}
          campo="total_pontos"
          sufixo=" pts"
          color="emerald"
        />
        <StatHighlightCard
          title="Menos rendeu"
          icon={<TrendingDown size={14} className="text-red-400" />}
          jogadores={meuHist?.menos_rendeu ?? []}
          campo="total_pontos"
          sufixo=" pts"
          color="red"
        />
      </div>
    </div>
  );
}

// ── Componentes auxiliares ─────────────────────────────────────

function RodadaFilter({ rodadas, selecionada, onSelect }: { rodadas: any[]; selecionada: number | null; onSelect: (id: number | null) => void }) {
  if (rodadas.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] text-white/30 font-bold uppercase">Rodada:</span>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-all',
            !selecionada ? 'bg-purple-600 text-white border-purple-500' : 'bg-white/5 text-white/40 border-white/8 hover:bg-white/10'
          )}
        >
          Geral
        </button>
        {rodadas.map((r: any) => (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-all',
              selecionada === r.id ? 'bg-purple-600 text-white border-purple-500' : 'bg-white/5 text-white/40 border-white/8 hover:bg-white/10'
            )}
          >
            R{r.numero}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatHighlightCard({ title, icon, jogadores, campo, sufixo, color }: {
  title: string; icon: React.ReactNode; jogadores: any[]; campo: string; sufixo: string; color: 'cyan' | 'emerald' | 'red';
}) {
  const borderColor = color === 'cyan' ? 'border-cyan-500/20' : color === 'emerald' ? 'border-emerald-500/20' : 'border-red-500/20';
  const bgColor = color === 'cyan' ? 'from-cyan-900/20 to-cyan-950/35' : color === 'emerald' ? 'from-emerald-900/20 to-emerald-950/35' : 'from-red-900/20 to-red-950/35';
  const topBar = color === 'cyan' ? 'from-cyan-400 to-cyan-600' : color === 'emerald' ? 'from-emerald-400 to-green-500' : 'from-red-400 to-red-600';
  const textColor = color === 'cyan' ? 'text-cyan-400' : color === 'emerald' ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className={cn('rounded-2xl overflow-hidden border', borderColor)}>
      <div className={cn('h-1 bg-gradient-to-r', topBar)} />
      <div className={cn('bg-gradient-to-b p-3', bgColor)}>
        <h4 className="text-[10px] font-bold text-white/40 uppercase mb-2 flex items-center gap-1">{icon} {title}</h4>
        {jogadores.length > 0 ? jogadores.slice(0, 2).map((j: any, i: number) => (
          <div key={j.id ?? i} className="flex items-center gap-2 mb-1.5 last:mb-0">
            <Avatar src={j.foto_url ?? j.avatar_url} nome={j.nome} size={7} className="border border-white/10 shrink-0" />
            <p className="text-[10px] font-bold text-white truncate flex-1">{j.nome?.split(' ')[0]}</p>
            <span className={cn('text-xs font-black', textColor)}>
              {typeof j[campo] === 'number' ? j[campo].toFixed?.(1) ?? j[campo] : j[campo]}{sufixo}
            </span>
          </div>
        )) : (
          <p className="text-[10px] text-white/25 text-center py-2">Sem dados</p>
        )}
      </div>
    </div>
  );
}
