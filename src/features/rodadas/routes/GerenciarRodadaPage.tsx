import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ChevronLeft, Users, SlidersHorizontal, Shuffle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Step } from '@/components/shared/Stepper';
import { useQuery } from '@tanstack/react-query';
import api from '@/api';

// Componentes das Etapas
import { useRodadaJogadores } from '../api/useRodadaJogadores';
import { JogadorSyncStep } from '../components/JogadorSyncStep';
import { NotasJogadoresStep } from '../components/NotasJogadoresStep';
import { MontarTimesManualStep } from '../components/MontarTimesManualStep';
import { ResultadoTimesStep } from '../components/ResultadoTimesStep';
import { RodadaFinalizadaView } from '../components/RodadaFinalizadaView';

import { useUpdateJogadoresBatch } from '@/features/jogadores/api/useUpdateJogadoresBatch';
import { Jogador } from '@/@types';
import { TimeManual, useSaveTimes } from '../api/useSaveTimes';
import { useLiga } from '@/features/ligas/api/useLigas';
import { cn } from '@/lib/utils';

enum RodadaStep {
  SyncJogadores = 1,
  AjustarNotas = 2,
  MontarManual = 3,
  ExibirTimes = 4,
}

const STEPS: Step[] = [
  { id: 1, label: 'Sincronizar', description: 'Lista de jogadores' },
  { id: 2, label: 'Ajustar Notas', description: 'Nível dos jogadores' },
  { id: 3, label: 'Sortear Times', description: 'Montar os times' },
  { id: 4, label: 'Confirmar', description: 'Times sorteados' },
];

