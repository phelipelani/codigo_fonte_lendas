// Arquivo: src/features/cartolendas/routes/CartolendaPage.tsx
import { useState, useMemo, useCallback, memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/api';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Trophy, Users, Shield, ChevronRight, X, Check,
  BarChart3, Search, History, Plus, Lock, Globe,
  RefreshCw, UserPlus, Copy, Share2,
  TrendingUp, TrendingDown, Zap, Star, Calendar, Coins,
  ArrowLeft, Settings, RotateCcw
} from 'lucide-react';
import { useCampeonatos } from '@/api/campeonatoApi';
import { useRodadasDoCampeonato } from '@/features/rodadas/api/useCampeonatoRodadas';
import cartolendasIcon from '@/assets/icones/cartolendas.webp';
import PageTitle from '@/components/shared/PageTitle';
import AnimatedTabs, { type TabItem } from '@/components/shared/AnimatedTabs';

// Componentes extraídos
import { LendaCoin, Avatar, DivisaoBadge } from '../components/shared';
import { AbaEscalar } from '../components/abas/AbaEscalar';
import { AbaHistoricoCompleto } from '../components/abas/AbaHistoricoCompleto';
import { AbaRankingTecnicos } from '../components/abas/AbaRankingTecnicos';
import { EscalacaoTecnico } from '../components/ranking/EscalacaoTecnico';
import { PatrimonioCard } from '../components/ranking/PatrimonioCard';

// Eventos em tempo real + Admin
import { useCartolendaEvents } from '@/hooks/useCartolendaEvents';
import { ResetTemporadaModal } from '../components/admin/ResetTemporadaModal';
import { HistoricoTemporadas } from '../components/admin/HistoricoTemporadas';

