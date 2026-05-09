import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/api';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Search, ArrowLeftRight, X, Check, RefreshCw } from 'lucide-react';
import { useRodadasDoCampeonato } from '@/features/rodadas/api/useCampeonatoRodadas';
import { LendaCoin, Avatar } from '../shared';

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
  const meuElenco = meuTime?.escalacao?.filter((e: any) => !e.eh_reserva) ?? [];
  const mercadoFiltrado = useMemo(() => {
    if (!mercado || !saiId) return [];
    const sai = meuElenco.find((e: any) => e.jogador_id === saiId);
    if (!sai) return [];
    return mercado.filter((j: any) => {
      const pos = j.posicao === 'goleiro' ? 'goleiro' : 'linha';
      return pos === sai.posicao && !meuElenco.some((e: any) => e.jogador_id === j.id) && (!buscaTrans || j.nome?.toLowerCase().includes(buscaTrans.toLowerCase()));
    });
  }, [mercado, saiId, meuElenco, buscaTrans]);
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
  return (
    <div className="space-y-5">
      <div className="bg-white/3 border border-white/10 rounded-xl p-4 flex items-center justify-between">
        <div><p className="text-sm font-bold text-white">Custo por transferencia: <span className="text-yellow-400 inline-flex items-center gap-0.5">2<LendaCoin size={12} /></span></p><p className="text-xs text-white/40 mt-0.5">{janelaMFechada ? 'Janela fechada — rodada em andamento' : 'Janela aberta'}</p></div>
        <div className="text-right"><p className="font-black text-xl text-yellow-400">{saldo.toFixed(1)}<LendaCoin size={16} className="ml-1" /></p><p className="text-[10px] text-white/30">seu saldo</p></div>
      </div>
      {janelaMFechada && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center"><p className="text-red-400 font-bold text-sm">A janela fechou quando o admin iniciou o check-in.</p></div>}
      {!janelaMFechada && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10"><p className="font-bold text-sm text-white">1. Quem sai?</p></div>
            <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
              {meuElenco.map((e: any) => (
                <button key={e.jogador_id} onClick={() => { setSaiId(e.jogador_id); setEntraId(null); }} className={cn('w-full flex items-center gap-2 p-2 rounded-xl border transition-all text-left', saiId === e.jogador_id ? 'border-red-500/50 bg-red-500/10' : 'border-white/8 hover:border-white/20')}>
                  <Avatar src={e.foto_url ?? e.avatar_url} nome={e.nome} size={7} />
                  <div className="flex-1 min-w-0"><p className="text-xs font-bold text-white truncate">{e.nome}</p><p className="text-[10px] text-white/30 capitalize">{e.posicao}</p></div>
                  <span className="text-xs font-bold text-yellow-400">{parseFloat(e.preco ?? 10).toFixed(1)}<LendaCoin size={11} className="ml-0.5" /></span>
                  {saiId === e.jogador_id && <X size={12} className="text-red-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10"><p className="font-bold text-sm text-white">2. Quem entra?</p>{saiId ? <p className="text-xs text-white/30">Compativeis com a posicao</p> : <p className="text-xs text-orange-400">Selecione quem sai primeiro</p>}</div>
            {saiId && <div className="px-2 pt-2"><div className="relative"><Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" /><input value={buscaTrans} onChange={e => setBuscaTrans(e.target.value)} placeholder="Buscar..." className="w-full pl-7 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/25 focus:outline-none" /></div></div>}
            <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
              {saiId ? mercadoFiltrado.map((j: any) => (
                <button key={j.id} onClick={() => setEntraId(j.id)} className={cn('w-full flex items-center gap-2 p-2 rounded-xl border transition-all text-left', entraId === j.id ? 'border-green-500/50 bg-green-500/10' : 'border-white/8 hover:border-white/20')}>
                  <Avatar src={j.foto_url ?? j.avatar_url} nome={j.nome} size={7} />
                  <div className="flex-1 min-w-0"><p className="text-xs font-bold text-white truncate">{j.nome}</p><p className="text-[10px] text-white/30">{parseFloat(j.media_pontos ?? 0).toFixed(1)} med</p></div>
                  <span className="text-xs font-bold text-yellow-400">{parseFloat(j.preco ?? 10).toFixed(1)}<LendaCoin size={11} className="ml-0.5" /></span>
                  {entraId === j.id && <Check size={12} className="text-green-400 shrink-0" />}
                </button>
              )) : <p className="text-center py-8 text-xs text-white/20">Escolha quem sai primeiro</p>}
            </div>
          </div>
        </div>
      )}
      {saiId && entraId && !janelaMFechada && (
        <button onClick={transferir} disabled={salvando} className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all flex items-center justify-center gap-2">
          {salvando ? <RefreshCw size={15} className="animate-spin" /> : <ArrowLeftRight size={15} />}Confirmar Transferencia (2<LendaCoin size={13} className="ml-0.5" />)
        </button>
      )}
      {(historico ?? []).length > 0 && (
        <div><p className="font-bold text-sm text-white mb-2">Historico desta rodada</p>
          <div className="space-y-2">{historico!.map((t: any) => (
            <div key={t.id} className="bg-white/3 border border-white/8 rounded-xl p-3 flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0"><Avatar src={t.saiu_foto} nome={t.jogador_saiu_nome} size={7} /><span className="text-xs font-bold text-red-400 truncate">{t.jogador_saiu_nome?.split(' ')[0]}</span></div>
              <ArrowLeftRight size={14} className="text-white/30 shrink-0" />
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end"><span className="text-xs font-bold text-green-400 truncate">{t.jogador_entrou_nome?.split(' ')[0]}</span><Avatar src={t.entrou_foto} nome={t.jogador_entrou_nome} size={7} /></div>
              <span className="text-[10px] text-red-400 shrink-0 ml-2">-{parseFloat(t.custo_coins).toFixed(1)}<LendaCoin size={10} className="ml-0.5" /></span>
            </div>
          ))}</div>
        </div>
      )}
    </div>
  );
}
