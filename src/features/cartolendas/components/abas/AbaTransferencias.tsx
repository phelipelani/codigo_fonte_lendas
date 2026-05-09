import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/api';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Search, ArrowLeftRight, X, Check, RefreshCw, ShieldAlert, TrendingUp, TrendingDown } from 'lucide-react';
import { useRodadasDoCampeonato } from '@/features/rodadas/api/useCampeonatoRodadas';
import { LendaCoin, Avatar, PosicaoBadge, PontosDisplay } from '../shared';
import { getPosicaoTipo } from '@/@types/cartolendas';

export function AbaTransferencias({ campeonatoId }: { campeonatoId: number }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { data: rodadas } = useRodadasDoCampeonato(campeonatoId);
  const rodadaAtual = useMemo(() => rodadas?.find((r: any) => r.status === 'agendada' || r.status === 'aberta') ?? null, [rodadas]);
  const rodadaId = rodadaAtual?.id ?? null;

  const { data: ranking } = useQuery({ queryKey: ['cartolendas', 'ranking'], queryFn: async () => (await api.get('/cartolendas/ranking')).data as any[] });
  const saldo = useMemo(() => { const eu = ranking?.find((r: any) => r.usuario_id === user?.id); return eu ? parseFloat(eu.lendas_coins ?? 100) : 100; }, [ranking, user]);

  const { data: meuTime } = useQuery({ queryKey: ['cartolendas', 'meu-time', rodadaId], queryFn: async () => (await api.get(`/cartolendas/meu-time/${rodadaId}`)).data, enabled: !!rodadaId });
  const { data: mercado } = useQuery({ queryKey: ['cartolendas', 'mercado', rodadaId, campeonatoId], queryFn: async () => (await api.get(`/cartolendas/mercado/${rodadaId}`, { params: { campeonato_id: campeonatoId } })).data as any[], enabled: !!rodadaId });
  const { data: historico, refetch: refetchHist } = useQuery({ queryKey: ['cartolendas', 'transferencias', rodadaId], queryFn: async () => (await api.get(`/cartolendas/transferencias/${rodadaId}`)).data as any[], enabled: !!rodadaId });

  const [saiId, setSaiId] = useState<number | null>(null);
  const [entraId, setEntraId] = useState<number | null>(null);
  const [buscaTrans, setBuscaTrans] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [ordenacao, setOrdenacao] = useState<'preco' | 'media' | 'variacao'>('preco');

  const meuElenco = meuTime?.escalacao?.filter((e: any) => !e.eh_reserva) ?? [];

  const mercadoFiltrado = useMemo(() => {
    if (!mercado || !saiId) return [];
    const sai = meuElenco.find((e: any) => e.jogador_id === saiId);
    if (!sai) return [];
    let filtered = mercado.filter((j: any) => {
      const pos = j.posicao === 'goleiro' ? 'goleiro' : 'linha';
      return pos === sai.posicao && !meuElenco.some((e: any) => e.jogador_id === j.id) && (!buscaTrans || j.nome?.toLowerCase().includes(buscaTrans.toLowerCase()));
    });
    // Ordenação
    filtered.sort((a: any, b: any) => {
      if (ordenacao === 'preco') return parseFloat(b.preco ?? 10) - parseFloat(a.preco ?? 10);
      if (ordenacao === 'media') return parseFloat(b.media_pontos ?? 0) - parseFloat(a.media_pontos ?? 0);
      return parseFloat(b.variacao ?? 0) - parseFloat(a.variacao ?? 0);
    });
    return filtered;
  }, [mercado, saiId, meuElenco, buscaTrans, ordenacao]);

  const transferir = async () => {
    if (!saiId || !entraId || !rodadaId) return;
    setSalvando(true);
    try {
      const { data } = await api.post('/cartolendas/transferencias', { jogador_sai_id: saiId, jogador_entra_id: entraId, rodada_id: rodadaId });
      toast.success(`Transferencia feita! Saldo: ${parseFloat(data.novo_saldo).toFixed(1)} LC`);
      setSaiId(null); setEntraId(null);
      qc.invalidateQueries({ queryKey: ['cartolendas', 'meu-time', rodadaId] });
      qc.invalidateQueries({ queryKey: ['cartolendas', 'ranking'] });
      refetchHist();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Erro'); }
    finally { setSalvando(false); }
  };

  const janelaMFechada = rodadaAtual?.status === 'em_andamento' || rodadaAtual?.status === 'finalizada';

  // Dados do jogador selecionado para sair
  const jogadorSai = saiId ? meuElenco.find((e: any) => e.jogador_id === saiId) : null;
  // Dados do jogador selecionado para entrar
  const jogadorEntra = entraId ? mercado?.find((j: any) => j.id === entraId) : null;

  return (
    <div className="space-y-5">
      {/* Header com saldo e custo */}
      <div className="rounded-2xl overflow-hidden border border-white/10">
        <div className="h-1 bg-gradient-to-r from-yellow-400 to-amber-500" />
        <div className="bg-gradient-to-b from-slate-800/30 to-slate-900/50 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">Custo por transferencia: <span className="text-yellow-400 inline-flex items-center gap-0.5">2<LendaCoin size={12} /></span></p>
            <p className="text-xs text-white/40 mt-0.5">{janelaMFechada ? 'Janela fechada — rodada em andamento' : 'Janela aberta'}</p>
          </div>
          <div className="text-right">
            <p className="font-black text-xl text-yellow-400 flex items-center gap-1">{saldo.toFixed(1)}<LendaCoin size={16} /></p>
            <p className="text-[10px] text-white/30">seu saldo</p>
          </div>
        </div>
      </div>

      {janelaMFechada && (
        <div className="rounded-2xl overflow-hidden border border-red-500/20">
          <div className="h-0.5 bg-gradient-to-r from-red-400 to-red-600" />
          <div className="bg-gradient-to-b from-red-900/20 to-red-950/40 p-4 text-center flex items-center justify-center gap-2">
            <ShieldAlert size={16} className="text-red-400" />
            <p className="text-red-400 font-bold text-sm">A janela fechou quando o admin iniciou o check-in.</p>
          </div>
        </div>
      )}

      {/* Preview da transferência */}
      {(jogadorSai || jogadorEntra) && !janelaMFechada && (
        <div className="rounded-2xl overflow-hidden border border-purple-500/20">
          <div className="h-0.5 bg-gradient-to-r from-purple-400 to-indigo-500" />
          <div className="bg-gradient-to-b from-purple-900/20 to-slate-900/50 p-4">
            <div className="flex items-center justify-center gap-4">
              {/* Jogador que sai */}
              <div className="flex flex-col items-center gap-1.5 w-24">
                {jogadorSai ? (
                  <>
                    <Avatar src={jogadorSai.foto_url ?? jogadorSai.avatar_url} nome={jogadorSai.nome} size={12} className="border-2 border-red-500/30" />
                    <p className="text-xs font-bold text-white truncate w-full text-center">{jogadorSai.nome?.split(' ')[0]}</p>
                    <PosicaoBadge tipo={getPosicaoTipo(jogadorSai.posicao_real ?? jogadorSai.posicao, jogadorSai.joga_recuado)} className="text-[7px] px-1 py-0" />
                    <span className="text-xs font-bold text-red-400">{parseFloat(jogadorSai.preco ?? 10).toFixed(1)} <LendaCoin size={10} className="inline" /></span>
                  </>
                ) : (
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-red-500/20 flex items-center justify-center">
                    <span className="text-red-400/40 text-lg">?</span>
                  </div>
                )}
              </div>

              <ArrowLeftRight size={20} className="text-purple-400 shrink-0" />

              {/* Jogador que entra */}
              <div className="flex flex-col items-center gap-1.5 w-24">
                {jogadorEntra ? (
                  <>
                    <Avatar src={jogadorEntra.foto_url ?? jogadorEntra.avatar_url} nome={jogadorEntra.nome} size={12} className="border-2 border-emerald-500/30" />
                    <p className="text-xs font-bold text-white truncate w-full text-center">{jogadorEntra.nome?.split(' ')[0]}</p>
                    <PosicaoBadge tipo={getPosicaoTipo(jogadorEntra.posicao_real ?? jogadorEntra.posicao, jogadorEntra.joga_recuado)} className="text-[7px] px-1 py-0" />
                    <span className="text-xs font-bold text-emerald-400">{parseFloat(jogadorEntra.preco ?? 10).toFixed(1)} <LendaCoin size={10} className="inline" /></span>
                  </>
                ) : (
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-emerald-500/20 flex items-center justify-center">
                    <span className="text-emerald-400/40 text-lg">?</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!janelaMFechada && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Quem sai */}
          <div className="rounded-2xl overflow-hidden border border-white/10">
            <div className="h-0.5 bg-gradient-to-r from-red-400 to-red-600" />
            <div className="bg-gradient-to-b from-slate-800/30 to-slate-900/50">
              <div className="px-4 py-3 border-b border-white/8">
                <p className="font-bold text-sm text-white">1. Quem sai?</p>
              </div>
              <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                {meuElenco.map((e: any) => {
                  const posicaoTipo = getPosicaoTipo(e.posicao_real ?? e.posicao, e.joga_recuado);
                  return (
                    <button key={e.jogador_id} onClick={() => { setSaiId(e.jogador_id); setEntraId(null); }} className={cn(
                      'w-full flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left',
                      saiId === e.jogador_id ? 'border-red-500/50 bg-red-500/10' : 'border-white/8 hover:border-white/20'
                    )}>
                      <Avatar src={e.foto_url ?? e.avatar_url} nome={e.nome} size={8} className="border border-white/10" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{e.nome}</p>
                        <PosicaoBadge tipo={posicaoTipo} className="text-[6px] px-1 py-0" />
                      </div>
                      <span className="text-xs font-bold text-yellow-400 flex items-center gap-0.5">{parseFloat(e.preco ?? 10).toFixed(1)}<LendaCoin size={10} /></span>
                      {saiId === e.jogador_id && <X size={12} className="text-red-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quem entra */}
          <div className="rounded-2xl overflow-hidden border border-white/10">
            <div className="h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600" />
            <div className="bg-gradient-to-b from-slate-800/30 to-slate-900/50">
              <div className="px-4 py-3 border-b border-white/8">
                <p className="font-bold text-sm text-white">2. Quem entra?</p>
                {saiId ? (
                  <p className="text-xs text-white/30">Compativeis com a posicao</p>
                ) : (
                  <p className="text-xs text-orange-400">Selecione quem sai primeiro</p>
                )}
              </div>
              {saiId && (
                <div className="px-2 pt-2 space-y-2">
                  <div className="relative">
                    <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input value={buscaTrans} onChange={e => setBuscaTrans(e.target.value)} placeholder="Buscar..." className="w-full pl-7 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-purple-500/50 transition-colors" />
                  </div>
                  {/* Ordenação */}
                  <div className="flex gap-1">
                    {([
                      { key: 'preco', label: 'Preco', icon: LendaCoin },
                      { key: 'media', label: 'Media', icon: TrendingUp },
                      { key: 'variacao', label: 'Var.', icon: TrendingDown },
                    ] as const).map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setOrdenacao(key)}
                        className={cn(
                          'px-2 py-1 rounded-lg text-[9px] font-bold border transition-all',
                          ordenacao === key ? 'bg-purple-600/30 text-purple-300 border-purple-500/30' : 'bg-white/5 text-white/30 border-white/8'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                {saiId ? mercadoFiltrado.map((j: any) => {
                  const posicaoTipo = getPosicaoTipo(j.posicao_real ?? j.posicao, j.joga_recuado);
                  const variacao = parseFloat(j.variacao ?? 0);
                  return (
                    <button key={j.id} onClick={() => setEntraId(j.id)} className={cn(
                      'w-full flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left',
                      entraId === j.id ? 'border-green-500/50 bg-green-500/10' : 'border-white/8 hover:border-white/20'
                    )}>
                      <Avatar src={j.foto_url ?? j.avatar_url} nome={j.nome} size={8} className="border border-white/10" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{j.nome}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <PosicaoBadge tipo={posicaoTipo} className="text-[6px] px-1 py-0" />
                          <span className="text-[10px] text-white/30">{parseFloat(j.media_pontos ?? 0).toFixed(1)} med</span>
                          {variacao !== 0 && (
                            <PontosDisplay valor={variacao} size="xs" showArrow className="px-0 py-0 text-[8px]" />
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-yellow-400 flex items-center gap-0.5">{parseFloat(j.preco ?? 10).toFixed(1)}<LendaCoin size={10} /></span>
                      {entraId === j.id && <Check size={12} className="text-green-400 shrink-0" />}
                    </button>
                  );
                }) : <p className="text-center py-8 text-xs text-white/20">Escolha quem sai primeiro</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botão confirmar */}
      {saiId && entraId && !janelaMFechada && (
        <button onClick={transferir} disabled={salvando} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 border border-purple-500/30">
          {salvando ? <RefreshCw size={15} className="animate-spin" /> : <ArrowLeftRight size={15} />}
          Confirmar Transferencia (2<LendaCoin size={13} className="ml-0.5" />)
        </button>
      )}

      {/* Histórico */}
      {(historico ?? []).length > 0 && (
        <div className="space-y-2">
          <p className="font-bold text-sm text-white">Historico desta rodada</p>
          <div className="space-y-2">
            {historico!.map((t: any) => (
              <div key={t.id} className="rounded-xl overflow-hidden border border-white/8">
                <div className="bg-gradient-to-b from-slate-800/30 to-slate-900/50 p-3 flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar src={t.saiu_foto} nome={t.jogador_saiu_nome} size={7} className="border border-red-500/20" />
                    <span className="text-xs font-bold text-red-400 truncate">{t.jogador_saiu_nome?.split(' ')[0]}</span>
                  </div>
                  <ArrowLeftRight size={14} className="text-purple-400 shrink-0" />
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="text-xs font-bold text-green-400 truncate">{t.jogador_entrou_nome?.split(' ')[0]}</span>
                    <Avatar src={t.entrou_foto} nome={t.jogador_entrou_nome} size={7} className="border border-emerald-500/20" />
                  </div>
                  <span className="text-[10px] text-red-400 shrink-0 ml-2 font-bold">-{parseFloat(t.custo_coins).toFixed(1)}<LendaCoin size={10} className="ml-0.5" /></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
