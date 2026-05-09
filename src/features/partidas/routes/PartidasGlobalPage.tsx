import { useState, useCallback, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Edit2, Trash2, Calendar, Filter, Swords, AlertTriangle, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PartidaEditModal } from '../components/PartidaEditModal';
import MatchDetailModal from '@/components/shared/MatchDetailModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import icPartidas from '@/assets/icones/partidas.webp';
import PageTitle from '@/components/shared/PageTitle';

// ── Match Card premium ──────────────────────────────────────
const MatchCard = memo(function MatchCard({ p, isAdmin, onEdit, onDelete, onClick }: { p: any; isAdmin: boolean; onEdit: () => void; onDelete: () => void; onClick: () => void }) {
  const winA = Number(p.placarA) > Number(p.placarB);
  const winB = Number(p.placarB) > Number(p.placarA);
  const isDraw = Number(p.placarA) === Number(p.placarB);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0d1f35]/60 backdrop-blur-sm hover:border-cyan-500/20 transition-all group active:scale-[0.995]"
    >
      {/* Top bar — competição + data */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/[0.04]">
        <span className="text-[10px] font-black text-amber-400/70 uppercase tracking-wider">
          {p.nome_competicao || 'Amistoso'}
        </span>
        <div className="flex items-center gap-1.5 text-white/25 text-[10px]">
          <Calendar size={10} />
          <span>{p.data ? format(new Date(p.data), "dd MMM, HH:mm", { locale: ptBR }) : 'N/D'}</span>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="flex items-center justify-between px-4 py-4 gap-3">
        {/* Time A */}
        <div className={cn('flex items-center gap-3 flex-1 min-w-0', winA && 'opacity-100', !winA && !isDraw && 'opacity-50')}>
          <div className={cn(
            'w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 shadow-md flex-shrink-0',
            winA ? 'border-emerald-400/40 shadow-emerald-500/10' : 'border-white/[0.06]',
          )}>
            {p.timeA_logo ? (
              <img src={p.timeA_logo} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/5 flex items-center justify-center"><Shield size={16} className="text-white/15" /></div>
            )}
          </div>
          <span className={cn('text-sm font-bold truncate', winA ? 'text-white' : 'text-white/50')}>
            {p.timeA_nome}
          </span>
        </div>

        {/* Placar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn(
            'text-2xl sm:text-3xl font-black tabular-nums w-8 text-right',
            winA ? 'text-emerald-400' : isDraw ? 'text-amber-400' : 'text-white/30',
          )}>
            {p.placarA}
          </span>
          <span className="text-white/15 text-xs font-light">×</span>
          <span className={cn(
            'text-2xl sm:text-3xl font-black tabular-nums w-8',
            winB ? 'text-emerald-400' : isDraw ? 'text-amber-400' : 'text-white/30',
          )}>
            {p.placarB}
          </span>
        </div>

        {/* Time B */}
        <div className={cn('flex items-center gap-3 flex-1 min-w-0 justify-end', winB && 'opacity-100', !winB && !isDraw && 'opacity-50')}>
          <span className={cn('text-sm font-bold truncate text-right', winB ? 'text-white' : 'text-white/50')}>
            {p.timeB_nome}
          </span>
          <div className={cn(
            'w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 shadow-md flex-shrink-0',
            winB ? 'border-emerald-400/40 shadow-emerald-500/10' : 'border-white/[0.06]',
          )}>
            {p.timeB_logo ? (
              <img src={p.timeB_logo} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/5 flex items-center justify-center"><Shield size={16} className="text-white/15" /></div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar — ações */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.015] border-t border-white/[0.04]">
        <span className="text-[10px] text-white/20 font-bold uppercase tracking-wider group-hover:text-cyan-400/50 transition-colors">
          Toque para detalhes
        </span>
        {isAdmin && (
          <div className="flex gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all"
              title="Editar"
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Excluir jogo ${p.timeA_nome} × ${p.timeB_nome}?`)) onDelete();
              }}
              className="w-7 h-7 rounded-lg bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Excluir"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </button>
  );
});

export function PartidasGlobalPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  // Estados
  const [filtroCamp, setFiltroCamp] = useState('todos');
  const [editPartida, setEditPartida] = useState<any>(null);
  const [detailPartida, setDetailPartida] = useState<any>(null);

  // 1. Busca Partidas Unificadas
  const { data: partidas, isLoading } = useQuery({
    queryKey: ['partidas', filtroCamp],
    queryFn: async () => {
        const params: any = {};
        if (filtroCamp !== 'todos') {
            params.campeonato_id = filtroCamp; 
        }
        
        const res = await api.get('/partidas/globais', { params });
        return res.data;
    }
  });

  // 2. Busca Lista de Campeonatos para o Filtro
  const { data: campeonatos } = useQuery({
    queryKey: ['campeonatos'],
    queryFn: async () => (await api.get('/campeonatos')).data
  });

  // 3. Mutation de Exclusão
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
        await api.delete(`/partidas/${id}`);
    },
    onSuccess: () => {
        toast.success("Partida excluída e estatísticas revertidas.");
        queryClient.invalidateQueries({ queryKey: ['partidas'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: () => toast.error("Erro ao excluir partida.")
  });

  if (isLoading) return <div className="container-main section-padding"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="container-main section-padding pb-24">
        
        {/* HEADER */}
        <PageTitle
          icon={icPartidas}
          title="Partidas"
          subtitle="Todas as partidas de Ligas e Campeonatos."
        >
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={16} className="text-white/30" />
            <Select value={filtroCamp} onValueChange={setFiltroCamp}>
              <SelectTrigger className="w-full md:w-[240px] bg-white/[0.03] border-white/[0.08] text-white text-sm">
                <SelectValue placeholder="Filtrar por Competição" />
              </SelectTrigger>
              <SelectContent className="max-h-[15rem]">
                <SelectItem value="todos">Todas as Competições</SelectItem>
                {campeonatos?.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PageTitle>

        {/* LISTAGEM */}
        <div className="grid gap-3">
            {partidas?.map((p: any) => (
                <MatchCard
                  key={`${p.tipo_competicao}-${p.partida_id}`}
                  p={p}
                  isAdmin={isAdmin}
                  onEdit={() => setEditPartida(p)}
                  onDelete={() => deleteMutation.mutate(p.partida_id)}
                  onClick={() => setDetailPartida({ ...p, id: p.partida_id })}
                />
            ))}

            {partidas?.length === 0 && (
                <div className="text-center py-16 text-white/30 border-2 border-dashed border-white/[0.06] rounded-2xl bg-white/[0.02]">
                    <Swords className="mx-auto mb-3 opacity-30 h-10 w-10" />
                    <p className="font-bold text-sm">Nenhuma partida encontrada</p>
                    <p className="text-xs text-white/20 mt-1">Tente outro filtro de competição</p>
                </div>
            )}
        </div>

        {/* Modal de Edição */}
        {editPartida && (
            <PartidaEditModal
                isOpen={!!editPartida}
                onClose={() => setEditPartida(null)}
                partida={editPartida}
            />
        )}

        {/* Modal de Detalhes */}
        {detailPartida && (
            <MatchDetailModal
                partida={detailPartida}
                onClose={() => setDetailPartida(null)}
            />
        )}
    </div>
  );
}