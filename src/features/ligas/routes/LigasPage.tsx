// Arquivo: src/features/ligas/routes/LigasPage.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, AlertTriangle, Trophy, Zap, Clock, XCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLigas } from '../api/useLigas';
import { useDeleteLiga } from '../api/useDeleteLiga';
import { useFinalizarLiga } from '../api/useFinalizarLiga';
import { LigaCreateModal } from '../components/LigaCreateModal';
import { LigaEditModal } from '../components/LigaEditModal';
import { LigaCard } from '../components/LigaCard';
import { cn } from '@/lib/utils';
import icLigas from '@/assets/icones/ligas.webp';
import PageTitle from '@/components/shared/PageTitle';

export const LigasPage = () => {
  const { data: ligas, isLoading, isError, error } = useLigas();
  const deleteMutation = useDeleteLiga();
  const finalizarMutation = useFinalizarLiga();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLigaId, setEditingLigaId] = useState<number | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'ativas' | 'encerradas' | 'pendentes'>('todas');

  // Calcular stats
  const stats = useMemo(() => {
    if (!ligas) return { total: 0, ativas: 0, encerradas: 0, pendentes: 0 };
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return ligas.reduce((acc, liga) => {
      const dataInicio = new Date(liga.data_inicio);
      const dataFim = new Date(liga.data_fim);
      dataInicio.setHours(0, 0, 0, 0);
      dataFim.setHours(0, 0, 0, 0);

      const foiFinalizada = !!liga.finalizada_em;
      const isAtiva = !foiFinalizada && hoje >= dataInicio && hoje <= dataFim;
      const isEncerrada = foiFinalizada || hoje > dataFim;

      return {
        total: acc.total + 1,
        ativas: acc.ativas + (isAtiva ? 1 : 0),
        encerradas: acc.encerradas + (isEncerrada ? 1 : 0),
        pendentes: acc.pendentes + (!isAtiva && !isEncerrada ? 1 : 0),
      };
    }, { total: 0, ativas: 0, encerradas: 0, pendentes: 0 });
  }, [ligas]);

  // Filtrar ligas
  const ligasFiltradas = useMemo(() => {
    if (!ligas || filtroStatus === 'todas') return ligas || [];

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return ligas.filter(liga => {
      const dataInicio = new Date(liga.data_inicio);
      const dataFim = new Date(liga.data_fim);
      dataInicio.setHours(0, 0, 0, 0);
      dataFim.setHours(0, 0, 0, 0);

      const foiFinalizada = !!liga.finalizada_em;
      const isAtiva = !foiFinalizada && hoje >= dataInicio && hoje <= dataFim;
      const isEncerrada = foiFinalizada || hoje > dataFim;

      switch (filtroStatus) {
        case 'ativas': return isAtiva;
        case 'encerradas': return isEncerrada;
        case 'pendentes': return !isAtiva && !isEncerrada;
        default: return true;
      }
    });
  }, [ligas, filtroStatus]);

  const handleDelete = (id: number) => deleteMutation.mutate(id);
  const handleFinalizar = (id: number) => finalizarMutation.mutate(id);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <PageTitle
        icon={icLigas}
        title="Ligas"
        subtitle="Gerencie suas temporadas e competições"
      >
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-cyan-500/25 border border-cyan-400/20"
        >
          <Plus className="mr-2 h-5 w-5" />
          NOVA LIGA
        </Button>
      </PageTitle>

      {/* Stats Cards */}
      {ligas && ligas.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { value: stats.total, label: 'Total', color: 'text-white', icon: Trophy, onClick: () => setFiltroStatus('todas') },
            { value: stats.ativas, label: 'Ativas', color: 'text-emerald-400', icon: Zap, onClick: () => setFiltroStatus('ativas') },
            { value: stats.pendentes, label: 'Pendentes', color: 'text-amber-400', icon: Clock, onClick: () => setFiltroStatus('pendentes') },
            { value: stats.encerradas, label: 'Encerradas', color: 'text-red-400', icon: XCircle, onClick: () => setFiltroStatus('encerradas') },
          ].map((stat, i) => (
            <motion.button
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={stat.onClick}
              className={cn(
                "p-3 rounded-xl border bg-[#0a1628]/40 backdrop-blur-md text-center transition-all",
                filtroStatus === stat.label.toLowerCase() || (filtroStatus === 'todas' && stat.label === 'Total')
                  ? "border-cyan-500/50 shadow-lg shadow-cyan-500/10"
                  : "border-cyan-500/20 hover:border-cyan-500/40"
              )}
            >
              <stat.icon size={16} className={cn("mx-auto mb-1", stat.color)} />
              <div className={cn("text-2xl font-black", stat.color)}>{stat.value}</div>
              <div className="text-[10px] text-cyan-100/50 uppercase">{stat.label}</div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Filtro ativo indicator */}
      {filtroStatus !== 'todas' && ligas && ligas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 flex items-center gap-2"
        >
          <span className="text-xs text-cyan-100/40">Filtrando por:</span>
          <span className="text-xs font-bold text-cyan-400 capitalize">{filtroStatus}</span>
          <button 
            onClick={() => setFiltroStatus('todas')}
            className="text-xs text-cyan-400/60 hover:text-cyan-400 underline"
          >
            Limpar
          </button>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/40 p-4 animate-pulse">
              <div className="flex gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-cyan-500/10" />
                <div className="flex-1">
                  <div className="h-5 w-3/4 rounded bg-cyan-500/10 mb-2" />
                  <div className="h-4 w-1/2 rounded bg-cyan-500/10" />
                </div>
              </div>
              <div className="h-8 rounded bg-cyan-500/10" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-center p-6 rounded-xl border border-red-500/30 bg-red-500/5">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
            <p className="text-red-400 font-medium">Erro ao buscar ligas</p>
            <p className="mt-1 text-xs text-red-300/60">{error?.message}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {ligas && ligas.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex min-h-[400px] items-center justify-center"
        >
          <div className="text-center p-8 rounded-2xl border border-cyan-500/20 bg-[#0a1628]/40 backdrop-blur-sm max-w-md">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/30">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Nenhuma liga cadastrada</h3>
            <p className="mb-6 text-cyan-100/50 text-sm">
              Crie sua primeira liga para começar a organizar as partidas!
            </p>
            <Button 
              onClick={() => setIsCreateModalOpen(true)} 
              className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500"
            >
              <Plus className="mr-2 h-5 w-5" />
              Criar Primeira Liga
            </Button>
          </div>
        </motion.div>
      )}

      {/* Empty filter results */}
      {ligas && ligas.length > 0 && ligasFiltradas.length === 0 && (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="text-center p-4 rounded-xl border border-cyan-500/20 bg-[#0a1628]/40">
            <Filter className="mx-auto mb-2 h-8 w-8 text-cyan-400/30" />
            <p className="mb-3 text-cyan-100/50 text-sm">Nenhuma liga {filtroStatus}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setFiltroStatus('todas')}
              className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 text-xs"
            >
              Ver Todas
            </Button>
          </div>
        </div>
      )}

      {/* Grid de Ligas - 3 colunas */}
      {ligasFiltradas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {ligasFiltradas.map((liga, index) => (
              <LigaCard
                key={liga.id}
                liga={liga}
                onEdit={setEditingLigaId}
                onDelete={handleDelete}
                onFinalizar={handleFinalizar}
                index={index}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modais */}
      {isCreateModalOpen && (
        <LigaCreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      )}
      {editingLigaId && (
        <LigaEditModal ligaId={editingLigaId} onClose={() => setEditingLigaId(null)} />
      )}
    </div>
  );
};