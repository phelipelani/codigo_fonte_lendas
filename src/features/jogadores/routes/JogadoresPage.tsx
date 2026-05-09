// Arquivo: src/features/jogadores/routes/JogadoresPage.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, AlertTriangle, Users, Search, SlidersHorizontal, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { getApiErrorMessage } from '@/utils/errorHandling';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';

import { useJogadores } from '../api/useJogadores';
import { JogadorCard } from '../components/JogadorCard';
import api from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import icJogadores from '@/assets/icones/jogadores.webp';
import PageTitle from '@/components/shared/PageTitle';

export const JogadoresPage = () => {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const { data: jogadores, isLoading, isError, error } = useJogadores();

  // Estado dos filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<'all' | 'linha' | 'goleiro'>('all');
  const [sortBy, setSortBy] = useState<'nome' | 'nivel' | 'posicao'>('nome');

  // Estado do modal de confirmação de delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jogadorToDelete, setJogadorToDelete] = useState<number | null>(null);

  // Filtragem e ordenação
  const filteredJogadores = useMemo(() => {
    if (!jogadores) return [];

    let filtered = [...jogadores];

    if (searchTerm) {
      filtered = filtered.filter((j) =>
        j.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (positionFilter !== 'all') {
      filtered = filtered.filter((j) => j.posicao === positionFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'nome': return a.nome.localeCompare(b.nome);
        case 'nivel': return b.nivel - a.nivel;
        case 'posicao': return a.posicao.localeCompare(b.posicao);
        default: return 0;
      }
    });

    return filtered;
  }, [jogadores, searchTerm, positionFilter, sortBy]);

  // Stats
  const stats = useMemo(() => {
    if (!jogadores) return { total: 0, linha: 0, goleiros: 0, comConta: 0 };
    return {
      total: jogadores.length,
      linha: jogadores.filter(j => j.posicao === 'linha').length,
      goleiros: jogadores.filter(j => j.posicao === 'goleiro').length,
      comConta: jogadores.filter(j => j.usuario?.tem_conta_ativa).length,
    };
  }, [jogadores]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setPositionFilter('all');
    setSortBy('nome');
  };

  const handleDeleteClick = (id: number) => {
    setJogadorToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!jogadorToDelete) return;
    try {
      await api.delete(`/jogadores/${jogadorToDelete}`);
      queryClient.invalidateQueries({ queryKey: ['jogadores'] });
      toast.success('Jogador deletado com sucesso!');
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erro ao deletar jogador.'));
    } finally {
      setDeleteDialogOpen(false);
      setJogadorToDelete(null);
    }
  };

  const hasActiveFilters = searchTerm !== '' || positionFilter !== 'all' || sortBy !== 'nome';

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <PageTitle
          icon={icJogadores}
          title="Jogadores"
          subtitle={`${jogadores?.length || 0} jogadores cadastrados`}
        >
          {isAdmin && (
            <Button asChild className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-cyan-500/25 border border-cyan-400/20">
              <Link to="/jogadores/novo">
                <Plus className="mr-2 h-5 w-5" />
                NOVO JOGADOR
              </Link>
            </Button>
          )}
        </PageTitle>

        {/* Stats Cards */}
        {jogadores && jogadores.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { value: stats.total, label: 'Total', color: 'text-white' },
              { value: stats.linha, label: 'Linha', color: 'text-cyan-400' },
              { value: stats.goleiros, label: 'Goleiros', color: 'text-emerald-400' },
              { value: stats.comConta, label: 'Com acesso', color: 'text-amber-400' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-3 rounded-xl border border-cyan-500/20 bg-[#0a1628]/40 backdrop-blur-md text-center"
              >
                <div className={cn("text-2xl font-black", stat.color)}>{stat.value}</div>
                <div className="text-[10px] text-cyan-100/50 uppercase">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Filtros */}
        {jogadores && jogadores.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/40 backdrop-blur-md p-3 mb-6"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              {/* Busca */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400/50" />
                <Input
                  placeholder="Buscar jogador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9 bg-[#0d1f35]/50 border-cyan-500/20 text-white placeholder:text-cyan-100/30 focus:border-cyan-400/50 rounded-lg text-sm"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/50 hover:text-cyan-400">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filtros */}
              <div className="flex items-center gap-2">
                <Select value={positionFilter} onValueChange={(v: any) => setPositionFilter(v)}>
                  <SelectTrigger className="w-[100px] h-9 bg-[#0d1f35]/50 border-cyan-500/20 text-white rounded-lg text-xs">
                    <SelectValue placeholder="Posição" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="linha">⚽ Linha</SelectItem>
                    <SelectItem value="goleiro">🧤 Goleiro</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-[90px] h-9 bg-[#0d1f35]/50 border-cyan-500/20 text-white rounded-lg text-[10px]">
                    <SlidersHorizontal className="mr-1 h-3 w-3 flex-shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nome">Nome</SelectItem>
                    <SelectItem value="nivel">Nível</SelectItem>
                    <SelectItem value="posicao">Posição</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-cyan-400/60 hover:text-cyan-400 hover:bg-cyan-500/10 h-9 text-xs px-2">
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-2 pt-2 border-t border-cyan-500/10">
                <p className="text-[10px] text-cyan-100/40">{filteredJogadores.length} resultados</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-cyan-400" />
              <p className="text-cyan-100/50 text-sm">Carregando jogadores...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="text-center p-6 rounded-xl border border-red-500/30 bg-red-500/5">
              <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
              <p className="text-red-400 font-medium text-sm">Erro ao buscar jogadores</p>
              <p className="mt-1 text-xs text-red-300/60">{error.message}</p>
            </div>
          </div>
        )}

        {/* Empty */}
        {jogadores && jogadores.length === 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex min-h-[300px] items-center justify-center">
            <div className="text-center p-6 rounded-2xl border border-cyan-500/20 bg-[#0a1628]/60 backdrop-blur-sm max-w-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/30">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-white">Nenhum jogador</h3>
              <p className="mb-4 text-cyan-100/50 text-sm">Comece cadastrando o primeiro!</p>
              <Button asChild className="bg-gradient-to-r from-cyan-600 to-teal-600">
                <Link to="/jogadores/novo"><Plus className="mr-2 h-4 w-4" /> Cadastrar</Link>
              </Button>
            </div>
          </motion.div>
        )}

        {/* No Results */}
        {jogadores && jogadores.length > 0 && filteredJogadores.length === 0 && (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="text-center p-4 rounded-xl border border-cyan-500/20 bg-[#0a1628]/60">
              <Search className="mx-auto mb-2 h-8 w-8 text-cyan-400/30" />
              <p className="mb-3 text-cyan-100/50 text-sm">Nenhum jogador encontrado</p>
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 text-xs">
                Limpar Filtros
              </Button>
            </div>
          </div>
        )}

        {/* ✅ GRID 3 COLUNAS */}
        {filteredJogadores.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredJogadores.map((jogador, index) => (
                <motion.div
                  key={jogador.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <JogadorCard jogador={jogador} onDelete={isAdmin ? handleDeleteClick : undefined} isAdmin={isAdmin} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-[#0a1628] border-cyan-500/20">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription className="text-cyan-100/50">
                O jogador será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white">Deletar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
};