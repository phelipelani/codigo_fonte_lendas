// Arquivo: src/features/rodadas/routes/RodadasPage.tsx
import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, Plus, Calendar, ChevronLeft, CheckCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Rodada } from '@/@types';
import { useLiga } from '@/features/ligas/api/useLigas';
import { useRodadas } from '../api/useRodadas';
import { useDeleteRodada } from '../api/useDeleteRodada';
import { RodadaCreateModal } from '../components/RodadaCreateModal';
import { RodadaEditModal } from '../components/RodadaEditModal';
import { RodadaCard } from '../components/RodadaCard';
import { cn } from '@/lib/utils';

export const RodadasPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ligaId = Number(id);

  const { data: liga, isLoading: isLoadingLiga } = useLiga(ligaId);
  const { data: rodadas, isLoading: isLoadingRodadas, isError, error } = useRodadas(ligaId);
  const deleteMutation = useDeleteRodada();

  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [editingRodada, setEditingRodada] = React.useState<Rodada | null>(null);

  React.useEffect(() => {
    return () => {
      setIsCreateModalOpen(false);
      setEditingRodada(null);
    };
  }, []);

  const handleDelete = (rodadaId: number) => {
    deleteMutation.mutate({ rodadaId, ligaId });
  };

  // Stats
  const stats = React.useMemo(() => {
    if (!rodadas) return { total: 0, finalizadas: 0, abertas: 0 };
    return {
      total: rodadas.length,
      finalizadas: rodadas.filter(r => r.status === 'finalizada').length,
      abertas: rodadas.filter(r => r.status !== 'finalizada').length,
    };
  }, [rodadas]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 text-cyan-100/50 hover:text-cyan-100 hover:bg-cyan-500/10"
          onClick={() => navigate('/ligas')}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Voltar para Ligas
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-black">
              <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                {isLoadingLiga ? 'Carregando...' : liga?.nome}
              </span>
            </h1>
            <p className="text-cyan-100/50 text-sm mt-1">
              Gerencie as rodadas desta liga
            </p>
          </div>

          <Button 
            onClick={() => setIsCreateModalOpen(true)} 
            className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-cyan-500/25 border border-cyan-400/20"
          >
            <Plus className="mr-2 h-5 w-5" />
            NOVA RODADA
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {rodadas && rodadas.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { value: stats.total, label: 'Total', color: 'text-white', icon: Calendar },
            { value: stats.abertas, label: 'Abertas', color: 'text-cyan-400', icon: Clock },
            { value: stats.finalizadas, label: 'Finalizadas', color: 'text-emerald-400', icon: CheckCircle },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-3 rounded-xl border border-cyan-500/20 bg-[#0a1628]/40 backdrop-blur-md text-center"
            >
              <stat.icon size={16} className={cn("mx-auto mb-1", stat.color)} />
              <div className={cn("text-2xl font-black", stat.color)}>{stat.value}</div>
              <div className="text-[10px] text-cyan-100/50 uppercase">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoadingRodadas && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/40 p-4 animate-pulse">
              <div className="flex gap-3 mb-4">
                <div className="h-16 w-16 rounded-xl bg-cyan-500/10" />
                <div className="flex-1">
                  <div className="h-5 w-24 rounded bg-cyan-500/10 mb-2" />
                  <div className="h-4 w-32 rounded bg-cyan-500/10" />
                </div>
              </div>
              <div className="h-9 rounded bg-cyan-500/10" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-center p-6 rounded-xl border border-red-500/30 bg-red-500/5">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
            <p className="text-red-400 font-medium">Erro ao buscar rodadas</p>
            <p className="mt-1 text-xs text-red-300/60">{error?.message}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {rodadas && rodadas.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex min-h-[400px] items-center justify-center"
        >
          <div className="text-center p-8 rounded-2xl border border-cyan-500/20 bg-[#0a1628]/40 backdrop-blur-sm max-w-md">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/30">
              <Calendar className="h-10 w-10 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Nenhuma rodada encontrada</h3>
            <p className="mb-6 text-cyan-100/50 text-sm">
              Crie uma nova rodada para começar a organizar os jogos!
            </p>
            <Button 
              onClick={() => setIsCreateModalOpen(true)} 
              className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500"
            >
              <Plus className="mr-2 h-5 w-5" />
              Criar Primeira Rodada
            </Button>
          </div>
        </motion.div>
      )}

      {/* Grid de Rodadas */}
      {rodadas && rodadas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {rodadas
              .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
              .map((rodada, index) => (
                <RodadaCard
                  key={rodada.id}
                  rodada={rodada}
                  ligaId={ligaId}
                  onEdit={setEditingRodada}
                  onDelete={handleDelete}
                  index={index}
                />
              ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modais */}
      {isCreateModalOpen && (
        <RodadaCreateModal
          ligaId={ligaId}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {editingRodada && (
        <RodadaEditModal 
          rodada={editingRodada} 
          onClose={() => setEditingRodada(null)} 
        />
      )}
    </div>
  );
};