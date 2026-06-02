// Arquivo: src/features/campeonatos/routes/CampeonatoPartidaCopaPage.tsx
// Tela ao vivo para partidas de Copa — mesmo padrão da liga (pontos corridos)
import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Minus, CheckCircle, Play, Pause,
  Flag, Loader2, X, Trash2, RefreshCw, Search, UserPlus,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/api';

// ─── tipos locais ─────────────────────────────────────────────────────────────
interface JogadorSimples { id: number; nome: string; foto_url?: string | null }
interface TimeLocal { id: number; nome: string; logo: string | null; jogadores: JogadorSimples[] }
interface EventoLocal { id: string; tipo: 'gol' | 'gol_contra'; jogador_id: number; nome_jogador: string; time_id: number; tempo: string }

// ─── modal assistência ────────────────────────────────────────────────────────
const ModalAssistencia = ({ isOpen, onClose, jogadoresTime, autorGolId, onConfirm }: any) => {
  if (!isOpen) return null;
  const possiveis = (jogadoresTime ?? []).filter((j: any) => j.id !== autorGolId);
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a1628] border-cyan-500/20 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Quem deu o passe?</DialogTitle>
          <DialogDescription className="sr-only">Selecione quem deu a assistência</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-4">
          <Button variant="outline" className="col-span-2 border-dashed border-cyan-500/30 text-cyan-100/70 hover:bg-cyan-500/10" onClick={() => onConfirm(null)}>
            Jogada Individual (Sem Assist.)
          </Button>
          {possiveis.map((j: any) => (
            <Button key={j.id} variant="ghost" className="justify-start truncate text-white hover:bg-cyan-500/10" onClick={() => onConfirm(j.id)}>
              {j.nome}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── modal confirmação ────────────────────────────────────────────────────────
const ModalConfirmacao = ({ isOpen, onClose, onConfirm, titulo, mensagem }: any) => {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#0a1628] rounded-xl p-6 max-w-md w-full mx-4 border border-cyan-500/20">
          <h3 className="text-xl font-bold text-white mb-4">{titulo}</h3>
          <p className="text-cyan-100/60 mb-6">{mensagem}</p>
          <div className="flex gap-3 justify-end">
            <Button onClick={onClose} variant="outline" className="border-cyan-500/30 text-cyan-100/70 hover:bg-cyan-500/10">Cancelar</Button>
            <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white">Confirmar</Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// ─── modal substituição ───────────────────────────────────────────────────────
const ModalSubstituicao = ({ isOpen, onClose, jogadorSaindo, jogadoresDisponiveis, onConfirm }: any) => {
  const [busca, setBusca] = React.useState('');
  const [selecionado, setSelecionado] = React.useState<number | null>(null);

  React.useEffect(() => { if (isOpen) { setBusca(''); setSelecionado(null); } }, [isOpen]);
  if (!isOpen || !jogadorSaindo) return null;

  const filtrados = jogadoresDisponiveis.filter((j: any) => j.nome.toLowerCase().includes(busca.toLowerCase()));
  const selObj = jogadoresDisponiveis.find((j: any) => j.id === selecionado);

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
              <span className="text-red-400 font-bold text-sm">{jogadorSaindo.nome.substring(0, 2).toUpperCase()}</span>
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
            <div className={cn('w-14 h-14 rounded-full flex items-center justify-center mb-2 border-2 transition-all', selecionado ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-[#0d1f35] border-dashed border-cyan-500/30')}>
              {selecionado ? <span className="text-emerald-400 font-bold text-sm">{selObj?.nome.substring(0, 2).toUpperCase()}</span> : <UserPlus size={20} className="text-cyan-500/40" />}
            </div>
            <span className={cn('text-xs font-medium truncate max-w-full', selecionado ? 'text-emerald-400' : 'text-cyan-100/40')}>
              {selecionado ? selObj?.nome : 'Selecione'}
            </span>
            <span className="text-[10px] text-emerald-400/60 uppercase">Entra</span>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-100/40" size={16} />
          <input type="text" placeholder="Buscar jogador..." value={busca} onChange={e => setBusca(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg bg-[#0d1f35]/50 border border-cyan-500/20 text-white placeholder:text-cyan-100/30 focus:outline-none focus:border-cyan-500/40" />
        </div>
        <div className="max-h-[200px] overflow-y-auto space-y-1">
          {filtrados.length === 0
            ? <p className="text-center text-cyan-100/40 text-sm py-6">Nenhum jogador disponível</p>
            : filtrados.map((j: any) => (
              <button key={j.id} onClick={() => setSelecionado(j.id)}
                className={cn('w-full flex items-center gap-3 p-2.5 rounded-lg transition-all', selecionado === j.id ? 'bg-cyan-500/10 border border-cyan-500/30' : 'hover:bg-cyan-500/5 border border-transparent')}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/20 flex items-center justify-center">
                  <span className="text-cyan-400 text-xs font-bold">{j.nome.substring(0, 2).toUpperCase()}</span>
                </div>
                <span className="text-sm font-medium text-white flex-1 text-left">{j.nome}</span>
                {selecionado === j.id && <CheckCircle size={16} className="text-cyan-400" />}
              </button>
            ))}
        </div>
        <div className="flex gap-3 pt-2">
          <Button onClick={onClose} variant="outline" className="flex-1 border-cyan-500/30 text-cyan-100/70 hover:bg-cyan-500/10">Cancelar</Button>
          <Button onClick={() => selecionado && selObj && onConfirm(selecionado, selObj.nome)} disabled={!selecionado}
            className="flex-1 bg-gradient-to-r from-cyan-600 to-teal-600 text-white disabled:opacity-50">
            <RefreshCw size={16} className="mr-2" /> Confirmar Troca
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── página principal ─────────────────────────────────────────────────────────
export function CampeonatoPartidaCopaPage() {
  const { id, partidaId } = useParams<{ id: string; partidaId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const campeonatoId = Number(id);
  const pId = Number(partidaId);

  // ── timer ──
  const [isRunning, setIsRunning] = React.useState(false);
  const [accTime, setAccTime] = React.useState(0);
  const [startTime, setStartTime] = React.useState<number | null>(null);
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (isRunning && startTime !== null) {
        const delta = Math.floor((Date.now() - startTime) / 1000);
        setDisplay(accTime + delta);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, startTime, accTime]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const play = () => { if (!isRunning) { setIsRunning(true); setStartTime(Date.now()); } };
  const pause = () => {
    if (!isRunning || startTime === null) return;
    const delta = Math.floor((Date.now() - startTime) / 1000);
    setAccTime(a => a + delta);
    setIsRunning(false);
    setStartTime(null);
  };
  const getSeg = () => isRunning && startTime ? accTime + Math.floor((Date.now() - startTime) / 1000) : accTime;

  // ── dados ──
  const [timeA, setTimeA] = React.useState<TimeLocal | null>(null);
  const [timeB, setTimeB] = React.useState<TimeLocal | null>(null);
  const [goleiroA, setGoleiroA] = React.useState<number | null>(null);
  const [goleiroB, setGoleiroB] = React.useState<number | null>(null);
  const [eventos, setEventos] = React.useState<EventoLocal[]>([]);

  // ── modais ──
  const [modalAssist, setModalAssist] = React.useState<{ autorId: number; timeId: number } | null>(null);
  const [modalGolContra, setModalGolContra] = React.useState<{ slot: 'A' | 'B' } | null>(null);
  const [modalSub, setModalSub] = React.useState<{ jogadorSaindo: JogadorSimples; slot: 'A' | 'B' } | null>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);

  // ── queries ──
  const { data: partida, isLoading: loadingPartida } = useQuery<any>({
    queryKey: ['partida', pId, 'detalhe-copa'],
    queryFn: async () => {
      const { data } = await api.get(`/partidas/${pId}/detalhes`);
      return data.partida ?? data;
    },
    enabled: !!pId,
  });

  const { data: timesData, isLoading: loadingTimes } = useQuery<any[]>({
    queryKey: ['times-copa', partida?.timeA_id, partida?.timeB_id],
    queryFn: async () => {
      const [resA, resB] = await Promise.all([
        api.get(`/times/${partida.timeA_id}`),
        api.get(`/times/${partida.timeB_id}`),
      ]);
      return [resA.data, resB.data];
    },
    enabled: !!partida?.timeA_id && !!partida?.timeB_id,
  });

  // Inicializa os times quando os dados chegam
  React.useEffect(() => {
    if (!timesData) return;
    const [tA, tB] = timesData;
    const mapTime = (t: any): TimeLocal => ({
      id: t.id,
      nome: t.nome,
      logo: t.logo_url ?? t.logoUrl ?? null,
      jogadores: (t.jogadores ?? [])
        .filter((j: any) => j.posicao !== 'goleiro')
        .map((j: any) => ({ id: j.id, nome: j.nome, foto_url: j.foto_url ?? null })),
    });
    setTimeA(mapTime(tA));
    setTimeB(mapTime(tB));
  }, [timesData]);

  const { data: goleiros } = useQuery<any[]>({
    queryKey: ['goleiros'],
    queryFn: async () => (await api.get('/jogadores', { params: { posicao: 'goleiro' } })).data,
  });

  // ── computados ──
  const placarA = React.useMemo(() =>
    eventos.filter(e => (e.tipo === 'gol' && e.time_id === timeA?.id) || (e.tipo === 'gol_contra' && e.time_id === timeB?.id)).length,
    [eventos, timeA, timeB]);
  const placarB = React.useMemo(() =>
    eventos.filter(e => (e.tipo === 'gol' && e.time_id === timeB?.id) || (e.tipo === 'gol_contra' && e.time_id === timeA?.id)).length,
    [eventos, timeA, timeB]);

  const golsJogador = (id: number) => eventos.filter(e => e.tipo === 'gol' && e.jogador_id === id).length;

  const todosJogadores = React.useMemo(() => [
    ...(timeA?.jogadores ?? []),
    ...(timeB?.jogadores ?? []),
  ], [timeA, timeB]);

  // ── handlers gol ──
  const abrirGol = (jogador: JogadorSimples, timeId: number) => {
    if (!isRunning) { toast.error('Inicie o cronômetro!'); return; }
    setModalAssist({ autorId: jogador.id, timeId });
  };

  const confirmarGol = (_assistId: number | null) => {
    if (!modalAssist) return;
    const { autorId, timeId } = modalAssist;
    const time = timeId === timeA?.id ? timeA : timeB;
    const jogadorNome = time?.jogadores.find(j => j.id === autorId)?.nome ?? 'Jogador';
    setEventos(prev => [...prev, { id: Math.random().toString(36), tipo: 'gol', jogador_id: autorId, nome_jogador: jogadorNome, time_id: timeId, tempo: fmt(getSeg()) }]);
    setModalAssist(null);
    toast.success(`⚽ Gol do ${jogadorNome}!`);
  };

  const removerGol = (jogadorId: number) => {
    const idx = [...eventos].reverse().findIndex(e => e.tipo === 'gol' && e.jogador_id === jogadorId);
    if (idx !== -1) {
      const real = eventos.length - 1 - idx;
      setEventos(prev => prev.filter((_, i) => i !== real));
      toast.info('Gol removido.');
    }
  };

  const confirmarGolContra = (jogadorId: number, timeId: number) => {
    const time = timeId === timeA?.id ? timeA : timeB;
    const nome = time?.jogadores.find(j => j.id === jogadorId)?.nome ?? 'Jogador';
    setEventos(prev => [...prev, { id: Math.random().toString(36), tipo: 'gol_contra', jogador_id: jogadorId, nome_jogador: `${nome} (GC)`, time_id: timeId, tempo: fmt(getSeg()) }]);
    setModalGolContra(null);
    toast.success('Gol contra registrado!');
  };

  // ── substituição ──
  const jogadoresDisponiveisParaSub = React.useMemo(() => {
    const naPartida = new Set([...(timeA?.jogadores ?? []), ...(timeB?.jogadores ?? [])].map(j => j.id));
    return todosJogadores.filter(j => !naPartida.has(j.id));
  }, [timeA, timeB, todosJogadores]);

  const confirmarSub = (novoId: number, novoNome: string) => {
    if (!modalSub) return;
    const { jogadorSaindo, slot } = modalSub;
    const atualiza = (time: TimeLocal): TimeLocal => ({
      ...time,
      jogadores: time.jogadores.map(j => j.id === jogadorSaindo.id ? { id: novoId, nome: novoNome } : j),
    });
    if (slot === 'A' && timeA) setTimeA(atualiza(timeA));
    if (slot === 'B' && timeB) setTimeB(atualiza(timeB));
    toast.success(`Substituição: ${jogadorSaindo.nome} → ${novoNome}`);
    setModalSub(null);
  };

  // ── finalizar ──
  const finalizarMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/partidas/${pId}/finalizar`, {
        placar_timeA: placarA,
        placar_timeB: placarB,
        timeA_id: partida?.timeA_id,
        timeB_id: partida?.timeB_id,
      });
    },
    onSuccess: () => {
      toast.success('Partida finalizada!');
      queryClient.invalidateQueries({ queryKey: ['campeonato', campeonatoId] });
      queryClient.invalidateQueries({ queryKey: ['campeonatos', campeonatoId] });
      navigate(`/campeonatos/${campeonatoId}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao finalizar'),
  });

  const handlePlayPause = () => {
    if (isRunning) { pause(); return; }
    if (!timeA || !timeB) { toast.warning('Aguarde carregar os times.'); return; }
    if (!goleiroA || !goleiroB) { toast.error('⚠️ Selecione o goleiro de cada time!', { duration: 4000 }); return; }
    play();
  };

  // ── loading ──
  if (loadingPartida || loadingTimes) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col pb-20 relative">
      {/* Campo decorativo */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ zIndex: 0 }}>
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-cyan-500 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 border-2 border-cyan-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-0 w-32 h-64 border-r-2 border-y-2 border-cyan-500 -translate-y-1/2" />
        <div className="absolute top-1/2 right-0 w-32 h-64 border-l-2 border-y-2 border-cyan-500 -translate-y-1/2" />
      </div>

      {/* Header */}
      <div className="bg-[#0d1f35]/90 backdrop-blur border-b border-cyan-500/20 p-3 flex justify-between items-center sticky top-0 z-20">
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-cyan-100/60 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> Sair
        </Button>
        <motion.div
          animate={{ scale: isRunning ? [1, 1.02, 1] : 1 }}
          transition={{ duration: 1, repeat: isRunning ? Infinity : 0 }}
          className={cn('font-mono text-2xl sm:text-3xl font-bold px-3 py-1 rounded-lg', isRunning ? 'text-red-400' : 'text-white')}
        >
          {fmt(display)}
        </motion.div>
        <Button
          onClick={handlePlayPause}
          className={cn('font-bold', isRunning ? 'bg-amber-500 hover:bg-amber-600 text-amber-900' : 'bg-emerald-600 hover:bg-emerald-700 text-white')}
        >
          {isRunning
            ? <><Pause size={16} className="sm:mr-1" /><span className="hidden sm:inline"> Pausar</span></>
            : <><Play size={16} className="sm:mr-1" /><span className="hidden sm:inline"> Iniciar</span></>}
        </Button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col p-3 sm:p-4 gap-3 sm:gap-4">

        {/* Placar */}
        <div className="grid grid-cols-3 items-center gap-2">
          {/* Time A */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#0d1f35] border-2 border-cyan-500/30 flex items-center justify-center overflow-hidden shadow-lg">
              {timeA?.logo ? <img src={timeA.logo} className="w-full h-full object-cover" /> : <span className="font-bold text-cyan-400">{(timeA?.nome ?? 'A').substring(0, 2)}</span>}
            </div>
            <span className="font-bold text-xs sm:text-sm text-center mt-1 text-white leading-tight">{timeA?.nome ?? '...'}</span>
            <motion.span key={placarA} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="text-3xl sm:text-4xl font-black mt-2 text-white">{placarA}</motion.span>
            <div className="mt-1">
              <Select value={goleiroA?.toString() ?? ''} onValueChange={v => setGoleiroA(Number(v))} disabled={isRunning}>
                <SelectTrigger className={cn('h-7 text-[10px] w-16 sm:w-20', !goleiroA ? 'bg-red-500/20 border-red-500/50 animate-pulse' : 'bg-[#0d1f35] border-cyan-500/20')}>
                  <SelectValue placeholder="Goleiro" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a1628] border-cyan-500/20">
                  {goleiros?.map((g: any) => <SelectItem key={g.id} value={String(g.id)} className="text-white">{g.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* VS + Encerrar */}
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black text-cyan-500">×</span>
            <Button variant="destructive" size="sm" className="mt-4 bg-red-600 hover:bg-red-700"
              onClick={() => setShowConfirm(true)} disabled={isRunning || !timeA || !timeB}>
              <CheckCircle size={14} className="mr-1" /> Encerrar
            </Button>
          </div>

          {/* Time B */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#0d1f35] border-2 border-cyan-500/30 flex items-center justify-center overflow-hidden shadow-lg">
              {timeB?.logo ? <img src={timeB.logo} className="w-full h-full object-cover" /> : <span className="font-bold text-cyan-400">{(timeB?.nome ?? 'B').substring(0, 2)}</span>}
            </div>
            <span className="font-bold text-xs sm:text-sm text-center mt-1 text-white leading-tight">{timeB?.nome ?? '...'}</span>
            <motion.span key={placarB} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="text-3xl sm:text-4xl font-black mt-2 text-white">{placarB}</motion.span>
            <div className="mt-1">
              <Select value={goleiroB?.toString() ?? ''} onValueChange={v => setGoleiroB(Number(v))} disabled={isRunning}>
                <SelectTrigger className={cn('h-7 text-[10px] w-16 sm:w-20', !goleiroB ? 'bg-red-500/20 border-red-500/50 animate-pulse' : 'bg-[#0d1f35] border-cyan-500/20')}>
                  <SelectValue placeholder="Goleiro" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a1628] border-cyan-500/20">
                  {goleiros?.map((g: any) => <SelectItem key={g.id} value={String(g.id)} className="text-white">{g.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Botões especiais */}
        <div className="grid grid-cols-2 gap-2 py-2 px-2">
          <div className="flex justify-start gap-2">
            <Button size="sm" variant="outline" className="text-[10px] sm:text-xs h-8 px-1.5 sm:px-3 border-red-500/50 text-red-400 hover:bg-red-500/10"
              onClick={() => setModalGolContra({ slot: 'A' })} disabled={!timeA || !isRunning}>Gol Contra</Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" className="text-[10px] sm:text-xs h-8 px-1.5 sm:px-3 border-red-500/50 text-red-400 hover:bg-red-500/10"
              onClick={() => setModalGolContra({ slot: 'B' })} disabled={!timeB || !isRunning}>Gol Contra</Button>
          </div>
        </div>

        {/* Lista de jogadores */}
        <div className="flex-1 grid grid-cols-2 gap-2 sm:gap-4 overflow-hidden min-h-0 px-1 sm:px-2">
          {/* Time A */}
          <div className="bg-[#0d1f35]/50 backdrop-blur-sm rounded-xl p-2 overflow-y-auto border border-cyan-500/10">
            {timeA?.jogadores.map(j => (
              <div key={j.id} className={cn('flex items-center justify-between p-2 mb-2 rounded-lg bg-[#0a1628]/80 border border-cyan-500/10 shadow-sm', !isRunning && 'opacity-70')}>
                <button
                  onClick={() => { if (!isRunning) setModalSub({ jogadorSaindo: j, slot: 'A' }); }}
                  className={cn('text-sm font-bold truncate max-w-[90px] sm:max-w-[130px] text-left transition-colors leading-tight',
                    !isRunning ? 'text-amber-400 hover:text-amber-300 cursor-pointer' : 'text-white cursor-default')}
                  title={!isRunning ? 'Clique para substituir' : ''}
                >{j.nome}</button>
                <div className="flex gap-1 items-center">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-500/10" onClick={() => removerGol(j.id)}>
                    <Minus size={14} />
                  </Button>
                  <span className="font-mono text-sm w-5 text-center text-cyan-400">{golsJogador(j.id)}</span>
                  <Button size="icon" className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => abrirGol(j, timeA.id)}>
                    <Plus size={14} />
                  </Button>
                </div>
              </div>
            ))}
            {(!timeA || timeA.jogadores.length === 0) && (
              <p className="text-center text-cyan-100/30 text-xs py-6">Sem jogadores de linha no elenco</p>
            )}
          </div>

          {/* Time B */}
          <div className="bg-[#0d1f35]/50 backdrop-blur-sm rounded-xl p-2 overflow-y-auto border border-cyan-500/10">
            {timeB?.jogadores.map(j => (
              <div key={j.id} className={cn('flex items-center justify-between p-2 mb-2 rounded-lg bg-[#0a1628]/80 border border-cyan-500/10 shadow-sm', !isRunning && 'opacity-70')}>
                <button
                  onClick={() => { if (!isRunning) setModalSub({ jogadorSaindo: j, slot: 'B' }); }}
                  className={cn('text-sm font-bold truncate max-w-[90px] sm:max-w-[130px] text-left transition-colors leading-tight',
                    !isRunning ? 'text-amber-400 hover:text-amber-300 cursor-pointer' : 'text-white cursor-default')}
                  title={!isRunning ? 'Clique para substituir' : ''}
                >{j.nome}</button>
                <div className="flex gap-1 items-center">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-500/10" onClick={() => removerGol(j.id)}>
                    <Minus size={14} />
                  </Button>
                  <span className="font-mono text-sm w-5 text-center text-cyan-400">{golsJogador(j.id)}</span>
                  <Button size="icon" className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => abrirGol(j, timeB.id)}>
                    <Plus size={14} />
                  </Button>
                </div>
              </div>
            ))}
            {(!timeB || timeB.jogadores.length === 0) && (
              <p className="text-center text-cyan-100/30 text-xs py-6">Sem jogadores de linha no elenco</p>
            )}
          </div>
        </div>

        {/* Histórico de eventos */}
        {eventos.length > 0 && (
          <div className="h-20 sm:h-24 bg-black/60 backdrop-blur-md rounded-xl p-1.5 sm:p-2 mx-1 mb-2 overflow-y-auto text-xs space-y-1 border border-cyan-500/10">
            {[...eventos].reverse().map(e => (
              <div key={e.id} className="flex justify-between items-center text-cyan-100/60 hover:bg-white/5 p-1 rounded group">
                <span className={e.tipo === 'gol_contra' ? 'text-red-400' : 'text-white'}>
                  ⚽ {e.nome_jogador} <span className="text-cyan-100/40">({e.time_id === timeA?.id ? timeA?.nome : timeB?.nome})</span>
                </span>
                <div className="flex gap-2 items-center flex-shrink-0">
                  <span className="text-cyan-100/40">{e.tempo}</span>
                  <button onClick={() => setEventos(prev => prev.filter(ev => ev.id !== e.id))}
                    className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modais */}
      <ModalAssistencia
        isOpen={!!modalAssist}
        onClose={() => setModalAssist(null)}
        jogadoresTime={modalAssist?.timeId === timeA?.id ? timeA?.jogadores : timeB?.jogadores}
        autorGolId={modalAssist?.autorId}
        onConfirm={confirmarGol}
      />
      <ModalConfirmacao
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => { setShowConfirm(false); finalizarMutation.mutate(); }}
        titulo="Encerrar Partida?"
        mensagem={`Resultado: ${timeA?.nome ?? 'Time A'} ${placarA} × ${placarB} ${timeB?.nome ?? 'Time B'}. Confirmar?`}
      />
      <ModalSubstituicao
        isOpen={!!modalSub}
        onClose={() => setModalSub(null)}
        jogadorSaindo={modalSub?.jogadorSaindo}
        jogadoresDisponiveis={jogadoresDisponiveisParaSub}
        onConfirm={confirmarSub}
      />

      {/* Modal gol contra */}
      <Dialog open={!!modalGolContra} onOpenChange={() => setModalGolContra(null)}>
        <DialogContent className="max-w-xs bg-[#0a1628] border-red-500/30">
          <DialogHeader>
            <DialogTitle className="text-red-400">Quem fez Gol Contra?</DialogTitle>
            <DialogDescription className="sr-only">Selecionar jogador</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 max-h-[300px] overflow-y-auto">
            {(modalGolContra?.slot === 'A' ? timeA?.jogadores : timeB?.jogadores)?.map(j => (
              <Button key={j.id} variant="ghost" className="justify-start text-red-400 hover:bg-red-500/10"
                onClick={() => confirmarGolContra(j.id, modalGolContra!.slot === 'A' ? timeA!.id : timeB!.id)}>
                {j.nome}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CampeonatoPartidaCopaPage;
