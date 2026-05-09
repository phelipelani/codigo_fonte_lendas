// ============================================================================
// Arquivo: src/features/Campeonatos/routes/CampeonatoCreatePage.tsx
// Fluxo: Form -> (se fixo) Selecionar Times -> Criar + Inscrever + Iniciar -> Detail
// ============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Trophy, Users, Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/api';
import { getApiErrorMessage } from '@/utils/errorHandling';
import { CampeonatoForm } from '../components/CampeonatoForm';

// ============================================================================
// TIPOS
// ============================================================================

interface Time {
  id: number;
  nome: string;
  logo_url?: string;
}

interface FormData {
  nome: string;
  data: string;
  formato: string;
  num_times: number;
  modo_selecao_times: 'fixo' | 'sorteio';
  tem_fase_grupos?: boolean;
  tem_lower_bracket?: boolean;
  formato_mata_mata?: string;
}

// ============================================================================
// COMPONENTE: SELEÇÃO DE TIMES FIXOS
// ============================================================================

interface SelecaoTimesProps {
  numTimesNecessarios: number;
  timesSelecionados: number[];
  onToggleTime: (timeId: number) => void;
  onConfirmar: () => void;
  onVoltar: () => void;
  isLoading: boolean;
}

const SelecaoTimes = ({
  numTimesNecessarios,
  timesSelecionados,
  onToggleTime,
  onConfirmar,
  onVoltar,
  isLoading,
}: SelecaoTimesProps) => {
  const { data: times, isLoading: loadingTimes } = useQuery<Time[]>({
    queryKey: ['times'],
    queryFn: async () => (await api.get('/times')).data,
  });

  const podeConfirmar = timesSelecionados.length === numTimesNecessarios;

  if (loadingTimes) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onVoltar}
          className="flex items-center gap-2 text-cyan-100/50 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft size={18} /> Voltar
        </button>
        <span
          className={cn(
            'px-3 py-1 rounded-full text-sm font-bold',
            podeConfirmar
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-cyan-500/20 text-cyan-400'
          )}
        >
          {timesSelecionados.length} / {numTimesNecessarios}
        </span>
      </div>

      {/* Título */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
          <Users className="text-purple-400" />
          Selecionar Times
        </h2>
        <p className="text-cyan-100/50 mt-2">
          Escolha {numTimesNecessarios} times para participar do campeonato
        </p>
      </div>

      {/* Aviso sem times suficientes */}
      {times && times.length < numTimesNecessarios && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
          <p className="text-amber-300 text-sm">
            ⚠️ Você precisa cadastrar mais times. Atualmente tem {times.length}, mas precisa de{' '}
            {numTimesNecessarios}.
          </p>
          <Button
            onClick={() => (window.location.href = '/times/criar')}
            variant="outline"
            size="sm"
            className="mt-3 border-amber-500 text-amber-400"
          >
            Cadastrar Times
          </Button>
        </div>
      )}

      {/* Grid de Times */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {times?.map((time) => {
          const isSelected = timesSelecionados.includes(time.id);
          const canSelect = timesSelecionados.length < numTimesNecessarios || isSelected;
          return (
            <motion.button
              key={time.id}
              type="button"
              whileHover={canSelect ? { scale: 1.02 } : {}}
              whileTap={canSelect ? { scale: 0.98 } : {}}
              onClick={() => canSelect && onToggleTime(time.id)}
              disabled={!canSelect}
              className={cn(
                'relative p-4 rounded-xl border-2 transition-all text-center',
                isSelected
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20'
                  : canSelect
                  ? 'border-cyan-500/20 bg-[#0d1f35]/30 hover:border-cyan-500/40'
                  : 'border-cyan-500/10 bg-[#0d1f35]/20 opacity-50 cursor-not-allowed'
              )}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
              <div className="flex flex-col items-center gap-3">
                <div
                  className={cn(
                    'w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden',
                    isSelected ? 'bg-emerald-500/20' : 'bg-cyan-500/10'
                  )}
                >
                  {time.logo_url ? (
                    <img src={time.logo_url} alt={time.nome} className="w-12 h-12 object-contain" />
                  ) : (
                    <span
                      className={cn(
                        'text-xl font-bold',
                        isSelected ? 'text-emerald-400' : 'text-cyan-400'
                      )}
                    >
                      {time.nome.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm font-semibold text-center truncate w-full',
                    isSelected ? 'text-white' : 'text-cyan-100/70'
                  )}
                >
                  {time.nome}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Tags dos selecionados */}
      {timesSelecionados.length > 0 && (
        <div className="p-4 rounded-xl bg-[#0d1f35]/50 border border-cyan-500/20">
          <h4 className="text-xs text-cyan-100/50 uppercase font-bold mb-3">Times Selecionados</h4>
          <div className="flex flex-wrap gap-2">
            {timesSelecionados.map((timeId) => {
              const time = times?.find((t) => t.id === timeId);
              return (
                <motion.span
                  key={timeId}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium"
                >
                  {time?.nome}
                  <button onClick={() => onToggleTime(timeId)} className="hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                </motion.span>
              );
            })}
          </div>
        </div>
      )}

      {/* Botão Confirmar */}
      <Button
        onClick={onConfirmar}
        disabled={!podeConfirmar || isLoading}
        className={cn(
          'w-full h-12 font-bold',
          podeConfirmar
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
            : 'bg-cyan-500/20 text-cyan-100/50 cursor-not-allowed'
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Criando Campeonato...
          </>
        ) : (
          <>
            Confirmar e Criar Campeonato
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </motion.div>
  );
};

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================

export function CampeonatoCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<'form' | 'selecao'>('form');
  const [formData, setFormData] = useState<FormData | null>(null);
  const [timesSelecionados, setTimesSelecionados] = useState<number[]>([]);

  // Mutation principal: cria campeonato, inscreve times e já inicia
  const createMutation = useMutation({
    mutationFn: async (payload: { campeonato: FormData; times?: number[] }) => {
      // 1. Cria o campeonato
      const { data: campeonato } = await api.post('/campeonatos', payload.campeonato);
      const campeonatoId: number = campeonato.id;

      // 2. Inscreve os times (se fixo)
      if (payload.times && payload.times.length > 0) {
        for (const timeId of payload.times) {
          await api.post(`/campeonatos/${campeonatoId}/times`, { time_id: timeId });
        }
      }

      // 3. Se modo fixo: já inicia o campeonato direto (sem precisar de outro clique)
      if (payload.campeonato.modo_selecao_times === 'fixo') {
        await api.post(`/campeonatos/${campeonatoId}/iniciar`);
      }

      return { campeonatoId, modoSelecao: payload.campeonato.modo_selecao_times };
    },
    onSuccess: ({ campeonatoId, modoSelecao }) => {
      queryClient.invalidateQueries({ queryKey: ['campeonatos'] });
      toast.success('Campeonato criado com sucesso!');

      if (modoSelecao === 'sorteio') {
        navigate(`/campeonatos/${campeonatoId}/sorteio`);
      } else {
        navigate(`/campeonatos/${campeonatoId}`);
      }
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'Erro ao criar campeonato'));
    },
  });

  const handleFormSubmit = (data: FormData) => {
    setFormData(data);
    if (data.modo_selecao_times === 'fixo') {
      setStep('selecao');
    } else {
      // Sorteio: cria sem times, vai para página de sorteio
      createMutation.mutate({ campeonato: data });
    }
  };

  const handleToggleTime = (timeId: number) => {
    setTimesSelecionados((prev) =>
      prev.includes(timeId) ? prev.filter((id) => id !== timeId) : [...prev, timeId]
    );
  };

  const handleConfirmarSelecao = () => {
    if (!formData) return;
    createMutation.mutate({ campeonato: formData, times: timesSelecionados });
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <button
            onClick={() =>
              step === 'selecao' ? setStep('form') : navigate('/campeonatos')
            }
            className="flex items-center gap-2 text-cyan-100/50 hover:text-cyan-400 transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            {step === 'selecao' ? 'Voltar ao Formulário' : 'Voltar'}
          </button>

          <h1 className="text-3xl md:text-4xl font-black flex items-center gap-3">
            <Trophy className="text-amber-400" />
            <span className="bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent">
              Novo Campeonato
            </span>
          </h1>

          {/* Steps */}
          <div className="flex items-center gap-4 mt-6">
            <div
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all',
                step === 'form' ? 'bg-cyan-500 text-white' : 'bg-cyan-500/20 text-cyan-400'
              )}
            >
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">1</span>
              Configurar
            </div>
            {formData?.modo_selecao_times === 'fixo' && (
              <>
                <div className="w-8 h-0.5 bg-cyan-500/30" />
                <div
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all',
                    step === 'selecao' ? 'bg-purple-500 text-white' : 'bg-purple-500/20 text-purple-400'
                  )}
                >
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span>
                  Selecionar Times
                </div>
              </>
            )}
          </div>
        </header>

        {/* Conteúdo */}
        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
            >
              <CampeonatoForm
                onSubmit={handleFormSubmit}
                isLoading={createMutation.isPending && formData?.modo_selecao_times === 'sorteio'}
              />
            </motion.div>
          )}

          {step === 'selecao' && formData && (
            <SelecaoTimes
              numTimesNecessarios={formData.num_times}
              timesSelecionados={timesSelecionados}
              onToggleTime={handleToggleTime}
              onConfirmar={handleConfirmarSelecao}
              onVoltar={() => setStep('form')}
              isLoading={createMutation.isPending}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default CampeonatoCreatePage;