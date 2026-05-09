// ============================================================================
// ARQUIVO: src/features/Campeonatos/routes/CampeonatoDetailPage.tsx
// Página de detalhe - Interfaces separadas: Liga vs Copa
// ============================================================================

import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCampeonato, useTimesDoCampeonato, useDeleteCampeonato } from '@/api/campeonatoApi';
import { useRodadasDoCampeonato, useDeleteRodadaCampeonato, useUpdateRodadaCampeonato } from '@/features/rodadas/api/useCampeonatoRodadas';
import { useAllTimes } from '@/api/timeApi';
import api from '@/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/AlertDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { ArrowLeft, Trophy, Calendar, BarChart3, Users, Plus, AlertTriangle, Play, History as HistoryIcon, Trash2, Flag, MoreVertical, Edit2, Camera, Filter, Swords, Shuffle, Crown, UserPlus, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn, formatDate } from '@/lib/utils';
import { useState, useMemo, useCallback, memo } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { CampeonatoRodadaCreateModal } from '../components/CampeonatoRodadaCreateModal';
import { StatsTab } from '../components/StatsTab';
import { RivalidadesTab } from '../components/RivalidadesTab';
import { CampeonatoFinalizarModal } from '../components/CampeonatoFinalizarModal';
import { FaseGruposPartidas } from '../components/FaseGruposPartidas';
import { useJogadores } from '@/features/jogadores/api/useJogadores';
import AnimatedTabs, { type TabItem } from '@/components/shared/AnimatedTabs';

// ============================================================================
// HELPERS
// ============================================================================

// Detecta se é Copa (qualquer formato com fase de grupos + mata-mata)
function ehCopa(formato: string | undefined): boolean {
  if (!formato) return false;
  return formato.startsWith('copa_') || formato === 'grupos' || formato === 'mata-mata' || formato === 'mata_mata';
}

// Detecta se é Liga (pontos corridos)
function ehLiga(formato: string | undefined): boolean {
  if (!formato) return true;
  return formato === 'liga' || formato === 'pontos_corridos';
}

// ============================================================================
// COMPONENTE: TABELA DE CLASSIFICAÇÃO
// ============================================================================

