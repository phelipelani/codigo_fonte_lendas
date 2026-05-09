// Arquivo: src/features/Campeonatos/routes/CampeonatosPage.tsx
import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useCampeonatos } from '@/api/campeonatoApi';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Trophy, Plus, Users, ChevronRight, CheckCircle, Clock,
  AlertTriangle, Calendar, Target, Zap, Crown, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import icCampeonatos from '@/assets/icones/campeonatos.webp';
import { useAuth } from '@/hooks/useAuth';
import PageTitle from '@/components/shared/PageTitle';

interface Campeonato {
  id: number;
  nome: string;
  data: string;
  formato: string;
  fase_atual: string;
  time_campeao_id: number | null;
  time_campeao_nome: string | null;
  time_campeao_logo?: string;
  num_times?: number;
}

type FaseCampeonato = 'inscricao' | 'fase_de_pontos' | 'grupos' | 'mata_mata' | 'finalizada' | 'finalizado' | 'em_andamento';

// Função helper extraída para fora do componente (evita recriação a cada render)
const getFaseBadge = (fase: FaseCampeonato | string) => {
  if (!fase) return {
    label: 'Indefinida',
    color: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    icon: <AlertTriangle size={12} />
  };
  switch (fase) {
    case 'finalizada': case 'finalizado':
      return { label: 'Finalizado', color: 'border-amber-500/30 bg-amber-500/10 text-amber-400', icon: <CheckCircle size={12} /> };
    case 'inscricao':
      return { label: 'Inscrições', color: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400', icon: <Clock size={12} /> };
    case 'fase_de_pontos': case 'em_andamento':
      return { label: 'Em Andamento', color: 'border-green-500/30 bg-green-500/10 text-green-400', icon: <Zap size={12} /> };
    case 'fase_de_grupos': case 'grupos':
      return { label: 'Fase de Grupos', color: 'border-purple-500/30 bg-purple-500/10 text-purple-400', icon: <Target size={12} /> };
    case 'mata_mata':
      return { label: 'Mata-Mata', color: 'border-red-500/30 bg-red-500/10 text-red-400', icon: <Crown size={12} /> };
    default:
      return { label: fase, color: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400', icon: <AlertTriangle size={12} /> };
  }
};

const CampeonatoCard = memo(({ campeonato, index }: { campeonato: Campeonato; index: number }) => {
  const badge = getFaseBadge(campeonato.fase_atual);
  const isFinalizado = campeonato.fase_atual === 'finalizada' || campeonato.fase_atual === 'finalizado';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative overflow-hidden rounded-xl border transition-all cursor-pointer",
        "bg-[#0a1628]/50 backdrop-blur-md",
        isFinalizado
          ? "border-amber-500/30 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10"
          : "border-cyan-500/20 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10"
      )}
    >
      {/* Linha colorida no topo */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1",
        isFinalizado
          ? "bg-gradient-to-r from-amber-500 to-yellow-500"
          : "bg-gradient-to-r from-cyan-500 to-teal-500"
      )} />

      <Link to={`/campeonatos/${campeonato.id}`} className="block p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0 mr-3">
            <h2 className={cn(
              "text-lg font-bold truncate mb-2 transition-colors",
              isFinalizado ? "text-amber-100 group-hover:text-amber-400" : "text-white group-hover:text-cyan-400"
            )}>
              {campeonato.nome}
            </h2>
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] uppercase font-bold",
              badge.color
            )}>
              {badge.icon}
              <span>{badge.label}</span>
            </div>
          </div>

          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border",
            isFinalizado
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-[#0d1f35] border-cyan-500/20 text-cyan-400"
          )}>
            {isFinalizado ? <Trophy size={18} /> : <Calendar size={18} />}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="mb-4">
          {isFinalizado ? (
            <div className="flex flex-col items-center py-3">
              <div className="relative mb-3 group-hover:scale-105 transition-transform">
                <div className="w-16 h-16 rounded-full border-2 border-amber-500/30 p-0.5 bg-[#0d1f35] overflow-hidden shadow-lg shadow-amber-500/10">
                  {campeonato.time_campeao_logo ? (
                    <img src={campeonato.time_campeao_logo} alt="Campeão" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="w-full h-full bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold text-lg rounded-full">
                      {campeonato.time_campeao_nome ? campeonato.time_campeao_nome.substring(0, 2).toUpperCase() : <Trophy size={24} />}
                    </div>
                  )}
                </div>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-amber-500 text-amber-900 rounded-full p-1 shadow-lg">
                  <Crown size={10} fill="currentColor" />
                </div>
              </div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-amber-500/60 mb-1">Campeão</p>
              <h3 className="text-sm font-black text-amber-300 text-center">
                {campeonato.time_campeao_nome || "A definir"}
              </h3>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0d1f35]/50 border border-cyan-500/10">
                <Calendar size={14} className="text-cyan-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-cyan-100/40 uppercase font-bold">Início</p>
                  <p className="text-sm font-medium text-white truncate">
                    {campeonato.data ? format(new Date(campeonato.data), 'dd/MM/yyyy') : 'A definir'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0d1f35]/50 border border-cyan-500/10">
                <Target size={14} className="text-cyan-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-cyan-100/40 uppercase font-bold">Formato</p>
                  <p className="text-sm font-medium text-white truncate">
                    {campeonato.num_times ? `${campeonato.num_times} times` : campeonato.formato ? campeonato.formato.charAt(0).toUpperCase() + campeonato.formato.slice(1).replace(/_/g, ' ') : 'A definir'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botão */}
        <div className={cn(
          "flex items-center justify-between p-3 -mx-5 -mb-5 mt-4 border-t transition-colors",
          isFinalizado
            ? "border-amber-500/20 bg-amber-500/5 group-hover:bg-amber-500/10"
            : "border-cyan-500/10 bg-cyan-500/5 group-hover:bg-cyan-500/10"
        )}>
          <span className={cn(
            "text-xs font-bold uppercase",
            isFinalizado ? "text-amber-400/70" : "text-cyan-400/70"
          )}>
            {isFinalizado ? "Ver Resultados" : "Gerenciar"}
          </span>
          <ChevronRight size={16} className={cn(
            "transition-transform group-hover:translate-x-1",
            isFinalizado ? "text-amber-400" : "text-cyan-400"
          )} />
        </div>
      </Link>
    </motion.div>
  );
});

