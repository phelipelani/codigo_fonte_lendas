// Arquivo: src/features/rodadas/routes/PartidasPage.tsx
import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Circle, CheckCircle, Plus, Minus, X, Play, Pause, 
  ChevronLeft, Timer, Trophy, Users, ArrowLeftRight,
  Flag, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { useQuery } from '@tanstack/react-query';
import api from '@/api';

import AmareloLogo from '@/assets/Amarelo.webp';
import PretoLogo from '@/assets/Preto.webp';
import AzulLogo from '@/assets/Azul.webp';
import RosaLogo from '@/assets/Rosa.webp';

const TEAM_LOGOS = [AmareloLogo, PretoLogo, AzulLogo, RosaLogo];

import { SelecionarTimeModal } from '../components/SelecionarTimeModal';
import { SubstituirJogadorModal } from '../components/SubstituirJogadorModal';
import { GolContraModal } from '../components/GolContraModal';
import { FimDeJogoModal } from '../components/FimDeJogoModal';

import { useGetTimes } from '../api/useGetTimes';
import { useCreatePartida } from '../api/useCreatePartida';

import { JogadorEmPartida, TimeEmPartida } from '@/@types/partida';
import { Jogador } from '@/@types';

import { getTeamConfig } from '../config/teamColors';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// BUSCAR GOLEIROS
// -----------------------------------------------------------------------------
const useGoleiros = () => {
  return useQuery<Jogador[], Error>({
    queryKey: ['goleiros'],
    queryFn: async () => {
      const { data } = await api.get('/jogadores', {
        params: { posicao: 'goleiro' },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// -----------------------------------------------------------------------------
// ÍCONES
// -----------------------------------------------------------------------------
const BallIcon = React.memo(({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="12" r="10" opacity="0.2" />
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
    <path d="M12 7l-1.5 4.5h-4l3.5 2.5-1.5 4.5 3.5-2.5 3.5 2.5-1.5-4.5 3.5-2.5h-4z" opacity="0.6" />
  </svg>
));

const BootIcon = React.memo(({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-2H2v2z" />
    <path d="M12 5l-8 8h16l-8-8z" opacity="0.6" />
    <circle cx="6" cy="17" r="1" />
    <circle cx="12" cy="17" r="1" />
    <circle cx="18" cy="17" r="1" />
  </svg>
));

// -----------------------------------------------------------------------------
// MODAL DE CONFIRMAÇÃO
// -----------------------------------------------------------------------------
interface ModalConfirmacaoProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  titulo: string;
  mensagem: string;
}

const ModalConfirmacao: React.FC<ModalConfirmacaoProps> = React.memo(({
  isOpen,
  onClose,
  onConfirm,
  titulo,
  mensagem,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#0a1628] rounded-xl p-6 max-w-md w-full mx-4 border border-cyan-500/20 shadow-2xl"
        >
          <h3 className="text-xl font-bold text-white mb-4">{titulo}</h3>
          <p className="text-cyan-100/60 mb-6">{mensagem}</p>
          <div className="flex gap-3 justify-end">
            <Button 
              onClick={onClose} 
              variant="ghost"
              className="text-cyan-100/60 hover:text-cyan-100 hover:bg-cyan-500/10"
            >
              Cancelar
            </Button>
            <Button 
              onClick={onConfirm} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirmar
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

// -----------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// -----------------------------------------------------------------------------
export const PartidasPage = () => {
  const { id: ligaId, rodadaId } = useParams<{ id: string; rodadaId: string }>();
  const navigate = useNavigate();

  const idRodada = Number(rodadaId);
  const idLiga = Number(ligaId);

  // Hooks da API
  const { data: jogadoresComTime, isLoading } = useGetTimes(idRodada);
  const { data: goleiros } = useGoleiros();
  const createPartidaMutation = useCreatePartida(idRodada);

  // ---------------------------------------------------------------------------
  // ESTADOS DA PARTIDA
  // ---------------------------------------------------------------------------
  const [partidaId, setPartidaId] = React.useState<number | null>(null);
  const [time1, setTime1] = React.useState<TimeEmPartida | null>(null);
  const [time2, setTime2] = React.useState<TimeEmPartida | null>(null);

  const [segundos, setSegundos] = React.useState(0);
  const [isRodando, setIsRodando] = React.useState(false);

  const [placar1, setPlacar1] = React.useState(0);
  const [placar2, setPlacar2] = React.useState(0);

  const [historicoGols, setHistoricoGols] = React.useState<
    Array<{ jogador: string; time: 'time1' | 'time2'; tempo: string }>
  >([]);

  // ---------------------------------------------------------------------------
  // MODAIS
  // ---------------------------------------------------------------------------
  const [modalSelecionarTime, setModalSelecionarTime] = React.useState<'time1' | 'time2' | null>(null);
  const [modalSubstituir, setModalSubstituir] = React.useState<{
    isOpen: boolean;
    timeSlot: 'time1' | 'time2';
    jogadorSaindo: Jogador | null;
  }>({ isOpen: false, timeSlot: 'time1', jogadorSaindo: null });
  const [modalGolContra, setModalGolContra] = React.useState<{
    isOpen: boolean;
    timeQueMarcou: 'time1' | 'time2';
  }>({ isOpen: false, timeQueMarcou: 'time1' });
  const [modalFimDeJogo, setModalFimDeJogo] = React.useState(false);
  const [showConfirmacao, setShowConfirmacao] = React.useState<{
    isOpen: boolean;
    tipo: 'finalizar-partida' | 'finalizar-rodada' | null;
  }>({ isOpen: false, tipo: null });

  // ---------------------------------------------------------------------------
  // CÁLCULOS E MEMOS
  // ---------------------------------------------------------------------------
  const timesDisponiveis = React.useMemo(() => {
    if (!jogadoresComTime) return [];

    const grupos = jogadoresComTime.reduce(
      (acc, jogador) => {
        if (!acc[jogador.numero_time]) {
          acc[jogador.numero_time] = {
            numero: jogador.numero_time,
            nome: jogador.nome_time,
            jogadores: [],
          };
        }
        acc[jogador.numero_time].jogadores.push(jogador);
        return acc;
      },
      {} as Record<number, { numero: number; nome: string; jogadores: Jogador[] }>
    );

    return Object.values(grupos);
  }, [jogadoresComTime]);

  const jogadoresDisponiveis = React.useMemo(() => {
    if (!jogadoresComTime || !goleiros) return [];

    const todosOsJogadores = [...jogadoresComTime];
    goleiros.forEach((g) => {
      if (!todosOsJogadores.some((j) => j.id === g.id)) {
        todosOsJogadores.push(g);
      }
    });

    const emCampo = [
      ...(time1?.jogadores.map((j) => j.id) || []),
      ...(time2?.jogadores.map((j) => j.id) || []),
    ];

    return todosOsJogadores.filter((j) => !emCampo.includes(j.id));
  }, [jogadoresComTime, goleiros, time1, time2]);

  // Timer
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRodando) {
      interval = setInterval(() => setSegundos((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRodando]);

  const formatTempo = React.useCallback((seg: number) => {
    const m = Math.floor(seg / 60).toString().padStart(2, '0');
    const s = (seg % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  // Configs de Time
  const config1 = React.useMemo(() => time1 ? getTeamConfig(time1.numero) : null, [time1]);
  const config2 = React.useMemo(() => time2 ? getTeamConfig(time2.numero) : null, [time2]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleSelecionarTime = (
    t: { numero: number; nome: string; jogadores: Jogador[] },
    slot: 'time1' | 'time2'
  ) => {
    const jogadoresConvertidos: JogadorEmPartida[] = t.jogadores.map((j) => ({
      ...j,
      gols: 0,
      assistencias: 0,
    }));

    const novoTime: TimeEmPartida = {
      numero: t.numero,
      nome: t.nome,
      jogadores: jogadoresConvertidos,
    };

    if (slot === 'time1') setTime1(novoTime);
    else setTime2(novoTime);
    setModalSelecionarTime(null);
  };

  const handleStatChange = (
    timeSlot: 'time1' | 'time2',
    jogadorId: number,
    stat: 'gols' | 'assistencias',
    delta: number
  ) => {
    const setTime = timeSlot === 'time1' ? setTime1 : setTime2;
    const setPlacar = timeSlot === 'time1' ? setPlacar1 : setPlacar2;
    const time = timeSlot === 'time1' ? time1 : time2;

    if (!time) return;

    setTime((prev) => {
      if (!prev) return prev;
      const novosJogadores = prev.jogadores.map((j) => {
        if (j.id === jogadorId) {
          const novoValor = Math.max(0, j[stat] + delta);
          return { ...j, [stat]: novoValor };
        }
        return j;
      });
      return { ...prev, jogadores: novosJogadores };
    });

    if (stat === 'gols') {
      setPlacar((p) => Math.max(0, p + delta));

      if (delta > 0) {
        const jogador = time.jogadores.find((j) => j.id === jogadorId);
        if (jogador) {
          setHistoricoGols((h) => [
            ...h,
            {
              jogador: jogador.nome,
              time: timeSlot,
              tempo: formatTempo(segundos),
            },
          ]);
        }
      }
    }
  };

  const handleSubstituir = (jogadorEntrando: Jogador) => {
    const { timeSlot, jogadorSaindo } = modalSubstituir;
    if (!jogadorSaindo) return;

    const setTime = timeSlot === 'time1' ? setTime1 : setTime2;

    setTime((prev) => {
      if (!prev) return prev;
      const novosJogadores = prev.jogadores.map((j) =>
        j.id === jogadorSaindo.id
          ? { ...jogadorEntrando, gols: 0, assistencias: 0 }
          : j
      );
      return { ...prev, jogadores: novosJogadores };
    });

    setModalSubstituir({ isOpen: false, timeSlot: 'time1', jogadorSaindo: null });
    toast.success(`${jogadorEntrando.nome} entrou no lugar de ${jogadorSaindo.nome}`);
  };

  const handleGolContra = (jogador: JogadorEmPartida) => {
    const { timeQueMarcou } = modalGolContra;
    const timeBeneficiado = timeQueMarcou === 'time1' ? 'time2' : 'time1';
    const setPlacar = timeBeneficiado === 'time1' ? setPlacar1 : setPlacar2;

    setPlacar((p) => p + 1);

    setHistoricoGols((h) => [
      ...h,
      {
        jogador: `${jogador.nome} (contra)`,
        time: timeBeneficiado,
        tempo: formatTempo(segundos),
      },
    ]);

    setModalGolContra({ isOpen: false, timeQueMarcou: 'time1' });
    toast.info(`Gol contra de ${jogador.nome}!`);
  };

  const handleIniciarPartida = async () => {
    if (!time1 || !time2) {
      toast.error('Selecione os dois times primeiro!');
      return;
    }

    try {
      const response = await createPartidaMutation.mutateAsync({
        time1_id: time1.numero,
        time2_id: time2.numero,
      });

      setPartidaId(response.id);
      setIsRodando(true);
      toast.success('Partida iniciada!');
    } catch (error) {
      toast.error('Erro ao criar partida');
    }
  };

  const handleFinalizarPartida = () => {
    setShowConfirmacao({ isOpen: true, tipo: 'finalizar-partida' });
  };

  const handleConfirmarAcao = async () => {
    if (showConfirmacao.tipo === 'finalizar-partida') {
      setIsRodando(false);

      if (partidaId && time1 && time2) {
        try {
          await api.put(`/partidas/${partidaId}/finalizar`, {
            placar_time1: placar1,
            placar_time2: placar2,
            jogadores_time1: time1.jogadores.map((j) => ({
              jogador_id: j.id,
              gols: j.gols,
              assistencias: j.assistencias,
            })),
            jogadores_time2: time2.jogadores.map((j) => ({
              jogador_id: j.id,
              gols: j.gols,
              assistencias: j.assistencias,
            })),
          });

          setModalFimDeJogo(true);
        } catch (error) {
          toast.error('Erro ao finalizar partida');
        }
      }
    } else if (showConfirmacao.tipo === 'finalizar-rodada') {
      try {
        await api.put(`/rodadas/${idRodada}/finalizar`);
        toast.success('Rodada finalizada!');
        navigate(`/ligas/${idLiga}/rodadas`);
      } catch (error) {
        toast.error('Erro ao finalizar rodada');
      }
    }
    setShowConfirmacao({ isOpen: false, tipo: null });
  };

  const handleProximaPartida = () => {
    setModalFimDeJogo(false);
    setPartidaId(null);
    setTime1(null);
    setTime2(null);
    setPlacar1(0);
    setPlacar2(0);
    setSegundos(0);
    setHistoricoGols([]);
  };

  const handleFinalizarRodada = () => {
    setShowConfirmacao({ isOpen: true, tipo: 'finalizar-rodada' });
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-400" />
          <p className="text-cyan-100/50">Carregando times...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-cyan-100/50 hover:text-cyan-100 hover:bg-cyan-500/10"
        >
          <ChevronLeft size={18} className="mr-1" />
          Voltar
        </Button>

        <div className="flex items-center gap-2">
          {!isRodando && !time1 && !time2 && (
            <Button
              size="sm"
              onClick={handleFinalizarRodada}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
            >
              <Flag size={14} className="mr-1" />
              Encerrar Rodada
            </Button>
          )}
        </div>
      </div>

      {/* Timer e Placar Central */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-cyan-500/20 bg-[#0a1628]/60 backdrop-blur-md p-4 mb-4"
      >
        {/* Timer */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/30 border border-cyan-500/20">
            <Timer size={16} className="text-cyan-400" />
            <span className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-wider">
              {formatTempo(segundos)}
            </span>
          </div>
        </div>

        {/* Placar */}
        <div className="flex items-center justify-center gap-3 sm:gap-6">
          {/* Time 1 */}
          <div className="flex-1 text-center">
            {time1 ? (
              <div className="flex flex-col items-center">
                <img
                  src={TEAM_LOGOS[(time1.numero - 1) % 4]}
                  alt={config1?.nome}
                  className="h-10 w-10 sm:h-16 sm:w-16 object-contain mb-1 sm:mb-2"
                />
                <span className="text-xs sm:text-sm font-bold text-white leading-tight">{config1?.nome}</span>
              </div>
            ) : (
              <div className="h-16 sm:h-20 flex items-center justify-center">
                <span className="text-cyan-100/30 text-xs sm:text-sm">Time 1</span>
              </div>
            )}
          </div>

          {/* Placar Central */}
          <div className="flex items-center gap-2 sm:gap-4">
            <motion.div
              key={placar1}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-4xl sm:text-5xl font-black text-white"
            >
              {placar1}
            </motion.div>
            <span className="text-xl sm:text-2xl text-cyan-500">×</span>
            <motion.div
              key={placar2}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-4xl sm:text-5xl font-black text-white"
            >
              {placar2}
            </motion.div>
          </div>

          {/* Time 2 */}
          <div className="flex-1 text-center">
            {time2 ? (
              <div className="flex flex-col items-center">
                <img
                  src={TEAM_LOGOS[(time2.numero - 1) % 4]}
                  alt={config2?.nome}
                  className="h-10 w-10 sm:h-16 sm:w-16 object-contain mb-1 sm:mb-2"
                />
                <span className="text-xs sm:text-sm font-bold text-white leading-tight">{config2?.nome}</span>
              </div>
            ) : (
              <div className="h-16 sm:h-20 flex items-center justify-center">
                <span className="text-cyan-100/30 text-xs sm:text-sm">Time 2</span>
              </div>
            )}
          </div>
        </div>

        {/* Botões de Controle */}
        <div className="flex justify-center gap-2 mt-3 flex-wrap">
          {!isRodando && time1 && time2 && !partidaId && (
            <Button
              onClick={handleIniciarPartida}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 text-sm h-9"
            >
              <Play size={16} className="mr-1.5" />
              Iniciar Partida
            </Button>
          )}

          {isRodando && (
            <>
              <Button
                onClick={() => setIsRodando(false)}
                variant="ghost"
                className="text-amber-400 hover:bg-amber-500/10 text-sm h-9 px-3"
              >
                <Pause size={16} className="mr-1.5" />
                Pausar
              </Button>
              <Button
                onClick={handleFinalizarPartida}
                className="bg-red-600 hover:bg-red-700 text-white text-sm h-9 px-3"
              >
                <Flag size={16} className="mr-1.5" />
                Finalizar
              </Button>
            </>
          )}

          {!isRodando && partidaId && (
            <Button
              onClick={() => setIsRodando(true)}
              className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-sm h-9 px-3"
            >
              <Play size={16} className="mr-1.5" />
              Retomar
            </Button>
          )}
        </div>
      </motion.div>

      {/* Grid dos Times */}
      <div className="grid grid-cols-2 gap-2">
        {/* TIME 1 */}
        <div className={cn(
          "rounded-xl border p-2 sm:p-3 transition-all",
          time1 
            ? `border-${config1?.color || 'cyan'}-500/30 bg-${config1?.color || 'cyan'}-500/5`
            : "border-cyan-500/20 bg-[#0a1628]/40"
        )}>
          {time1 ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-cyan-100/50 uppercase">Time 1</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setModalGolContra({ isOpen: true, timeQueMarcou: 'time1' })}
                  disabled={!isRodando}
                  className="h-5 px-1.5 text-[9px] text-red-400 hover:bg-red-500/10"
                >
                  Gol Contra
                </Button>
              </div>

              <div className="space-y-1.5">
                {time1.jogadores.map((jogador) => (
                  <div
                    key={jogador.id}
                    className="flex flex-col gap-1 p-2 rounded-lg bg-black/20 border border-white/5"
                  >
                    {/* Nome + Avatar */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-cyan-500/30 to-teal-500/30 flex items-center justify-center text-[10px] font-bold text-white">
                        {jogador.nome.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="flex-1 font-medium text-xs text-white truncate">
                        {jogador.nome}
                      </span>
                    </div>

                    {/* Controles em linha compacta */}
                    <div className="flex items-center justify-between gap-1">
                      {/* Gols */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleStatChange('time1', jogador.id, 'gols', -1)}
                          disabled={!isRodando || jogador.gols === 0}
                          className="h-6 w-6 flex items-center justify-center rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-30"
                        >
                          <Minus size={10} />
                        </button>
                        <div className="flex items-center gap-0.5 min-w-[22px] justify-center">
                          <BallIcon className="h-3 w-3 text-emerald-400" />
                          <span className="text-[11px] font-bold text-white">{jogador.gols}</span>
                        </div>
                        <button
                          onClick={() => handleStatChange('time1', jogador.id, 'gols', 1)}
                          disabled={!isRodando}
                          className="h-6 w-6 flex items-center justify-center rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30"
                        >
                          <Plus size={10} />
                        </button>
                      </div>

                      {/* Assistências */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleStatChange('time1', jogador.id, 'assistencias', -1)}
                          disabled={!isRodando || jogador.assistencias === 0}
                          className="h-6 w-6 flex items-center justify-center rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-30"
                        >
                          <Minus size={10} />
                        </button>
                        <div className="flex items-center gap-0.5 min-w-[22px] justify-center">
                          <BootIcon className="h-3 w-3 text-blue-400" />
                          <span className="text-[11px] font-bold text-white">{jogador.assistencias}</span>
                        </div>
                        <button
                          onClick={() => handleStatChange('time1', jogador.id, 'assistencias', 1)}
                          disabled={!isRodando}
                          className="h-6 w-6 flex items-center justify-center rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-30"
                        >
                          <Plus size={10} />
                        </button>
                      </div>

                      {/* Substituir */}
                      <button
                        onClick={() => setModalSubstituir({ isOpen: true, timeSlot: 'time1', jogadorSaindo: jogador })}
                        disabled={!isRodando}
                        className="h-6 w-6 flex items-center justify-center rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 disabled:opacity-30"
                        title="Substituir"
                      >
                        <ArrowLeftRight size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48">
              <Button
                onClick={() => setModalSelecionarTime('time1')}
                className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500"
              >
                <Users size={18} className="mr-2" />
                Selecionar Time 1
              </Button>
            </div>
          )}
        </div>

        {/* TIME 2 */}
        <div className={cn(
          "rounded-xl border p-2 sm:p-3 transition-all",
          time2 
            ? `border-${config2?.color || 'cyan'}-500/30 bg-${config2?.color || 'cyan'}-500/5`
            : "border-cyan-500/20 bg-[#0a1628]/40"
        )}>
          {time2 ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-cyan-100/50 uppercase">Time 2</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setModalGolContra({ isOpen: true, timeQueMarcou: 'time2' })}
                  disabled={!isRodando}
                  className="h-5 px-1.5 text-[9px] text-red-400 hover:bg-red-500/10"
                >
                  Gol Contra
                </Button>
              </div>

              <div className="space-y-1.5">
                {time2.jogadores.map((jogador) => (
                  <div
                    key={jogador.id}
                    className="flex flex-col gap-1 p-2 rounded-lg bg-black/20 border border-white/5"
                  >
                    {/* Nome + Avatar */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-cyan-500/30 to-teal-500/30 flex items-center justify-center text-[10px] font-bold text-white">
                        {jogador.nome.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="flex-1 font-medium text-xs text-white truncate">
                        {jogador.nome}
                      </span>
                    </div>

                    {/* Controles em linha compacta */}
                    <div className="flex items-center justify-between gap-1">
                      {/* Gols */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleStatChange('time2', jogador.id, 'gols', -1)}
                          disabled={!isRodando || jogador.gols === 0}
                          className="h-6 w-6 flex items-center justify-center rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-30"
                        >
                          <Minus size={10} />
                        </button>
                        <div className="flex items-center gap-0.5 min-w-[22px] justify-center">
                          <BallIcon className="h-3 w-3 text-emerald-400" />
                          <span className="text-[11px] font-bold text-white">{jogador.gols}</span>
                        </div>
                        <button
                          onClick={() => handleStatChange('time2', jogador.id, 'gols', 1)}
                          disabled={!isRodando}
                          className="h-6 w-6 flex items-center justify-center rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30"
                        >
                          <Plus size={10} />
                        </button>
                      </div>

                      {/* Assistências */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleStatChange('time2', jogador.id, 'assistencias', -1)}
                          disabled={!isRodando || jogador.assistencias === 0}
                          className="h-6 w-6 flex items-center justify-center rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-30"
                        >
                          <Minus size={10} />
                        </button>
                        <div className="flex items-center gap-0.5 min-w-[22px] justify-center">
                          <BootIcon className="h-3 w-3 text-blue-400" />
                          <span className="text-[11px] font-bold text-white">{jogador.assistencias}</span>
                        </div>
                        <button
                          onClick={() => handleStatChange('time2', jogador.id, 'assistencias', 1)}
                          disabled={!isRodando}
                          className="h-6 w-6 flex items-center justify-center rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-30"
                        >
                          <Plus size={10} />
                        </button>
                      </div>

                      {/* Substituir */}
                      <button
                        onClick={() => setModalSubstituir({ isOpen: true, timeSlot: 'time2', jogadorSaindo: jogador })}
                        disabled={!isRodando}
                        className="h-6 w-6 flex items-center justify-center rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 disabled:opacity-30"
                        title="Substituir"
                      >
                        <ArrowLeftRight size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48">
              <Button
                onClick={() => setModalSelecionarTime('time2')}
                className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500"
              >
                <Users size={18} className="mr-2" />
                Selecionar Time 2
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Histórico de Gols */}
      {historicoGols.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-4 rounded-xl border border-cyan-500/20 bg-[#0a1628]/40 p-3"
        >
          <div className="text-xs font-bold text-cyan-100/50 uppercase mb-2 flex items-center gap-2">
            <Trophy size={12} />
            Histórico de Gols
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {historicoGols.map((h, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs bg-black/20 rounded px-2 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <BallIcon className="h-3 w-3 text-emerald-400" />
                  <span className="font-medium text-white">{h.jogador}</span>
                  <span className="text-cyan-100/40">
                    {h.time === 'time1' ? config1?.nome : config2?.nome}
                  </span>
                </div>
                <span className="text-cyan-100/40 font-mono">{h.tempo}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* MODAIS */}
      <SelecionarTimeModal
        isOpen={!!modalSelecionarTime}
        onClose={() => setModalSelecionarTime(null)}
        onSelectTime={(t) => modalSelecionarTime && handleSelecionarTime(t, modalSelecionarTime)}
        times={timesDisponiveis}
        title={modalSelecionarTime === 'time1' ? 'Selecionar Time 1' : 'Selecionar Time 2'}
        className="max-w-sm w-[85%] mx-auto"
      />

      <SubstituirJogadorModal
        isOpen={modalSubstituir.isOpen}
        onClose={() => setModalSubstituir({ isOpen: false, jogadorSaindo: null, timeSlot: 'time1' })}
        jogadorSaindo={modalSubstituir.jogadorSaindo}
        jogadoresDisponiveis={jogadoresDisponiveis}
        onSelect={handleSubstituir}
        className="max-w-sm w-[85%] mx-auto"
      />

      <GolContraModal
        isOpen={modalGolContra.isOpen}
        onClose={() => setModalGolContra({ isOpen: false, timeQueMarcou: 'time1' })}
        jogadores={modalGolContra.timeQueMarcou === 'time1' ? time1?.jogadores || [] : time2?.jogadores || []}
        nomeTime={modalGolContra.timeQueMarcou === 'time1' ? config1?.nome || 'Time 1' : config2?.nome || 'Time 2'}
        onSelect={handleGolContra}
        className="max-w-sm w-[85%] mx-auto"
      />

      <FimDeJogoModal
        isOpen={modalFimDeJogo}
        onProximaPartida={handleProximaPartida}
        nomeTime1={config1?.nome || 'Time 1'}
        nomeTime2={config2?.nome || 'Time 2'}
        placar1={placar1}
        placar2={placar2}
        className="max-w-sm w-[85%] mx-auto"
      />

      <ModalConfirmacao
        isOpen={showConfirmacao.isOpen}
        onClose={() => setShowConfirmacao({ isOpen: false, tipo: null })}
        onConfirm={handleConfirmarAcao}
        titulo={showConfirmacao.tipo === 'finalizar-partida' ? 'Finalizar Partida?' : 'Finalizar Rodada?'}
        mensagem={
          showConfirmacao.tipo === 'finalizar-partida'
            ? 'Tem certeza que deseja finalizar esta partida?'
            : 'Tem certeza que deseja finalizar a rodada? Isso encerrará todas as atividades.'
        }
      />
    </div>
  );
};