const TabelaClassificacao = memo(({ campeonatoId, showFilter = true }: { campeonatoId: number; showFilter?: boolean }) => {
  const [rodadaFiltro, setRodadaFiltro] = useState<string>("all");
  const { data: rodadas } = useRodadasDoCampeonato(campeonatoId);
  const { data: tabela, isLoading } = useQuery({
    queryKey: ['campeonato', campeonatoId, 'classificacao', rodadaFiltro],
    queryFn: async () => {
      const params: any = {};
      if (rodadaFiltro !== "all") params.rodada = rodadaFiltro;
      return (await api.get(`/campeonatos/${campeonatoId}/classificacao`, { params })).data;
    }
  });

  const rodadasOrdenadas = useMemo(
    () => rodadas ? [...rodadas].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()) : [],
    [rodadas]
  );

  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />;

  return (
    <div className="space-y-4">
      {showFilter && rodadasOrdenadas.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <Filter size={16} className="text-textMuted" />
          <Select value={rodadaFiltro} onValueChange={setRodadaFiltro}>
            <SelectTrigger className="w-[200px] h-8 text-xs bg-surface border-border"><SelectValue placeholder="Filtrar" /></SelectTrigger>
            <SelectContent className="max-h-[15rem]">
              <SelectItem value="all">Classificação Atual</SelectItem>
              {rodadasOrdenadas.map((r, idx) => (<SelectItem key={r.id} value={String(r.id)}>Rodada {idx + 1}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}
      {!tabela || tabela.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-textMuted bg-surface/50 rounded-lg border border-border">
          <AlertTriangle className="h-10 w-10 mb-2 opacity-50" /><p>Classificação indisponível.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm text-left">
            <thead className="bg-surfaceElevated text-textMuted uppercase text-xs font-semibold">
              <tr>
                <th className="px-4 py-3 text-center">#</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3 text-center font-bold text-textPrimary">P</th>
                <th className="px-4 py-3 text-center hidden sm:table-cell">J</th>
                <th className="px-4 py-3 text-center hidden sm:table-cell">V</th>
                <th className="px-4 py-3 text-center hidden sm:table-cell">E</th>
                <th className="px-4 py-3 text-center hidden sm:table-cell">D</th>
                <th className="px-4 py-3 text-center">SG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderLight">
              {tabela.map((item: any, index: number) => (
                <tr key={item.time_id || item.id} className={cn("hover:bg-surfaceHover", index < 4 && "bg-accent-blue-transparent/5")}>
                  <td className="px-4 py-3 text-center font-medium text-textMuted">{item.posicao}º</td>
                  <td className="px-4 py-3 font-semibold text-textPrimary flex items-center gap-2">
                    {item.logo_url ? <img src={item.logo_url} alt="" className="w-6 h-6 object-contain" /> : <div className="w-6 h-6 rounded-full bg-accentPrimary/20 flex items-center justify-center text-xs text-accentPrimary">{item.nome?.substring(0,2)}</div>}
                    <span className="truncate max-w-[120px] sm:max-w-none">{item.nome}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-accentPrimary text-base">{item.pontos}</td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">{item.jogos}</td>
                  <td className="px-4 py-3 text-center text-green-400 hidden sm:table-cell">{item.vitorias}</td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">{item.empates}</td>
                  <td className="px-4 py-3 text-center text-red-400 hidden sm:table-cell">{item.derrotas}</td>
                  <td className="px-4 py-3 text-center font-medium">{item.saldo_gols}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// COMPONENTE: LISTA DE RODADAS (LIGA)
// ============================================================================

const RodadasList = memo(({ campeonatoId, isFinalizado }: { campeonatoId: number; isFinalizado: boolean }) => {
  const { isAdmin } = useAuth();
  const { data: rodadas, isLoading } = useRodadasDoCampeonato(campeonatoId);
  const deleteMutation = useDeleteRodadaCampeonato();
  const updateMutation = useUpdateRodadaCampeonato();
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingRodada, setEditingRodada] = useState<{ id: number; data: string } | null>(null);
  const [deleteRodadaId, setDeleteRodadaId] = useState<number | null>(null);
  const navigate = useNavigate();

  // useMemo DEVE ficar antes de qualquer return condicional (Rules of Hooks)
  const rodadasOrdenadas = useMemo(
    () => rodadas ? [...rodadas].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()) : [],
    [rodadas]
  );

  if (isLoading) return <Skeleton className="h-40 w-full rounded-lg" />;
  if (!rodadas || rodadas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-surface rounded-lg border border-border border-dashed">
        <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-textMuted mb-3 sm:mb-4 opacity-30" />
        <p className="text-textSecondary font-medium text-base sm:text-lg">Nenhuma rodada criada</p>
        {!isFinalizado && isAdmin && (<><p className="text-sm text-textMuted mb-4 sm:mb-6">Crie a primeira rodada.</p><Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> Criar Rodada</Button><CampeonatoRodadaCreateModal campeonatoId={campeonatoId} isOpen={isCreateOpen} onClose={() => setCreateOpen(false)} /></>)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base sm:text-lg font-bold text-textPrimary">Rodadas</h3>
        {!isFinalizado && isAdmin && <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Nova </span>Rodada</Button>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {rodadasOrdenadas.map((rodada, index) => {
          const isRodadaFinalizada = rodada.status === 'finalizada';
          return (
            <Card key={rodada.id} className={cn("p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4", isRodadaFinalizada ? "border-l-accentSecondary bg-surface/50" : "border-l-accentPrimary bg-surface")}>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center font-bold text-lg sm:text-xl flex-shrink-0", isRodadaFinalizada ? "bg-surfaceElevated text-accentSecondary" : "bg-surfaceElevated text-accentPrimary")}>{index + 1}</div>
                <div className="min-w-0">
                  <h4 className="font-bold text-textPrimary text-base sm:text-lg">Rodada {index + 1}</h4>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-textMuted"><Calendar size={14} className="flex-shrink-0" /><span className="truncate">{formatDate(rodada.data)}</span>{isRodadaFinalizada && <span className="text-[10px] font-bold text-success ml-1 sm:ml-2 flex-shrink-0">FINALIZADA</span>}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 ml-13 sm:ml-0">
                {isRodadaFinalizada ? (
                  <Button variant="outline" size="sm" className="border-accentSecondary text-accentSecondary text-xs sm:text-sm flex-1 sm:flex-none" onClick={() => navigate(`/campeonatos/${campeonatoId}/rodadas/${rodada.id}/historico`)}><HistoryIcon size={14} className="mr-1 sm:mr-2" /> <span className="hidden sm:inline">Ver </span>Hist.</Button>
                ) : isAdmin ? (
                  <Button size="sm" disabled={isFinalizado} className="bg-accentPrimary text-white text-xs sm:text-sm flex-1 sm:flex-none" onClick={() => navigate(`/campeonatos/${campeonatoId}/rodadas/${rodada.id}`)}><Play size={14} className="mr-1 sm:mr-2" /> <span className="hidden sm:inline">Check-in / </span>Jogar</Button>
                ) : null}
                {!isFinalizado && isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"><MoreVertical size={16} /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-surfaceElevated border-border">
                      <DropdownMenuItem onClick={() => setEditingRodada({ id: rodada.id, data: rodada.data.split('T')[0] })}><Edit2 className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteRodadaId(rodada.id)} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" /> Deletar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <CampeonatoRodadaCreateModal campeonatoId={campeonatoId} isOpen={isCreateOpen} onClose={() => setCreateOpen(false)} />
      <AlertDialog open={!!deleteRodadaId} onOpenChange={() => setDeleteRodadaId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir Rodada?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { deleteMutation.mutate(deleteRodadaId!); setDeleteRodadaId(null); }} className="bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <Dialog open={!!editingRodada} onOpenChange={() => setEditingRodada(null)}>
        <DialogContent className="bg-surface border-border"><DialogHeader><DialogTitle>Editar Data</DialogTitle></DialogHeader><Input type="date" value={editingRodada?.data || ''} onChange={(e) => setEditingRodada(prev => prev ? { ...prev, data: e.target.value } : null)} className="my-4" /><DialogFooter><Button variant="outline" onClick={() => setEditingRodada(null)}>Cancelar</Button><Button onClick={() => { updateMutation.mutate({ rodadaId: editingRodada!.id, data: { data: editingRodada!.data } }); setEditingRodada(null); }}>Salvar</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
});

// ============================================================================
// COMPONENTE: INSCRIÇÃO (LIGA - TIMES FIXOS)
// ============================================================================

const InscricaoSection = memo(({ campeonatoId }: { campeonatoId: number }) => {
  const queryClient = useQueryClient();
  const { data: timesInscritos } = useTimesDoCampeonato(campeonatoId);
  const { data: todosTimes } = useAllTimes();
  const [selectedTimeId, setSelectedTimeId] = useState<string>('');
  const addTimeMutation = useMutation({
    mutationFn: async (timeId: number) => { await api.post(`/campeonatos/${campeonatoId}/times`, { time_id: timeId }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campeonatos', campeonatoId, 'times'] }); toast.success('Time inscrito!'); setSelectedTimeId(''); },
  });
  const timesDisponiveis = useMemo(
    () => todosTimes?.filter(t => !timesInscritos?.some(ti => ti.id === t.id)),
    [todosTimes, timesInscritos]
  );

  return (
    <Card className="p-4 sm:p-6 border-accentPrimary/30 bg-surface/50">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-bold flex items-center gap-2"><Users className="text-accentPrimary" size={20} />Times Inscritos</h3>
        <span className="badge badge-primary text-sm">{timesInscritos?.length || 0}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        {timesInscritos?.map(time => (
          <div key={time.id} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-surface border border-border">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surfaceElevated flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0">
              {time.logo_url ? <img src={time.logo_url} className="w-full h-full object-cover" alt="" /> : time.nome.substring(0,2)}
            </div>
            <span className="text-xs sm:text-sm font-medium truncate">{time.nome}</span>
          </div>
        ))}
        {(!timesInscritos || timesInscritos.length === 0) && <p className="col-span-full text-center text-textMuted py-4 text-sm">Nenhum time inscrito.</p>}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end border-t border-borderLight pt-3 sm:pt-4">
        <div className="w-full sm:w-1/2">
          <Select value={selectedTimeId} onValueChange={setSelectedTimeId}>
            <SelectTrigger className="input bg-surfaceElevated"><SelectValue placeholder="Selecione um time..." /></SelectTrigger>
            <SelectContent>{timesDisponiveis?.map(time => (<SelectItem key={time.id} value={String(time.id)}>{time.nome}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <Button onClick={() => addTimeMutation.mutate(Number(selectedTimeId))} disabled={!selectedTimeId} className="w-full sm:w-auto"><Plus size={16} className="mr-2" /> Inscrever</Button>
      </div>
    </Card>
  );
});

// ============================================================================
// COMPONENTE: GERENCIAMENTO DE ELENCO (mid-season)
// ============================================================================

const ElencoManagement = memo(({ campeonatoId }: { campeonatoId: number }) => {
  const queryClient = useQueryClient();
  const { data: todosJogadores } = useJogadores();
  const { data: elenco, isLoading } = useQuery({
    queryKey: ['campeonatos', campeonatoId, 'elenco'],
    queryFn: async () => (await api.get(`/campeonatos/${campeonatoId}/elenco`)).data as any[],
  });
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);
  const [addingToTeam, setAddingToTeam] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<{ elencoId: number; nome: string } | null>(null);

  const addMutation = useMutation({
    mutationFn: async ({ timeId, jogadorId }: { timeId: number; jogadorId: number }) => {
      await api.post(`/campeonatos/${campeonatoId}/elenco/adicionar`, { time_id: timeId, jogador_id: jogadorId });
    },
    onSuccess: (_d, _v) => {
      queryClient.invalidateQueries({ queryKey: ['campeonatos', campeonatoId, 'elenco'] });
      toast.success('Jogador adicionado ao elenco!');
      setAddingToTeam(null);
      setBusca('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao adicionar'),
  });

  const removeMutation = useMutation({
    mutationFn: async (elencoId: number) => {
      await api.delete(`/campeonatos/${campeonatoId}/elenco/${elencoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campeonatos', campeonatoId, 'elenco'] });
      toast.success('Jogador removido do elenco');
      setConfirmRemove(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao remover'),
  });

  // IDs de jogadores já no elenco do time que estamos adicionando
  const idsNoElencoDoTime = useMemo(() => {
    if (!addingToTeam || !elenco) return new Set<number>();
    const time = elenco.find((t: any) => t.time_id === addingToTeam);
    return new Set((time?.jogadores ?? []).map((j: any) => j.id));
  }, [addingToTeam, elenco]);

  const jogadoresFiltrados = useMemo(() => {
    if (!todosJogadores || !addingToTeam) return [];
    return todosJogadores.filter((j: any) => {
      if (idsNoElencoDoTime.has(j.id)) return false;
      if (busca && !j.nome?.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    }).slice(0, 20);
  }, [todosJogadores, addingToTeam, idsNoElencoDoTime, busca]);

  if (isLoading) return <Skeleton className="h-40 w-full rounded-lg" />;

  return (
    <Card className="p-4 sm:p-6 border-accentPrimary/30 bg-surface/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
          <Users className="text-accentPrimary" size={20} /> Elencos do Campeonato
        </h3>
        <span className="text-xs text-textMuted">Adicione/remova jogadores mid-season</span>
      </div>

      <div className="space-y-3">
        {(elenco ?? []).map((time: any) => (
          <div key={time.time_id} className="border border-border rounded-lg overflow-hidden bg-surface">
            <button
              onClick={() => setExpandedTeam(expandedTeam === time.time_id ? null : time.time_id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-surfaceHover transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-surfaceElevated flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                {time.time_logo ? <img src={time.time_logo} className="w-full h-full object-cover" alt="" /> : time.time_nome?.substring(0, 2)}
              </div>
              <span className="font-bold text-sm flex-1">{time.time_nome}</span>
              <span className="text-xs text-textMuted">{time.jogadores?.length ?? 0} jogadores</span>
              {expandedTeam === time.time_id ? <ChevronUp size={16} className="text-textMuted" /> : <ChevronDown size={16} className="text-textMuted" />}
            </button>

            {expandedTeam === time.time_id && (
              <div className="border-t border-border p-3 space-y-2">
                {(time.jogadores ?? []).map((j: any) => (
                  <div key={j.id} className="flex items-center gap-2 p-2 rounded-lg bg-surfaceElevated/50">
                    <div className="w-7 h-7 rounded-full bg-surfaceElevated flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0">
                      {j.foto_url || j.avatar_url ? <img src={j.foto_url ?? j.avatar_url} className="w-full h-full object-cover" alt="" /> : j.nome?.substring(0, 2)}
                    </div>
                    <span className="text-xs font-medium flex-1">{j.nome}</span>
                    <span className="text-[10px] text-textMuted capitalize">{j.posicao}</span>
                    <span className="text-[10px] text-textMuted">Nv.{j.nivel}</span>
                    {j.is_capitao && <Crown size={12} className="text-yellow-500" />}
                    <button
                      onClick={() => setConfirmRemove({ elencoId: j.elenco_id, nome: j.nome })}
                      className="text-textMuted hover:text-red-500 transition-colors ml-1"
                      title="Remover do elenco"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {addingToTeam === time.time_id ? (
                  <div className="mt-2 space-y-2 border-t border-border pt-2">
                    <div className="relative">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                      <input
                        type="text"
                        placeholder="Buscar jogador..."
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-surfaceElevated border border-border rounded-lg text-xs focus:outline-none focus:border-accentPrimary"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {jogadoresFiltrados.map((j: any) => (
                        <button
                          key={j.id}
                          onClick={() => addMutation.mutate({ timeId: time.time_id, jogadorId: j.id })}
                          className="w-full flex items-center gap-2 p-2 rounded-lg bg-surfaceElevated hover:bg-accentPrimary/10 transition-colors text-left"
                          disabled={addMutation.isPending}
                        >
                          <div className="w-6 h-6 rounded-full bg-surfaceElevated flex items-center justify-center text-[9px] font-bold overflow-hidden shrink-0">
                            {j.foto_url ? <img src={j.foto_url} className="w-full h-full object-cover" alt="" /> : j.nome?.substring(0, 2)}
                          </div>
                          <span className="text-xs font-medium flex-1">{j.nome}</span>
                          <span className="text-[10px] text-textMuted capitalize">{j.posicao}</span>
                          <Plus size={12} className="text-accentPrimary" />
                        </button>
                      ))}
                      {jogadoresFiltrados.length === 0 && <p className="text-center text-xs text-textMuted py-2">Nenhum jogador encontrado</p>}
                    </div>
                    <button onClick={() => { setAddingToTeam(null); setBusca(''); }} className="text-xs text-textMuted hover:text-textPrimary">Cancelar</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingToTeam(time.time_id)}
                    className="w-full flex items-center justify-center gap-1.5 p-2 rounded-lg border border-dashed border-border hover:border-accentPrimary/50 hover:bg-accentPrimary/5 text-xs text-textMuted hover:text-accentPrimary transition-all"
                  >
                    <UserPlus size={13} /> Adicionar jogador
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {(!elenco || elenco.length === 0) && <p className="text-center text-textMuted py-4 text-sm">Nenhum elenco cadastrado.</p>}
      </div>

      {/* Modal de confirmação de remoção */}
      <AlertDialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {confirmRemove?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>O jogador será removido do elenco deste campeonato. Seus stats históricos serão mantidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmRemove && removeMutation.mutate(confirmRemove.elencoId)} className="bg-danger">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
});

// ============================================================================
// COMPONENTE: INTERFACE LIGA (PONTOS CORRIDOS)
// ============================================================================

const LIGA_TABS: TabItem[] = [
  { id: 'rodadas', label: 'Rodadas', icon: <Calendar size={14} /> },
  { id: 'classificacao', label: 'Tabela', icon: <Trophy size={14} /> },
  { id: 'stats', label: 'Stats', icon: <BarChart3 size={14} /> },
  { id: 'rivalidades', label: 'Rival.', icon: <Users size={14} /> },
];

const LigaInterface = memo(({ campeonatoId, isFinalizado }: { campeonatoId: number; isFinalizado: boolean }) => {
  const [activeTab, setActiveTab] = useState('rodadas');
  return (
    <AnimatedTabs tabs={LIGA_TABS} activeTab={activeTab} onTabChange={setActiveTab} variant="pills">
      {activeTab === 'rodadas' && <RodadasList campeonatoId={campeonatoId} isFinalizado={isFinalizado} />}
      {activeTab === 'classificacao' && <TabelaClassificacao campeonatoId={campeonatoId} />}
      {activeTab === 'stats' && <StatsTab campeonatoId={campeonatoId} />}
      {activeTab === 'rivalidades' && <RivalidadesTab campeonatoId={campeonatoId} />}
    </AnimatedTabs>
  );
});

// ============================================================================
// COMPONENTE: INTERFACE COPA (FASE DE GRUPOS + MATA-MATA)
// ============================================================================

const CopaInterface = memo(({ campeonatoId, campeonato, isFinalizado }: { campeonatoId: number; campeonato: any; isFinalizado: boolean }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('partidas');
  const isFaseGrupos = campeonato.fase_atual === 'fase_de_grupos';
  const isMataAMata = campeonato.fase_atual === 'mata_mata';
  const { data: bracket } = useQuery({ queryKey: ['campeonato', campeonatoId, 'bracket'], queryFn: async () => (await api.get(`/campeonatos/${campeonatoId}/mata-mata/bracket`)).data, enabled: isMataAMata || isFinalizado });

  const handleFaseGruposFinalizada = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['campeonatos', campeonatoId] });
    queryClient.invalidateQueries({ queryKey: ['campeonato', campeonatoId] });
    setActiveTab('bracket');
  }, [queryClient, campeonatoId]);

  const copaTabs = useMemo<TabItem[]>(() => {
    const tabs: TabItem[] = [
      { id: 'partidas', label: isFaseGrupos ? 'Grupos' : 'Partidas', icon: <Swords size={14} /> },
      { id: 'tabela', label: 'Tabela', icon: <Trophy size={14} /> },
    ];
    if (isMataAMata || isFinalizado) {
      tabs.push({ id: 'bracket', label: 'Bracket', icon: <Crown size={14} /> });
    }
    tabs.push(
      { id: 'stats', label: 'Stats', icon: <BarChart3 size={14} /> },
      { id: 'rivalidades', label: 'Rival.', icon: <Users size={14} /> },
    );
    return tabs;
  }, [isFaseGrupos, isMataAMata, isFinalizado]);

  return (
    <AnimatedTabs tabs={copaTabs} activeTab={activeTab} onTabChange={setActiveTab} variant="pills">
      {activeTab === 'partidas' && (
        <FaseGruposPartidas
          campeonatoId={campeonatoId}
          faseAtual={campeonato.fase_atual}
          onFaseGruposFinalizada={handleFaseGruposFinalizada}
        />
      )}
      {activeTab === 'tabela' && <TabelaClassificacao campeonatoId={campeonatoId} showFilter={false} />}
      {activeTab === 'bracket' && (
        <div className="rounded-xl border border-purple-500/30 bg-surface/50 p-6 text-center">
          <Crown className="w-16 h-16 mx-auto text-purple-400 mb-4" />
          <h3 className="text-xl font-bold text-textPrimary mb-2">Chaveamento Mata-Mata</h3>
          {bracket ? <pre className="text-xs bg-surfaceElevated p-4 rounded-lg overflow-auto max-h-64 text-left">{JSON.stringify(bracket, null, 2)}</pre> : <p className="text-textMuted">Finalize a fase de grupos primeiro.</p>}
        </div>
      )}
      {activeTab === 'stats' && <StatsTab campeonatoId={campeonatoId} />}
      {activeTab === 'rivalidades' && <RivalidadesTab campeonatoId={campeonatoId} />}
    </AnimatedTabs>
  );
});

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================

export function CampeonatoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const campeonatoId = Number(id);
  const queryClient = useQueryClient();
  const { data: campeonato, isLoading } = useCampeonato(campeonatoId);
  const { data: timesInscritos } = useTimesDoCampeonato(campeonatoId);
  const deleteMutation = useDeleteCampeonato();
  const iniciarMutation = useMutation({ mutationFn: async () => { await api.post(`/campeonatos/${campeonatoId}/iniciar`); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campeonatos'] }); toast.success("Campeonato iniciado!"); } });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [finalizarModalOpen, setFinalizarModalOpen] = useState(false);

  if (isLoading) return <div className="container-main section-padding pt-0"><Skeleton className="h-12 w-1/2 mb-4" /><Skeleton className="h-64 w-full" /></div>;
  if (!campeonato) return <div className="p-10 text-center">Campeonato não encontrado.</div>;

  const tipoCopa = ehCopa(campeonato.formato);
  const tipoLiga = ehLiga(campeonato.formato);
  const isInscricao = campeonato.fase_atual === 'inscricao';
  const isEmAndamento = ['em_andamento', 'fase_de_pontos', 'fase_de_grupos', 'mata_mata'].includes(campeonato.fase_atual);
  const isFinalizado = ['finalizada', 'finalizado'].includes(campeonato.fase_atual);
  const isSorteio = campeonato.modo_selecao_times === 'sorteio';
  const podeIniciar = timesInscritos && timesInscritos.length >= 2;

  return (
    <div className="container-main section-padding pt-0 pb-20 px-3 sm:px-4 lg:px-6">
      {/* Header */}
      <header className="mb-4 sm:mb-6">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <Link to="/campeonatos" className="flex items-center gap-2 text-textMuted hover:text-accentPrimary text-sm"><ArrowLeft size={18} /> Voltar</Link>
          {isAdmin && <Button variant="ghost" size="icon" aria-label="Deletar campeonato" className="text-textMuted hover:text-red-500" onClick={() => setDeleteOpen(true)}><Trash2 size={18} /></Button>}
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
          <div className="min-w-0 w-full md:w-auto">
            <h1 className="heading-gradient text-2xl sm:text-3xl md:text-4xl font-bold flex items-center gap-2 sm:gap-3">
              <Trophy className="text-accentSecondary flex-shrink-0" size={24} />
              <span className="truncate">{campeonato.nome}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs sm:text-sm text-textMuted">
              <span className={cn("px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase border", tipoCopa ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30")}>{tipoCopa ? 'Copa' : 'Liga'}</span>
              <span className="hidden sm:inline">Início: {formatDate(campeonato.data)}</span>
              <span className={cn("px-2 py-0.5 rounded-full border text-[10px] sm:text-xs font-semibold", isInscricao ? "border-yellow-500 text-yellow-500" : isEmAndamento ? "border-green-500 text-green-500" : "border-accentSecondary text-accentSecondary")}>{isInscricao ? 'Inscrições' : isEmAndamento ? 'Em Andamento' : 'Finalizado'}</span>
            </div>
          </div>
          {/* Botões — somente admin */}
          {isAdmin && (
            <div className="flex gap-2 w-full sm:w-auto">
              {isInscricao && !isSorteio && tipoLiga && <Button size="sm" className={cn("flex-1 sm:flex-none", !podeIniciar && "opacity-50")} onClick={() => iniciarMutation.mutate()} disabled={!podeIniciar}><Play size={16} className="mr-1 sm:mr-2" /> Iniciar</Button>}
              {isInscricao && isSorteio && <Button size="sm" onClick={() => navigate(`/campeonatos/${campeonatoId}/sorteio`)} className="bg-gradient-to-r from-purple-600 to-pink-600 flex-1 sm:flex-none"><Shuffle className="mr-1 sm:mr-2" size={16} />Sortear</Button>}
              {(isEmAndamento || isFinalizado) && <Button variant="outline" size="sm" onClick={() => setFinalizarModalOpen(true)} className="flex-1 sm:flex-none">{isFinalizado ? <><Camera size={16} className="mr-1 sm:mr-2" />Foto</> : <><Flag size={16} className="mr-1 sm:mr-2" />Encerrar</>}</Button>}
            </div>
          )}
        </div>
      </header>

      {/* Banner Campeão */}
      {isFinalizado && campeonato.time_campeao_nome && (
        <motion.div initial={{scale: 0.9, opacity: 0}} animate={{scale: 1, opacity: 1}} className="mb-8 p-8 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-600/20 border border-yellow-500/50 text-center cursor-pointer" onClick={() => setFinalizarModalOpen(true)}>
          {campeonato.foto_campiao_url ? <div className="mb-4 max-w-md mx-auto rounded-xl overflow-hidden border-4 border-yellow-500/30"><img src={campeonato.foto_campiao_url} alt="Campeão" className="w-full" /></div> : <Trophy className="h-16 w-16 mx-auto text-yellow-400 mb-4" />}
          <h2 className="text-3xl md:text-5xl font-black text-white mb-2">🏆 CAMPEÃO 🏆</h2>
          <p className="text-xl text-yellow-200 font-bold">{campeonato.time_campeao_nome}</p>
        </motion.div>
      )}

      {/* Gerenciamento de Elenco (disponível durante campeonato em andamento, admin only) */}
      {isEmAndamento && isAdmin && (
        <div className="mb-6 animate-fade-in-up"><ElencoManagement campeonatoId={campeonatoId} /></div>
      )}

      {/* Conteúdo Principal */}
      {isInscricao ? (
        isAdmin ? <div className="mb-8 animate-fade-in-up"><InscricaoSection campeonatoId={campeonatoId} /></div> : <p className="text-textMuted text-center py-8">Inscrições em andamento. Aguarde o administrador iniciar o campeonato.</p>
      ) : (
        <>
          {/* RENDERIZAÇÃO CONDICIONAL: Liga vs Copa */}
          {tipoLiga && <LigaInterface campeonatoId={campeonatoId} isFinalizado={isFinalizado} />}
          {tipoCopa && <CopaInterface campeonatoId={campeonatoId} campeonato={campeonato} isFinalizado={isFinalizado} />}
        </>
      )}

      {/* Modais */}
      {campeonato && <CampeonatoFinalizarModal isOpen={finalizarModalOpen} onClose={() => setFinalizarModalOpen(false)} campeonatoId={campeonato.id} campeonatoNome={campeonato.nome} isFinalizado={isFinalizado} />}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(campeonatoId, { onSuccess: () => navigate('/campeonatos') })} className="bg-danger">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}