export function CampeonatosPage() {
  const { isAdmin } = useAuth();
  const { data: campeonatos, isLoading, isError, error } = useCampeonatos();

  const { totalCampeonatos, campeonatosAtivos, campeonatosFinalizados, inscricoesAbertas } = useMemo(() => {
    if (!campeonatos) return { totalCampeonatos: 0, campeonatosAtivos: 0, campeonatosFinalizados: 0, inscricoesAbertas: 0 };
    const finalizados = campeonatos.filter(c => c.fase_atual === 'finalizada' || c.fase_atual === 'finalizado').length;
    return {
      totalCampeonatos: campeonatos.length,
      campeonatosAtivos: campeonatos.length - finalizados,
      campeonatosFinalizados: finalizados,
      inscricoesAbertas: campeonatos.filter(c => c.fase_atual === 'inscricao').length,
    };
  }, [campeonatos]);

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <header className="mb-8">
          <PageTitle
            icon={icCampeonatos}
            title="Campeonatos"
            subtitle="Gerencie competições, times e resultados"
          >
            {isAdmin && (
              <Link to="/campeonatos/novo">
                <Button className="h-11 px-5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-cyan-500/25">
                  <Plus size={20} className="mr-2" />
                  Novo Campeonato
                </Button>
              </Link>
            )}
          </PageTitle>

          {/* Stats */}
          {campeonatos && campeonatos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 backdrop-blur-md p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Trophy size={16} className="text-cyan-400" />
                  <span className="text-[10px] text-cyan-100/50 uppercase font-bold">Total</span>
                </div>
                <p className="text-2xl font-black text-white">{totalCampeonatos}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={16} className="text-emerald-400" />
                  <span className="text-[10px] text-emerald-300/60 uppercase font-bold">Ativos</span>
                </div>
                <p className="text-2xl font-black text-emerald-400">{campeonatosAtivos}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle size={16} className="text-amber-400" />
                  <span className="text-[10px] text-amber-300/60 uppercase font-bold">Finalizados</span>
                </div>
                <p className="text-2xl font-black text-amber-400">{campeonatosFinalizados}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-md p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Users size={16} className="text-blue-400" />
                  <span className="text-[10px] text-blue-300/60 uppercase font-bold">Inscrições</span>
                </div>
                <p className="text-2xl font-black text-blue-400">{inscricoesAbertas}</p>
              </motion.div>
            </div>
          )}
        </header>

        {/* Erro */}
        {isError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 mb-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-red-400 mb-1">Erro ao Carregar</h3>
                <p className="text-sm text-red-300/70">
                  {error instanceof Error ? error.message : 'Erro desconhecido. Tente novamente.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-64 rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 animate-pulse" />
            ))}
          </div>
        )}

        {/* Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {campeonatos?.map((campeonato, index) => (
                <CampeonatoCard key={campeonato.id} campeonato={campeonato} index={index} />
              ))}
            </AnimatePresence>

            {/* Empty State */}
            {campeonatos?.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 px-4">
                <div className="w-20 h-20 rounded-2xl bg-[#0d1f35] border-2 border-dashed border-cyan-500/20 flex items-center justify-center mb-6">
                  <Trophy size={40} className="text-amber-400/30" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Nenhum campeonato encontrado</h3>
                <p className="text-cyan-100/50 text-center mb-6 max-w-md text-sm">
                  Crie seu primeiro campeonato para começar a gerenciar times e partidas.
                </p>
                <Link to="/campeonatos/novo">
                  <Button className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold">
                    <Plus size={20} className="mr-2" />
                    Criar Primeiro Campeonato
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CampeonatosPage;