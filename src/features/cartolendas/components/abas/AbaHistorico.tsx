import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/api';
import { cn } from '@/lib/utils';
import { ChevronRight, Search, TrendingUp, TrendingDown, Users, Zap } from 'lucide-react';
import { LendaCoin, Avatar, PosicaoBadge, PontosDisplay, MiniGrafico } from '../shared';
import { getPosicaoTipo } from '@/@types/cartolendas';

export function AbaHistorico({ campeonatoId }: { campeonatoId: number }) {
  const [subAba, setSubAba] = useState<'jogadores' | 'meu'>('meu');
  const [busca, setBusca] = useState('');
  const [jogadorExpandido, setJogadorExpandido] = useState<number | null>(null);

  const { data: histJogadores, isLoading: loadJog } = useQuery({
    queryKey: ['cartolendas', 'historico-jogadores', campeonatoId],
    queryFn: async () => (await api.get(`/cartolendas/historico-jogadores?campeonato_id=${campeonatoId}`)).data,
    enabled: subAba === 'jogadores',
  });

  const { data: meuHist, isLoading: loadMeu } = useQuery({
    queryKey: ['cartolendas', 'meu-historico', campeonatoId],
    queryFn: async () => (await api.get(`/cartolendas/meu-historico?campeonato_id=${campeonatoId}`)).data,
    enabled: subAba === 'meu',
  });

  const jogadoresFiltrados = useMemo(() => {
    if (!histJogadores?.jogadores) return [];
    const term = busca.toLowerCase();
    return term ? histJogadores.jogadores.filter((j: any) => j.nome?.toLowerCase().includes(term)) : histJogadores.jogadores;
  }, [histJogadores, busca]);

  const evolucaoLC = useMemo(() => {
    if (!meuHist?.evolucao) return [];
    let acumulado = 0;
    return meuHist.evolucao.map((e: any) => {
      acumulado += parseFloat(e.total_pontos || 0);
      return { ...e, acumulado: acumulado.toFixed(1), saldo_lc: parseFloat(e.saldo_lc || 100) };
    });
  }, [meuHist]);

  // Dados do gráfico de evolução de pontos
  const pontosParaGrafico = useMemo(() => evolucaoLC.map((e: any) => parseFloat(e.total_pontos || 0)), [evolucaoLC]);

  const StatCard = ({ title, jogadores, campo, sufixo = '', icone }: { title: string; jogadores: any[]; campo: string; sufixo?: string; icone: React.ReactNode }) => (
    <div className="rounded-2xl overflow-hidden border border-white/8">
      <div className="h-0.5 bg-gradient-to-r from-slate-500/30 to-slate-700/30" />
      <div className="bg-gradient-to-b from-slate-800/30 to-slate-900/50 p-3">
        <h4 className="text-xs font-bold text-white/50 uppercase mb-2 flex items-center gap-1.5">{icone} {title}</h4>
        {jogadores?.length ? jogadores.map((j: any, i: number) => (
          <div key={j.id} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
            <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0', i === 0 ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white/40')}>{i + 1}</span>
            <Avatar src={j.foto_url ?? j.avatar_url} nome={j.nome} size={7} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{j.nome}</p>
              <PosicaoBadge tipo={getPosicaoTipo(j.posicao_real ?? j.posicao, j.joga_recuado)} className="text-[6px] px-1 py-0" />
            </div>
            <span className="text-sm font-black text-purple-400">{typeof j[campo] === 'number' ? j[campo].toFixed?.(1) ?? j[campo] : j[campo]}{sufixo}</span>
          </div>
        )) : <p className="text-xs text-white/30 text-center py-2">Sem dados ainda</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setSubAba('meu')} className={cn(
          'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border',
          subAba === 'meu' ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-900/30' : 'bg-white/5 text-white/50 border-white/8 hover:bg-white/10'
        )}>Meu Historico</button>
        <button onClick={() => setSubAba('jogadores')} className={cn(
          'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border',
          subAba === 'jogadores' ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-900/30' : 'bg-white/5 text-white/50 border-white/8 hover:bg-white/10'
        )}>Jogadores</button>
      </div>

      {subAba === 'meu' && (
        loadMeu ? <div className="text-center py-8 text-white/30">Carregando...</div> : (
          <div className="space-y-4">
            {meuHist?.ranking && (
              <div className="rounded-2xl overflow-hidden border border-purple-500/20">
                <div className="h-1 bg-gradient-to-r from-purple-400 to-indigo-500" />
                <div className="bg-gradient-to-b from-purple-900/30 to-slate-900/50 p-4">
                  <h4 className="text-xs font-bold text-purple-300 uppercase mb-3">Resumo Geral</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-xl font-black text-white">{parseFloat(meuHist.ranking.pontos_total ?? 0).toFixed(1)}</p>
                      <p className="text-[10px] text-white/40">Pontos Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-black text-yellow-400">{parseFloat(meuHist.ranking.lendas_coins ?? 100).toFixed(1)}</p>
                      <p className="text-[10px] text-white/40 flex items-center justify-center gap-0.5">LendaCoins <LendaCoin size={10} /></p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-black text-cyan-400">{meuHist.ranking.rodadas_jogadas ?? 0}</p>
                      <p className="text-[10px] text-white/40">Rodadas</p>
                    </div>
                  </div>
                  {meuHist.ranking.melhor_rodada_pts > 0 && (
                    <p className="text-center text-xs text-white/40 mt-2">Melhor rodada: <span className="text-emerald-400 font-bold">{parseFloat(meuHist.ranking.melhor_rodada_pts).toFixed(1)} pts</span></p>
                  )}
                </div>
              </div>
            )}

            {/* Gráfico de evolução com mini sparkline */}
            {evolucaoLC.length > 1 && (
              <div className="rounded-2xl overflow-hidden border border-white/8">
                <div className="h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                <div className="bg-gradient-to-b from-slate-800/30 to-slate-900/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-white/50 uppercase flex items-center gap-1.5">
                      <TrendingUp size={13} className="text-emerald-400" /> Evolucao por Rodada
                    </h4>
                    <MiniGrafico dados={pontosParaGrafico} width={80} height={28} cor="stroke-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    {evolucaoLC.map((e: any, i: number) => {
                      const pts = parseFloat(e.total_pontos || 0);
                      const maxPts = Math.max(...evolucaoLC.map((x: any) => Math.abs(parseFloat(x.total_pontos || 0))), 1);
                      const width = Math.abs(pts) / maxPts * 100;
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] text-white/40 w-8 shrink-0 text-right font-bold">R{e.numero}</span>
                          <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden relative">
                            <div className={cn('h-full rounded-lg transition-all', pts >= 0 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-red-600 to-red-400')} style={{ width: `${Math.max(width, 4)}%` }} />
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                              {pts.toFixed(1)} pts
                            </span>
                          </div>
                          <span className="text-[10px] text-white/30 w-10 text-right font-bold">{e.acumulado}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-white/30 text-right mt-1">Acumulado</p>
                </div>
              </div>
            )}

            {evolucaoLC.length > 0 && (
              <div className="rounded-2xl overflow-hidden border border-yellow-500/20">
                <div className="h-0.5 bg-gradient-to-r from-yellow-400 to-amber-500" />
                <div className="bg-gradient-to-b from-yellow-900/20 to-slate-900/50 p-4">
                  <h4 className="text-xs font-bold text-yellow-300 uppercase mb-3 flex items-center gap-1.5"><LendaCoin size={13} /> Evolucao LendaCoins</h4>
                  <div className="space-y-1">
                    {evolucaoLC.map((e: any, i: number) => {
                      const lc = e.saldo_lc;
                      const prevLc = i > 0 ? evolucaoLC[i - 1].saldo_lc : 100;
                      const diff = lc - prevLc;
                      return (
                        <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                          <span className="text-white/40 w-8 font-bold">R{e.numero}</span>
                          <span className="text-yellow-400 font-bold">{lc.toFixed(1)} <LendaCoin size={10} className="inline" /></span>
                          <PontosDisplay valor={diff} size="xs" showArrow className="px-1 py-0 text-[9px]" />
                          <span className="text-white/30 text-[10px]">gasto: {parseFloat(e.orcamento_gasto || 0).toFixed(1)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {meuHist?.minha_valorizacao?.length > 0 && (
              <div className="rounded-2xl overflow-hidden border border-cyan-500/20">
                <div className="h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500" />
                <div className="bg-gradient-to-b from-cyan-900/20 to-slate-900/50 p-4">
                  <h4 className="text-xs font-bold text-cyan-300 uppercase mb-3 flex items-center gap-1.5"><Zap size={13} /> Minha Valorizacao como Jogador</h4>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-center flex-1">
                      <p className="text-lg font-black text-white">{parseFloat(meuHist.minha_valorizacao[0]?.preco ?? 0).toFixed(2)}</p>
                      <p className="text-[10px] text-white/30">Preco Inicial <LendaCoin size={10} className="inline" /></p>
                    </div>
                    <ChevronRight size={14} className="text-white/20" />
                    <div className="text-center flex-1">
                      <p className="text-lg font-black text-white">{parseFloat(meuHist.minha_valorizacao[meuHist.minha_valorizacao.length - 1]?.preco ?? 0).toFixed(2)}</p>
                      <p className="text-[10px] text-white/30">Preco Atual <LendaCoin size={10} className="inline" /></p>
                    </div>
                    <div className="text-center flex-1">
                      {(() => {
                        const ini = parseFloat(meuHist.minha_valorizacao[0]?.preco ?? 0);
                        const fim = parseFloat(meuHist.minha_valorizacao[meuHist.minha_valorizacao.length - 1]?.preco ?? 0);
                        const diff = fim - ini;
                        return (
                          <>
                            <PontosDisplay valor={diff} size="sm" showArrow />
                            <p className="text-[10px] text-white/30">Variacao Total</p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {meuHist.minha_valorizacao.map((v: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                        <span className="text-white/40 font-bold">R{v.numero}</span>
                        <span className="text-white font-bold">{parseFloat(v.preco).toFixed(2)} <LendaCoin size={10} className="inline" /></span>
                        <PontosDisplay valor={parseFloat(v.variacao)} size="xs" showArrow className="px-1 py-0" />
                        <span className="text-purple-400 font-bold">{parseFloat(v.pontos_rodada).toFixed(1)} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <StatCard title="Jogador que mais escalei" jogadores={meuHist?.mais_escalado ?? []} campo="vezes_escalado" sufixo="x" icone={<Users size={13} className="text-cyan-400" />} />
              <StatCard title="Mais rendeu pontos" jogadores={meuHist?.mais_rendeu ?? []} campo="total_pontos" sufixo=" pts" icone={<TrendingUp size={13} className="text-emerald-400" />} />
              <StatCard title="Mais pontuou (recorde)" jogadores={meuHist?.mais_pontuou ?? []} campo="melhor_pontuacao" sufixo=" pts" icone={<Zap size={13} className="text-yellow-400" />} />
              <StatCard title="Menos rendeu pontos" jogadores={meuHist?.menos_rendeu ?? []} campo="total_pontos" sufixo=" pts" icone={<TrendingDown size={13} className="text-red-400" />} />
            </div>
          </div>
        )
      )}

      {subAba === 'jogadores' && (
        loadJog ? <div className="text-center py-8 text-white/30">Carregando...</div> : (
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar jogador..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 transition-colors" />
            </div>
            {jogadoresFiltrados.map((j: any) => {
              const expanded = jogadorExpandido === j.id;
              const posicaoTipo = getPosicaoTipo(j.posicao_real ?? j.posicao, j.joga_recuado);
              // Dados para sparkline
              const pontosRodadas = j.rodadas?.map((rd: any) => parseFloat(rd.pontos_rodada ?? 0)) ?? [];

              return (
                <div key={j.id} className="rounded-2xl overflow-hidden border border-white/8">
                  <button onClick={() => setJogadorExpandido(expanded ? null : j.id)} className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors bg-gradient-to-b from-slate-800/30 to-slate-900/50">
                    <Avatar src={j.foto_url ?? j.avatar_url} nome={j.nome} size={10} className="border border-white/10" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-bold text-white text-sm truncate">{j.nome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <PosicaoBadge tipo={posicaoTipo} className="text-[7px] px-1 py-0" />
                        <span className="text-[10px] text-white/30">{j.rodadas?.length ?? 0} rodadas</span>
                      </div>
                    </div>
                    {/* Mini gráfico de últimas rodadas */}
                    {pontosRodadas.length >= 2 && (
                      <MiniGrafico dados={pontosRodadas} width={50} height={20} cor="stroke-purple-400" />
                    )}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-white">{j.preco_atual?.toFixed(2)} <LendaCoin size={11} className="inline" /></p>
                      <PontosDisplay valor={j.valorizacao_total ?? 0} size="xs" showArrow className="px-0 py-0 text-[10px] justify-end" />
                    </div>
                    <ChevronRight size={14} className={cn('text-white/20 transition-transform', expanded && 'rotate-90')} />
                  </button>
                  {expanded && (
                    <div className="px-3 pb-3 border-t border-white/5 bg-slate-900/30">
                      <div className="grid grid-cols-4 gap-2 py-3">
                        <div className="text-center"><p className="text-sm font-black text-purple-400">{j.media_pontos?.toFixed(1)}</p><p className="text-[9px] text-white/30">Media Pts</p></div>
                        <div className="text-center"><p className="text-sm font-black text-white">{j.total_pontos?.toFixed(1)}</p><p className="text-[9px] text-white/30">Total Pts</p></div>
                        <div className="text-center"><p className="text-sm font-black text-cyan-400">{j.total_gols}</p><p className="text-[9px] text-white/30">Gols</p></div>
                        <div className="text-center"><p className="text-sm font-black text-yellow-400">{j.total_assistencias}</p><p className="text-[9px] text-white/30">Assists</p></div>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-white/5">
                        <table className="w-full text-xs">
                          <thead><tr className="text-white/30 border-b border-white/5 bg-white/[0.02]"><th className="text-left py-2 px-2 font-medium">Rodada</th><th className="text-center py-2 font-medium">Preco</th><th className="text-center py-2 font-medium">Var.</th><th className="text-center py-2 font-medium">Pts</th><th className="text-center py-2 font-medium">G</th><th className="text-center py-2 font-medium">A</th></tr></thead>
                          <tbody>
                            {j.rodadas?.map((rd: any, idx: number) => {
                              const rodNum = histJogadores?.rodadas?.find((r: any) => r.id === rd.rodada_id)?.numero ?? idx + 1;
                              const pts = parseFloat(rd.pontos_rodada ?? 0);
                              return (
                                <tr key={rd.rodada_id} className={cn('border-b border-white/5 last:border-0', pts >= 8 ? 'bg-emerald-500/5' : pts < 0 ? 'bg-red-500/5' : '')}>
                                  <td className="py-1.5 px-2 text-white/50 font-bold">R{rodNum}</td>
                                  <td className="py-1.5 text-center text-white font-bold">{rd.preco.toFixed(2)}</td>
                                  <td className="py-1.5 text-center">
                                    <PontosDisplay valor={rd.variacao} size="xs" showArrow className="px-0 py-0 text-[10px] justify-center" />
                                  </td>
                                  <td className={cn('py-1.5 text-center font-black', pts >= 0 ? 'text-emerald-400' : 'text-red-400')}>{pts.toFixed(1)}</td>
                                  <td className="py-1.5 text-center text-cyan-400">{rd.gols}</td>
                                  <td className="py-1.5 text-center text-yellow-400">{rd.assistencias}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {jogadoresFiltrados.length === 0 && <p className="text-center text-white/30 py-8 text-sm">Nenhum jogador encontrado</p>}
          </div>
        )
      )}
    </div>
  );
}
