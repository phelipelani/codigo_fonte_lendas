// Arquivo: src/features/Campeonatos/components/CampeonatoRodadaFinalizadaView.tsx
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { 
  Trophy, Calendar, Clock, Target, Footprints, X, 
  CheckCircle, Timer, ChevronRight, Activity, History,
  Sparkles, Star, Zap, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PartidaCamp {
  id: number;
  timeA_id: number;
  timeA_nome?: string;
  nome_timeA?: string; // Alias alternativo
  timeA_logo_url?: string | null;
  timeB_id: number;
  timeB_nome?: string;
  nome_timeB?: string; // Alias alternativo
  timeB_logo_url?: string | null;
  placar_timeA: number;
  placar_timeB: number;
  status: string;
  duracao_segundos?: number;
}

// Helper para obter nome do time com fallback
const getTimeANome = (p: PartidaCamp) => p.timeA_nome || p.nome_timeA || 'Time A';
const getTimeBNome = (p: PartidaCamp) => p.timeB_nome || p.nome_timeB || 'Time B';

interface EventoPartida {
  id: number;
  tipo: 'gol' | 'gol_contra' | 'assistencia';
  jogador_id: number;
  jogador_nome: string;   // alias frontend
  nome_jogador: string;   // campo real do backend
  tempo_segundos: number;
  assist_por_jogador_id?: number;
  assist_por_nome?: string;    // alias frontend
  nome_assistente?: string;    // campo real do backend
  time_id: number;
}

// Função para formatar tempo em mm:ss
const formatTempo = (segundos: number) => {
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

// --- MODAL DE DETALHES DA PARTIDA ---
const ModalDetalhesPartida = ({
  isOpen,
  onClose,
  partida,
  campeonatoId
}: {
  isOpen: boolean;
  onClose: () => void;
  partida: PartidaCamp | null;
  campeonatoId: number;
}) => {
  // Busca os eventos da partida
  const { data: eventos, isLoading } = useQuery<EventoPartida[]>({
    queryKey: ['partida', partida?.id, 'eventos'],
    queryFn: async () => {
      if (!partida?.id) return [];
      try {
        const res = await api.get(`/partidas/${partida.id}/detalhes`);
        return (res.data?.eventos ?? []).map((e: any) => ({
          ...e,
          jogador_nome: e.jogador_nome || e.nome_jogador || 'Desconhecido',
          assist_por_nome: e.assist_por_nome || e.nome_assistente || undefined,
        })) as EventoPartida[];
      } catch (err: any) {
        // Se a rota não existir (404), retorna array vazio
        if (err?.response?.status === 404) {
          if (import.meta.env.DEV) console.warn('Rota de eventos não encontrada - backend precisa implementar');
          return [];
        }
        throw err;
      }
    },
    enabled: isOpen && !!partida?.id,
    retry: false // Não retentar se der erro
  });

  // Separa eventos por time (hooks devem ficar ANTES de qualquer early return)
  const eventosTimeA = React.useMemo(() => eventos?.filter(e => e.time_id === partida?.timeA_id && e.tipo === 'gol') || [], [eventos, partida?.timeA_id]);
  const eventosTimeB = React.useMemo(() => eventos?.filter(e => e.time_id === partida?.timeB_id && e.tipo === 'gol') || [], [eventos, partida?.timeB_id]);
  const golsContra = React.useMemo(() => eventos?.filter(e => e.tipo === 'gol_contra') || [], [eventos]);

  // Ordena todos os eventos por tempo
  const todosEventos = React.useMemo(() => [...(eventos || [])].filter(e => e.tipo === 'gol' || e.tipo === 'gol_contra').sort((a, b) => a.tempo_segundos - b.tempo_segundos), [eventos]);

  if (!isOpen || !partida) return null;

  const vencedor = partida.placar_timeA > partida.placar_timeB
    ? 'A'
    : partida.placar_timeB > partida.placar_timeA
      ? 'B'
      : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a1628] border-cyan-500/20 max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
                <Activity className="text-white" size={20} />
              </div>
              <div>
                <DialogTitle className="text-white text-lg">Detalhes da Partida</DialogTitle>
                <p className="text-cyan-100/50 text-xs">Eventos e estatísticas</p>
              </div>
            </div>
            {partida.duracao_segundos && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d1f35] rounded-lg border border-cyan-500/20">
                <Timer size={14} className="text-cyan-400" />
                <span className="text-xs font-mono text-cyan-100">{formatTempo(partida.duracao_segundos)}</span>
              </div>
            )}
          </div>
          <DialogDescription className="sr-only">Detalhes e eventos da partida</DialogDescription>
        </DialogHeader>

        {/* Placar Principal */}
        <div className="py-6 border-b border-cyan-500/10">
          <div className="flex items-center justify-between gap-4">
            {/* Time A */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col items-center flex-1"
            >
              <div className={cn(
                "w-16 h-16 rounded-full border-2 flex items-center justify-center overflow-hidden mb-2 transition-all",
                vencedor === 'A' 
                  ? "border-amber-500 shadow-lg shadow-amber-500/20" 
                  : "border-cyan-500/30 bg-[#0d1f35]"
              )}>
                {partida.timeA_logo_url ? (
                  <img src={partida.timeA_logo_url} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-cyan-400">{getTimeANome(partida).substring(0, 2)}</span>
                )}
              </div>
              <span className="font-bold text-sm text-white text-center">{getTimeANome(partida)}</span>
              {vencedor === 'A' && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 mt-1">
                  <Trophy size={10} /> VENCEDOR
                </span>
              )}
            </motion.div>

            {/* Placar */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 bg-gradient-to-b from-[#0d1f35] to-[#0a1628] px-6 py-4 rounded-2xl border border-cyan-500/20 shadow-xl"
            >
              <span className={cn(
                "text-5xl font-black",
                vencedor === 'A' ? "text-emerald-400" : "text-white"
              )}>
                {partida.placar_timeA}
              </span>
              <span className="text-cyan-500 text-2xl font-bold">×</span>
              <span className={cn(
                "text-5xl font-black",
                vencedor === 'B' ? "text-emerald-400" : "text-white"
              )}>
                {partida.placar_timeB}
              </span>
            </motion.div>

            {/* Time B */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col items-center flex-1"
            >
              <div className={cn(
                "w-16 h-16 rounded-full border-2 flex items-center justify-center overflow-hidden mb-2 transition-all",
                vencedor === 'B' 
                  ? "border-amber-500 shadow-lg shadow-amber-500/20" 
                  : "border-cyan-500/30 bg-[#0d1f35]"
              )}>
                {partida.timeB_logo_url ? (
                  <img src={partida.timeB_logo_url} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-cyan-400">{getTimeBNome(partida).substring(0, 2)}</span>
                )}
              </div>
              <span className="font-bold text-sm text-white text-center">{getTimeBNome(partida)}</span>
              {vencedor === 'B' && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 mt-1">
                  <Trophy size={10} /> VENCEDOR
                </span>
              )}
            </motion.div>
          </div>
        </div>

        {/* Timeline de Eventos */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="flex items-center gap-2 mb-4">
            <History size={16} className="text-cyan-400" />
            <span className="text-sm font-bold text-white">Timeline de Gols</span>
            <span className="text-xs text-cyan-100/50">({todosEventos.length} eventos)</span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full bg-cyan-500/10" />
              ))}
            </div>
          ) : todosEventos.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-3">
                <Target size={24} className="text-cyan-500/40" />
              </div>
              <p className="text-cyan-100/50 text-sm">Nenhum gol registrado</p>
              <p className="text-cyan-100/30 text-xs mt-1">Partida terminou 0 x 0</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todosEventos.map((evento, index) => {
                const isTimeA = evento.time_id === partida.timeA_id;
                const isGolContra = evento.tipo === 'gol_contra';
                
                return (
                  <motion.div
                    key={evento.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all hover:bg-cyan-500/5",
                      isGolContra 
                        ? "bg-red-500/5 border-red-500/20" 
                        : "bg-[#0d1f35]/50 border-cyan-500/10"
                    )}
                  >
                    {/* Tempo */}
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-[#0a1628] border border-cyan-500/20 flex flex-col items-center justify-center">
                      <Clock size={12} className="text-cyan-400 mb-0.5" />
                      <span className="font-mono text-sm font-bold text-white">
                        {formatTempo(evento.tempo_segundos)}
                      </span>
                    </div>

                    {/* Ícone de Gol */}
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      isGolContra 
                        ? "bg-red-500/20 text-red-400" 
                        : "bg-emerald-500/20 text-emerald-400"
                    )}>
                      <span className="text-lg">⚽</span>
                    </div>

                    {/* Detalhes */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-bold text-sm truncate",
                          isGolContra ? "text-red-400" : "text-white"
                        )}>
                          {evento.jogador_nome}
                        </span>
                        {isGolContra && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                            GOL CONTRA
                          </span>
                        )}
                      </div>
                      
                      {evento.assist_por_nome && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Footprints size={12} className="text-cyan-400" />
                          <span className="text-xs text-cyan-100/60">
                            Assistência: <span className="text-cyan-400">{evento.assist_por_nome}</span>
                          </span>
                        </div>
                      )}
                      
                      {!evento.assist_por_nome && !isGolContra && (
                        <span className="text-xs text-cyan-100/40">Jogada individual</span>
                      )}
                    </div>

                    {/* Badge do Time */}
                    <div className={cn(
                      "flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                      isTimeA 
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                    )}>
                      {isTimeA ? getTimeANome(partida).substring(0, 3) : getTimeBNome(partida).substring(0, 3)}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer com estatísticas rápidas */}
        <div className="pt-4 border-t border-cyan-500/10">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-[#0d1f35]/50 rounded-lg">
              <span className="text-lg font-bold text-emerald-400">{eventosTimeA.length}</span>
              <p className="text-[10px] text-cyan-100/50 uppercase">Gols {getTimeANome(partida).substring(0, 3)}</p>
            </div>
            <div className="text-center p-2 bg-[#0d1f35]/50 rounded-lg">
              <span className="text-lg font-bold text-cyan-400">
                {eventos?.filter(e => e.assist_por_jogador_id).length || 0}
              </span>
              <p className="text-[10px] text-cyan-100/50 uppercase">Assistências</p>
            </div>
            <div className="text-center p-2 bg-[#0d1f35]/50 rounded-lg">
              <span className="text-lg font-bold text-emerald-400">{eventosTimeB.length}</span>
              <p className="text-[10px] text-cyan-100/50 uppercase">Gols {getTimeBNome(partida).substring(0, 3)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// --- MODAL DE RESUMO DA RODADA ---
const ModalResumoRodada = ({
  isOpen,
  onClose,
  partidas,
  rodadaId,
}: {
  isOpen: boolean;
  onClose: () => void;
  partidas: PartidaCamp[];
  rodadaId: number;
}) => {
  // Busca eventos de todas as partidas em paralelo
  const { data: todosEventos, isLoading } = useQuery<EventoPartida[]>({
    queryKey: ['rodada', rodadaId, 'todos-eventos-resumo'],
    queryFn: async () => {
      if (!partidas?.length) return [];
      const results = await Promise.all(
        partidas.map(p =>
          api.get(`/partidas/${p.id}/detalhes`)
            .then(r => (r.data?.eventos ?? []).map((e: any) => ({
              ...e,
              jogador_nome: e.jogador_nome || e.nome_jogador || 'Desconhecido',
              assist_por_nome: e.assist_por_nome || e.nome_assistente || undefined,
            })) as EventoPartida[])
            .catch(() => [] as EventoPartida[])
        )
      );
      return results.flat();
    },
    enabled: isOpen && !!partidas?.length,
    staleTime: 1000 * 60 * 5,
  });

  const destaques = React.useMemo(() => {
    if (!todosEventos || !partidas?.length) return null;

    const golsPorJogador: Record<number, { nome: string; total: number }> = {};
    const assistsPorJogador: Record<number, { nome: string; total: number }> = {};
    const golsContraPorJogador: Record<number, { nome: string; total: number }> = {};
    const participacoes: Record<number, { nome: string; total: number }> = {};

    todosEventos.forEach(e => {
      if (e.tipo === 'gol') {
        if (!golsPorJogador[e.jogador_id]) golsPorJogador[e.jogador_id] = { nome: e.jogador_nome, total: 0 };
        golsPorJogador[e.jogador_id].total++;
        if (!participacoes[e.jogador_id]) participacoes[e.jogador_id] = { nome: e.jogador_nome, total: 0 };
        participacoes[e.jogador_id].total++;
        if (e.assist_por_jogador_id && e.assist_por_nome) {
          if (!assistsPorJogador[e.assist_por_jogador_id])
            assistsPorJogador[e.assist_por_jogador_id] = { nome: e.assist_por_nome, total: 0 };
          assistsPorJogador[e.assist_por_jogador_id].total++;
          if (!participacoes[e.assist_por_jogador_id])
            participacoes[e.assist_por_jogador_id] = { nome: e.assist_por_nome, total: 0 };
          participacoes[e.assist_por_jogador_id].total++;
        }
      }
      if (e.tipo === 'gol_contra') {
        if (!golsContraPorJogador[e.jogador_id])
          golsContraPorJogador[e.jogador_id] = { nome: e.jogador_nome, total: 0 };
        golsContraPorJogador[e.jogador_id].total++;
      }
    });

    const artilheiro = Object.values(golsPorJogador).sort((a, b) => b.total - a.total)[0] ?? null;
    const garcom     = Object.values(assistsPorJogador).sort((a, b) => b.total - a.total)[0] ?? null;
    const peDeRato   = Object.values(golsContraPorJogador).sort((a, b) => b.total - a.total)[0] ?? null;
    const mvp        = Object.values(participacoes).sort((a, b) => b.total - a.total)[0] ?? null;

    // Melhor time por vitórias, depois por gols
    const golsPorTime: Record<number, { nome: string; gols: number; vitorias: number }> = {};
    partidas.forEach(p => {
      const nA = p.timeA_nome || p.nome_timeA || 'Time A';
      const nB = p.timeB_nome || p.nome_timeB || 'Time B';
      if (!golsPorTime[p.timeA_id]) golsPorTime[p.timeA_id] = { nome: nA, gols: 0, vitorias: 0 };
      if (!golsPorTime[p.timeB_id]) golsPorTime[p.timeB_id] = { nome: nB, gols: 0, vitorias: 0 };
      golsPorTime[p.timeA_id].gols += p.placar_timeA;
      golsPorTime[p.timeB_id].gols += p.placar_timeB;
      if (p.placar_timeA > p.placar_timeB) golsPorTime[p.timeA_id].vitorias++;
      else if (p.placar_timeB > p.placar_timeA) golsPorTime[p.timeB_id].vitorias++;
    });
    const melhorTime = Object.values(golsPorTime)
      .sort((a, b) => b.vitorias - a.vitorias || b.gols - a.gols)[0] ?? null;

    return { artilheiro, garcom, mvp, peDeRato, melhorTime };
  }, [todosEventos, partidas]);

  const cards = React.useMemo(() => [
    {
      key: 'mvp',
      label: 'MVP da Rodada',
      emoji: '⭐',
      icon: <Sparkles size={18} className="text-amber-400" />,
      valor: destaques?.mvp ?? null,
      stat: destaques?.mvp ? `${destaques.mvp.total} participações` : null,
      bg: 'from-amber-500/20 to-yellow-500/10',
      border: 'border-amber-500/40',
      color: 'text-amber-300',
      delay: 0.10,
    },
    {
      key: 'artilheiro',
      label: 'Artilheiro',
      emoji: '⚽',
      icon: <Target size={18} className="text-emerald-400" />,
      valor: destaques?.artilheiro ?? null,
      stat: destaques?.artilheiro
        ? `${destaques.artilheiro.total} gol${destaques.artilheiro.total !== 1 ? 's' : ''}`
        : null,
      bg: 'from-emerald-500/20 to-teal-500/10',
      border: 'border-emerald-500/40',
      color: 'text-emerald-300',
      delay: 0.20,
    },
    {
      key: 'garcom',
      label: 'Garçom',
      emoji: '👟',
      icon: <Footprints size={18} className="text-cyan-400" />,
      valor: destaques?.garcom ?? null,
      stat: destaques?.garcom
        ? `${destaques.garcom.total} assistência${destaques.garcom.total !== 1 ? 's' : ''}`
        : null,
      bg: 'from-cyan-500/20 to-blue-500/10',
      border: 'border-cyan-500/40',
      color: 'text-cyan-300',
      delay: 0.30,
    },
    {
      key: 'melhorTime',
      label: 'Melhor Time',
      emoji: '🏆',
      icon: <Shield size={18} className="text-purple-400" />,
      valor: destaques?.melhorTime ? { nome: destaques.melhorTime.nome } : null,
      stat: destaques?.melhorTime
        ? `${destaques.melhorTime.vitorias} vitória${destaques.melhorTime.vitorias !== 1 ? 's' : ''} · ${destaques.melhorTime.gols} gols`
        : null,
      bg: 'from-purple-500/20 to-violet-500/10',
      border: 'border-purple-500/40',
      color: 'text-purple-300',
      delay: 0.40,
    },
    {
      key: 'peDeRato',
      label: 'Pé de Rato 🐀',
      emoji: '🐀',
      icon: <Zap size={18} className="text-red-400" />,
      valor: destaques?.peDeRato ?? null,
      stat: destaques?.peDeRato
        ? `${destaques.peDeRato.total} gol${destaques.peDeRato.total !== 1 ? 's' : ''} contra`
        : null,
      bg: 'from-red-500/20 to-orange-500/10',
      border: 'border-red-500/40',
      color: 'text-red-300',
      delay: 0.50,
    },
  ], [destaques]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a1628] border-cyan-500/20 max-w-md w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="relative px-5 pt-5 pb-4 border-b border-cyan-500/10 flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-purple-500/5 pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20"
            >
              <Trophy className="text-white" size={24} />
            </motion.div>
            <div>
              <DialogTitle className="text-white text-lg font-black">Resumo da Rodada</DialogTitle>
              <p className="text-cyan-100/50 text-xs">{partidas.length} partidas · destaques do dia</p>
            </div>
          </div>
          <DialogDescription className="sr-only">Destaques e premiações da rodada</DialogDescription>
        </div>

        {/* Cards */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              <span className="text-cyan-100/40 text-sm">Calculando destaques...</span>
            </div>
          ) : (
            cards.map(card => (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: card.delay, duration: 0.35 }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-r',
                  card.bg, card.border,
                  !card.valor && 'opacity-40'
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center flex-shrink-0 text-xl">
                  {card.valor ? card.emoji : '—'}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">
                    {card.label}
                  </span>
                  <span className={cn('font-black text-sm truncate block', card.color)}>
                    {card.valor ? card.valor.nome : 'Nenhum registro'}
                  </span>
                  {card.stat && (
                    <span className="text-[11px] text-white/40">{card.stat}</span>
                  )}
                </div>
                <div className="flex-shrink-0">{card.icon}</div>
              </motion.div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-3 flex-shrink-0 border-t border-cyan-500/10">
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold"
          >
            Ver detalhes das partidas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


// --- CARD DE PARTIDA ---
const CardPartida = React.memo(({
  partida,
  onClick,
  index
}: {
  partida: PartidaCamp;
  onClick: () => void;
  index: number;
}) => {
  const vencedor = partida.placar_timeA > partida.placar_timeB 
    ? 'A' 
    : partida.placar_timeB > partida.placar_timeA 
      ? 'B' 
      : null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="w-full p-4 rounded-xl border border-cyan-500/20 bg-gradient-to-b from-[#0d1f35]/80 to-[#0a1628]/80 backdrop-blur-sm hover:border-cyan-500/40 transition-all group text-left"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-black text-cyan-400">
            {index + 1}
          </span>
          <span className="text-[10px] font-bold text-cyan-100/50 uppercase tracking-wider">
            Resultado Final
          </span>
        </div>
        <div className="flex items-center gap-2">
          {partida.status === 'finalizada' && (
            <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
              <CheckCircle size={10} />
              Concluído
            </span>
          )}
          <ChevronRight size={14} className="text-cyan-500/40 group-hover:text-cyan-400 transition-colors" />
        </div>
      </div>

      {/* Placar */}
      <div className="flex items-center justify-between">
        {/* Time A */}
        <div className="flex flex-col items-center flex-1">
          <div className={cn(
            "w-14 h-14 rounded-full border-2 flex items-center justify-center overflow-hidden mb-2 transition-all",
            vencedor === 'A' 
              ? "border-amber-500 shadow-md shadow-amber-500/20" 
              : "border-cyan-500/20 bg-[#0a1628]"
          )}>
            {partida.timeA_logo_url ? (
              <img src={partida.timeA_logo_url} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-cyan-400 text-sm">{getTimeANome(partida).substring(0, 2)}</span>
            )}
          </div>
          {vencedor === 'A' && (
            <span className="text-[9px] text-amber-400 font-bold uppercase">Vencedor</span>
          )}
        </div>

        {/* Placar Central */}
        <div className="flex items-center gap-2 bg-[#0a1628] px-4 py-2 rounded-xl border border-cyan-500/20">
          <span className={cn(
            "text-2xl font-black",
            vencedor === 'A' ? "text-emerald-400" : "text-white"
          )}>
            {partida.placar_timeA}
          </span>
          <span className="text-cyan-500 font-bold">×</span>
          <span className={cn(
            "text-2xl font-black",
            vencedor === 'B' ? "text-emerald-400" : "text-white"
          )}>
            {partida.placar_timeB}
          </span>
        </div>

        {/* Time B */}
        <div className="flex flex-col items-center flex-1">
          <div className={cn(
            "w-14 h-14 rounded-full border-2 flex items-center justify-center overflow-hidden mb-2 transition-all",
            vencedor === 'B' 
              ? "border-amber-500 shadow-md shadow-amber-500/20" 
              : "border-cyan-500/20 bg-[#0a1628]"
          )}>
            {partida.timeB_logo_url ? (
              <img src={partida.timeB_logo_url} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-cyan-400 text-sm">{getTimeBNome(partida).substring(0, 2)}</span>
            )}
          </div>
          {vencedor === 'B' && (
            <span className="text-[9px] text-amber-400 font-bold uppercase">Vencedor</span>
          )}
        </div>
      </div>

      {/* Hint de clique */}
      <div className="mt-3 pt-3 border-t border-cyan-500/10 text-center">
        <span className="text-[10px] text-cyan-100/40 group-hover:text-cyan-400 transition-colors">
          Clique para ver detalhes
        </span>
      </div>
    </motion.button>
  );
});

// --- COMPONENTE PRINCIPAL ---
export const CampeonatoRodadaFinalizadaView = ({ 
  rodadaId, 
  campeonatoId 
}: { 
  rodadaId: number; 
  campeonatoId: number; 
}) => {
  const [partidaSelecionada, setPartidaSelecionada] = React.useState<PartidaCamp | null>(null);
  const [showResumo, setShowResumo] = React.useState(false);
  const resumoMostrado = React.useRef(false);

  // Busca as partidas da rodada
  const { data: partidas, isLoading } = useQuery<PartidaCamp[]>({
    queryKey: ['campeonato', campeonatoId, 'rodada', rodadaId, 'partidas'],
    queryFn: async () => {
      const res = await api.get(`/campeonatos/rodada/${rodadaId}/partidas`);
      return res.data;
    }
  });

  // Busca informações da rodada
  const { data: rodada } = useQuery({
    queryKey: ['rodada', rodadaId],
    queryFn: async () => {
      try {
        const res = await api.get(`/rodadas/${rodadaId}`);
        return res.data;
      } catch (err: any) {
        if (err?.response?.status === 404) {
          return { status: 'finalizada' }; // Fallback
        }
        throw err;
      }
    },
    retry: false
  });


  // Abre o resumo automaticamente na primeira vez que a rodada finalizada é carregada
  React.useEffect(() => {
    if (rodada?.status === 'finalizada' && partidas?.length && !resumoMostrado.current) {
      resumoMostrado.current = true;
      const timer = setTimeout(() => setShowResumo(true), 600);
      return () => clearTimeout(timer);
    }
  }, [rodada?.status, partidas?.length]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64 mx-auto bg-cyan-500/10" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-40 w-full bg-cyan-500/10" />
          ))}
        </div>
      </div>
    );
  }

  if (!partidas || partidas.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-cyan-500/20 rounded-xl bg-[#0d1f35]/30">
        <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
          <Calendar size={24} className="text-cyan-500/40" />
        </div>
        <p className="text-cyan-100/50">Nenhuma partida encontrada para esta rodada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com status */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3"
      >
        {rodada?.status === 'finalizada' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
            <CheckCircle size={16} className="text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">Rodada Finalizada</span>
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0d1f35] border border-cyan-500/20 rounded-full">
          <Activity size={14} className="text-cyan-400" />
          <span className="text-xs text-cyan-100/70">{partidas.length} partidas realizadas</span>
        </div>
      </motion.div>

      {/* Grid de partidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {partidas.map((partida, index) => (
          <CardPartida
            key={partida.id}
            partida={partida}
            index={index}
            onClick={() => setPartidaSelecionada(partida)}
          />
        ))}
      </div>

      {/* Modal de Detalhes */}
      <ModalDetalhesPartida
        isOpen={!!partidaSelecionada}
        onClose={() => setPartidaSelecionada(null)}
        partida={partidaSelecionada}
        campeonatoId={campeonatoId}
      />

      {/* Modal de Resumo da Rodada */}
      <ModalResumoRodada
        isOpen={showResumo}
        onClose={() => setShowResumo(false)}
        partidas={partidas}
        rodadaId={rodadaId}
      />

      {/* Botão para reabrir o resumo */}
      {!showResumo && partidas.length > 0 && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={() => setShowResumo(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-all"
          >
            <Trophy size={14} />
            Ver resumo da rodada
          </button>
        </div>
      )}
    </div>
  );
};