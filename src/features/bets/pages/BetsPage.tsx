import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { betsApi, MercadoBet, OpcaoBet } from '../api/bets';
import { OddButton } from '../components/OddButton';
import { BoletimAposta } from '../components/BoletimAposta';

export function BetsPage() {
  const [activeTab, setActiveTab] = useState<'mercados' | 'historico' | 'ranking'>('mercados');
  const [selecoes, setSelecoes] = useState<OpcaoBet[]>([]);

  const { data: carteira } = useQuery({
    queryKey: ['bets_carteira'],
    queryFn: betsApi.getCarteira,
  });

  const { data: mercados, isLoading: isLoadingMercados } = useQuery({
    queryKey: ['bets_mercados'],
    queryFn: () => betsApi.getMercados(0, 0),
  });

  const { data: historico, isLoading: isLoadingHistorico } = useQuery({
    queryKey: ['bets_historico'],
    queryFn: betsApi.getHistorico,
  });

  const { data: ranking, isLoading: isLoadingRanking } = useQuery({
    queryKey: ['bets_ranking'],
    queryFn: betsApi.getRanking,
  });

  const handleToggleSelecao = (opcao: OpcaoBet) => {
    setSelecoes((prev) => {
      if (prev.find((s) => s.id === opcao.id)) {
        return prev.filter((s) => s.id !== opcao.id);
      }
      const cleanPrev = prev.filter(s => s.mercado_id !== opcao.mercado_id);
      return [...cleanPrev, opcao];
    });
  };

  if (isLoadingMercados) return <div className="text-white text-center py-10">Carregando dados...</div>;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header / Carteira */}
      <div className="flex justify-between items-center bg-zinc-900 p-6 rounded-2xl mb-6 border border-zinc-800 shadow-lg">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tight">LENDAS <span className="text-fut-primary">BETS</span></h1>
          <p className="text-zinc-400 mt-1">Sua nova casa de apostas virtual.</p>
        </div>
        <div className="bg-zinc-800 p-4 rounded-xl border-l-4 border-fut-primary text-right min-w-[200px]">
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Seu Saldo</p>
          <div className="flex items-center justify-end gap-2 text-2xl font-black text-white">
            <span className="text-fut-primary">💰</span>
            {Number(carteira?.saldo || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Navegação de Abas */}
      <div className="flex gap-4 mb-8 bg-zinc-900 p-2 rounded-xl w-fit border border-zinc-800">
        <button 
          onClick={() => setActiveTab('mercados')}
          className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'mercados' ? 'bg-fut-primary text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
        >
          Mercados Ativos
        </button>
        <button 
          onClick={() => setActiveTab('historico')}
          className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'historico' ? 'bg-fut-primary text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
        >
          Minhas Apostas
        </button>
        <button 
          onClick={() => setActiveTab('ranking')}
          className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'ranking' ? 'bg-fut-primary text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
        >
          Ranking Lendacoins
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 relative items-start">
        {/* Coluna Esquerda: Dinâmica pela Aba */}
        <div className="flex-1 space-y-6">
          
          {/* TAB MERCADOS */}
          {activeTab === 'mercados' && (
            <>
              {!mercados || mercados.length === 0 ? (
                <div className="bg-zinc-900/50 p-10 text-center rounded-2xl border border-zinc-800/50">
                  <span className="text-4xl block mb-3">⚽</span>
                  <p className="text-zinc-400 text-lg">Nenhum mercado aberto no momento para a rodada atual.</p>
                </div>
              ) : (
                mercados.map((mercado) => {
                  
                  const getCategoriaLabel = (categoria: string) => {
                    switch (categoria) {
                      case 'gols_pro': return 'Ataque / Gols Marcados';
                      case 'gols_sofridos': return 'Defesa / Gols Tomados';
                      case 'vitorias': return 'Estatística / Vitórias na Rodada';
                      case 'derrotas': return 'Estatística / Derrotas na Rodada';
                      case 'pontos': return 'Estatística / Pontos Feitos';
                      default: return 'Mercado de Apostas';
                    }
                  };

                  const getLinhaLabel = (categoria: string, linhaVal: string) => {
                    switch (categoria) {
                      case 'gols_pro':
                      case 'gols_sofridos': return `Gols ${linhaVal}`;
                      case 'vitorias': return `Vitórias ${linhaVal}`;
                      case 'derrotas': return `Derrotas ${linhaVal}`;
                      case 'pontos': return `Pontos ${linhaVal}`;
                      default: return `Linha ${linhaVal}`;
                    }
                  };

                  return (
                  <div key={mercado.id} className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 shadow-md">
                    
                    {/* Header do Mercado */}
                    <div className="bg-zinc-800 p-4 border-b border-zinc-700/50 flex items-center gap-4">
                      {mercado.imagem ? (
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0 border-2 border-fut-primary/50">
                          <img src={mercado.imagem} alt={mercado.alvo_nome || 'Alvo'} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-lg flex-shrink-0">
                          ⚽
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-bold text-white">{mercado.titulo}</h3>
                        <p className="text-sm text-zinc-400 uppercase tracking-widest mt-0.5">{getCategoriaLabel(mercado.regra_categoria)}</p>
                      </div>
                    </div>

                    {/* Opções (Tabela Horizontal Bet365 style) */}
                    <div className="p-0">
                      <table className="w-full text-left border-collapse">
                        <tbody>
                          {/* Agrupar por pares (Mais / Menos) para simular o layout de linhas */}
                          {Array.from(new Set(mercado.opcoes.map(o => {
                            // Extrai a linha do texto "Mais de X.5" ou "Menos de X.5"
                            const match = o.descricao.match(/\d+\.5/);
                            return match ? match[0] : null;
                          }).filter(Boolean))).sort().map((linhaVal) => {
                            
                            const over = mercado.opcoes.find(o => o.descricao.includes(`Mais`) && o.descricao.includes(linhaVal!));
                            const under = mercado.opcoes.find(o => o.descricao.includes(`Menos`) && o.descricao.includes(linhaVal!));
                            
                            if (!over && !under) return null;

                            return (
                              <tr key={linhaVal} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20 transition-colors">
                                <td className="py-4 pl-6 pr-4 w-1/3 border-r border-zinc-800/50">
                                  <span className="text-zinc-400 font-medium">{getLinhaLabel(mercado.regra_categoria, linhaVal!)}</span>
                                </td>
                                <td className="py-2 px-3 w-1/3">
                                  {over && (
                                    <button
                                      onClick={() => handleToggleSelecao(over)}
                                      className={`w-full flex justify-between items-center px-4 py-3 rounded-lg border transition-all duration-200
                                        ${selecoes.some(s => s.id === over.id) 
                                          ? 'bg-fut-primary/10 border-fut-primary text-fut-primary' 
                                          : 'bg-zinc-800 border-zinc-700 text-white hover:border-fut-primary/50'
                                        }`}
                                    >
                                      <span className="text-sm font-medium">Mais de</span>
                                      <span className="font-bold text-base">{Number((over as any).odd_atual || over.odd).toFixed(2)}</span>
                                    </button>
                                  )}
                                </td>
                                <td className="py-2 pr-6 pl-3 w-1/3">
                                  {under && (
                                    <button
                                      onClick={() => handleToggleSelecao(under)}
                                      className={`w-full flex justify-between items-center px-4 py-3 rounded-lg border transition-all duration-200
                                        ${selecoes.some(s => s.id === under.id) 
                                          ? 'bg-fut-primary/10 border-fut-primary text-fut-primary' 
                                          : 'bg-zinc-800 border-zinc-700 text-white hover:border-fut-primary/50'
                                        }`}
                                    >
                                      <span className="text-sm font-medium">Menos de</span>
                                      <span className="font-bold text-base">{Number((under as any).odd_atual || under.odd).toFixed(2)}</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          
                          {/* Fallback para mercados que nao sao Over/Under de gols (se houver) */}
                          {!mercado.opcoes[0]?.descricao.includes('ais de') && !mercado.opcoes[0]?.descricao.includes('enos de') && (
                            <tr>
                              <td colSpan={3} className="p-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {mercado.opcoes.map((opcao) => (
                                    <OddButton
                                      key={opcao.id}
                                      opcao={opcao}
                                      isSelected={selecoes.some((s) => s.id === opcao.id)}
                                      onToggle={handleToggleSelecao}
                                    />
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )})
              )}
            </>
          )}

          {/* TAB HISTORICO */}
          {activeTab === 'historico' && (
            <div className="space-y-4">
              {isLoadingHistorico ? (
                <div className="text-zinc-400">Carregando histórico...</div>
              ) : historico?.length === 0 ? (
                <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 text-center text-zinc-400">
                  Você ainda não fez nenhuma aposta.
                </div>
              ) : (
                historico?.map((bilhete: any) => (
                  <div key={bilhete.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-zinc-500 text-sm">Bilhete #{bilhete.id}</span>
                        <h4 className="text-white font-bold">Rodada {bilhete.rodada_id}</h4>
                        <span className="text-zinc-400 text-xs">{new Date(bilhete.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                      <div className={`px-3 py-1 rounded font-bold text-sm uppercase 
                        ${bilhete.status === 'pendente' ? 'bg-yellow-500/20 text-yellow-500' : ''}
                        ${bilhete.status === 'ganhou' ? 'bg-green-500/20 text-green-500' : ''}
                        ${bilhete.status === 'perdeu' ? 'bg-red-500/20 text-red-500' : ''}
                      `}>
                        {bilhete.status}
                      </div>
                    </div>
                    <div className="space-y-2 mb-4 bg-zinc-800/50 p-3 rounded-lg">
                      {bilhete.opcoes?.map((op: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-zinc-800/50 last:border-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Status GREEN / LOSS / PENDENTE */}
                            {op.status_resultado === 'ganhou' ? (
                              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                <span>✓</span> GREEN
                              </span>
                            ) : op.status_resultado === 'perdeu' ? (
                              <span className="bg-red-500/15 text-red-400 border border-red-500/30 text-[11px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                <span>✕</span> LOSS
                              </span>
                            ) : (
                              <span className="bg-zinc-700/30 text-zinc-400 border border-zinc-700 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase">
                                ABERTO
                              </span>
                            )}

                            <span className="text-zinc-200 font-medium">{op.titulo}</span>
                            <span className="text-zinc-400 text-xs">({op.descricao})</span>
                            {op.resultado_real !== undefined && op.resultado_real !== null && (
                              <span className="text-zinc-300 text-xs border border-zinc-700/80 px-1.5 py-0.5 rounded bg-zinc-800 font-mono">
                                Placar real: <strong className="text-fut-primary">{op.resultado_real}</strong>
                              </span>
                            )}
                          </div>
                          <span className="text-fut-primary font-bold ml-2 shrink-0">{Number(op.odd_momento).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center border-t border-zinc-800 pt-4">
                      <div>
                        <p className="text-zinc-400 text-xs uppercase">Valor Apostado</p>
                        <p className="text-white font-bold">💰 {Number(bilhete.valor_apostado).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-zinc-400 text-xs uppercase">Retorno {bilhete.status === 'pendente' ? 'Potencial' : ''}</p>
                        <p className={`font-bold text-lg ${bilhete.status === 'perdeu' ? 'text-red-500' : 'text-green-500'}`}>
                          {bilhete.status === 'perdeu' ? '0.00' : `💰 ${Number(bilhete.retorno_potencial || (bilhete.valor_apostado * bilhete.odd_total)).toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB RANKING */}
          {activeTab === 'ranking' && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="bg-zinc-800 px-6 py-4 border-b border-zinc-700">
                <h2 className="text-xl font-bold text-white">🏆 Ranking Lendacoins</h2>
                <p className="text-sm text-zinc-400 mt-1">Os maiores apostadores do momento.</p>
              </div>
              <div className="p-0">
                {isLoadingRanking ? (
                  <div className="p-6 text-zinc-400">Carregando ranking...</div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-zinc-800/50">
                      <tr>
                        <th className="py-3 px-6 text-zinc-400 font-medium text-sm">Pos</th>
                        <th className="py-3 px-6 text-zinc-400 font-medium text-sm">Jogador</th>
                        <th className="py-3 px-6 text-zinc-400 font-medium text-sm text-right">Lendacoins</th>
                        <th className="py-3 px-6 text-zinc-400 font-medium text-sm text-right">Lucro/Prejuízo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking?.map((r: any) => (
                        <tr key={r.usuario_id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30">
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold
                              ${r.posicao === 1 ? 'bg-yellow-500 text-black' : ''}
                              ${r.posicao === 2 ? 'bg-zinc-300 text-black' : ''}
                              ${r.posicao === 3 ? 'bg-amber-700 text-white' : ''}
                              ${r.posicao > 3 ? 'bg-zinc-800 text-zinc-400' : ''}
                            `}>
                              {r.posicao}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-white font-medium">{r.nome}</td>
                          <td className="py-4 px-6 text-right font-bold text-fut-primary">💰 {Number(r.saldo).toFixed(2)}</td>
                          <td className={`py-4 px-6 text-right font-bold ${Number(r.lucro_prejuizo_total) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {Number(r.lucro_prejuizo_total) > 0 ? '+' : ''}{Number(r.lucro_prejuizo_total).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Coluna Direita: Boletim */}
        <div className="w-full lg:w-[380px] lg:shrink-0 sticky top-4">
          <BoletimAposta
            selecoes={selecoes}
            saldo={Number(carteira?.saldo || 0)}
            onClear={() => setSelecoes([])}
            onRemoveSelecao={(id) => setSelecoes((prev) => prev.filter((s) => s.id !== id))}
          />
        </div>
      </div>
    </div>
  );
}