export const GerenciarRodadaPage = () => {
  const { id, rodadaId } = useParams<{ id: string; rodadaId: string }>();
  const navigate = useNavigate();
  const idRodada = Number(rodadaId);
  const idLiga = Number(id);

  const [originalJogadores, setOriginalJogadores] = React.useState<Jogador[]>([]);
  const [currentStep, setCurrentStep] = React.useState<RodadaStep>(RodadaStep.SyncJogadores);
  const [jogadoresPorTime, setJogadoresPorTime] = React.useState(6);

  // Hooks de API
  const { data: liga } = useLiga(idLiga);
  
  const { data: rodadaInfo, isLoading: loadingInfo } = useQuery({
    queryKey: ['rodada', idRodada],
    queryFn: async () => (await api.get(`/rodadas/${idRodada}`)).data
  });

  const { data: jogadoresNaRodada, isLoading: isLoadingJogadores, isSuccess } = useRodadaJogadores(idRodada);
  
  const updateBatchMutation = useUpdateJogadoresBatch(idRodada);
  const saveTimesMutation = useSaveTimes(idRodada);

  // Definir passo inicial
  React.useEffect(() => {
    if (rodadaInfo?.status !== 'finalizada' && isSuccess && jogadoresNaRodada) {
      if (jogadoresNaRodada.length > 0) {
        setOriginalJogadores(jogadoresNaRodada);
        setCurrentStep(RodadaStep.AjustarNotas);
      } else {
        setOriginalJogadores([]);
        setCurrentStep(RodadaStep.SyncJogadores);
      }
    }
  }, [rodadaId, isSuccess, jogadoresNaRodada, rodadaInfo]);

  // Handlers
  const handleSalvarESortear = async (jogadoresAtualizados: Jogador[]) => {
    try {
      await updateBatchMutation.mutateAsync({
        originais: originalJogadores,
        atualizados: jogadoresAtualizados,
      });
      setOriginalJogadores(jogadoresAtualizados);
      await executarSorteio(jogadoresAtualizados);
    } catch (error) {
      console.error('Erro no fluxo de sorteio:', error);
    }
  };

  // Executa o sorteio (separado para poder re-sortear)
  const executarSorteio = async (jogadoresParaSortear?: Jogador[]) => {
    try {
      const jogadoresAlvo = jogadoresParaSortear || originalJogadores;
      const { sorteiarTimesAutomatico } = await import('../utils/sorteioAutomatico');
      const timesSorteados = sorteiarTimesAutomatico(jogadoresAlvo, jogadoresPorTime);

      const payload = {
        times: timesSorteados.map((t, index) => ({
          nome: `Time ${index + 1}`,
          jogadores: t.jogadores.map((j) => ({ id: j.id })),
        })),
      };

      await saveTimesMutation.mutateAsync(payload);
      setCurrentStep(RodadaStep.ExibirTimes);
    } catch (error) {
      console.error('Erro ao sortear:', error);
    }
  };

  const handleSalvarEMontarManual = (jogadoresAtualizados: Jogador[]) => {
    updateBatchMutation.mutate(
      { originais: originalJogadores, atualizados: jogadoresAtualizados },
      {
        onSuccess: () => {
          setOriginalJogadores(jogadoresAtualizados);
          setCurrentStep(RodadaStep.MontarManual);
        },
      }
    );
  };

  const handleConfirmarTimesManuais = (times: TimeManual[]) => {
    const payload = {
      times: times.map((t) => ({
        nome: t.nome,
        jogadores: t.jogadores.map((j) => ({ id: j.id })),
      })),
    };

    saveTimesMutation.mutate(payload, {
      onSuccess: () => setCurrentStep(RodadaStep.ExibirTimes),
    });
  };

  // Render Step Content
  const renderStepContent = () => {
    if (loadingInfo) {
      return (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      );
    }

    switch (currentStep) {
      case RodadaStep.SyncJogadores:
        return <JogadorSyncStep rodadaId={idRodada} onNext={() => setCurrentStep(RodadaStep.AjustarNotas)} />;
      
      case RodadaStep.AjustarNotas:
        if (isLoadingJogadores) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-cyan-400" /></div>;
        return (
          <NotasJogadoresStep
            jogadores={jogadoresNaRodada || []}
            jogadoresPorTime={jogadoresPorTime}
            setJogadoresPorTime={setJogadoresPorTime}
            onSortearAuto={handleSalvarESortear}
            onMontarManual={handleSalvarEMontarManual}
            isLoading={updateBatchMutation.isPending}
          />
        );

      case RodadaStep.MontarManual:
        return (
          <MontarTimesManualStep
            jogadores={originalJogadores}
            jogadoresPorTime={jogadoresPorTime}
            onConfirmar={handleConfirmarTimesManuais}
            isLoading={saveTimesMutation.isPending}
          />
        );

      case RodadaStep.ExibirTimes:
        return (
          <ResultadoTimesStep
            rodadaId={idRodada}
            ligaId={idLiga}
            onResortear={() => executarSorteio()}
            isRessorteando={saveTimesMutation.isPending}
          />
        );
        
      default:
        return <div className="text-red-400">Passo inválido</div>;
    }
  };

  // Rodada Finalizada View
  if (rodadaInfo?.status === 'finalizada') {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 text-cyan-100/50 hover:text-cyan-100 hover:bg-cyan-500/10"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <h1 className="text-3xl md:text-4xl font-black">
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent">
              Resumo da Rodada
            </span>
          </h1>
          <p className="mt-2 text-cyan-100/50 text-sm">Esta rodada já foi encerrada. Confira o histórico dos jogos.</p>
        </div>
        <RodadaFinalizadaView rodadaId={idRodada} />
      </div>
    );
  }

  // Stepper customizado inline
  const renderStepper = () => (
    <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
      {STEPS.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const icons = [Users, SlidersHorizontal, Shuffle, CheckCircle];
        const Icon = icons[index];
        
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center min-w-[80px]">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                isCompleted 
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30"
                  : isCurrent
                  ? "bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg shadow-cyan-500/30"
                  : "bg-[#0d1f35] border border-cyan-500/20 text-cyan-100/30"
              )}>
                {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
              </div>
              <span className={cn("mt-2 text-xs font-bold text-center", isCurrent ? "text-cyan-300" : isCompleted ? "text-emerald-400" : "text-cyan-100/30")}>
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={cn("flex-1 h-0.5 mx-2 rounded transition-all", isCompleted ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-cyan-500/20")} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 text-cyan-100/50 hover:text-cyan-100 hover:bg-cyan-500/10"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <h1 className="text-3xl md:text-4xl font-black">
          <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">Gerenciar Rodada</span>
        </h1>
      </div>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>{renderStepper()}</motion.div>

      <motion.div
        key={`${rodadaId}-${currentStep}`}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="min-h-[500px] rounded-2xl border border-cyan-500/20 bg-[#0a1628]/50 backdrop-blur-md p-4 md:p-8"
      >
        {renderStepContent()}
      </motion.div>
    </div>
  );
};
