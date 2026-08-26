import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { betsApi, MercadoBet } from '../api/bets';
import api from '../../../api';
import { toast } from 'sonner';

interface DraggableItem {
  id: number;
  nome: string;
  imagem: string;
  tipo: 'time' | 'goleiro';
}

export function BetsAdminPage() {
  const queryClient = useQueryClient();
  const [editingOdd, setEditingOdd] = useState<{ opcaoId: number, odd: string } | null>(null);
  
  // Drag & Drop State

  const { data: rodadasCampeonato } = useQuery({
    queryKey: ['admin_rodadas_campeonato', 46],
    queryFn: async () => {
       const res = await api.get('/rodadas/campeonato/46');
       return res.data;
    }
  });

  const [selectedRodadaId, setSelectedRodadaId] = useState<number | ''>('');

  const [activeTab, setActiveTab] = useState<'times' | 'goleiros'>('times');
  const [droppedItem, setDroppedItem] = useState<DraggableItem | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const { data: rankingUsuarios, isLoading: isLoadingUsuarios } = useQuery({
    queryKey: ['admin_usuarios_ranking'],
    queryFn: async () => await betsApi.getRanking()
  });

  const addSaldoMutation = useMutation({
    mutationFn: async (params: { usuarioId: number, valor: number }) => {
      return betsApi.adminAddSaldo(params.usuarioId, params.valor);
    },
    onSuccess: () => {
      toast.success('Saldo adicionado com sucesso!');
      setAddSaldoAmount('');
      queryClient.invalidateQueries({ queryKey: ['admin_usuarios_ranking'] });
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.error || 'Erro ao adicionar saldo');
    }
  });

  const [addSaldoUserId, setAddSaldoUserId] = useState<number | ''>('');
  const [addSaldoAmount, setAddSaldoAmount] = useState<string>('');


  const { data: statsTimes, isLoading: isLoadingTimes } = useQuery({
    queryKey: ['admin_stats_times'],
    queryFn: async () => await betsApi.adminGetStatsTimes()
  });

  const { data: statsGoleiros, isLoading: isLoadingGoleiros } = useQuery({
    queryKey: ['admin_stats_goleiros'],
    queryFn: async () => await betsApi.adminGetStatsGoleiros()
  });

  const { data: mercadosAtivos, isLoading: isLoadingMercados } = useQuery({
    queryKey: ['admin_mercados'],
    queryFn: async () => await betsApi.adminGetMercados()
  });

  const criarMercadoGenericoMutation = useMutation({
    mutationFn: async (params: { alvo_id: number, tipo_alvo: 'time'|'goleiro', categoria: string, nome_alvo: string, rodada_id?: number }) => {
      return betsApi.adminCriarMercadoGenerico({ ...params, rodada_id: selectedRodadaId ? Number(selectedRodadaId) : undefined });
    },
    onSuccess: () => {
      toast.success('Mercado criado com sucesso!');
      setDroppedItem(null);
      queryClient.invalidateQueries({ queryKey: ['bets_mercados'] });
      queryClient.invalidateQueries({ queryKey: ['admin_mercados'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erro ao criar mercado');
    }
  });

  const excluirMercadoMutation = useMutation({
    mutationFn: async (id: number) => betsApi.adminExcluirMercado(id),
    onSuccess: (data) => {
      toast.success(data.message || 'Mercado excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['bets_mercados'] });
      queryClient.invalidateQueries({ queryKey: ['admin_mercados'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Erro ao excluir mercado')
  });

  const atualizarStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => betsApi.adminAtualizarMercadoStatus(id, status),
    onSuccess: () => {
      toast.success('Status atualizado!');
      queryClient.invalidateQueries({ queryKey: ['bets_mercados'] });
      queryClient.invalidateQueries({ queryKey: ['admin_mercados'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Erro ao atualizar status')
  });

  const atualizarOddMutation = useMutation({
    mutationFn: async ({ id, odd }: { id: number, odd: string }) => betsApi.adminAtualizarOpcao(id, odd),
    onSuccess: () => {
      toast.success('Odd atualizada com sucesso!');
      setEditingOdd(null);
      queryClient.invalidateQueries({ queryKey: ['bets_mercados'] });
      queryClient.invalidateQueries({ queryKey: ['admin_mercados'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Erro ao atualizar odd')
  });

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, item: DraggableItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const data = e.dataTransfer.getData('application/json');
    if (data) {
      try {
        const item = JSON.parse(data) as DraggableItem;
        setDroppedItem(item);
      } catch (err) {
        console.error("Erro ao fazer parse do drag item", err);
      }
    }
  };

  const handleCreateMarket = (categoria: string) => {
    if (!droppedItem) return;
    criarMercadoGenericoMutation.mutate({
      alvo_id: droppedItem.id,
      tipo_alvo: droppedItem.tipo,
      categoria,
      nome_alvo: droppedItem.nome
    });
  };

  const renderDraggableList = () => {
    if (activeTab === 'times') {
      if (isLoadingTimes) return <p className="text-zinc-500 text-sm">Carregando...</p>;
      return statsTimes?.map((t: any) => (
        <div 
          key={t.id}
          draggable
          onDragStart={(e) => handleDragStart(e, { id: t.id, nome: t.nome, imagem: t.escudo, tipo: 'time' })}
          className="bg-zinc-800/80 hover:bg-zinc-700 p-3 rounded-lg flex items-center gap-3 cursor-grab active:cursor-grabbing border border-zinc-700/50 hover:border-fut-primary transition-colors"
        >
          {t.escudo ? (
            <img src={t.escudo} alt={t.nome} className="w-10 h-10 rounded-full object-cover bg-zinc-900" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-xs">TM</div>
          )}
          <div className="flex-1 overflow-hidden">
            <h4 className="text-white font-bold text-sm truncate">{t.nome}</h4>
            <div className="flex gap-2 text-[10px] text-zinc-400 mt-0.5">
              <span className="text-green-400">GP:{t.media_gols_pro}</span>
              <span className="text-blue-400">V:{t.media_vitorias}</span>
            </div>
          </div>
          <div className="text-zinc-500">
             <i className="las la-grip-vertical"></i>
          </div>
        </div>
      ));
    } else {
      if (isLoadingGoleiros) return <p className="text-zinc-500 text-sm">Carregando...</p>;
      return statsGoleiros?.map((g: any) => (
        <div 
          key={g.id}
          draggable
          onDragStart={(e) => handleDragStart(e, { id: g.id, nome: g.nome, imagem: g.foto, tipo: 'goleiro' })}
          className="bg-zinc-800/80 hover:bg-zinc-700 p-3 rounded-lg flex items-center gap-3 cursor-grab active:cursor-grabbing border border-zinc-700/50 hover:border-fut-primary transition-colors"
        >
          {g.foto ? (
            <img src={g.foto} alt={g.nome} className="w-10 h-10 rounded-full object-cover bg-zinc-900" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-xs">GL</div>
          )}
          <div className="flex-1 overflow-hidden">
            <h4 className="text-white font-bold text-sm truncate">{g.nome}</h4>
            <div className="flex gap-2 text-[10px] text-zinc-400 mt-0.5">
              <span className="text-red-400">GS:{g.media_gols_sofridos}</span>
            </div>
          </div>
          <div className="text-zinc-500">
             <i className="las la-grip-vertical"></i>
          </div>
        </div>
      ));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-3xl font-bold text-white mb-8 flex items-center">
        <span className="text-fut-primary mr-3">⚙️</span> Painel Criativo de Mercados
      </h1>


      {/* GESTÃO DE SALDO */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-8 flex flex-col md:flex-row items-center gap-4">
        <div>
          <h2 className="text-white font-bold text-lg">💰 Dar Pontos (Lendacoins)</h2>
          <p className="text-sm text-zinc-400">Adicione saldo diretamente na carteira de um usuário.</p>
        </div>
        <div className="flex-1"></div>
        <select 
          className="bg-zinc-800 border border-zinc-700 text-white p-2 rounded"
          value={addSaldoUserId}
          onChange={(e) => setAddSaldoUserId(Number(e.target.value))}
        >
          <option value="">Selecione o Usuário</option>
          {rankingUsuarios?.map((u: any) => (
            <option key={u.usuario_id} value={u.usuario_id}>{u.nome} (Saldo: {u.saldo})</option>
          ))}
        </select>
        <input 
          type="number" 
          placeholder="Qtd Lendacoins"
          className="bg-zinc-800 border border-zinc-700 text-white p-2 rounded w-40"
          value={addSaldoAmount}
          onChange={(e) => setAddSaldoAmount(e.target.value)}
        />
        <button
          onClick={() => {
            if (!addSaldoUserId || !addSaldoAmount) return;
            if (window.confirm('Tem certeza que deseja dar ' + addSaldoAmount + ' pontos para este usuário?')) {
               addSaldoMutation.mutate({ usuarioId: Number(addSaldoUserId), valor: Number(addSaldoAmount) });
            }
          }}
          disabled={!addSaldoUserId || !addSaldoAmount || addSaldoMutation.isPending}
          className="bg-fut-primary text-black font-bold px-4 py-2 rounded hover:bg-yellow-400 transition disabled:opacity-50"
        >
          {addSaldoMutation.isPending ? 'Enviando...' : 'Adicionar Saldo'}
        </button>
      </div>


      {/* SELECIONAR RODADA PARA OS MERCADOS */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-8 flex flex-col md:flex-row items-center gap-4">
        <div>
          <h2 className="text-white font-bold text-lg">⚙️ Configuração de Rodada</h2>
          <p className="text-sm text-zinc-400">Selecione a qual rodada os novos mercados criados pertencerão.</p>
        </div>
        <div className="flex-1"></div>
        <select 
          className="bg-zinc-800 border border-zinc-700 text-white p-2 rounded"
          value={selectedRodadaId}
          onChange={(e) => setSelectedRodadaId(Number(e.target.value))}
        >
          <option value="">Automático (Rodada Aberta Mais Antiga)</option>
          {rodadasCampeonato?.map((r: any) => (
            <option key={r.id} value={r.id}>Rodada {r.id} - {r.data} ({r.status})</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        
        {/* SIDEBAR: Draggable Items */}
        <div className="lg:col-span-1 bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col h-[600px]">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-white font-bold">Base de Dados</h2>
            <p className="text-xs text-zinc-400 mt-1">Arraste os itens para a direita</p>
          </div>
          
          <div className="flex border-b border-zinc-800">
            <button 
              className={`flex-1 py-3 text-sm font-bold ${activeTab === 'times' ? 'text-fut-primary border-b-2 border-fut-primary bg-zinc-800/30' : 'text-zinc-400 hover:text-white'}`}
              onClick={() => setActiveTab('times')}
            >
              Times
            </button>
            <button 
              className={`flex-1 py-3 text-sm font-bold ${activeTab === 'goleiros' ? 'text-fut-primary border-b-2 border-fut-primary bg-zinc-800/30' : 'text-zinc-400 hover:text-white'}`}
              onClick={() => setActiveTab('goleiros')}
            >
              Goleiros
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
            {renderDraggableList()}
          </div>
        </div>

        {/* MAIN AREA: Dropzone & Markets */}
        <div className="lg:col-span-3 flex flex-col gap-6 h-full">
          
          {/* DROPZONE */}
          <div 
            className={`flex-none rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center p-8 min-h-[250px] relative overflow-hidden ${
              isDraggingOver ? 'border-fut-primary bg-fut-primary/5' : 'border-zinc-700 bg-zinc-900/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!droppedItem ? (
              <>
                <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4 text-4xl shadow-inner">
                  👇
                </div>
                <h3 className="text-xl font-bold text-white text-center">Solte um Time ou Goleiro Aqui</h3>
                <p className="text-zinc-400 mt-2 text-center max-w-md">
                  Arraste um card do painel à esquerda e solte nesta área para criar odds matemáticas baseadas nas estatísticas da rodada.
                </p>
              </>
            ) : (
              <div className="w-full max-w-2xl animate-fade-in">
                <div className="flex justify-between items-center mb-6 border-b border-zinc-700 pb-4">
                  <div className="flex items-center gap-4">
                    {droppedItem.imagem ? (
                      <img src={droppedItem.imagem} alt={droppedItem.nome} className="w-16 h-16 rounded-full object-cover border-2 border-fut-primary shadow-lg" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center font-bold text-white border-2 border-fut-primary shadow-lg">
                        {droppedItem.tipo === 'time' ? 'TM' : 'GL'}
                      </div>
                    )}
                    <div>
                      <h3 className="text-2xl font-bold text-white">{droppedItem.nome}</h3>
                      <p className="text-fut-primary text-sm uppercase tracking-wider">{droppedItem.tipo}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setDroppedItem(null)} 
                    className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-full w-8 h-8 flex items-center justify-center transition"
                    title="Cancelar"
                  >
                    ✕
                  </button>
                </div>

                <h4 className="text-zinc-300 font-medium mb-4 text-center">Selecione o tipo de mercado que deseja gerar:</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {droppedItem.tipo === 'time' ? (
                    <>
                      <button onClick={() => handleCreateMarket('gols_pro')} disabled={criarMercadoGenericoMutation.isPending} className="bg-zinc-800 hover:bg-fut-primary hover:text-black text-white font-bold py-4 rounded-xl border border-zinc-700 transition shadow-sm group">
                        <div className="text-xl mb-1 group-hover:scale-110 transition-transform">⚽</div>
                        <div className="text-sm">Gols Pró</div>
                      </button>
                      <button onClick={() => handleCreateMarket('gols_sofridos')} disabled={criarMercadoGenericoMutation.isPending} className="bg-zinc-800 hover:bg-fut-primary hover:text-black text-white font-bold py-4 rounded-xl border border-zinc-700 transition shadow-sm group">
                        <div className="text-xl mb-1 group-hover:scale-110 transition-transform">🥅</div>
                        <div className="text-sm">Gols Sofridos</div>
                      </button>
                      <button onClick={() => handleCreateMarket('vitorias')} disabled={criarMercadoGenericoMutation.isPending} className="bg-zinc-800 hover:bg-fut-primary hover:text-black text-white font-bold py-4 rounded-xl border border-zinc-700 transition shadow-sm group">
                        <div className="text-xl mb-1 group-hover:scale-110 transition-transform">🏆</div>
                        <div className="text-sm">Vitórias</div>
                      </button>
                      <button onClick={() => handleCreateMarket('derrotas')} disabled={criarMercadoGenericoMutation.isPending} className="bg-zinc-800 hover:bg-fut-primary hover:text-black text-white font-bold py-4 rounded-xl border border-zinc-700 transition shadow-sm group">
                        <div className="text-xl mb-1 group-hover:scale-110 transition-transform">❌</div>
                        <div className="text-sm">Derrotas</div>
                      </button>
                      <button onClick={() => handleCreateMarket('pontos')} disabled={criarMercadoGenericoMutation.isPending} className="bg-zinc-800 hover:bg-fut-primary hover:text-black text-white font-bold py-4 rounded-xl border border-zinc-700 transition shadow-sm group md:col-span-2">
                        <div className="text-xl mb-1 group-hover:scale-110 transition-transform">⭐</div>
                        <div className="text-sm">Pontos Feitos</div>
                      </button>
                    </>
                  ) : (
                    <div className="md:col-span-3 flex justify-center">
                       <button onClick={() => handleCreateMarket('gols_sofridos')} disabled={criarMercadoGenericoMutation.isPending} className="bg-zinc-800 hover:bg-fut-primary hover:text-black text-white font-bold py-6 px-12 rounded-xl border border-zinc-700 transition shadow-sm group">
                         <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🥅</div>
                         <div className="text-lg">Gols Sofridos na Rodada</div>
                       </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ACTIVE MARKETS MANAGER */}
          <div className="flex-1 bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden shadow-lg flex flex-col">
            <div className="bg-zinc-800 px-6 py-4 border-b border-zinc-700 sticky top-0 z-10 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Mercados Ativos Recentes</h2>
                <p className="text-sm text-zinc-400 mt-1">Clique no ícone de lápis para alterar odds</p>
              </div>
              
              <button 
                onClick={async () => {
                  const rodadaId = mercadosAtivos?.[0]?.rodada_id;
                  if (!rodadaId) return toast.error("Não há mercados para apurar!");
                  if (!window.confirm("Isso irá calcular os resultados reais da rodada e pagar os bilhetes vencedores. Tem certeza?")) return;
                  
                  try {
                    await betsApi.adminApurarRodada(rodadaId);
                    toast.success("Rodada apurada e bilhetes pagos com sucesso!");
                    queryClient.invalidateQueries({ queryKey: ['admin_mercados'] });
                  } catch (e: any) {
                    toast.error(e.response?.data?.error || "Erro ao apurar");
                  }
                }}
                disabled={!mercadosAtivos || mercadosAtivos.length === 0}
                className="bg-fut-primary text-black font-bold px-4 py-2 rounded shadow-lg hover:bg-yellow-400 transition"
              >
                🏆 Apurar Resultados da Rodada
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {isLoadingMercados ? (
                <div className="text-zinc-400 text-center py-8">Carregando mercados...</div>
              ) : mercadosAtivos?.length === 0 ? (
                 <div className="text-zinc-500 text-center py-12 flex flex-col items-center">
                    <span className="text-4xl mb-3 opacity-50">📂</span>
                    <span>Nenhum mercado criado ainda.</span>
                    <span className="text-sm mt-1">Arraste um time acima para começar.</span>
                 </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mercadosAtivos?.map((mercado: MercadoBet) => (
                    <div key={mercado.id} className={`bg-zinc-800/40 border ${mercado.status === 'pausado' ? 'border-amber-500/50 opacity-70' : 'border-zinc-700'} rounded-lg p-4 transition hover:bg-zinc-800/60`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          {mercado.imagem ? (
                            <img src={mercado.imagem} alt="" className="w-10 h-10 rounded-full object-cover border border-zinc-700 bg-zinc-900" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center text-xs text-white">#</div>
                          )}
                          <div>
                            <h3 className="text-white font-bold leading-tight">{mercado.titulo}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block mt-1 font-bold ${mercado.status === 'pausado' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
                              {mercado.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {mercado.status === 'aberto' ? (
                             <button onClick={() => atualizarStatusMutation.mutate({ id: mercado.id, status: 'pausado' })} title="Pausar" className="p-1.5 bg-amber-500/10 text-amber-500 rounded hover:bg-amber-500/20 transition flex items-center justify-center">
                               ⏸️
                             </button>
                          ) : (
                             <button onClick={() => atualizarStatusMutation.mutate({ id: mercado.id, status: 'aberto' })} title="Retomar" className="p-1.5 bg-green-500/10 text-green-500 rounded hover:bg-green-500/20 transition flex items-center justify-center">
                               ▶️
                             </button>
                          )}
                          <button onClick={() => window.confirm("Excluir e reembolsar todas as apostas?") && excluirMercadoMutation.mutate(mercado.id)} title="Excluir" className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition flex items-center justify-center">
                             🗑️
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {mercado.opcoes?.map((op) => (
                          <div key={op.id} className="flex justify-between items-center bg-zinc-900/80 rounded px-3 py-2 text-sm border border-zinc-800">
                            <span className="text-zinc-300 font-medium">{op.descricao}</span>
                            
                            <div className="flex items-center gap-2">
                              {editingOdd?.opcaoId === op.id ? (
                                 <div className="flex items-center gap-1">
                                   <input 
                                     type="text" 
                                     value={editingOdd.odd}
                                     onChange={(e) => setEditingOdd({ ...editingOdd, odd: e.target.value })}
                                     className="w-14 bg-zinc-950 border border-fut-primary rounded px-1 py-0.5 text-white text-center text-xs focus:outline-none"
                                     autoFocus
                                   />
                                   <button onClick={() => atualizarOddMutation.mutate({ id: op.id, odd: editingOdd.odd })} className="text-green-400 hover:text-green-300">✅</button>
                                   <button onClick={() => setEditingOdd(null)} className="text-red-400 hover:text-red-300">✕</button>
                                 </div>
                              ) : (
                                 <div className="flex items-center gap-1.5 cursor-pointer group" onClick={() => setEditingOdd({ opcaoId: op.id, odd: op.odd })}>
                                   <span className="text-fut-primary font-bold text-[15px]">{Number(op.odd).toFixed(2)}</span>
                                   <span className="text-zinc-600 group-hover:text-zinc-300 transition-colors text-xs">✏️</span>
                                 </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
