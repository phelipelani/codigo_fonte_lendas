// Arquivo: src/features/rodadas/routes/CampeonatoPartidaLivePage.tsx
import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Circle, CheckCircle, Plus, Minus, AlertCircle, ArrowLeft, 
  X, Trash2, Play, Pause, Flag, Timer, Loader2, RefreshCw,
  ArrowRight, Search, UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { useQuery } from '@tanstack/react-query';
import api from '@/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { useElencoRodada, useSalvarPartidaCampeonato, useFinalizarRodada } from '@/features/rodadas/api/useCampeonatoRodadas';
import { TimeEmPartida } from '@/@types/partida';
import { usePartidaLiveStore, EventoLocal } from '@/store/usePartidaLiveStore';

// --- MODALS AUXILIARES ---

const ModalAssistencia = ({ isOpen, onClose, jogadoresTime, autorGolId, onConfirm, goleiroId, goleirosLista }: any) => {
  if (!isOpen) return null;

  let possiveis = jogadoresTime ? jogadoresTime.filter((j: any) => j.id !== autorGolId) : [];

  if (goleiroId && goleiroId !== autorGolId && goleirosLista) {
    const goleiroObj = goleirosLista.find((g: any) => g.id === goleiroId);
    if (goleiroObj && !possiveis.find((p: any) => p.id === goleiroId)) {
      possiveis.push({ id: goleiroId, nome: `${goleiroObj.nome} (GL)` });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a1628] border-cyan-500/20 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Quem deu o passe?</DialogTitle>
          <DialogDescription className="sr-only">Selecione quem deu a assistência</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-4">
          <Button
            variant="outline"
            className="col-span-2 border-dashed border-cyan-500/30 text-cyan-100/70 hover:bg-cyan-500/10"
            onClick={() => onConfirm(null)}
          >
            Jogada Individual (Sem Assist.)
          </Button>
          {possiveis.map((j: any) => (
            <Button
              key={j.id}
              variant="ghost"
              className="justify-start truncate text-white hover:bg-cyan-500/10"
              onClick={() => onConfirm(j.id)}
            >
              {j.nome}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ModalSelecaoTime = ({ isOpen, onClose, times, onSelect }: any) => {
  if (!isOpen) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a1628] border-cyan-500/20">
        <DialogHeader>
          <DialogTitle className="text-white">Selecione o Time</DialogTitle>
          <DialogDescription className="sr-only">Escolha o time</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {times.length === 0 ? (
            <p className="text-center text-cyan-100/50 py-4">Nenhum time disponível.</p>
          ) : (
            times.map((t: any) => (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className="p-4 rounded-xl border border-cyan-500/20 bg-[#0d1f35]/50 hover:bg-cyan-500/10 hover:border-cyan-500/40 flex items-center gap-4 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-[#0a1628] border border-cyan-500/20 flex items-center justify-center overflow-hidden">
                  {t.logo ? (
                    <img src={t.logo} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-cyan-400">{t.nome.substring(0, 2)}</span>
                  )}
                </div>
                <span className="font-bold text-lg text-white">{t.nome}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ModalConfirmacao: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  titulo: string;
  mensagem: string;
}> = ({ isOpen, onClose, onConfirm, titulo, mensagem }) => {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#0a1628] rounded-xl p-6 max-w-md w-full mx-4 border border-cyan-500/20"
        >
          <h3 className="text-xl font-bold text-white mb-4">{titulo}</h3>
          <p className="text-cyan-100/60 mb-6">{mensagem}</p>
          <div className="flex gap-3 justify-end">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-cyan-500/30 text-cyan-100/70 hover:bg-cyan-500/10"
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
};

// --- MODAL DE SUBSTITUIÇÃO DURANTE A PARTIDA ---
const ModalSubstituicaoPartida = ({ 
  isOpen, 
  onClose, 
  jogadorSaindo, 
  jogadoresDisponiveis,
  onConfirm 
}: { 
  isOpen: boolean;
  onClose: () => void;
  jogadorSaindo: { id: number; nome: string } | null;
  jogadoresDisponiveis: { id: number; nome: string; foto_url?: string }[];
  onConfirm: (jogadorEntraId: number, jogadorEntraNome: string) => void;
}) => {
  const [busca, setBusca] = React.useState('');
  const [selecionado, setSelecionado] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setBusca('');
      setSelecionado(null);
    }
  }, [isOpen]);

  if (!isOpen || !jogadorSaindo) return null;

  const jogadoresFiltrados = jogadoresDisponiveis.filter(j => 
    j.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const jogadorSelecionadoObj = jogadoresDisponiveis.find(j => j.id === selecionado);

  const handleConfirmar = () => {
    if (selecionado && jogadorSelecionadoObj) {
      onConfirm(selecionado, jogadorSelecionadoObj.nome);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a1628] border-cyan-500/20 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <RefreshCw className="text-white" size={20} />
            </div>
            <div>
              <DialogTitle className="text-white text-lg">Substituição</DialogTitle>
              <p className="text-cyan-100/50 text-xs">Trocar jogador durante a partida</p>
            </div>
          </div>
          <DialogDescription className="sr-only">Selecione o jogador que vai entrar</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 items-center gap-4 py-4 border-y border-cyan-500/10">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center mb-2">
              <span className="text-red-400 font-bold text-sm">
                {jogadorSaindo.nome.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="text-xs font-medium text-red-400 truncate max-w-full">{jogadorSaindo.nome}</span>
            <span className="text-[10px] text-red-400/60 uppercase">Sai</span>
          </div>

          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <ArrowRight className="text-amber-400" size={20} />
            </div>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center mb-2 border-2 transition-all",
              selecionado ? "bg-emerald-500/20 border-emerald-500/40" : "bg-[#0d1f35] border-dashed border-cyan-500/30"
            )}>
              {selecionado ? (
                <span className="text-emerald-400 font-bold text-sm">{jogadorSelecionadoObj?.nome.substring(0, 2).toUpperCase()}</span>
              ) : (
                <UserPlus size={20} className="text-cyan-500/40" />
              )}
            </div>
            <span className={cn("text-xs font-medium truncate max-w-full", selecionado ? "text-emerald-400" : "text-cyan-100/40")}>
              {selecionado ? jogadorSelecionadoObj?.nome : "Selecione"}
            </span>
            <span className="text-[10px] text-emerald-400/60 uppercase">Entra</span>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-100/40" size={16} />
          <input
            type="text"
            placeholder="Buscar jogador disponível..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg bg-[#0d1f35]/50 border border-cyan-500/20 text-white placeholder:text-cyan-100/30 focus:outline-none focus:border-cyan-500/40"
          />
        </div>

        <div className="max-h-[200px] overflow-y-auto space-y-1">
          {jogadoresFiltrados.length === 0 ? (
            <p className="text-center text-cyan-100/40 text-sm py-6">Nenhum jogador disponível encontrado</p>
          ) : (
            jogadoresFiltrados.map((j) => (
              <button
                key={j.id}
                onClick={() => setSelecionado(j.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-lg transition-all",
                  selecionado === j.id ? "bg-cyan-500/10 border border-cyan-500/30" : "hover:bg-cyan-500/5 border border-transparent"
                )}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/20 flex items-center justify-center overflow-hidden">
                  {j.foto_url ? <img src={j.foto_url} className="w-full h-full object-cover" /> : <span className="text-cyan-400 text-xs font-bold">{j.nome.substring(0, 2).toUpperCase()}</span>}
                </div>
                <span className="text-sm font-medium text-white flex-1 text-left">{j.nome}</span>
                {selecionado === j.id && <CheckCircle size={16} className="text-cyan-400" />}
              </button>
            ))
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={onClose} variant="outline" className="flex-1 border-cyan-500/30 text-cyan-100/70 hover:bg-cyan-500/10">Cancelar</Button>
          <Button onClick={handleConfirmar} disabled={!selecionado} className="flex-1 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white disabled:opacity-50">
            <RefreshCw size={16} className="mr-2" />Confirmar Troca
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const CampeonatoPartidaLivePage = () => {
  const { id, rodadaId } = useParams<{ id: string; rodadaId: string }>();
  const navigate = useNavigate();
  const rId = Number(rodadaId);
  const cId = Number(id);

  const { data: elenco, isLoading } = useElencoRodada(rId);
  const { data: goleiros } = useQuery({ 
    queryKey: ['goleiros'], 
    queryFn: async () => (await api.get('/jogadores', { params: { posicao: 'goleiro' } })).data 
  });
  const salvarMutation = useSalvarPartidaCampeonato();
  const finalizarRodadaMutation = useFinalizarRodada();

  const store = usePartidaLiveStore();

  // Estado local para display do cronômetro
  const [segundosDisplay, setSegundosDisplay] = React.useState(0);
  const [modalTimeSlot, setModalTimeSlot] = React.useState<'A' | 'B' | null>(null);
  const [modalAssist, setModalAssist] = React.useState<{ isOpen: boolean; autorId: number; timeId: number } | null>(null);
  const [modalGolContra, setModalGolContra] = React.useState<{ isOpen: boolean; timeQueMarcou: 'time1' | 'time2' }>({ isOpen: false, timeQueMarcou: 'time1' });
  const [showConfirmacao, setShowConfirmacao] = React.useState<{ isOpen: boolean; tipo: 'finalizar-partida' | 'finalizar-rodada' | null }>({ isOpen: false, tipo: null });
  
  // Estado para substituição durante a partida
  const [modalSubstituicao, setModalSubstituicao] = React.useState<{
    isOpen: boolean;
    jogadorSaindo: { id: number; nome: string } | null;
    timeSlot: 'A' | 'B' | null;
  }>({ isOpen: false, jogadorSaindo: null, timeSlot: null });

  // Atualiza o cronômetro a cada segundo
  React.useEffect(() => {
    setSegundosDisplay(store.getSegundosAtuais());
    const interval = setInterval(() => {
      if (store.isRunning) setSegundosDisplay(store.getSegundosAtuais());
    }, 1000);
    return () => clearInterval(interval);
  }, [store.isRunning, store.startTime, store.accumulatedTime]);

  // Função para formatar tempo
  const formatTempo = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Times disponíveis
  const timesDisponiveis = React.useMemo(() => {
    if (!elenco) return [];
    const grupos: any = {};
    elenco.forEach(item => {
      if (!grupos[item.time_id]) grupos[item.time_id] = { id: item.time_id, nome: item.nome_time, logo: item.logo_time, jogadores: [] };
      grupos[item.time_id].jogadores.push({ id: item.jogador_id, nome: item.nome_jogador, foto_url: item.foto_url });
    });
    return Object.values(grupos);
  }, [elenco]);

  // Jogadores disponíveis para substituição (não estão na partida atual)
  const jogadoresDisponiveisParaSubstituicao = React.useMemo(() => {
    if (!elenco) return [];
    const jogadoresNaPartida = new Set<number>();
    if (store.timeA?.jogadores) store.timeA.jogadores.forEach((j: any) => jogadoresNaPartida.add(j.id));
    if (store.timeB?.jogadores) store.timeB.jogadores.forEach((j: any) => jogadoresNaPartida.add(j.id));
    return elenco.filter(item => !jogadoresNaPartida.has(item.jogador_id)).map(item => ({
      id: item.jogador_id,
      nome: item.nome_jogador,
      foto_url: item.foto_url
    }));
  }, [elenco, store.timeA, store.timeB]);

  const timesFiltrados = React.useMemo(() => {
    if (modalTimeSlot === 'A') return timesDisponiveis.filter((t: any) => t.id !== store.timeB?.numero);
    if (modalTimeSlot === 'B') return timesDisponiveis.filter((t: any) => t.id !== store.timeA?.numero);
    return [];
  }, [modalTimeSlot, timesDisponiveis, store.timeA, store.timeB]);

  // Placares calculados
  const placarA = store.eventos.filter(e => (e.tipo === 'gol' && e.time_id === store.timeA?.numero) || (e.tipo === 'gol_contra' && e.time_id === store.timeB?.numero)).length;
  const placarB = store.eventos.filter(e => (e.tipo === 'gol' && e.time_id === store.timeB?.numero) || (e.tipo === 'gol_contra' && e.time_id === store.timeA?.numero)).length;

  // Handlers
  const handleSelectTime = (timeData: any, slot: 'A' | 'B') => {
    const timeEmPartida: TimeEmPartida = {
      numero: timeData.id, nome: timeData.nome, logo: timeData.logo, goleiro_id: null, jogadores: timeData.jogadores
    };
    if (!store.isActive) {
      if (slot === 'A') store.iniciarPartida(rId, timeEmPartida, null as any);
      else store.iniciarPartida(rId, null as any, timeEmPartida);
    } else {
      const novoA = slot === 'A' ? timeEmPartida : store.timeA;
      const novoB = slot === 'B' ? timeEmPartida : store.timeB;
      store.iniciarPartida(rId, novoA!, novoB!);
    }
    setModalTimeSlot(null);
  };

  const handlePlayPause = () => {
    if (store.isRunning) {
      store.pause();
    } else {
      if (!store.timeA || !store.timeB) {
        toast.warning("Selecione os dois times antes de iniciar.");
        return;
      }
      if (!store.goleiroA || !store.goleiroB) {
        toast.error("⚠️ É obrigatório selecionar o goleiro de cada time!", { duration: 4000 });
        return;
      }
      store.play();
    }
  };

  const handleGolClick = (jogador: any, timeId: number) => {
    if (!store.isRunning) { toast.error("Inicie o cronômetro!"); return; }
    setModalAssist({ isOpen: true, autorId: jogador.id, timeId });
  };

  // Handler para abrir modal de substituição
  const handleJogadorClick = (jogador: { id: number; nome: string }, timeSlot: 'A' | 'B') => {
    if (store.isRunning) {
      toast.warning("Pause o cronômetro para fazer substituições!");
      return;
    }
    setModalSubstituicao({ isOpen: true, jogadorSaindo: jogador, timeSlot });
  };

  // Handler para confirmar substituição
  const handleConfirmarSubstituicao = (jogadorEntraId: number, jogadorEntraNome: string) => {
    if (!modalSubstituicao.jogadorSaindo || !modalSubstituicao.timeSlot) return;
    const { jogadorSaindo, timeSlot } = modalSubstituicao;
    
    if (timeSlot === 'A' && store.timeA) {
      const novosJogadores = store.timeA.jogadores.map((j: any) => 
        j.id === jogadorSaindo.id ? { id: jogadorEntraId, nome: jogadorEntraNome } : j
      );
      store.iniciarPartida(rId, { ...store.timeA, jogadores: novosJogadores }, store.timeB!);
    } else if (timeSlot === 'B' && store.timeB) {
      const novosJogadores = store.timeB.jogadores.map((j: any) => 
        j.id === jogadorSaindo.id ? { id: jogadorEntraId, nome: jogadorEntraNome } : j
      );
      store.iniciarPartida(rId, store.timeA!, { ...store.timeB, jogadores: novosJogadores });
    }

    toast.success(`Substituição: ${jogadorSaindo.nome} → ${jogadorEntraNome}`);
    setModalSubstituicao({ isOpen: false, jogadorSaindo: null, timeSlot: null });
  };

  const confirmGol = (assistId: number | null) => {
    if (!modalAssist) return;
    const { autorId, timeId } = modalAssist;
    let jogadorNome = (timeId === store.timeA?.numero ? store.timeA : store.timeB)?.jogadores.find((j: any) => j.id === autorId)?.nome;
    if (!jogadorNome) {
      if (autorId === store.goleiroA || autorId === store.goleiroB) {
        const goleiroObj = goleiros?.find((g: any) => g.id === autorId);
        if (goleiroObj) jogadorNome = `${goleiroObj.nome} (Goleiro)`;
      }
    }
    if (!jogadorNome) jogadorNome = "Desconhecido";

    const novoEvento: EventoLocal = {
      id: Math.random().toString(36), tipo: 'gol',
      jogador_id: autorId, nome_jogador: jogadorNome, time_id: timeId,
      tempo: formatTempo(store.getSegundosAtuais()), tempo_segundos: store.getSegundosAtuais(),
      assist_por: assistId || undefined
    };
    store.addEvento(novoEvento);
    setModalAssist(null);
    toast.success(`Gol do ${jogadorNome}!`);
  };

  const removeUltimoEventoDoJogador = (jogadorId: number) => {
    const index = [...store.eventos].reverse().findIndex(e => e.jogador_id === jogadorId && e.tipo === 'gol');
    if (index !== -1) {
      const realIndex = store.eventos.length - 1 - index;
      const evento = store.eventos[realIndex];
      store.removeEvento(evento.id);
      toast.info("Gol removido.");
    }
  };

  const removerEventoPorId = (eventoId: string) => {
    store.removeEvento(eventoId);
    toast.info("Evento excluído.");
  };

  const handleGoleiroGoal = (timeSlot: 'time1' | 'time2') => {
    if (!store.isRunning) { toast.error("Inicie o jogo!"); return; }
    const timeObj = timeSlot === 'time1' ? store.timeA : store.timeB;
    const goleiroId = timeSlot === 'time1' ? store.goleiroA : store.goleiroB;
    if (!timeObj || !goleiroId) { toast.error("Selecione um goleiro!"); return; }
    setModalAssist({ isOpen: true, autorId: goleiroId, timeId: timeObj.numero });
  };

  const handleGolContra = (jogadorId: number, timeId: number) => {
    const jogador = (timeId === store.timeA?.numero ? store.timeA : store.timeB)?.jogadores.find((j: any) => j.id === jogadorId);
    const novoEvento: EventoLocal = {
      id: Math.random().toString(36), tipo: 'gol_contra',
      jogador_id: jogadorId, nome_jogador: `${jogador?.nome || 'Jogador'} (GC)`,
      time_id: timeId, tempo: formatTempo(store.getSegundosAtuais()), tempo_segundos: store.getSegundosAtuais()
    };
    store.addEvento(novoEvento);
    setModalGolContra(prev => ({ ...prev, isOpen: false }));
    toast.success(`Gol contra registrado!`);
  };

  const handleConfirmarAcao = () => {
    if (showConfirmacao.tipo === 'finalizar-partida') {
      handleFinalizarPartida();
    } else if (showConfirmacao.tipo === 'finalizar-rodada') {
      finalizarRodadaMutation.mutate({ rodadaId: rId }, {
        onSuccess: () => { navigate(`/campeonatos/${cId}`); }
      });
    }
    setShowConfirmacao({ isOpen: false, tipo: null });
  };

  const handleFinalizarPartida = async () => {
    if (!store.timeA || !store.timeB) return;
    const payload = {
      rodadaId: rId,
      timeA_id: store.timeA.numero, timeB_id: store.timeB.numero,
      placar_timeA: placarA, placar_timeB: placarB,
      duracao_segundos: store.getSegundosAtuais(),
      goleiro_timeA_id: store.goleiroA, goleiro_timeB_id: store.goleiroB,
      timeA_jogadores: store.timeA.jogadores, timeB_jogadores: store.timeB.jogadores,
      eventos: store.eventos.map(e => ({
        tipo: e.tipo, jogador_id: e.jogador_id, time_id: e.time_id,
        tempo_segundos: e.tempo_segundos, assist_por_jogador_id: e.assist_por || null
      }))
    };
    try {
      await salvarMutation.mutateAsync(payload);
      if (placarA > placarB) {
        // Time A venceu: fica no slot A, goleiro A preservado, slot B limpo
        // Remove o goleiro da lista de jogadores de linha para não duplicar
        const goleiroVencedor = store.goleiroA;
        const timeAsemGoleiro = {
          ...store.timeA!,
          jogadores: store.timeA!.jogadores.filter((j: any) => j.id !== goleiroVencedor)
        };
        store.iniciarPartida(rId, timeAsemGoleiro, null as any);
        store.setGoleiros(goleiroVencedor, null as any);
      } else if (placarB > placarA) {
        // Time B venceu: fica no slot B, goleiro B preservado, slot A limpo
        // Remove o goleiro da lista de jogadores de linha para não duplicar
        const goleiroVencedor = store.goleiroB;
        const timeBsemGoleiro = {
          ...store.timeB!,
          jogadores: store.timeB!.jogadores.filter((j: any) => j.id !== goleiroVencedor)
        };
        store.iniciarPartida(rId, null as any, timeBsemGoleiro);
        store.setGoleiros(null as any, goleiroVencedor);
      } else {
        // Empate: limpa tudo
        store.finalizarPartida();
      }
      setShowConfirmacao({ isOpen: false, tipo: null });
    } catch (e) { console.error(e); }
  };

  const clearSelection = (slot: 'A' | 'B') => {
    if (!store.isActive) return;
    if (slot === 'A') store.iniciarPartida(rId, null as any, store.timeB!);
    else store.iniciarPartida(rId, store.timeA!, null as any);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col pb-20 relative">
      {/* Campo de fundo decorativo */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ zIndex: 0 }}>
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-cyan-500 -translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/2 w-48 h-48 border-2 border-cyan-500 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-1/2 left-0 w-32 h-64 border-r-2 border-y-2 border-cyan-500 -translate-y-1/2"></div>
        <div className="absolute top-1/2 right-0 w-32 h-64 border-l-2 border-y-2 border-cyan-500 -translate-y-1/2"></div>
      </div>

      {/* Header */}
      <div className="bg-[#0d1f35]/90 backdrop-blur border-b border-cyan-500/20 p-3 flex justify-between items-center sticky top-0 z-20">
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-cyan-100/60 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> Sair
        </Button>
        
        <motion.div
          animate={{ scale: store.isRunning ? [1, 1.02, 1] : 1 }}
          transition={{ duration: 1, repeat: store.isRunning ? Infinity : 0 }}
          className={cn(
            "font-mono text-2xl sm:text-3xl font-bold px-3 sm:px-4 py-1 rounded-lg",
            store.isRunning ? "text-red-400" : "text-white"
          )}
        >
          {formatTempo(segundosDisplay)}
        </motion.div>
        
        <Button 
          onClick={handlePlayPause} 
          className={cn(
            "font-bold",
            store.isRunning 
              ? "bg-amber-500 hover:bg-amber-600 text-amber-900" 
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          )}
        >
          {store.isRunning ? <><Pause size={16} className="sm:mr-1" /><span className="hidden sm:inline"> Pausar</span></> : <><Play size={16} className="sm:mr-1" /><span className="hidden sm:inline"> Iniciar</span></>}
        </Button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col p-3 sm:p-4 gap-3 sm:gap-4">
        {/* Placar */}
        <div className="grid grid-cols-3 items-center gap-2">
          {/* Time A */}
          <div className="flex flex-col items-center relative">
            {store.timeA ? (
              <>
                {!store.isRunning && segundosDisplay === 0 && (
                  <div className="absolute -top-1 -right-1 z-30">
                    <Button size="icon" variant="destructive" className="h-6 w-6 rounded-full" onClick={() => clearSelection('A')}>
                      <X size={12} />
                    </Button>
                  </div>
                )}
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#0d1f35] border-2 border-cyan-500/30 flex items-center justify-center overflow-hidden shadow-lg">
                  {store.timeA.logo ? <img src={store.timeA.logo} className="w-full h-full object-cover" /> : <span className="font-bold text-cyan-400">{store.timeA.nome.substring(0, 2)}</span>}
                </div>
                <span className="font-bold text-xs sm:text-sm text-center mt-1 text-white leading-tight">{store.timeA.nome}</span>
                <motion.span 
                  key={placarA}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  className="text-3xl sm:text-4xl font-black mt-2 text-white"
                >
                  {placarA}
                </motion.span>
                <div className="mt-1 relative z-20">
                  <Select value={store.goleiroA?.toString() || ''} onValueChange={(v) => store.setGoleiros(Number(v), store.goleiroB)} disabled={store.isRunning}>
                    <SelectTrigger className={cn(
                      "h-7 text-[10px] w-16 sm:w-20",
                      !store.goleiroA ? "bg-red-500/20 border-red-500/50 animate-pulse" : "bg-[#0d1f35] border-cyan-500/20"
                    )}>
                      <SelectValue placeholder="Goleiro" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a1628] border-cyan-500/20">
                      {goleiros?.map((g: any) => <SelectItem key={g.id} value={String(g.id)} className="text-white">{g.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <Button variant="outline" className="h-20 w-20 rounded-full border-dashed border-cyan-500/30 text-cyan-400" onClick={() => setModalTimeSlot('A')}>
                <Plus /> Time A
              </Button>
            )}
          </div>

          {/* VS + Encerrar */}
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black text-cyan-500">×</span>
            <Button 
              variant="destructive" 
              size="sm" 
              className="mt-4 bg-red-600 hover:bg-red-700" 
              onClick={() => setShowConfirmacao({ isOpen: true, tipo: 'finalizar-partida' })} 
              disabled={store.isRunning || !store.timeA || !store.timeB}
            >
              <CheckCircle size={14} className="mr-1" /> Encerrar
            </Button>
          </div>

          {/* Time B */}
          <div className="flex flex-col items-center relative">
            {store.timeB ? (
              <>
                {!store.isRunning && segundosDisplay === 0 && (
                  <div className="absolute -top-1 -right-1 z-30">
                    <Button size="icon" variant="destructive" className="h-6 w-6 rounded-full" onClick={() => clearSelection('B')}>
                      <X size={12} />
                    </Button>
                  </div>
                )}
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#0d1f35] border-2 border-cyan-500/30 flex items-center justify-center overflow-hidden shadow-lg">
                  {store.timeB.logo ? <img src={store.timeB.logo} className="w-full h-full object-cover" /> : <span className="font-bold text-cyan-400">{store.timeB.nome.substring(0, 2)}</span>}
                </div>
                <span className="font-bold text-xs sm:text-sm text-center mt-1 text-white leading-tight">{store.timeB.nome}</span>
                <motion.span 
                  key={placarB}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  className="text-3xl sm:text-4xl font-black mt-2 text-white"
                >
                  {placarB}
                </motion.span>
                <div className="mt-1 relative z-20">
                  <Select value={store.goleiroB?.toString() || ''} onValueChange={(v) => store.setGoleiros(store.goleiroA, Number(v))} disabled={store.isRunning}>
                    <SelectTrigger className={cn(
                      "h-7 text-[10px] w-16 sm:w-20",
                      !store.goleiroB ? "bg-red-500/20 border-red-500/50 animate-pulse" : "bg-[#0d1f35] border-cyan-500/20"
                    )}>
                      <SelectValue placeholder="Goleiro" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a1628] border-cyan-500/20">
                      {goleiros?.map((g: any) => <SelectItem key={g.id} value={String(g.id)} className="text-white">{g.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <Button variant="outline" className="h-20 w-20 rounded-full border-dashed border-cyan-500/30 text-cyan-400" onClick={() => setModalTimeSlot('B')}>
                <Plus /> Time B
              </Button>
            )}
          </div>
        </div>

        {/* Botões especiais */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 py-2 px-2 sm:px-4">
          <div className="flex justify-start gap-2">
            <Button size="sm" variant="outline" className="text-[10px] sm:text-xs h-8 px-1.5 sm:px-3 border-amber-500/50 text-amber-400 hover:bg-amber-500/10" onClick={() => handleGoleiroGoal('time1')} disabled={!store.goleiroA || !store.isRunning}>
              Gol Goleiro
            </Button>
            <Button size="sm" variant="outline" className="text-[10px] sm:text-xs h-8 px-1.5 sm:px-3 border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={() => setModalGolContra({ isOpen: true, timeQueMarcou: 'time1' })} disabled={!store.timeA || !store.isRunning}>
              Gol Contra
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" className="text-[10px] sm:text-xs h-8 px-1.5 sm:px-3 border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={() => setModalGolContra({ isOpen: true, timeQueMarcou: 'time2' })} disabled={!store.timeB || !store.isRunning}>
              Gol Contra
            </Button>
            <Button size="sm" variant="outline" className="text-[10px] sm:text-xs h-8 px-1.5 sm:px-3 border-amber-500/50 text-amber-400 hover:bg-amber-500/10" onClick={() => handleGoleiroGoal('time2')} disabled={!store.goleiroB || !store.isRunning}>
              Gol Goleiro
            </Button>
          </div>
        </div>

        {/* Lista de jogadores */}
        <div className="flex-1 grid grid-cols-2 gap-2 sm:gap-4 overflow-hidden min-h-0 px-1 sm:px-2">
          <div className="bg-[#0d1f35]/50 backdrop-blur-sm rounded-xl p-2 overflow-y-auto border border-cyan-500/10">
            {store.timeA?.jogadores.map((j: any) => {
              const golsJogador = store.eventos.filter(e => e.tipo === 'gol' && e.jogador_id === j.id).length;
              return (
                <div key={j.id} className={cn(
                  "flex items-center justify-between p-2 mb-2 rounded-lg bg-[#0a1628]/80 border border-cyan-500/10 shadow-sm",
                  !store.isRunning && "opacity-70"
                )}>
                  <button 
                    onClick={() => handleJogadorClick(j, 'A')}
                    className={cn(
                      "text-xs font-bold truncate max-w-[65px] sm:max-w-[100px] text-left transition-colors",
                      !store.isRunning ? "text-amber-400 hover:text-amber-300 cursor-pointer" : "text-white cursor-default"
                    )}
                    title={!store.isRunning ? "Clique para substituir" : ""}
                  >
                    {j.nome}
                  </button>
                  <div className="flex gap-1 items-center">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:bg-red-500/10" onClick={() => removeUltimoEventoDoJogador(j.id)}>
                      <Minus size={14} />
                    </Button>
                    <span className="font-mono text-sm w-4 text-center text-cyan-400">{golsJogador}</span>
                    <Button size="icon" className="h-6 w-6 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleGolClick(j, store.timeA!.numero)}>
                      <Plus size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-[#0d1f35]/50 backdrop-blur-sm rounded-xl p-2 overflow-y-auto border border-cyan-500/10">
            {store.timeB?.jogadores.map((j: any) => {
              const golsJogador = store.eventos.filter(e => e.tipo === 'gol' && e.jogador_id === j.id).length;
              return (
                <div key={j.id} className={cn(
                  "flex items-center justify-between p-2 mb-2 rounded-lg bg-[#0a1628]/80 border border-cyan-500/10 shadow-sm",
                  !store.isRunning && "opacity-70"
                )}>
                  <button 
                    onClick={() => handleJogadorClick(j, 'B')}
                    className={cn(
                      "text-xs font-bold truncate max-w-[65px] sm:max-w-[100px] text-left transition-colors",
                      !store.isRunning ? "text-amber-400 hover:text-amber-300 cursor-pointer" : "text-white cursor-default"
                    )}
                    title={!store.isRunning ? "Clique para substituir" : ""}
                  >
                    {j.nome}
                  </button>
                  <div className="flex gap-1 items-center">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:bg-red-500/10" onClick={() => removeUltimoEventoDoJogador(j.id)}>
                      <Minus size={14} />
                    </Button>
                    <span className="font-mono text-sm w-4 text-center text-cyan-400">{golsJogador}</span>
                    <Button size="icon" className="h-6 w-6 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleGolClick(j, store.timeB!.numero)}>
                      <Plus size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Histórico de eventos */}
        {store.eventos.length > 0 && (
          <div className="h-20 sm:h-24 bg-black/60 backdrop-blur-md rounded-xl p-1.5 sm:p-2 mx-1 sm:mx-2 mb-2 overflow-y-auto text-xs space-y-1 border border-cyan-500/10">
            {store.eventos.filter(e => e.tipo === 'gol' || e.tipo === 'gol_contra').slice().reverse().map((e) => {
              let textoAssistencia = "";
              if (e.assist_por) {
                const timeAssist = (e.time_id === store.timeA?.numero ? store.timeA : store.timeB);
                let nomeAssist = timeAssist?.jogadores.find((j: any) => j.id === e.assist_por)?.nome;
                if (!nomeAssist) {
                  const goleiroObj = goleiros?.find((g: any) => g.id === e.assist_por);
                  if (goleiroObj) nomeAssist = `${goleiroObj.nome} (GL)`;
                }
                if (nomeAssist) textoAssistencia = ` 👟 ${nomeAssist}`;
              }
              return (
                <div key={e.id} className="flex justify-between items-center text-cyan-100/60 hover:bg-white/5 p-1 rounded group">
                  <div className="flex gap-2 items-center truncate">
                    <span className={e.tipo === 'gol_contra' ? "text-red-400" : "text-white"}>
                      ⚽ {e.nome_jogador} <span className="text-cyan-100/40">({e.time_id === store.timeA?.numero ? store.timeA?.nome : store.timeB?.nome})</span>
                      <span className="text-cyan-400 font-medium">{textoAssistencia}</span>
                    </span>
                  </div>
                  <div className="flex gap-2 items-center flex-shrink-0">
                    <span className="text-cyan-100/40">{e.tempo}</span>
                    <button onClick={() => removerEventoPorId(e.id)} className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Botão encerrar rodada */}
        <div className="px-4 pb-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-cyan-100/40 hover:text-red-400 hover:bg-red-500/10"
            onClick={() => setShowConfirmacao({ isOpen: true, tipo: 'finalizar-rodada' })}
            disabled={store.isRunning || finalizarRodadaMutation.isPending}
          >
            <Flag size={14} className="mr-1" />
            {finalizarRodadaMutation.isPending ? 'Finalizando...' : 'Encerrar Rodada do Dia'}
          </Button>
        </div>
      </div>

      {/* Modals */}
      <ModalSelecaoTime isOpen={!!modalTimeSlot} onClose={() => setModalTimeSlot(null)} times={timesFiltrados} onSelect={(t: any) => handleSelectTime(t, modalTimeSlot!)} />
      <ModalAssistencia isOpen={!!modalAssist} onClose={() => setModalAssist(null)} jogadoresTime={modalAssist?.timeId === store.timeA?.numero ? store.timeA?.jogadores : store.timeB?.jogadores} autorGolId={modalAssist?.autorId} onConfirm={confirmGol} goleiroId={modalAssist?.timeId === store.timeA?.numero ? store.goleiroA : store.goleiroB} goleirosLista={goleiros} />
      <ModalConfirmacao isOpen={showConfirmacao.isOpen} onClose={() => setShowConfirmacao({ isOpen: false, tipo: null })} onConfirm={handleConfirmarAcao} titulo={showConfirmacao.tipo === 'finalizar-partida' ? "Encerrar Jogo?" : "Finalizar Rodada?"} mensagem={showConfirmacao.tipo === 'finalizar-partida' ? "Tem certeza que deseja finalizar a partida? O placar será salvo." : "Isso irá encerrar a rodada atual e voltar para o menu. Confirmar?"} />
      
      {/* Modal de Substituição durante a partida */}
      <ModalSubstituicaoPartida
        isOpen={modalSubstituicao.isOpen}
        onClose={() => setModalSubstituicao({ isOpen: false, jogadorSaindo: null, timeSlot: null })}
        jogadorSaindo={modalSubstituicao.jogadorSaindo}
        jogadoresDisponiveis={jogadoresDisponiveisParaSubstituicao}
        onConfirm={handleConfirmarSubstituicao}
      />
      
      <Dialog open={modalGolContra.isOpen} onOpenChange={() => setModalGolContra({ isOpen: false, timeQueMarcou: 'time1' })}>
        <DialogContent className="max-w-xs bg-[#0a1628] border-red-500/30">
          <DialogHeader>
            <DialogTitle className="text-red-400">Quem fez Gol Contra?</DialogTitle>
            <DialogDescription className="sr-only">Selecionar jogador</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 max-h-[300px] overflow-y-auto">
            {(modalGolContra.timeQueMarcou === 'time1' ? store.timeA?.jogadores : store.timeB?.jogadores)?.map((j: any) => (
              <Button key={j.id} variant="ghost" className="justify-start text-red-400 hover:bg-red-500/10" onClick={() => handleGolContra(j.id, modalGolContra.timeQueMarcou === 'time1' ? store.timeA!.numero : store.timeB!.numero)}>
                {j.nome}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};