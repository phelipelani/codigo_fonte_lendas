// ============================================================================
// Arquivo: src/features/Campeonatos/components/FaseGruposPartidas.tsx
// Componente que exibe e gerencia as partidas da fase de grupos
// ============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Play, Trophy, CheckCircle, Clock, Loader2, AlertTriangle, RefreshCw, ChevronRight, Crown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/api';

// ============================================================================
// TIPOS
// ============================================================================

interface Partida {
  id: number;
  campeonato_id: number;
  time_a_id: number;
  time_b_id: number;
  time_a_nome?: string;
  time_b_nome?: string;
  time_a_logo?: string;
  time_b_logo?: string;
  placar_time_a?: number;
  placar_time_b?: number;
  status: 'pendente' | 'em_andamento' | 'finalizada';
  ordem_jogo?: number;
}

interface FaseGruposPartidasProps {
  campeonatoId: number;
  faseAtual: string;
  onFaseGruposFinalizada?: () => void;
}

// ============================================================================
// COMPONENTE: CARD DE TIME
// ============================================================================

const TimeSlot = ({ time, placar, isVencedor, isPerdedor, showPlacar }: { 
  time: { id: number; nome: string; logo_url?: string };
  placar?: number;
  isVencedor: boolean;
  isPerdedor: boolean;
  showPlacar: boolean;
}) => (
  <div className={cn("flex items-center gap-3 flex-1 min-w-0", isPerdedor && "opacity-50")}>
    <div className={cn(
      "w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0",
      isVencedor ? "bg-emerald-500/20 ring-2 ring-emerald-500" : "bg-[#0a1628]"
    )}>
      {time.logo_url ? (
        <img src={time.logo_url} alt={time.nome} className="w-8 h-8 object-contain" />
      ) : (
        <span className={cn("text-sm font-bold", isVencedor ? "text-emerald-400" : "text-cyan-400")}>
          {time.nome.substring(0, 2).toUpperCase()}
        </span>
      )}
    </div>
    <span className={cn("font-semibold truncate", isVencedor ? "text-emerald-400" : "text-white")}>{time.nome}</span>
    {showPlacar && <span className={cn("ml-auto text-2xl font-black tabular-nums", isVencedor ? "text-emerald-400" : "text-white")}>{placar ?? '-'}</span>}
    {isVencedor && <Crown className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
  </div>
);

// ============================================================================
// COMPONENTE: CARD DE PARTIDA
// ============================================================================

const PartidaCard = ({ partida, index, onJogar }: { partida: Partida; index: number; onJogar: (id: number) => void }) => {
  const isFinalizada = partida.status === 'finalizada';
  const isPendente = partida.status === 'pendente';
  const isEmAndamento = partida.status === 'em_andamento';

  const timeA = { id: partida.time_a_id, nome: partida.time_a_nome || 'Time A', logo_url: partida.time_a_logo };
  const timeB = { id: partida.time_b_id, nome: partida.time_b_nome || 'Time B', logo_url: partida.time_b_logo };
  const placarA = partida.placar_time_a;
  const placarB = partida.placar_time_b;

  let vencedorId: number | null = null;
  if (isFinalizada && placarA !== undefined && placarB !== undefined) {
    if (placarA > placarB) vencedorId = timeA.id;
    else if (placarB > placarA) vencedorId = timeB.id;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "rounded-xl border overflow-hidden transition-all",
        isFinalizada ? "border-emerald-500/30 bg-emerald-500/5" 
          : isPendente ? "border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50 cursor-pointer"
          : "border-amber-500/30 bg-amber-500/5"
      )}
      onClick={() => isPendente && onJogar(partida.id)}
    >
      {/* Header */}
      <div className={cn(
        "px-4 py-2 flex items-center justify-between text-xs font-semibold",
        isFinalizada ? "bg-emerald-500/10 text-emerald-400" : isPendente ? "bg-purple-500/10 text-purple-400" : "bg-amber-500/10 text-amber-400"
      )}>
        <span className="flex items-center gap-2">
          {isFinalizada && <CheckCircle size={14} />}
          {isPendente && <Clock size={14} />}
          {isEmAndamento && <Play size={14} className="animate-pulse" />}
          Jogo {partida.ordem_jogo || index + 1}
        </span>
        <span>{isFinalizada ? 'Finalizado' : isPendente ? 'Pendente' : 'Em Andamento'}</span>
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-3">
        <TimeSlot time={timeA} placar={placarA} isVencedor={vencedorId === timeA.id} isPerdedor={vencedorId !== null && vencedorId !== timeA.id} showPlacar={isFinalizada} />
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-cyan-500/20" />
          <span className="text-xs font-bold text-cyan-500/50">VS</span>
          <div className="flex-1 h-px bg-cyan-500/20" />
        </div>
        <TimeSlot time={timeB} placar={placarB} isVencedor={vencedorId === timeB.id} isPerdedor={vencedorId !== null && vencedorId !== timeB.id} showPlacar={isFinalizada} />
      </div>

      {/* Botão Jogar */}
      {isPendente && (
        <div className="px-4 pb-4">
          <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500" onClick={(e) => { e.stopPropagation(); onJogar(partida.id); }}>
            <Play size={16} className="mr-2" />Jogar Partida
          </Button>
        </div>
      )}
    </motion.div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function FaseGruposPartidas({ campeonatoId, faseAtual, onFaseGruposFinalizada }: FaseGruposPartidasProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Query: Buscar partidas
  const { data: partidas, isLoading, error, refetch } = useQuery<Partida[]>({
    queryKey: ['campeonato', campeonatoId, 'fase-grupos', 'partidas'],
    queryFn: async () => (await api.get(`/campeonatos/${campeonatoId}/fase-grupos/partidas`)).data
  });

  // Mutation: Iniciar fase de grupos
  const iniciarMutation = useMutation({
    mutationFn: async () => (await api.post(`/campeonatos/${campeonatoId}/fase-grupos/iniciar`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campeonato', campeonatoId] });
      queryClient.invalidateQueries({ queryKey: ['campeonatos', campeonatoId] });
      toast.success('Fase de grupos iniciada!');
      refetch();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao iniciar')
  });

  // Mutation: Finalizar fase de grupos
  const finalizarMutation = useMutation({
    mutationFn: async () => (await api.post(`/campeonatos/${campeonatoId}/fase-grupos/finalizar`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campeonato', campeonatoId] });
      queryClient.invalidateQueries({ queryKey: ['campeonatos', campeonatoId] });
      toast.success('Mata-mata gerado!');
      onFaseGruposFinalizada?.();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao finalizar')
  });

  const handleJogar = (partidaId: number) => navigate(`/campeonatos/${campeonatoId}/partida/${partidaId}`);

  // Estatísticas
  const totalPartidas = partidas?.length || 0;
  const finalizadas = partidas?.filter(p => p.status === 'finalizada').length || 0;
  const pendentes = totalPartidas - finalizadas;
  const todasFinalizadas = totalPartidas > 0 && pendentes === 0;

  // Loading
  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>;

  // Erro
  if (error) return (
    <div className="p-8 rounded-xl border border-red-500/30 bg-red-500/5 text-center">
      <AlertTriangle className="w-12 h-12 mx-auto text-red-400 mb-4" />
      <h3 className="text-lg font-bold text-white mb-2">Erro ao carregar</h3>
      <Button onClick={() => refetch()} variant="outline" className="border-red-500 text-red-400"><RefreshCw size={16} className="mr-2" />Tentar novamente</Button>
    </div>
  );

  // Sem partidas - Botão iniciar
  if (!partidas || partidas.length === 0) return (
    <div className="p-8 rounded-xl border border-purple-500/30 bg-purple-500/5 text-center">
      <Swords className="w-16 h-16 mx-auto text-purple-400 mb-4" />
      <h3 className="text-xl font-bold text-white mb-2">Fase de Grupos</h3>
      <p className="text-cyan-100/50 mb-6">Partidas serão geradas automaticamente (Round-Robin).</p>
      <Button onClick={() => iniciarMutation.mutate()} disabled={iniciarMutation.isPending} className="bg-gradient-to-r from-purple-600 to-pink-600">
        {iniciarMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando...</> : <><Swords className="mr-2" size={18} />Iniciar Fase de Grupos</>}
      </Button>
    </div>
  );

  // Lista de partidas
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2"><Swords className="text-purple-400" />Partidas da Fase de Grupos</h3>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-semibold"><CheckCircle size={14} />{finalizadas} finalizadas</span>
          {pendentes > 0 && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-400 text-sm font-semibold"><Clock size={14} />{pendentes} pendentes</span>}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {partidas.map((partida, index) => <PartidaCard key={partida.id} partida={partida} index={index} onJogar={handleJogar} />)}
      </div>

      {/* Botão Finalizar */}
      <AnimatePresence>
        {todasFinalizadas && faseAtual === 'fase_de_grupos' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-6 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-yellow-600/10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center"><Trophy className="w-7 h-7 text-amber-400" /></div>
                <div><h4 className="text-lg font-bold text-white">Todas partidas finalizadas!</h4><p className="text-amber-300/70 text-sm">Finalize para gerar o mata-mata</p></div>
              </div>
              <Button onClick={() => finalizarMutation.mutate()} disabled={finalizarMutation.isPending} className="bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold">
                {finalizarMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Finalizando...</> : <>Finalizar Fase de Grupos<ChevronRight className="ml-2" size={18} /></>}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FaseGruposPartidas;