// ── Modais ────────────────────────────────────────────────────
function ModalCriarLiga({ onClose, onCriada }: { onClose: () => void; onCriada: (liga: any) => void }) {
  const { data: campeonatos } = useCampeonatos();
  const [nome, setNome] = useState(''); const [descricao, setDescricao] = useState(''); const [campId, setCampId] = useState(''); const [maxM, setMaxM] = useState(20); const [loading, setLoading] = useState(false);
  const camps = useMemo(() => (campeonatos ?? []).filter((c: any) => ['em_andamento', 'fase_de_grupos', 'fase_de_pontos', 'mata_mata'].includes(c.fase_atual) || (c.status === 'em_andamento' && c.fase_atual !== 'finalizada')), [campeonatos]);
  const criar = async () => {
    if (!nome.trim() || !campId) { toast.error('Preencha nome e campeonato'); return; }
    setLoading(true);
    try { const { data } = await api.post('/cartolendas/ligas', { nome, descricao, tipo: 'privada', campeonato_id: parseInt(campId), max_membros: maxM }); toast.success('Liga criada!'); onCriada(data); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Erro'); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0d1f35] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10"><h2 className="font-black text-lg text-white">Criar Liga Privada</h2><button onClick={onClose} className="text-white/30 hover:text-white" aria-label="Fechar"><X size={20} /></button></div>
        <div className="p-5 space-y-4">
          <div><label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Nome *</label><input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Os Crias do Pelada" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-purple-500/50" /></div>
          <div><label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Campeonato *</label>
            <select value={campId} onChange={e => setCampId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50">
              <option value="">Selecione...</option>{camps.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            {camps.length === 0 && <p className="text-xs text-orange-400 mt-1">Nenhum campeonato em andamento.</p>}
          </div>
          <div><label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Descricao</label><textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2} placeholder="Opcional..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-purple-500/50 resize-none" /></div>
          <div><label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Max. membros</label><input type="number" min={2} max={50} value={maxM} onChange={e => setMaxM(parseInt(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50" /></div>
        </div>
        <div className="p-5 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-bold hover:bg-white/5 transition-all">Cancelar</button>
          <button onClick={criar} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50">{loading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}Criar</button>
        </div>
      </div>
    </div>
  );
}

function ModalEntrarLiga({ onClose, onEntrou }: { onClose: () => void; onEntrou: () => void }) {
  const [codigo, setCodigo] = useState(''); const [loading, setLoading] = useState(false);
  const entrar = async () => {
    if (!codigo.trim()) return; setLoading(true);
    try { const { data } = await api.post('/cartolendas/ligas/entrar', { codigo: codigo.trim() }); toast.success(data.message ?? 'Entrou!'); onEntrou(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Codigo invalido'); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0d1f35] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between"><h2 className="font-black text-lg text-white">Entrar com codigo</h2><button onClick={onClose} className="text-white/30 hover:text-white" aria-label="Fechar"><X size={20} /></button></div>
        <input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} placeholder="ABCD1234" maxLength={12} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-lg font-black text-white tracking-widest placeholder:text-white/25 focus:outline-none focus:border-purple-500/50" />
        <button onClick={entrar} disabled={loading || !codigo.trim()} className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50">{loading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}Entrar</button>
      </div>
    </div>
  );
}

// ── Card mini-resumo da liga ──────────────────────────────────
const LigaCard = memo(function LigaCard({ liga, onClick }: { liga: any; onClick: () => void }) {
  const { user } = useAuthStore();
  const isGlobal = liga.tipo === 'global';
  const membro = liga.membros?.find((m: any) => m.id === user?.id);
  const posicao = membro ? (liga.membros?.indexOf(membro) ?? -1) + 1 : null;
  const patrimonio = membro ? parseFloat(membro.lendas_coins ?? 100) : null;
  const pontos = membro ? parseFloat(membro.pontos_total ?? 0) : null;

  return (
    <button onClick={onClick} className={cn(
      'w-full rounded-2xl overflow-hidden border transition-all text-left group hover:scale-[1.01]',
      isGlobal
        ? 'bg-gradient-to-br from-cyan-900/30 to-blue-900/20 border-cyan-500/20 hover:border-cyan-500/40'
        : 'bg-gradient-to-br from-purple-900/20 to-indigo-900/15 border-purple-500/15 hover:border-purple-500/40'
    )}>
      {/* Topo colorido */}
      <div className={cn('h-1', isGlobal ? 'bg-gradient-to-r from-cyan-400 to-blue-500' : 'bg-gradient-to-r from-purple-400 to-indigo-500')} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
              isGlobal ? 'bg-cyan-500/15 border border-cyan-500/20' : 'bg-purple-500/15 border border-purple-500/20'
            )}>
              {isGlobal ? <Globe size={20} className="text-cyan-400" /> : <Lock size={18} className="text-purple-400" />}
            </div>
            <div className="min-w-0">
              <p className="font-black text-white text-sm truncate">{liga.nome}</p>
              <p className="text-[10px] text-white/35">{liga.campeonato_nome}</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors shrink-0 mt-1" />
        </div>

        {/* Stats mini */}
        {membro ? (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-black/20 rounded-xl p-2 text-center">
              <p className="font-black text-white text-sm">{posicao ? `${posicao}°` : '-'}</p>
              <p className="text-[8px] text-white/30 uppercase font-bold">Posicao</p>
            </div>
            <div className="bg-black/20 rounded-xl p-2 text-center">
              <p className="font-black text-purple-400 text-sm">{pontos?.toFixed(1) ?? '0'}</p>
              <p className="text-[8px] text-white/30 uppercase font-bold">Pontos</p>
            </div>
            <div className="bg-black/20 rounded-xl p-2 text-center">
              <div className="flex items-center justify-center gap-0.5">
                <p className="font-black text-yellow-400 text-sm">{patrimonio?.toFixed(0) ?? '100'}</p>
                <LendaCoin size={10} />
              </div>
              <p className="text-[8px] text-white/30 uppercase font-bold">Saldo</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40"><Users size={12} className="inline mr-1" />{liga.total_membros} membros</span>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', isGlobal ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400')}>
              {liga.sou_membro ? 'Participando' : 'Ver'}
            </span>
          </div>
        )}
      </div>
    </button>
  );
});

// ── Constantes de abas (fora do componente para evitar re-criação) ──
const ABAS_LIGA: TabItem[] = [
  { id: 'escalar', label: 'Escalação', icon: <Shield size={14} /> },
  { id: 'historico', label: 'Histórico', icon: <History size={14} /> },
  { id: 'ranking', label: 'Ranking', icon: <Trophy size={14} /> },
];

// ── Detalhe da liga ───────────────────────────────────────────
function DetalheLiga({ ligaId, onVoltar }: { ligaId: number; onVoltar: () => void }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [abaLiga, setAbaLiga] = useState<'escalar' | 'historico' | 'ranking'>('escalar');
  const [showInvite, setShowInvite] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [buscaMembro, setBuscaMembro] = useState('');
  const [addingUser, setAddingUser] = useState<number | null>(null);
  const [verEscalacao, setVerEscalacao] = useState<{ userId: number; rodadaId: number } | null>(null);

  const { data: usuariosDisp } = useQuery({
    queryKey: ['cartolendas', 'usuarios-disponiveis', ligaId],
    queryFn: async () => (await api.get(`/cartolendas/usuarios-disponiveis/${ligaId}`)).data as any[],
    enabled: showAddMember,
  });
  const adicionarMembro = useCallback(async (userId: number) => {
    setAddingUser(userId);
    try {
      const { data } = await api.post(`/cartolendas/ligas/${ligaId}/adicionar-membro`, { usuario_id: userId });
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ['cartolendas', 'liga', ligaId] });
      qc.invalidateQueries({ queryKey: ['cartolendas', 'usuarios-disponiveis', ligaId] });
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Erro'); }
    finally { setAddingUser(null); }
  }, [ligaId, qc]);
  const usuariosFiltrados = useMemo(() => {
    if (!usuariosDisp) return [];
    if (!buscaMembro) return usuariosDisp;
    const b = buscaMembro.toLowerCase();
    return usuariosDisp.filter((u: any) => (u.jogador_nome ?? u.username)?.toLowerCase().includes(b));
  }, [usuariosDisp, buscaMembro]);

  const { data: liga, isLoading } = useQuery({ queryKey: ['cartolendas', 'liga', ligaId], queryFn: async () => (await api.get(`/cartolendas/ligas/${ligaId}`)).data });
  const copiarCodigo = useCallback(() => { if (liga?.codigo_convite) { navigator.clipboard.writeText(liga.codigo_convite); toast.success('Codigo copiado!'); } }, [liga?.codigo_convite]);
  const compartilharConvite = useCallback(async () => {
    if (!liga?.codigo_convite) return;
    const texto = `Entra na minha liga "${liga.nome}" no Cartolendas!\n\nCodigo: ${liga.codigo_convite}\n\nAcesse o Futlendas e entre com esse codigo!`;
    if (navigator.share) {
      try { await navigator.share({ title: `Convite Cartolendas - ${liga.nome}`, text: texto }); }
      catch { navigator.clipboard.writeText(texto); toast.success('Convite copiado!'); }
    } else { navigator.clipboard.writeText(texto); toast.success('Convite copiado para a area de transferencia!'); }
  }, [liga?.codigo_convite, liga?.nome]);
  const sairLiga = useCallback(async () => { try { await api.delete(`/cartolendas/ligas/${ligaId}/sair`); toast.success('Saiu da liga'); qc.invalidateQueries({ queryKey: ['cartolendas', 'ligas'] }); onVoltar(); } catch { toast.error('Erro ao sair'); } }, [ligaId, qc, onVoltar]);
  const handleVerEscalacao = useCallback((userId: number, rodadaId: number) => setVerEscalacao({ userId, rodadaId }), []);

  if (isLoading) return <div className="text-center py-20 text-white/30">Carregando...</div>;
  if (!liga) return null;

  const isLigaAdmin = liga.criador_id === user?.id || user?.role === 'admin';

  // Se estiver vendo escalação de outro técnico
  if (verEscalacao) {
    return (
      <div className="space-y-5">
        <EscalacaoTecnico rodadaId={verEscalacao.rodadaId} userId={verEscalacao.userId} onVoltar={() => setVerEscalacao(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header da liga */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={onVoltar} className="text-xs text-white/30 hover:text-white mb-2 flex items-center gap-1 transition-colors">
            <ArrowLeft size={12} /> Voltar ao Dashboard
          </button>
          <h2 className="font-black text-2xl text-white">{liga.nome}</h2>
          <p className="text-sm text-white/40">{liga.campeonato_nome} · {liga.total_membros}/{liga.max_membros} membros</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {isLigaAdmin && (
            <button onClick={() => { setShowAddMember(!showAddMember); setShowInvite(false); }} className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 rounded-xl px-3 py-2 text-xs font-bold text-cyan-400 transition-all">
              <Plus size={14} /> Adicionar
            </button>
          )}
          {isLigaAdmin && liga.codigo_convite && (
            <button onClick={() => { setShowInvite(!showInvite); setShowAddMember(false); }} className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 rounded-xl px-3 py-2 text-xs font-bold text-green-400 transition-all">
              <UserPlus size={14} /> Convidar
            </button>
          )}
          <button onClick={sairLiga} className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl px-3 py-2 text-xs font-bold text-red-400 transition-all">Sair</button>
        </div>
      </div>

      {/* Painel de convite */}
      {showInvite && liga.codigo_convite && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1"><UserPlus size={16} className="text-green-400" /><p className="font-bold text-sm text-white">Convidar participantes</p></div>
          <div className="flex-1 bg-black/20 border border-green-500/20 rounded-xl px-4 py-3 text-center">
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Codigo da Liga</p>
            <p className="font-black text-2xl text-green-400 tracking-[0.3em]">{liga.codigo_convite}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={copiarCodigo} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-green-500/40 text-sm font-bold text-white/70 transition-all"><Copy size={14} /> Copiar</button>
            <button onClick={compartilharConvite} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-sm font-bold text-white transition-all shadow-lg shadow-green-900/30"><Share2 size={14} /> Compartilhar</button>
          </div>
        </div>
      )}

      {/* Painel Adicionar Membros */}
      {showAddMember && isLigaAdmin && (
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Plus size={16} className="text-cyan-400" /><p className="font-bold text-sm text-white">Adicionar membros</p></div>
            <button onClick={() => setShowAddMember(false)} className="text-white/30 hover:text-white"><X size={16} /></button>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" placeholder="Buscar jogador..." value={buscaMembro} onChange={e => setBuscaMembro(e.target.value)} className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div className="overflow-y-auto max-h-[250px] space-y-1">
            {usuariosFiltrados.map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/8 bg-white/3 hover:border-cyan-500/30 transition-all">
                <Avatar src={u.foto_url ?? u.avatar_url} nome={u.jogador_nome ?? u.username} size={7} />
                <div className="flex-1 min-w-0"><p className="text-xs font-bold text-white truncate">{u.jogador_nome ?? u.username}</p></div>
                <button onClick={() => adicionarMembro(u.id)} disabled={addingUser === u.id} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold transition-all disabled:opacity-50">
                  {addingUser === u.id ? <RefreshCw size={11} className="animate-spin" /> : <Plus size={11} />} Adicionar
                </button>
              </div>
            ))}
            {usuariosFiltrados.length === 0 && <p className="text-center text-xs text-white/25 py-4">Nenhum jogador disponivel</p>}
          </div>
        </div>
      )}

      {/* Patrimonio Card */}
      <PatrimonioCard />

      {/* ══════ ABAS PRINCIPAIS ══════ */}
      <AnimatedTabs
        tabs={ABAS_LIGA}
        activeTab={abaLiga}
        onTabChange={(id) => setAbaLiga(id as 'escalar' | 'historico' | 'ranking')}
        variant="pills"
      >
        {abaLiga === 'escalar' && <AbaEscalar campeonatoId={liga.campeonato_id} />}
        {abaLiga === 'historico' && <AbaHistoricoCompleto campeonatoId={liga.campeonato_id} />}
        {abaLiga === 'ranking' && (
          <AbaRankingTecnicos
            campeonatoId={liga.campeonato_id}
            membros={liga.membros ?? []}
            onVerEscalacao={handleVerEscalacao}
          />
        )}
      </AnimatedTabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGINA PRINCIPAL — DASHBOARD
// ═══════════════════════════════════════════════════════════════
export function CartolendaPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [ligaSelecionada, setLigaSelecionada] = useState<number | null>(null);
  const [modalCriar, setModalCriar] = useState(false);
  const [modalEntrar, setModalEntrar] = useState(false);
  const [modalReset, setModalReset] = useState(false);
  const [viewTemporadas, setViewTemporadas] = useState(false);
  const [abaMain, setAbaMain] = useState<'minhas' | 'todas'>('minhas');
  const isAdmin = user?.role === 'admin';

  // Polling de eventos em tempo real (10s)
  useCartolendaEvents();

  const handleSelectLiga = useCallback((id: number) => setLigaSelecionada(id), []);
  const handleCriada = useCallback((liga: any) => { setModalCriar(false); qc.invalidateQueries({ queryKey: ['cartolendas', 'ligas'] }); setLigaSelecionada(liga.id); }, [qc]);
  const handleEntrou = useCallback(() => { setModalEntrar(false); qc.invalidateQueries({ queryKey: ['cartolendas', 'ligas'] }); }, [qc]);
  const handleCloseCriar = useCallback(() => setModalCriar(false), []);
  const handleCloseEntrar = useCallback(() => setModalEntrar(false), []);
  const handleCloseReset = useCallback(() => setModalReset(false), []);
  const handleVoltarLiga = useCallback(() => setLigaSelecionada(null), []);
  const handleCloseTemporadas = useCallback(() => setViewTemporadas(false), []);

  const { data: ligas, isLoading } = useQuery({ queryKey: ['cartolendas', 'ligas'], queryFn: async () => (await api.get('/cartolendas/ligas')).data as any[] });
  const { data: ranking } = useQuery({ queryKey: ['cartolendas', 'ranking'], queryFn: async () => (await api.get('/cartolendas/ranking')).data as any[] });
  const { data: statsGlobal } = useQuery({
    queryKey: ['cartolendas', 'stats', 'rodada'],
    queryFn: async () => (await api.get('/cartolendas/stats/rodada')).data,
    staleTime: 60_000,
  });

  const meuRanking = useMemo(() => ranking?.find((r: any) => r.usuario_id === user?.id), [ranking, user?.id]);
  const minhasLigas = useMemo(() => (ligas ?? []).filter((l: any) => l.sou_membro), [ligas]);
  const todasLigas = useMemo(() => ligas ?? [], [ligas]);

  // Verifica se há rodada aberta em qualquer liga
  const temRodadaAberta = minhasLigas.length > 0; // simplificado — o botão escalar leva para a liga

  // Craque e garfado da rodada
  const craque = statsGlobal?.melhores_jogadores?.[0] ?? null;
  const garfado = statsGlobal?.piores_jogadores?.[0] ?? null;

  if (ligaSelecionada) return (
    <div className="container-main section-padding pt-0 pb-20">
      <DetalheLiga ligaId={ligaSelecionada} onVoltar={handleVoltarLiga} />
    </div>
  );

  if (viewTemporadas) return (
    <div className="container-main section-padding pt-0 pb-20">
      <HistoricoTemporadas onClose={handleCloseTemporadas} />
    </div>
  );

  return (
    <div className="container-main section-padding pt-0 pb-20">
      {/* ══════ HEADER ══════ */}
      <PageTitle
        icon={cartolendasIcon}
        title="Cartolendas"
        subtitle="Monte seu time, escale, transfira e dispute com os amigos"
      >
        {meuRanking && (
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 shrink-0">
            <div className="text-right">
              <div className="flex items-center gap-1">
                <p className="font-black text-xl text-yellow-400">{parseFloat(meuRanking.lendas_coins ?? 100).toFixed(1)}</p>
                <LendaCoin size={16} />
              </div>
              <p className="text-[10px] text-white/30">Lendas Coins</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <DivisaoBadge divisao={meuRanking.divisao ?? 'Bronze'} />
              <p className="text-[10px] text-white/30 mt-1">{parseFloat(meuRanking.pontos_total ?? 0).toFixed(1)} pts</p>
            </div>
          </div>
        )}
      </PageTitle>

      {/* ══════ AÇÕES ══════ */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={() => setModalCriar(true)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-bold text-white transition-all shadow-lg shadow-purple-900/30">
          <Plus size={15} /> Criar Liga
        </button>
        <button onClick={() => setModalEntrar(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/15 hover:border-purple-500/40 rounded-xl text-sm font-bold text-white/70 transition-all">
          <Lock size={15} /> Entrar com codigo
        </button>
        <button onClick={() => setViewTemporadas(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/15 hover:border-yellow-500/40 rounded-xl text-sm font-bold text-white/70 transition-all">
          <Calendar size={15} /> Temporadas
        </button>
        {isAdmin && (
          <>
            <button
              onClick={async () => {
                if (!confirm('Recalcular todos os pontos, preços e patrimônio do Cartolendas? Isso pode demorar alguns segundos.')) return;
                try {
                  const { data } = await api.post('/cartolendas/recalcular');
                  toast.success('Recálculo completo!');
                  qc.invalidateQueries({ queryKey: ['cartolendas'] });
                  console.log('Recálculo log:', data.log);
                } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Erro no recálculo'); }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-900/30 border border-orange-500/20 hover:border-orange-500/40 rounded-xl text-sm font-bold text-orange-400 transition-all"
            >
              <RefreshCw size={15} /> Recalcular
            </button>
            <button onClick={() => setModalReset(true)} className="flex items-center gap-2 px-4 py-2.5 bg-red-900/30 border border-red-500/20 hover:border-red-500/40 rounded-xl text-sm font-bold text-red-400 transition-all ml-auto">
              <RotateCcw size={15} /> Reset Temporada
            </button>
          </>
        )}
      </div>

      {/* ══════ DESTAQUES DA RODADA (Craque + Garfado) ══════ */}
      {(craque || garfado) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {craque && (
            <div className="rounded-2xl overflow-hidden border border-emerald-500/20">
              <div className="h-1 bg-gradient-to-r from-emerald-400 to-green-500" />
              <div className="bg-gradient-to-br from-emerald-900/25 to-emerald-950/40 p-4 flex items-center gap-3">
                <div className="relative">
                  <Avatar src={craque.foto_url ?? craque.avatar_url} nome={craque.nome} size={12} className="border-2 border-emerald-500/30" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Star size={12} className="text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-emerald-400 font-bold uppercase">Craque da Rodada</p>
                  <p className="font-black text-white text-sm truncate">{craque.nome}</p>
                  <p className="text-[10px] text-white/30 capitalize">{craque.posicao}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-2xl text-emerald-400">{parseFloat(craque.pontos).toFixed(1)}</p>
                  <p className="text-[9px] text-emerald-300/50 font-bold">pts</p>
                </div>
              </div>
            </div>
          )}
          {garfado && (
            <div className="rounded-2xl overflow-hidden border border-red-500/20">
              <div className="h-1 bg-gradient-to-r from-red-400 to-red-600" />
              <div className="bg-gradient-to-br from-red-900/25 to-red-950/40 p-4 flex items-center gap-3">
                <div className="relative">
                  <Avatar src={garfado.foto_url ?? garfado.avatar_url} nome={garfado.nome} size={12} className="border-2 border-red-500/30" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <TrendingDown size={12} className="text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-red-400 font-bold uppercase">Garfado da Rodada</p>
                  <p className="font-black text-white text-sm truncate">{garfado.nome}</p>
                  <p className="text-[10px] text-white/30 capitalize">{garfado.posicao}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-2xl text-red-400">{parseFloat(garfado.pontos).toFixed(1)}</p>
                  <p className="text-[9px] text-red-300/50 font-bold">pts</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════ BOTÃO ESCALAR ══════ */}
      {minhasLigas.length > 0 ? (
        <div className="mb-6 rounded-2xl overflow-hidden border border-emerald-500/20 bg-gradient-to-r from-emerald-900/20 to-emerald-950/30">
          <div className="h-1 bg-gradient-to-r from-emerald-400 to-green-500" />
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Shield size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Escalar time</p>
                <p className="text-[10px] text-white/35">Selecione uma liga para escalar</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {minhasLigas.slice(0, 3).map((l: any) => (
                <button
                  key={l.id}
                  onClick={() => handleSelectLiga(l.id)}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-all"
                >
                  {l.nome?.length > 15 ? l.nome.slice(0, 15) + '...' : l.nome}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] p-6 text-center">
          <Calendar size={28} className="mx-auto mb-2 text-white/20" />
          <p className="text-white/40 font-bold text-sm">Nenhuma liga encontrada</p>
          <p className="text-white/25 text-xs mt-1">Crie uma liga ou entre com um codigo de convite</p>
        </div>
      )}

      {/* ══════ TABS: MINHAS LIGAS / TODAS ══════ */}
      <AnimatedTabs
        tabs={[
          { id: 'minhas', label: 'Minhas Ligas', icon: <Trophy size={14} /> },
          { id: 'todas', label: 'Todas', icon: <Globe size={14} /> },
        ]}
        activeTab={abaMain}
        onTabChange={(id) => setAbaMain(id as 'minhas' | 'todas')}
        variant="pills"
      >
        {isLoading ? (
          <div className="text-center py-12 text-white/30 text-sm">Carregando ligas...</div>
        ) : abaMain === 'minhas' ? (
          minhasLigas.length === 0 ? (
            <div className="text-center py-12 bg-white/[0.03] border border-dashed border-white/10 rounded-2xl">
              <Users size={32} className="mx-auto mb-3 text-white/20" />
              <p className="text-white/40 font-semibold mb-1">Voce nao esta em nenhuma liga</p>
              <p className="text-white/20 text-sm">Crie uma ou entre com o codigo de um amigo</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {minhasLigas.map((l: any) => (
                <LigaCard key={l.id} liga={l} onClick={() => handleSelectLiga(l.id)} />
              ))}
            </div>
          )
        ) : (
          todasLigas.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">Nenhuma liga encontrada</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {todasLigas.map((l: any) => (
                <LigaCard key={l.id} liga={l} onClick={() => handleSelectLiga(l.id)} />
              ))}
            </div>
          )
        )}
      </AnimatedTabs>

      {/* Modais */}
      {modalCriar && <ModalCriarLiga onClose={handleCloseCriar} onCriada={handleCriada} />}
      {modalEntrar && <ModalEntrarLiga onClose={handleCloseEntrar} onEntrou={handleEntrou} />}
      {modalReset && <ResetTemporadaModal onClose={handleCloseReset} />}
    </div>
  );
}
