import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/api';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Shield, Coins, Search, ArrowUpDown, Check, RefreshCw, Lock,
  TrendingUp, TrendingDown, Crown, AlertTriangle, ChevronDown,
} from 'lucide-react';
import { useRodadasDoCampeonato } from '@/features/rodadas/api/useCampeonatoRodadas';
import { LendaCoin, Avatar } from '../shared';
import { CampoFutebol } from '../escalar/CampoFutebol';

// ── Componente principal ──────────────────────────────────────
export function AbaEscalar({ campeonatoId }: { campeonatoId: number }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  // ── Dados do campeonato ──
  const { data: campeonato } = useQuery({
    queryKey: ['campeonato', campeonatoId],
    queryFn: async () => (await api.get(`/campeonatos/${campeonatoId}`)).data,
    enabled: !!campeonatoId,
    staleTime: 60_000,
  });

  // ── Rodadas com número sequencial calculado ──
  const { data: rodadasRaw } = useRodadasDoCampeonato(campeonatoId);
  const rodadas = useMemo(() => {
    if (!rodadasRaw?.length) return [];
    // Ordena por data/id para calcular número sequencial
    const sorted = [...rodadasRaw].sort((a: any, b: any) => {
      if (a.data !== b.data) return a.data < b.data ? -1 : 1;
      return a.id - b.id;
    });
    return sorted.map((r: any, i: number) => ({ ...r, numero: i + 1 }));
  }, [rodadasRaw]);

  const rodadaAtual = useMemo(() => {
    if (!rodadas.length) return null;
    return rodadas.find((r: any) => r.status === 'agendada' || r.status === 'aberta')
      ?? rodadas.find((r: any) => r.status === 'em_andamento')
      ?? null;
  }, [rodadas]);

  const rodadaId = rodadaAtual?.id ?? null;
  const mercadoFechado = rodadaAtual?.status === 'em_andamento' || rodadaAtual?.status === 'finalizada';
  const totalRodadas = rodadas.length;

  // ── Queries de dados ──
  const { data: mercado } = useQuery({
    queryKey: ['cartolendas', 'mercado', rodadaId, campeonatoId],
    queryFn: async () => (await api.get(`/cartolendas/mercado/${rodadaId}`, { params: { campeonato_id: campeonatoId } })).data as any[],
    enabled: !!rodadaId,
    staleTime: 30_000,
  });
  const { data: meuTime, refetch } = useQuery({
    queryKey: ['cartolendas', 'meu-time', rodadaId],
    queryFn: async () => (await api.get(`/cartolendas/meu-time/${rodadaId}`)).data,
    enabled: !!rodadaId,
  });
  const { data: capitaoData } = useQuery({
    queryKey: ['cartolendas', 'capitao', rodadaId],
    queryFn: async () => (await api.get(`/cartolendas/capitao/${rodadaId}`)).data,
    enabled: !!rodadaId,
  });

  // ── State local ──
  const [escalacaoLocal, setEscalacaoLocal] = useState<any[]>([]);
  const [inicializado, setInicializado] = useState(false);
  const [capitaoId, setCapitaoId] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'goleiro' | 'linha'>('todos');
  const [ordenar, setOrdenar] = useState<'pontos' | 'preco' | 'variacao'>('pontos');
  const [salvando, setSalvando] = useState(false);

  // ── Jogador do usuário (obrigatório) ──
  const jogadorDoUsuario = useMemo(() => {
    if (!mercado || !user?.id) return null;
    return mercado.find((m: any) => m.usuario_id === user.id) ?? null;
  }, [mercado, user]);

  // ── Inicialização ──
  useEffect(() => {
    if (!meuTime || inicializado || !mercado) return;
    let base = (meuTime.escalacao ?? []).map((e: any) => {
      const info = mercado.find((m: any) => m.id === e.jogador_id);
      return { ...e, ...(info ?? {}), jogador_id: e.jogador_id };
    });
    if (jogadorDoUsuario && !base.some((e: any) => e.jogador_id === jogadorDoUsuario.id)) {
      base = [{ ...jogadorDoUsuario, jogador_id: jogadorDoUsuario.id, posicao: jogadorDoUsuario.posicao ?? 'linha', eh_reserva: false }, ...base];
    }
    setEscalacaoLocal(base);
    if (capitaoData?.jogador_id) setCapitaoId(capitaoData.jogador_id);
    setInicializado(true);
  }, [meuTime, inicializado, mercado, jogadorDoUsuario, capitaoData]);

  // ── Cálculos ──
  // Verba dinâmica: vem do backend (sobe/desce com valorização dos jogadores)
  const ORCAMENTO = parseFloat(meuTime?.verba_tecnico ?? 100);
  const custo = useMemo(() => escalacaoLocal.reduce((s, e) => s + parseFloat(e.preco ?? 10), 0), [escalacaoLocal]);
  const saldoRestante = ORCAMENTO - custo;
  const qtdGoleiros = escalacaoLocal.filter(e => e.posicao === 'goleiro' && !e.eh_reserva).length;
  const qtdLinha = escalacaoLocal.filter(e => e.posicao === 'linha' && !e.eh_reserva).length;
  const qtdReservas = escalacaoLocal.filter(e => e.eh_reserva).length;
  const completo = qtdGoleiros === 1 && qtdLinha === 6;
  const escaladosIds = useMemo(() => new Set(escalacaoLocal.map(e => e.jogador_id)), [escalacaoLocal]);

  // ── Mercado filtrado ──
  const jogadoresFiltrados = useMemo(() => {
    if (!mercado) return [];
    let lista = [...mercado];
    if (filtro !== 'todos') lista = lista.filter(j => j.posicao === filtro);
    if (busca) lista = lista.filter(j => j.nome?.toLowerCase().includes(busca.toLowerCase()));
    lista.sort((a, b) => {
      if (ordenar === 'preco') return parseFloat(b.preco ?? 0) - parseFloat(a.preco ?? 0);
      if (ordenar === 'variacao') return parseFloat(b.variacao ?? 0) - parseFloat(a.variacao ?? 0);
      return parseFloat(b.media_pontos ?? 0) - parseFloat(a.media_pontos ?? 0);
    });
    return lista;
  }, [mercado, filtro, busca, ordenar]);

  // ── Handlers ──
  const adicionar = useCallback((j: any) => {
    if (mercadoFechado) return;
    if (escaladosIds.has(j.id)) return;
    const preco = parseFloat(j.preco ?? 10);
    if (custo + preco > ORCAMENTO) {
      toast.error(`Orçamento insuficiente! Faltam ${saldoRestante.toFixed(1)} LC, jogador custa ${preco.toFixed(1)}`);
      return;
    }
    const isGol = j.posicao === 'goleiro';
    let ehReserva = (isGol && qtdGoleiros >= 1) || (!isGol && qtdLinha >= 6);
    if (ehReserva && qtdReservas >= 1) { toast.error('Máximo 1 reserva'); return; }
    setEscalacaoLocal(prev => [...prev, { ...j, jogador_id: j.id, posicao: isGol ? 'goleiro' : 'linha', eh_reserva: ehReserva }]);
  }, [mercadoFechado, escaladosIds, custo, saldoRestante, qtdGoleiros, qtdLinha, qtdReservas]);

  const remover = useCallback((id: number) => {
    if (mercadoFechado) return;
    if (id === jogadorDoUsuario?.id) { toast.error('Você não pode se remover do time!'); return; }
    setEscalacaoLocal(prev => prev.filter(e => e.jogador_id !== id));
    if (capitaoId === id) setCapitaoId(null);
  }, [mercadoFechado, jogadorDoUsuario?.id, capitaoId]);

  const toggleCapitao = useCallback((jogadorId: number) => {
    if (mercadoFechado) return;
    setCapitaoId(prev => prev === jogadorId ? null : jogadorId);
  }, [mercadoFechado]);

  const salvar = async () => {
    if (!rodadaId || !completo || mercadoFechado) return;
    if (jogadorDoUsuario && !escaladosIds.has(jogadorDoUsuario.id)) {
      toast.error('Você deve estar escalado no próprio time!');
      return;
    }
    if (custo > ORCAMENTO) {
      toast.error(`Orçamento excedido: ${custo.toFixed(1)}/${ORCAMENTO} LC`);
      return;
    }
    setSalvando(true);
    try {
      await api.post('/cartolendas/escalar', { rodada_id: rodadaId, jogadores: escalacaoLocal.map(e => ({ jogador_id: e.jogador_id, eh_reserva: !!e.eh_reserva })) });
      if (capitaoId) {
        await api.post('/cartolendas/capitao', { jogador_id: capitaoId, rodada_id: rodadaId });
      }
      toast.success('Escalação salva com sucesso!');
      setInicializado(false);
      refetch();
      qc.invalidateQueries({ queryKey: ['cartolendas', 'capitao', rodadaId] });
      qc.invalidateQueries({ queryKey: ['cartolendas', 'mercado'] });
      qc.invalidateQueries({ queryKey: ['cartolendas', 'meu-patrimonio'] });
      qc.invalidateQueries({ queryKey: ['cartolendas', 'ranking'] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao salvar escalação');
    } finally {
      setSalvando(false);
    }
  };

  // ── Sem rodada ──
  if (!rodadaId) return (
    <div className="text-center py-16 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <Lock size={28} className="text-white/20" />
      </div>
      <div>
        <p className="text-white/50 font-bold text-lg">Mercado Fechado</p>
        <p className="text-white/25 text-sm mt-1">Nenhuma rodada aberta para escalação.<br />Aguarde o admin abrir a próxima rodada.</p>
      </div>
    </div>
  );

  const nomeCampeonato = campeonato?.nome ?? campeonato?.name ?? `Campeonato #${campeonatoId}`;

  // ── Render principal ──
  return (
    <div className="space-y-4">

      {/* ══════ HEADER ESTILO CARTOLA ══════ */}
      <div className={cn(
        'rounded-2xl overflow-hidden border',
        mercadoFechado
          ? 'bg-gradient-to-r from-red-950/60 to-red-900/30 border-red-500/20'
          : 'bg-gradient-to-r from-emerald-950/60 to-emerald-900/30 border-emerald-500/20'
      )}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg',
              mercadoFechado ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
            )}>
              {rodadaAtual?.numero ?? '?'}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{nomeCampeonato}</p>
              <p className="text-white/40 text-xs">
                Rodada {rodadaAtual?.numero}/{totalRodadas}
                {rodadaAtual?.data && <> · {new Date(rodadaAtual.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</>}
              </p>
            </div>
          </div>
          <div className="text-right">
            {mercadoFechado ? (
              <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 rounded-full px-3 py-1">
                <Lock size={11} className="text-red-400" />
                <span className="text-xs font-bold text-red-400">Mercado Fechado</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-3 py-1">
                <Shield size={11} className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400">Mercado Aberto</span>
              </div>
            )}
          </div>
        </div>

        {/* Barra de orçamento */}
        <div className="px-4 py-2.5 bg-black/20 border-t border-white/5 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Coins size={14} className="text-yellow-400" />
            <span className="text-xs text-white/40">Verba {ORCAMENTO !== 100 ? `(${ORCAMENTO.toFixed(1)})` : ''}</span>
          </div>
          <div className="flex-1">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', saldoRestante < 0 ? 'bg-red-500' : saldoRestante < 15 ? 'bg-yellow-500' : 'bg-emerald-500')}
                style={{ width: `${Math.min((custo / ORCAMENTO) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('text-sm font-black', saldoRestante < 0 ? 'text-red-400' : 'text-yellow-400')}>
              {saldoRestante.toFixed(1)}
            </span>
            <LendaCoin size={13} />
            {ORCAMENTO !== 100 && (
              <span className={cn('text-[9px] font-bold ml-0.5', ORCAMENTO > 100 ? 'text-emerald-400' : 'text-red-400')}>
                {ORCAMENTO > 100 ? '+' : ''}{(ORCAMENTO - 100).toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ══════ STATUS DO TIME ══════ */}
      <div className="flex gap-2 flex-wrap text-xs">
        <span className={cn('px-3 py-1.5 rounded-lg font-bold border', qtdGoleiros === 1 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-white/30 border-white/10')}>
          {qtdGoleiros === 1 ? '✓' : '○'} 1 Goleiro
        </span>
        <span className={cn('px-3 py-1.5 rounded-lg font-bold border', qtdLinha === 6 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-white/30 border-white/10')}>
          {qtdLinha}/6 Linha
        </span>
        <span className={cn('px-3 py-1.5 rounded-lg font-bold border', qtdReservas === 1 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-white/30 border-white/10')}>
          {qtdReservas}/1 Reserva
        </span>
        {capitaoId ? (
          <span className="px-3 py-1.5 rounded-lg font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <Crown size={10} className="inline mr-1" />Capitão
          </span>
        ) : completo ? (
          <span className="px-3 py-1.5 rounded-lg font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse">
            <AlertTriangle size={10} className="inline mr-1" />Defina o capitão!
          </span>
        ) : null}
        {jogadorDoUsuario && !escaladosIds.has(jogadorDoUsuario.id) && (
          <span className="px-3 py-1.5 rounded-lg font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertTriangle size={10} className="inline mr-1" />Você não está escalado!
          </span>
        )}
      </div>

      {/* ══════ CAMPO + MERCADO ══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Campo de futebol */}
        <div className="lg:col-span-3 space-y-3">
          <CampoFutebol
            escalacao={escalacaoLocal}
            capitaoId={capitaoId ?? undefined}
            jogadorObrigatorioId={jogadorDoUsuario?.id}
            onRemover={mercadoFechado ? () => {} : remover}
            onCapitao={mercadoFechado ? undefined : toggleCapitao}
            readOnly={mercadoFechado}
          />

          {/* Botão salvar */}
          {!mercadoFechado && (
            <button
              onClick={salvar}
              disabled={salvando || !completo}
              className={cn(
                'w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2',
                completo
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-900/40'
                  : 'bg-white/5 text-white/25 border border-white/10 cursor-not-allowed'
              )}
            >
              {salvando ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
              {salvando ? 'Salvando...' : completo ? 'Salvar Escalação' : `Complete o time (${qtdGoleiros + qtdLinha}/7)`}
            </button>
          )}

          {!mercadoFechado && completo && !capitaoId && (
            <p className="text-center text-xs text-orange-400/80">
              Toque em "Cap" em um jogador no campo para definir o capitão — pontos dobrados!
            </p>
          )}
        </div>

        {/* ══════ PAINEL MERCADO ══════ */}
        <div className="lg:col-span-2">
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">

            {/* Header do mercado */}
            <div className="p-3 bg-white/[0.03] border-b border-white/10">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Mercado</h3>
                <span className="text-[10px] text-white/30">{mercado?.length ?? 0} jogadores</span>
              </div>

              {/* Busca */}
              <div className="relative mb-2">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type="text"
                  placeholder="Buscar jogador..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/8 rounded-lg text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>

              {/* Filtros */}
              <div className="flex gap-1.5 flex-wrap">
                {(['todos', 'goleiro', 'linha'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all',
                      filtro === f
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/40'
                        : 'bg-white/5 text-white/35 hover:bg-white/10 hover:text-white/50'
                    )}
                  >
                    {f === 'todos' ? 'Todos' : f === 'goleiro' ? 'Goleiros' : 'Linha'}
                  </button>
                ))}
                <button
                  onClick={() => setOrdenar(o => o === 'pontos' ? 'preco' : o === 'preco' ? 'variacao' : 'pontos')}
                  className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/5 text-white/35 hover:bg-white/10 transition-all"
                >
                  <ArrowUpDown size={10} />
                  {ordenar === 'pontos' ? 'Média' : ordenar === 'preco' ? 'Preço' : 'Variação'}
                </button>
              </div>
            </div>

            {/* Grid de cards de jogadores */}
            <div className="overflow-y-auto max-h-[500px] p-2">
              <div className="grid grid-cols-2 gap-2">
                {jogadoresFiltrados.map((j: any) => {
                  const jaEsc = escaladosIds.has(j.id);
                  const preco = parseFloat(j.preco ?? 10);
                  const semSaldo = preco > saldoRestante && !jaEsc;
                  const variacao = parseFloat(j.variacao ?? 0);
                  const ehEu = j.id === jogadorDoUsuario?.id;
                  const desabilitado = jaEsc || semSaldo || mercadoFechado;

                  return (
                    <div
                      key={j.id}
                      onClick={() => !desabilitado && adicionar(j)}
                      className={cn(
                        'relative rounded-xl overflow-hidden border transition-all duration-200',
                        jaEsc ? 'opacity-40 cursor-default border-purple-500/20 bg-purple-500/5'
                        : semSaldo ? 'opacity-30 cursor-not-allowed border-white/5 bg-white/[0.02]'
                        : mercadoFechado ? 'cursor-default border-white/8 bg-white/[0.03]'
                        : ehEu ? 'border-emerald-500/30 bg-gradient-to-b from-emerald-900/30 to-emerald-950/50 hover:border-emerald-500/50 cursor-pointer hover:scale-[1.02]'
                        : 'border-white/8 bg-gradient-to-b from-slate-800/40 to-slate-900/60 hover:border-purple-500/20 cursor-pointer hover:scale-[1.02]'
                      )}
                    >
                      {/* Topo colorido */}
                      <div className={cn(
                        'h-0.5',
                        jaEsc ? 'bg-purple-500/50'
                        : ehEu ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                        : 'bg-gradient-to-r from-purple-500/30 to-purple-700/30'
                      )} />

                      <div className="p-2 flex flex-col items-center gap-1">
                        {/* Avatar */}
                        <div className="relative">
                          <Avatar src={j.foto_url ?? j.avatar_url} nome={j.nome} size={9} className="border border-white/10" />
                          {ehEu && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0a1628]">
                              <Crown size={7} className="text-white" />
                            </div>
                          )}
                          {jaEsc && (
                            <div className="absolute inset-0 rounded-full bg-purple-500/20 flex items-center justify-center">
                              <Check size={14} className="text-purple-400" />
                            </div>
                          )}
                        </div>

                        {/* Nome */}
                        <p className="text-[10px] font-bold text-white text-center leading-tight truncate w-full">
                          {j.nome?.split(' ')[0]}
                          {ehEu && <span className="text-[8px] text-emerald-400 block">(VOCÊ)</span>}
                        </p>

                        {/* Posição + Scouting Badge */}
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-white/25 capitalize font-bold">{j.posicao}</span>
                          {/* Scouting badges */}
                          {variacao > 0 && parseFloat(j.media_pontos ?? 0) > 5 && (
                            <span className="text-[7px] font-black bg-emerald-500/20 text-emerald-400 px-1 rounded">EM ALTA</span>
                          )}
                          {variacao < -1 && (
                            <span className="text-[7px] font-black bg-red-500/20 text-red-400 px-1 rounded">EM BAIXA</span>
                          )}
                          {preco < 8 && parseFloat(j.media_pontos ?? 0) > 4 && (
                            <span className="text-[7px] font-black bg-yellow-500/20 text-yellow-400 px-1 rounded">BARGANHA</span>
                          )}
                        </div>

                        {/* Preço */}
                        <div className="flex items-center gap-0.5 text-[9px] font-bold text-yellow-400">
                          <LendaCoin size={8} />
                          {preco.toFixed(1)}
                        </div>

                        {/* Média + Variação */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] text-white/25 font-bold">{parseFloat(j.media_pontos ?? 0).toFixed(1)} pts</span>
                          {variacao !== 0 && (
                            <span className={cn(
                              'text-[8px] font-bold flex items-center gap-0.5 rounded-full px-1 py-0.5',
                              variacao > 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                            )}>
                              {variacao > 0 ? <TrendingUp size={7} /> : <TrendingDown size={7} />}
                              {variacao > 0 ? '+' : ''}{variacao.toFixed(1)}
                            </span>
                          )}
                        </div>

                        {/* Lock de saldo */}
                        {semSaldo && (
                          <div className="flex items-center gap-0.5 text-[8px] text-red-400/60">
                            <Lock size={8} /> Sem saldo
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {jogadoresFiltrados.length === 0 && (
                <div className="py-12 text-center text-xs text-white/20">
                  Nenhum jogador encontrado
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
