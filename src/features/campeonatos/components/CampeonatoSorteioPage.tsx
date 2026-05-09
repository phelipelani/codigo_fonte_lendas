// Arquivo: src/features/Campeonatos/routes/CampeonatoSorteioPage.tsx
import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Shuffle, Users, Clipboard, CheckCircle, 
  Trophy, Loader2, Star, Shield, ArrowRight, Sparkles,
  AlertTriangle, Database, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/api';

// ============================================================================
// TIPOS
// ============================================================================

interface JogadorSorteio {
  id?: number;
  nome: string;
  nota: number;
  joga_recuado: boolean;
  isFromDb: boolean;
  foto_url?: string;
}

interface TimeSorteado {
  nome: string;
  logo?: string;
  jogadores: JogadorSorteio[];
  pontuacaoTotal: number;
}

interface JogadorDB {
  id: number;
  nome: string;
  nivel: number;
  foto_url?: string;
  posicao?: string;
}

// ✅ NOMES E LOGOS DOS TIMES CORRETOS
const TIMES_CONFIG = [
  { nome: 'Time Amarelo', logo: '/src/assets/Amarelo.webp', cor: 'from-yellow-500 to-amber-600' },
  { nome: 'Time Preto', logo: '/src/assets/Preto.webp', cor: 'from-gray-700 to-gray-900' },
  { nome: 'Time Azul', logo: '/src/assets/Azul.webp', cor: 'from-blue-500 to-blue-700' },
  { nome: 'Time Rosa', logo: '/src/assets/Rosa.webp', cor: 'from-pink-400 to-pink-600' },
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function CampeonatoSorteioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const campeonatoId = Number(id);

  // Estados do fluxo
  const [step, setStep] = useState<'input' | 'notas' | 'resultado'>('input');
  const [nomesTexto, setNomesTexto] = useState('');
  const [jogadores, setJogadores] = useState<JogadorSorteio[]>([]);
  const [jogadoresPorTime, setJogadoresPorTime] = useState(5);
  const [timesSorteados, setTimesSorteados] = useState<TimeSorteado[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Buscar info do campeonato
  const { data: campeonato, isLoading: loadingCampeonato } = useQuery({
    queryKey: ['campeonatos', campeonatoId],
    queryFn: async () => (await api.get(`/campeonatos/${campeonatoId}`)).data
  });

  // Função para parsear nomes (remove números)
  const parseNomes = (texto: string): string[] => {
    return texto
      .split('\n')
      .map(linha => linha.replace(/^[\d\.\-\)\s]+/, '').trim())
      .filter(nome => nome.length > 0);
  };

  // Mutation: Sincronizar jogadores com o banco
  const syncMutation = useMutation({
    mutationFn: async (nomes: string[]) => {
      const { data } = await api.post('/jogadores/sync-por-nomes', { nomes });
      return data as { jogadores: JogadorDB[]; novos: number; existentes: number; };
    }
  });

  // STEP 1: Input de nomes e sincronização
  const handleParsarESincronizar = async () => {
    const nomes = parseNomes(nomesTexto);

    if (nomes.length < 2) {
      toast.error('Adicione pelo menos 2 jogadores');
      return;
    }

    setIsSyncing(true);

    try {
      const result = await syncMutation.mutateAsync(nomes);
      
      const jogadoresMapeados: JogadorSorteio[] = nomes.map(nome => {
        const jogadorDB = result.jogadores.find(
          j => j.nome.toLowerCase() === nome.toLowerCase()
        );

        if (jogadorDB) {
          return {
            id: jogadorDB.id,
            nome: jogadorDB.nome,
            nota: jogadorDB.nivel || 5,
            joga_recuado: jogadorDB.posicao === 'goleiro' || jogadorDB.posicao === 'zagueiro',
            isFromDb: true,
            foto_url: jogadorDB.foto_url
          };
        } else {
          return { nome, nota: 5, joga_recuado: false, isFromDb: false };
        }
      });

      setJogadores(jogadoresMapeados);
      
      const fromDb = jogadoresMapeados.filter(j => j.isFromDb).length;
      const newPlayers = jogadoresMapeados.filter(j => !j.isFromDb).length;
      
      if (fromDb > 0) {
        toast.success(`${fromDb} jogadores encontrados no banco!`, {
          description: newPlayers > 0 ? `${newPlayers} novos serão criados` : 'Notas carregadas automaticamente'
        });
      } else {
        toast.info(`${nomes.length} jogadores serão criados`);
      }

      setStep('notas');

    } catch (error: any) {
      const jogadoresFallback: JogadorSorteio[] = parseNomes(nomesTexto).map(nome => ({
        nome, nota: 5, joga_recuado: false, isFromDb: false
      }));
      setJogadores(jogadoresFallback);
      toast.warning('Não foi possível sincronizar com o banco');
      setStep('notas');
    } finally {
      setIsSyncing(false);
    }
  };

  // Mutation para criar times e iniciar campeonato
  const iniciarMutation = useMutation({
    mutationFn: async (times: TimeSorteado[]) => {
      const timesPayload = times.map(time => ({
        nome: time.nome,
        jogadores: time.jogadores.map(j => ({
          id: j.id,
          nome: j.nome,
          nota: j.nota
        }))
      }));

      const { data } = await api.post(`/campeonatos/${campeonatoId}/criar-times-sorteio`, {
        times: timesPayload,
        jogadoresPorTime
      });

      return data;
    },
    onSuccess: () => {
      toast.success('Times criados e campeonato iniciado!', {
        description: `${timesSorteados.length} times foram inscritos automaticamente.`
      });
      queryClient.invalidateQueries({ queryKey: ['campeonatos'] });
      queryClient.invalidateQueries({ queryKey: ['campeonatos', campeonatoId] });
      navigate(`/campeonatos/${campeonatoId}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao criar times');
    }
  });

  // STEP 2: Ajustar notas
  const handleNotaChange = (index: number, nota: number) => {
    setJogadores(prev => 
      prev.map((j, i) => i === index ? { ...j, nota: Math.min(10, Math.max(1, nota)) } : j)
    );
  };

  const handleRecuadoChange = (index: number, checked: boolean) => {
    setJogadores(prev => 
      prev.map((j, i) => i === index ? { ...j, joga_recuado: checked } : j)
    );
  };

  // Estatísticas
  const stats = useMemo(() => {
    const numTimes = Math.floor(jogadores.length / jogadoresPorTime);
    const fromDb = jogadores.filter(j => j.isFromDb).length;
    const recuados = jogadores.filter(j => j.joga_recuado).length;

    // Calcular tiers para preview
    const sorted = [...jogadores].sort((a, b) => b.nota - a.nota);
    const naoRecuados = sorted.filter(j => !j.joga_recuado);
    const mvps = naoRecuados.slice(0, numTimes).length;
    const peDeRato = Math.min(numTimes, naoRecuados.length >= numTimes * 2 ? numTimes : Math.max(0, naoRecuados.length - numTimes));

    return { mvps, peDeRato, recuados, numTimes, fromDb };
  }, [jogadores, jogadoresPorTime]);

  // Embaralha array (Fisher-Yates)
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Algoritmo de sorteio balanceado por categorias
  const sortearTimes = () => {
    if (stats.numTimes < 2) {
      toast.error('Jogadores insuficientes para formar times');
      return;
    }

    const numTimes = stats.numTimes;

    // 1. Classificar jogadores em tiers
    const sorted = [...jogadores].sort((a, b) => b.nota - a.nota);

    // Separar recuados primeiro (para não contar duplo)
    const recuados: JogadorSorteio[] = [];
    const naoRecuados: JogadorSorteio[] = [];
    sorted.forEach(j => {
      if (j.joga_recuado) recuados.push(j);
      else naoRecuados.push(j);
    });

    // Dos não-recuados, pegar os top N como MVP e bottom N como Pé de Rato
    const mvps = naoRecuados.slice(0, numTimes);
    const peDeRato = naoRecuados.slice(-numTimes);

    // Jogadores que são tanto MVP quanto Pé de Rato (quando há poucos jogadores)
    const mvpIds = new Set(mvps.map((_, i) => i));
    const peDeRatoIds = new Set(peDeRato.map(j => naoRecuados.indexOf(j)));

    // Montar as categorias sem sobreposição
    const tierMvp: JogadorSorteio[] = [];
    const tierPeDeRato: JogadorSorteio[] = [];
    const tierRecuado: JogadorSorteio[] = [];
    const tierNormal: JogadorSorteio[] = [];
    const usados = new Set<string>();

    // Tier MVP: top jogadores (não recuados, maiores notas)
    for (const j of mvps) {
      if (tierMvp.length >= numTimes) break;
      tierMvp.push(j);
      usados.add(j.nome);
    }

    // Tier Recuado
    for (const j of recuados) {
      if (tierRecuado.length >= numTimes) break;
      if (!usados.has(j.nome)) {
        tierRecuado.push(j);
        usados.add(j.nome);
      }
    }

    // Tier Pé de Rato: piores notas (não recuados, não MVPs)
    for (let i = naoRecuados.length - 1; i >= 0; i--) {
      if (tierPeDeRato.length >= numTimes) break;
      const j = naoRecuados[i];
      if (!usados.has(j.nome)) {
        tierPeDeRato.push(j);
        usados.add(j.nome);
      }
    }

    // Tier Normal: todos os restantes
    jogadores.forEach(j => {
      if (!usados.has(j.nome)) {
        tierNormal.push(j);
      }
    });

    // 2. Criar times vazios
    const times: TimeSorteado[] = [];
    for (let i = 0; i < numTimes; i++) {
      const config = TIMES_CONFIG[i] || { nome: `Time ${i + 1}`, logo: undefined };
      times.push({
        nome: config.nome,
        logo: config.logo,
        jogadores: [],
        pontuacaoTotal: 0
      });
    }

    // Helper: adiciona jogador ao time
    const addToTime = (time: TimeSorteado, jogador: JogadorSorteio) => {
      time.jogadores.push(jogador);
      time.pontuacaoTotal += jogador.nota;
    };

    // 3. Distribuir tiers garantidos (1 de cada por time, embaralhado)
    const ordemTimes = shuffle([...Array(numTimes).keys()]);

    // MVP: 1 por time
    const mvpShuffled = shuffle(tierMvp);
    mvpShuffled.forEach((j, i) => {
      if (i < numTimes) addToTime(times[ordemTimes[i]], j);
    });

    // Recuado: 1 por time (nova ordem aleatória)
    const ordemRecuado = shuffle([...Array(numTimes).keys()]);
    const recuadoShuffled = shuffle(tierRecuado);
    recuadoShuffled.forEach((j, i) => {
      if (i < numTimes) addToTime(times[ordemRecuado[i]], j);
    });

    // Pé de Rato: 1 por time (nova ordem aleatória)
    const ordemPdr = shuffle([...Array(numTimes).keys()]);
    const pdrShuffled = shuffle(tierPeDeRato);
    pdrShuffled.forEach((j, i) => {
      if (i < numTimes) addToTime(times[ordemPdr[i]], j);
    });

    // 4. Distribuir normais: embaralha e coloca no time com menor pontuação que ainda tem vaga
    const normaisShuffled = shuffle(tierNormal);
    // Adicionar sobras dos tiers (caso algum tier tenha menos que numTimes)
    const sobras = [
      ...mvpShuffled.slice(numTimes),
      ...recuadoShuffled.slice(numTimes),
      ...pdrShuffled.slice(numTimes),
    ];
    const restantes = shuffle([...normaisShuffled, ...sobras]);

    restantes.forEach(jogador => {
      // Encontrar time com menor pontuação que ainda tem vaga
      const timesComVaga = times
        .filter(t => t.jogadores.length < jogadoresPorTime)
        .sort((a, b) => a.pontuacaoTotal - b.pontuacaoTotal);

      if (timesComVaga.length > 0) {
        // Entre os times com pontuação mais baixa, pegar um aleatório (para variar)
        const menorPontuacao = timesComVaga[0].pontuacaoTotal;
        const empate = timesComVaga.filter(t => t.pontuacaoTotal === menorPontuacao);
        const escolhido = empate[Math.floor(Math.random() * empate.length)];
        addToTime(escolhido, jogador);
      }
    });

    setTimesSorteados(times);
    setStep('resultado');
  };

  // STEP 3: Confirmação
  const handleConfirmar = () => {
    iniciarMutation.mutate(timesSorteados);
  };

  // Loading
  if (loadingCampeonato) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  // Verificar se campeonato permite sorteio
  if (campeonato?.modo_selecao_times !== 'sorteio') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <AlertTriangle className="h-16 w-16 text-amber-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Modo de seleção incorreto</h2>
        <p className="text-cyan-100/50 mb-4">Este campeonato não está configurado para sorteio de times.</p>
        <Link to={`/campeonatos/${campeonatoId}`}>
          <Button>Voltar ao Campeonato</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-5xl mx-auto px-4 py-6">
        
        {/* Header */}
        <header className="mb-8">
          <Link
            to={`/campeonatos/${campeonatoId}`}
            className="inline-flex items-center gap-2 text-cyan-100/50 hover:text-cyan-400 transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Voltar</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Shuffle className="text-white" size={28} />
              </div>
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-4 w-4 text-amber-400" />
              </motion.div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black">
                <span className="bg-gradient-to-r from-purple-300 via-pink-200 to-purple-300 bg-clip-text text-transparent">
                  Sorteio de Times
                </span>
              </h1>
              <p className="text-cyan-100/50 text-sm">{campeonato?.nome}</p>
            </div>
          </motion.div>
        </header>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['input', 'notas', 'resultado'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all",
                step === s 
                  ? "bg-cyan-500 text-white" 
                  : i < ['input', 'notas', 'resultado'].indexOf(step)
                    ? "bg-emerald-500 text-white"
                    : "bg-[#0d1f35] text-cyan-100/40"
              )}>
                {i < ['input', 'notas', 'resultado'].indexOf(step) ? <CheckCircle size={16} /> : i + 1}
              </div>
              {i < 2 && (
                <div className={cn(
                  "w-12 h-1 mx-1 rounded",
                  i < ['input', 'notas', 'resultado'].indexOf(step) ? "bg-emerald-500" : "bg-[#0d1f35]"
                )} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Input de Nomes */}
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 backdrop-blur-md p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Clipboard className="text-cyan-400" size={20} />
                  <h2 className="text-lg font-bold text-white">Cole a lista de jogadores</h2>
                </div>
                <p className="text-sm text-cyan-100/50 mb-2">
                  Um nome por linha. Pode colar direto do WhatsApp (com números).
                </p>
                
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Database size={16} className="text-emerald-400" />
                  <p className="text-xs text-emerald-300">
                    Jogadores já cadastrados serão reconhecidos automaticamente com suas notas!
                  </p>
                </div>

                <Textarea
                  value={nomesTexto}
                  onChange={(e) => setNomesTexto(e.target.value)}
                  placeholder={`1 Dieguinho\n2 Alan\n3 Lani\n4 Leandro\n...`}
                  className="min-h-[300px] bg-[#0d1f35]/50 border-cyan-500/20 text-white placeholder:text-cyan-100/30 font-mono"
                />

                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-cyan-100/50">
                    {parseNomes(nomesTexto).length} jogadores detectados
                  </span>

                  <Button
                    onClick={handleParsarESincronizar}
                    disabled={nomesTexto.trim().length === 0 || isSyncing}
                    className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500"
                  >
                    {isSyncing ? (
                      <><Loader2 className="mr-2 animate-spin" size={16} />Sincronizando...</>
                    ) : (
                      <>Continuar<ArrowRight className="ml-2" size={16} /></>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Ajustar Notas */}
          {step === 'notas' && (
            <motion.div
              key="notas"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Config e Stats */}
              <div className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 backdrop-blur-md p-4">
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {/* Jogadores por time */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0d1f35] border border-cyan-500/20">
                    <label className="text-sm text-cyan-100/70">Por time:</label>
                    <input
                      type="number"
                      min="2"
                      max="11"
                      value={jogadoresPorTime}
                      onChange={(e) => setJogadoresPorTime(parseInt(e.target.value) || 5)}
                      className="w-14 h-10 text-center text-lg font-bold bg-transparent border border-cyan-500/30 rounded-lg text-white"
                    />
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <Star className="h-4 w-4 text-amber-400" />
                      <div>
                        <div className="text-[10px] text-amber-300/70">MVP</div>
                        <div className="text-lg font-black text-amber-400">{stats.mvps}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
                      <Shield className="h-4 w-4 text-blue-400" />
                      <div>
                        <div className="text-[10px] text-blue-300/70">Recuados</div>
                        <div className="text-lg font-black text-blue-400">{stats.recuados}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <div>
                        <div className="text-[10px] text-red-300/70">Pé de Rato</div>
                        <div className="text-lg font-black text-red-400">{stats.peDeRato}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30">
                      <Users className="h-4 w-4 text-purple-400" />
                      <div>
                        <div className="text-[10px] text-purple-300/70">Times</div>
                        <div className="text-lg font-black text-purple-400">{stats.numTimes}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid de Jogadores */}
              <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {jogadores.map((jogador, index) => {
                  const isMvp = jogador.nota >= 8;
                  const isPeDeRato = jogador.nota <= 4;

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={cn(
                        'rounded-xl border-2 p-5 relative',
                        jogador.joga_recuado
                          ? 'border-blue-500/50 bg-blue-500/5'
                          : isMvp
                            ? 'border-amber-500/50 bg-amber-500/5'
                            : isPeDeRato
                              ? 'border-red-500/50 bg-red-500/5'
                              : 'border-cyan-500/20 bg-[#0a1628]/50'
                      )}
                    >
                      {/* Badge do banco */}
                      {jogador.isFromDb && (
                        <div className="absolute -top-2 -right-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                            <UserCheck size={16} className="text-white" />
                          </div>
                        </div>
                      )}
                      
                      {/* Nome e foto */}
                      <div className="flex items-center gap-2 mb-5">
                        {jogador.foto_url ? (
                          <img 
                            src={jogador.foto_url} 
                            alt={jogador.nome}
                            className="w-14 h-14 rounded-full object-cover border border-cyan-500/30"
                          />
                        ) : (
                          <div className={cn(
                            "w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold",
                            jogador.isFromDb ? "bg-emerald-500/20 text-emerald-400" : "bg-cyan-500/20 text-cyan-400"
                          )}>
                            {jogador.nome.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <h3 className="font-bold text-white text-lg truncate flex-1" title={jogador.nome}>
                          {jogador.nome}
                        </h3>
                      </div>

                      {/* Controles */}
                      <div className="flex items-center justify-between gap-2 pt-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-cyan-100/50">Nota:</span>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={jogador.nota}
                            onChange={(e) => handleNotaChange(index, parseInt(e.target.value) || 1)}
                            className={cn(
                              "w-16 h-12 text-center text-2xl font-black rounded-lg bg-[#0d1f35] border-2",
                              isMvp && "border-amber-500/50 text-amber-400",
                              isPeDeRato && "border-red-500/50 text-red-400",
                              jogador.joga_recuado && !isMvp && !isPeDeRato && "border-blue-500/50 text-blue-400",
                              !isMvp && !isPeDeRato && !jogador.joga_recuado && "border-cyan-500/30 text-white"
                            )}
                          />
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={jogador.joga_recuado}
                            onChange={(e) => handleRecuadoChange(index, e.target.checked)}
                            className="h-6 w-6 rounded border-cyan-500/30 bg-[#0d1f35] text-blue-500"
                          />
                          <Shield className={cn(
                            "h-6 w-6",
                            jogador.joga_recuado ? "text-blue-400" : "text-cyan-100/30"
                          )} />
                        </label>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Botões */}
              <div className="flex justify-center gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep('input')}
                  className="border-cyan-500/30 text-cyan-300"
                >
                  <ArrowLeft className="mr-2" size={16} />
                  Voltar
                </Button>

                <Button
                  onClick={sortearTimes}
                  disabled={stats.numTimes < 2}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                >
                  <Shuffle className="mr-2" size={16} />
                  Sortear Times
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Resultado */}
          {step === 'resultado' && (
            <motion.div
              key="resultado"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-white mb-2">Times Sorteados!</h2>
                <p className="text-cyan-100/50">Confira os times antes de confirmar</p>
              </div>

              {/* Grid de Times */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {timesSorteados.map((time, index) => {
                  const media = time.jogadores.length > 0
                    ? (time.pontuacaoTotal / time.jogadores.length).toFixed(1)
                    : '0.0';
                  const config = TIMES_CONFIG[index];

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 overflow-hidden"
                    >
                      {/* Header do Time */}
                      <div className={cn(
                        "p-4 border-b border-cyan-500/10",
                        config ? `bg-gradient-to-r ${config.cor}/20` : "bg-gradient-to-r from-cyan-500/10 to-teal-500/10"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {time.logo && (
                              <img src={time.logo} alt={time.nome} className="w-8 h-8 object-contain" />
                            )}
                            <h3 className="font-bold text-white">{time.nome}</h3>
                          </div>
                          <div className="flex items-center gap-1 text-amber-400">
                            <Star size={14} />
                            <span className="font-bold">{media}</span>
                          </div>
                        </div>
                      </div>

                      {/* Jogadores */}
                      <div className="p-3 space-y-2">
                        {time.jogadores.map((jogador, jIndex) => (
                          <div
                            key={jIndex}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-lg",
                              jogador.isFromDb ? "bg-emerald-500/10" : "bg-[#0d1f35]/50"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {jogador.foto_url ? (
                                <img src={jogador.foto_url} className="w-6 h-6 rounded-full object-cover" />
                              ) : jogador.isFromDb && (
                                <UserCheck size={12} className="text-emerald-400" />
                              )}
                              <span className="text-sm text-white truncate">{jogador.nome}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {jogador.joga_recuado && <Shield size={12} className="text-blue-400" />}
                              <span className={cn(
                                "text-xs font-bold px-1.5 py-0.5 rounded",
                                jogador.nota === 10 && "bg-amber-500/20 text-amber-400",
                                jogador.nota <= 5 && "bg-red-500/20 text-red-400",
                                jogador.nota > 5 && jogador.nota < 10 && "bg-cyan-500/20 text-cyan-400"
                              )}>
                                {jogador.nota}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Botões */}
              <div className="flex justify-center gap-3 pt-6">
                <Button
                  variant="outline"
                  onClick={() => setStep('notas')}
                  className="border-cyan-500/30 text-cyan-300"
                >
                  <ArrowLeft className="mr-2" size={16} />
                  Voltar
                </Button>

                <Button
                  onClick={sortearTimes}
                  variant="outline"
                  className="border-purple-500/30 text-purple-300"
                >
                  <Shuffle className="mr-2" size={16} />
                  Sortear Novamente
                </Button>

                <Button
                  onClick={handleConfirmar}
                  disabled={iniciarMutation.isPending}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                >
                  {iniciarMutation.isPending ? (
                    <><Loader2 className="mr-2 animate-spin" size={16} />Criando...</>
                  ) : (
                    <><Trophy className="mr-2" size={16} />Confirmar e Iniciar</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default CampeonatoSorteioPage;