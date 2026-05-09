// Arquivo: src/features/rodadas/components/MontarTimesManualStep.tsx
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  GripVertical, 
  Users, 
  CheckCircle, 
  XCircle, 
  Trophy, 
  Plus, 
  Minus, 
  Smartphone,
  Monitor,
  Star,
  Shield,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Jogador } from '@/@types';
import { TimeManual } from '../api/useSaveTimes';
import { cn } from '@/lib/utils';
import { getTimeConfig } from '../config/timesConfig';

interface Props {
  jogadores: Jogador[];
  jogadoresPorTime: number;
  onConfirmar: (times: TimeManual[]) => void;
  isLoading: boolean;
}

export const MontarTimesManualStep: React.FC<Props> = ({
  jogadores,
  jogadoresPorTime,
  onConfirmar,
  isLoading,
}) => {
  const [disponiveis, setDisponiveis] = React.useState<Jogador[]>([]);
  const [times, setTimes] = React.useState<TimeManual[]>([]);
  const [usarBotoes, setUsarBotoes] = React.useState(false);
  const [jogadorSelecionado, setJogadorSelecionado] = React.useState<number | null>(null);

  React.useEffect(() => {
    const isMobile = window.innerWidth < 768;
    setUsarBotoes(isMobile);
  }, []);

  React.useEffect(() => {
    setDisponiveis([...jogadores]);

    const numTimes = Math.floor(jogadores.length / jogadoresPorTime);
    const timesIniciais: TimeManual[] = [];
    for (let i = 0; i < numTimes; i++) {
      const config = getTimeConfig(i);
      timesIniciais.push({
        nome: config.nome,
        jogadores: [],
        pontuacaoTotal: 0,
      });
    }
    setTimes(timesIniciais);
  }, [jogadores, jogadoresPorTime]);

  // ========== MODO BOTÕES ==========
  const adicionarJogadorNoTime = (jogadorId: number, timeIndex: number) => {
    const jogador = disponiveis.find((j) => j.id === jogadorId);
    if (!jogador) return;

    if (times[timeIndex].jogadores.length >= jogadoresPorTime) {
      return;
    }

    setDisponiveis((prev) => prev.filter((j) => j.id !== jogadorId));
    setTimes((prev) =>
      prev.map((time, idx) =>
        idx === timeIndex ? { ...time, jogadores: [...time.jogadores, jogador] } : time
      )
    );
    setJogadorSelecionado(null);
  };

  const removerJogadorDoTime = (jogadorId: number, timeIndex: number) => {
    const jogador = times[timeIndex].jogadores.find((j) => j.id === jogadorId);
    if (!jogador) return;

    setTimes((prev) =>
      prev.map((time, idx) =>
        idx === timeIndex
          ? { ...time, jogadores: time.jogadores.filter((j) => j.id !== jogadorId) }
          : time
      )
    );
    setDisponiveis((prev) => [...prev, jogador]);
  };

  // ========== MODO DRAG AND DROP ==========
  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceIsDisponivel = source.droppableId === 'disponiveis';
    const destIsDisponivel = destination.droppableId === 'disponiveis';

    if (sourceIsDisponivel && destIsDisponivel) {
      setDisponiveis((prev) => {
        const newArr = [...prev];
        const [removed] = newArr.splice(source.index, 1);
        newArr.splice(destination.index, 0, removed);
        return newArr;
      });
      return;
    }

    if (sourceIsDisponivel && !destIsDisponivel) {
      const timeIndex = parseInt(destination.droppableId.replace('time-', ''));
      const jogador = disponiveis[source.index];

      if (times[timeIndex].jogadores.length >= jogadoresPorTime) return;

      setDisponiveis((prev) => prev.filter((_, idx) => idx !== source.index));
      setTimes((prev) =>
        prev.map((time, idx) => {
          if (idx === timeIndex) {
            const newJogadores = [...time.jogadores];
            newJogadores.splice(destination.index, 0, jogador);
            return { ...time, jogadores: newJogadores };
          }
          return time;
        })
      );
      return;
    }

    if (!sourceIsDisponivel && destIsDisponivel) {
      const timeIndex = parseInt(source.droppableId.replace('time-', ''));
      const jogador = times[timeIndex].jogadores[source.index];

      setTimes((prev) =>
        prev.map((time, idx) => {
          if (idx === timeIndex) {
            return { ...time, jogadores: time.jogadores.filter((_, jIdx) => jIdx !== source.index) };
          }
          return time;
        })
      );

      setDisponiveis((prev) => {
        const newArr = [...prev];
        newArr.splice(destination.index, 0, jogador);
        return newArr;
      });
      return;
    }

    if (!sourceIsDisponivel && !destIsDisponivel) {
      const sourceTimeIndex = parseInt(source.droppableId.replace('time-', ''));
      const destTimeIndex = parseInt(destination.droppableId.replace('time-', ''));
      const jogador = times[sourceTimeIndex].jogadores[source.index];

      if (sourceTimeIndex === destTimeIndex) {
        setTimes((prev) =>
          prev.map((time, idx) => {
            if (idx === sourceTimeIndex) {
              const newJogadores = [...time.jogadores];
              const [removed] = newJogadores.splice(source.index, 1);
              newJogadores.splice(destination.index, 0, removed);
              return { ...time, jogadores: newJogadores };
            }
            return time;
          })
        );
        return;
      }

      if (times[destTimeIndex].jogadores.length >= jogadoresPorTime) return;

      setTimes((prev) =>
        prev.map((time, idx) => {
          if (idx === sourceTimeIndex) {
            return { ...time, jogadores: time.jogadores.filter((_, jIdx) => jIdx !== source.index) };
          }
          if (idx === destTimeIndex) {
            const newJogadores = [...time.jogadores];
            newJogadores.splice(destination.index, 0, jogador);
            return { ...time, jogadores: newJogadores };
          }
          return time;
        })
      );
    }
  };

  const handleNomeTimeChange = (timeIndex: number, novoNome: string) => {
    setTimes((prev) =>
      prev.map((time, idx) => (idx === timeIndex ? { ...time, nome: novoNome } : time))
    );
  };

  const handleConfirmar = () => {
    onConfirmar(times);
  };

  // Card de Jogador
  const JogadorCard = ({ jogador, timeIndex }: { jogador: Jogador; timeIndex?: number }) => {
    const nota = jogador.nota_ultima_rodada || jogador.nivel || 1;
    const isCraque = nota === 10;

    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border p-2 transition-all',
          isCraque
            ? 'border-amber-500/30 bg-amber-500/5'
            : 'border-cyan-500/20 bg-[#0d1f35]/50',
          timeIndex === undefined && 'hover:border-cyan-500/40 cursor-grab'
        )}
      >
        <GripVertical className="h-4 w-4 text-cyan-100/30 flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white text-sm truncate">{jogador.nome}</div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-100/50">
            {jogador.posicao === 'goleiro' && <span className="text-emerald-400">⚽ Goleiro</span>}
            {jogador.joga_recuado && (
              <span className="flex items-center gap-0.5 text-blue-400">
                <Shield size={10} /> Recuado
              </span>
            )}
          </div>
        </div>

        <div className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold',
          isCraque ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/10 text-cyan-400'
        )}>
          <Star size={10} />
          {nota}
        </div>

        {timeIndex !== undefined && (
          <button
            onClick={() => removerJogadorDoTime(jogador.id, timeIndex)}
            className="h-6 w-6 flex items-center justify-center rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20"
          >
            <Minus size={12} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-black">
          <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
            Montar Times Manualmente
          </span>
        </h2>
        <p className="mt-2 text-cyan-100/50 text-sm">
          Arraste os jogadores para formar os times
        </p>
      </div>

      {/* Toggle Modo */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#0d1f35] border border-cyan-500/20">
          <button
            onClick={() => setUsarBotoes(false)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              !usarBotoes
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white'
                : 'text-cyan-100/50 hover:text-cyan-100'
            )}
          >
            <Monitor size={16} />
            Arrastar
          </button>
          <button
            onClick={() => setUsarBotoes(true)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              usarBotoes
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white'
                : 'text-cyan-100/50 hover:text-cyan-100'
            )}
          >
            <Smartphone size={16} />
            Botões
          </button>
        </div>
      </div>

      {/* Modo Botões */}
      {usarBotoes ? (
        <div className="space-y-6">
          {/* Disponíveis */}
          <div className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 p-4">
            <h3 className="text-sm font-bold text-cyan-100/70 mb-3 flex items-center gap-2">
              <Users size={16} />
              Disponíveis ({disponiveis.length})
            </h3>

            {disponiveis.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-400/30" />
                <p className="text-cyan-100/50 text-sm">Todos alocados!</p>
              </div>
            ) : (
              <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
                {disponiveis.map((jogador) => (
                  <button
                    key={jogador.id}
                    onClick={() => setJogadorSelecionado(jogadorSelecionado === jogador.id ? null : jogador.id)}
                    className={cn(
                      'p-2 rounded-lg border text-left transition-all',
                      jogadorSelecionado === jogador.id
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-cyan-500/20 bg-[#0d1f35]/50 hover:border-cyan-500/40'
                    )}
                  >
                    <div className="font-medium text-white text-sm truncate">{jogador.nome}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-cyan-100/50">
                        {jogador.posicao === 'goleiro' ? '⚽' : 'Linha'}
                      </span>
                      <span className="text-xs font-bold text-cyan-400">{jogador.nota_ultima_rodada || jogador.nivel || 1}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Times (Modo Botões) */}
          <div className="grid gap-4 md:grid-cols-2">
            {times.map((time, timeIndex) => {
              const isComplete = time.jogadores.length === jogadoresPorTime;
              const mediaTime =
                time.jogadores.length > 0
                  ? (time.jogadores.reduce((sum, j) => sum + (j.nota_ultima_rodada || 1), 0) / time.jogadores.length).toFixed(1)
                  : '0.0';

              return (
                <div key={timeIndex} className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 overflow-hidden">
                  {/* Header */}
                  <div className={cn(
                    'p-3 border-b',
                    isComplete ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-cyan-500/10'
                  )}>
                    <div className="flex items-center justify-between">
                      <Input
                        value={time.nome}
                        onChange={(e) => handleNomeTimeChange(timeIndex, e.target.value)}
                        className="border-0 bg-transparent text-lg font-bold text-white p-0 h-auto"
                      />
                      <div className="flex items-center gap-2">
                        {isComplete ? (
                          <CheckCircle size={16} className="text-emerald-400" />
                        ) : (
                          <XCircle size={16} className="text-cyan-100/30" />
                        )}
                        <span className="text-xs text-cyan-100/50">
                          {time.jogadores.length}/{jogadoresPorTime}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={12} className="text-amber-400" />
                      <span className="text-sm font-bold text-amber-400">{mediaTime}</span>
                    </div>
                  </div>

                  {/* Lista + Botão Adicionar */}
                  <div className="p-3 space-y-2">
                    {time.jogadores.map((jogador) => (
                      <JogadorCard key={jogador.id} jogador={jogador} timeIndex={timeIndex} />
                    ))}

                    {jogadorSelecionado && !isComplete && (
                      <button
                        onClick={() => adicionarJogadorNoTime(jogadorSelecionado, timeIndex)}
                        className="w-full p-2 rounded-lg border-2 border-dashed border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={16} />
                        Adicionar Aqui
                      </button>
                    )}

                    {time.jogadores.length === 0 && !jogadorSelecionado && (
                      <div className="text-center py-6">
                        <Users className="mx-auto mb-2 h-8 w-8 text-cyan-400/20" />
                        <p className="text-cyan-100/40 text-xs">Selecione um jogador e clique em adicionar</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Modo Drag and Drop */
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            {/* Disponíveis */}
            <div className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 p-4">
              <h3 className="text-sm font-bold text-cyan-100/70 mb-3 flex items-center gap-2">
                <Users size={16} />
                Disponíveis ({disponiveis.length})
              </h3>

              <Droppable droppableId="disponiveis">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'min-h-[300px] rounded-lg border-2 border-dashed p-2 transition-all',
                      snapshot.isDraggingOver
                        ? 'border-cyan-500/50 bg-cyan-500/5'
                        : 'border-cyan-500/20'
                    )}
                  >
                    {disponiveis.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-8">
                        <CheckCircle className="mb-2 h-8 w-8 text-emerald-400/30" />
                        <p className="text-cyan-100/50 text-sm">Todos alocados!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {disponiveis.map((jogador, index) => (
                          <Draggable key={jogador.id} draggableId={`disp-${jogador.id}`} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(snapshot.isDragging && 'opacity-80')}
                              >
                                <JogadorCard jogador={jogador} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Times */}
            <div className="grid gap-4 md:grid-cols-2">
              {times.map((time, timeIndex) => {
                const isComplete = time.jogadores.length === jogadoresPorTime;
                const mediaTime =
                  time.jogadores.length > 0
                    ? (time.jogadores.reduce((sum, j) => sum + (j.nota_ultima_rodada || 1), 0) / time.jogadores.length).toFixed(1)
                    : '0.0';

                return (
                  <div key={timeIndex} className="space-y-2">
                    {/* Header */}
                    <div className={cn(
                      'rounded-xl border p-3',
                      isComplete ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-cyan-500/20 bg-[#0a1628]/50'
                    )}>
                      <div className="flex items-center justify-between">
                        <Input
                          value={time.nome}
                          onChange={(e) => handleNomeTimeChange(timeIndex, e.target.value)}
                          className="border-0 bg-transparent text-lg font-bold text-white p-0 h-auto w-32"
                        />
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Star size={12} className="text-amber-400" />
                            <span className="text-sm font-bold text-amber-400">{mediaTime}</span>
                          </div>
                          <span className="text-xs text-cyan-100/50">
                            {time.jogadores.length}/{jogadoresPorTime}
                          </span>
                          {isComplete ? (
                            <CheckCircle size={16} className="text-emerald-400" />
                          ) : (
                            <XCircle size={16} className="text-cyan-100/30" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Drop Zone */}
                    <Droppable droppableId={`time-${timeIndex}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            'min-h-[200px] rounded-xl border-2 p-2 transition-all',
                            snapshot.isDraggingOver
                              ? 'border-cyan-500/50 bg-cyan-500/5'
                              : isComplete
                              ? 'border-emerald-500/30 bg-emerald-500/5'
                              : 'border-dashed border-cyan-500/20'
                          )}
                        >
                          <div className="space-y-2">
                            {time.jogadores.map((jogador, index) => (
                              <Draggable key={jogador.id} draggableId={`time${timeIndex}-${jogador.id}`} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={cn(snapshot.isDragging && 'opacity-80')}
                                  >
                                    <JogadorCard jogador={jogador} timeIndex={timeIndex} />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          </div>
                          {provided.placeholder}

                          {time.jogadores.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8">
                              <Users className="mb-2 h-8 w-8 text-cyan-400/20" />
                              <p className="text-cyan-100/40 text-xs">Arraste jogadores aqui</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </div>
        </DragDropContext>
      )}

      {/* Botão Confirmar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center pt-4"
      >
        <Button
          onClick={handleConfirmar}
          disabled={isLoading || disponiveis.length > 0}
          size="lg"
          className="min-w-[280px] h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/25 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Trophy className="mr-2 h-5 w-5" />
              Confirmar Times
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
};