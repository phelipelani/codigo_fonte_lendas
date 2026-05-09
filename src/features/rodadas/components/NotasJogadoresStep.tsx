// Arquivo: src/features/rodadas/components/NotasJogadoresStep.tsx
import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Shuffle,
  Users,
  Star,
  TrendingDown,
  Shield,
  Trophy,
  Loader2,
  Minus,
  Plus,
  Search,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Jogador } from '@/@types';
import { cn } from '@/lib/utils';

interface Props {
  jogadores: Jogador[];
  jogadoresPorTime: number;
  setJogadoresPorTime: (value: number) => void;
  onSortearAuto: (jogadoresAtualizados: Jogador[]) => void;
  onMontarManual: (jogadoresAtualizados: Jogador[]) => void;
  isLoading: boolean;
}

// =============================================================
// Faixas de nota — uma fonte unica para cor + label
// =============================================================
type Faixa = {
  label: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  ringClass: string;
  badgeClass: string;
  glowClass: string;
};

function getFaixa(nota: number): Faixa {
  if (nota >= 10) {
    return {
      label: 'Craque',
      textClass: 'text-amber-300',
      bgClass: 'bg-amber-500/10',
      borderClass: 'border-amber-400/50',
      ringClass: 'ring-amber-400/30',
      badgeClass: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
      glowClass: 'shadow-[0_0_24px_-8px_rgba(251,191,36,0.45)]',
    };
  }
  if (nota >= 8) {
    return {
      label: 'Excelente',
      textClass: 'text-emerald-300',
      bgClass: 'bg-emerald-500/10',
      borderClass: 'border-emerald-400/40',
      ringClass: 'ring-emerald-400/30',
      badgeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
      glowClass: 'shadow-[0_0_24px_-10px_rgba(52,211,153,0.4)]',
    };
  }
  if (nota >= 6) {
    return {
      label: 'Bom',
      textClass: 'text-cyan-300',
      bgClass: 'bg-cyan-500/10',
      borderClass: 'border-cyan-400/40',
      ringClass: 'ring-cyan-400/30',
      badgeClass: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
      glowClass: 'shadow-[0_0_22px_-12px_rgba(34,211,238,0.35)]',
    };
  }
  if (nota >= 4) {
    return {
      label: 'Médio',
      textClass: 'text-orange-300',
      bgClass: 'bg-orange-500/10',
      borderClass: 'border-orange-400/40',
      ringClass: 'ring-orange-400/30',
      badgeClass: 'bg-orange-500/20 text-orange-200 border-orange-400/40',
      glowClass: 'shadow-[0_0_22px_-12px_rgba(251,146,60,0.35)]',
    };
  }
  return {
    label: 'Pé de Rato',
    textClass: 'text-red-300',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-400/40',
    ringClass: 'ring-red-400/30',
    badgeClass: 'bg-red-500/20 text-red-200 border-red-400/40',
    glowClass: 'shadow-[0_0_22px_-12px_rgba(248,113,113,0.4)]',
  };
}

/**
 * Limpa emojis, simbolos e numeros do comeco/fim do nome do jogador.
 * Aplicado defensivamente na exibicao porque jogadores cadastrados antes
 * da correcao do regex no JogadorSyncStep podem ter "lixo" colado no nome
 * (ex: "André 💰", "- 21 João").
 */
function limparNomeExibicao(nome: unknown): string {
  if (typeof nome !== 'string') return '';
  return nome
    .replace(/^[^\p{L}]+/u, '')              // tudo nao-letra no comeco
    .replace(/[^\p{L}\p{N}.'\- ]+$/u, '')    // simbolos/emojis no fim
    .replace(/\s+/g, ' ')
    .trim();
}

function getIniciais(nome: unknown): string {
  const limpo = limparNomeExibicao(nome);
  if (!limpo) return '?';
  const partes = limpo.split(/\s+/).filter(Boolean);
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return (partes[0]![0]! + partes[partes.length - 1]![0]!).toUpperCase();
}

// =============================================================
// Card de jogador
// =============================================================
type JogadorCardProps = {
  jogador: Jogador & { nota_ultima_rodada?: number | string };
  index: number;
  onNotaChange: (id: number, nota: number) => void;
  onRecuadoToggle: (id: number, checked: boolean) => void;
};

const JogadorCard: React.FC<JogadorCardProps> = ({
  jogador,
  index,
  onNotaChange,
  onRecuadoToggle,
}) => {
  const notaRaw = jogador.nota_ultima_rodada;
  const notaNumerica = typeof notaRaw === 'number'
    ? notaRaw
    : parseInt(String(notaRaw ?? ''), 10);
  const nota = Number.isFinite(notaNumerica) ? notaNumerica : 1;
  const faixa = getFaixa(nota);
  const recuado = !!jogador.joga_recuado;
  const isGoleiro = jogador.posicao === 'goleiro';
  const fotoUrl = jogador.foto_url || jogador.fotoUrl || null;
  // Nome saneado para exibicao (remove emojis/numeros que vieram do cadastro)
  const nome = limparNomeExibicao(jogador.nome) || 'Sem nome';

  const decrementar = () => onNotaChange(jogador.id, Math.max(1, nota - 1));
  const incrementar = () => onNotaChange(jogador.id, Math.min(10, nota + 1));

  // Barra de progresso visual da nota (1-10 -> 0-100%)
  const progresso = Math.min(100, Math.max(0, (nota / 10) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.012, 0.25), duration: 0.22 }}
      className={cn(
        'group relative flex flex-col rounded-2xl border bg-gradient-to-b from-[#0a1628]/85 to-[#091322]/85 backdrop-blur-md p-3.5 sm:p-4 transition-all duration-200',
        'hover:border-cyan-400/40 focus-within:ring-2 focus-within:ring-offset-0',
        faixa.borderClass,
        faixa.ringClass,
        faixa.glowClass
      )}
    >
      {/* Header — avatar + nome + tags */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex-shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 flex items-center justify-center overflow-hidden font-black text-base bg-[#0d1f35]',
            faixa.borderClass,
            faixa.textClass
          )}
        >
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt={nome || 'Jogador'}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span aria-hidden>{getIniciais(nome)}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className="font-bold text-white text-sm sm:text-base leading-tight break-words"
            title={nome}
          >
            {nome || 'Sem nome'}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {isGoleiro && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                <span aria-hidden>⚽</span> Goleiro
              </span>
            )}
            <span
              className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border',
                faixa.badgeClass
              )}
            >
              {faixa.label}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de progresso visual */}
      <div className="mt-3.5 h-1.5 w-full rounded-full bg-cyan-500/10 overflow-hidden">
        <motion.div
          initial={false}
          animate={{ width: `${progresso}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full',
            nota >= 10
              ? 'bg-gradient-to-r from-amber-500 to-amber-300'
              : nota >= 8
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-300'
                : nota >= 6
                  ? 'bg-gradient-to-r from-cyan-500 to-cyan-300'
                  : nota >= 4
                    ? 'bg-gradient-to-r from-orange-500 to-orange-300'
                    : 'bg-gradient-to-r from-red-500 to-red-300'
          )}
        />
      </div>

      {/* Stepper de nota */}
      <div className="mt-3 flex items-center justify-center gap-2 sm:gap-2.5">
        <button
          type="button"
          onClick={decrementar}
          disabled={nota <= 1}
          aria-label={`Diminuir nota de ${nome}`}
          className={cn(
            'h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center rounded-xl border transition-all',
            'border-cyan-500/30 bg-[#0d1f35] text-cyan-200',
            'hover:bg-cyan-500/15 hover:border-cyan-400/60 active:scale-95',
            'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#0d1f35]'
          )}
        >
          <Minus className="h-4 w-4" />
        </button>

        <div
          className={cn(
            'flex items-center justify-center h-12 sm:h-14 min-w-[68px] sm:min-w-[78px] rounded-xl border-2',
            faixa.borderClass,
            faixa.bgClass
          )}
        >
          <Input
            type="number"
            min={1}
            max={10}
            inputMode="numeric"
            value={nota}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') return;
              const n = parseInt(v, 10);
              if (Number.isFinite(n))
                onNotaChange(jogador.id, Math.max(1, Math.min(10, n)));
            }}
            aria-label={`Nota de ${nome}`}
            className={cn(
              'w-full h-full text-center text-2xl sm:text-3xl font-black tabular-nums bg-transparent border-0 focus-visible:ring-0 focus-visible:outline-none p-0',
              faixa.textClass
            )}
          />
        </div>

        <button
          type="button"
          onClick={incrementar}
          disabled={nota >= 10}
          aria-label={`Aumentar nota de ${nome}`}
          className={cn(
            'h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center rounded-xl border transition-all',
            'border-cyan-500/30 bg-[#0d1f35] text-cyan-200',
            'hover:bg-cyan-500/15 hover:border-cyan-400/60 active:scale-95',
            'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#0d1f35]'
          )}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Toggle recuado */}
      <button
        type="button"
        role="switch"
        aria-checked={recuado}
        aria-label={`${recuado ? 'Desmarcar' : 'Marcar'} ${nome} como recuado`}
        onClick={() => onRecuadoToggle(jogador.id, !recuado)}
        className={cn(
          'mt-3.5 w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-all',
          recuado
            ? 'bg-blue-500/15 border-blue-400/50 hover:bg-blue-500/20'
            : 'bg-[#0d1f35] border-cyan-500/15 hover:bg-[#0d1f35]/80 hover:border-cyan-500/30'
        )}
      >
        <span className="flex items-center gap-2">
          <Shield
            className={cn(
              'h-4 w-4 transition-colors',
              recuado ? 'text-blue-300' : 'text-cyan-100/40'
            )}
          />
          <span
            className={cn(
              'text-xs font-semibold',
              recuado ? 'text-blue-200' : 'text-cyan-100/60'
            )}
          >
            Joga recuado
          </span>
        </span>
        <span
          className={cn(
            'relative h-5 w-9 rounded-full transition-colors flex-shrink-0',
            recuado ? 'bg-blue-400' : 'bg-cyan-100/15'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
              recuado && 'translate-x-4'
            )}
          />
        </span>
      </button>
    </motion.div>
  );
};

// =============================================================
// Pill de estatistica
// =============================================================
type StatTone = 'cyan' | 'amber' | 'red' | 'blue' | 'emerald' | 'purple';

const TONE_CLASSES: Record<StatTone, string> = {
  cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  red: 'border-red-500/30 bg-red-500/10 text-red-200',
  blue: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  purple: 'border-purple-500/30 bg-purple-500/10 text-purple-200',
};

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone: StatTone;
};

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, hint, tone }) => (
  <div
    className={cn(
      'flex items-center gap-3 px-3.5 py-3 rounded-xl border backdrop-blur-md',
      TONE_CLASSES[tone]
    )}
  >
    <div className={cn('flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center', TONE_CLASSES[tone].replace('text-', 'text-'))}>
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-widest opacity-80 leading-tight">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl sm:text-2xl font-black leading-tight tabular-nums">
          {value}
        </span>
        {hint && <span className="text-[11px] opacity-60">{hint}</span>}
      </div>
    </div>
  </div>
);

// =============================================================
// Componente principal
// =============================================================
export const NotasJogadoresStep: React.FC<Props> = ({
  jogadores,
  jogadoresPorTime,
  setJogadoresPorTime,
  onSortearAuto,
  onMontarManual,
  isLoading,
}) => {
  const [jogadoresData, setJogadoresData] = React.useState<
    (Jogador & { nota_ultima_rodada?: number | string })[]
  >([]);
  const [busca, setBusca] = React.useState('');

  React.useEffect(() => {
    if (!Array.isArray(jogadores)) {
      setJogadoresData([]);
      return;
    }
    setJogadoresData(
      jogadores.map((j: any) => ({
        ...j,
        nota_ultima_rodada:
          (j && (j.nivel || j.nota_ultima_rodada)) || 1,
        joga_recuado: !!(j && j.joga_recuado),
      }))
    );
  }, [jogadores]);

  const total = jogadoresData.length;

  const stats = React.useMemo(() => {
    const craques = jogadoresData.filter(
      (j) => Number(j.nota_ultima_rodada) === 10
    ).length;
    const pesDeRato = jogadoresData.filter(
      (j) => (Number(j.nota_ultima_rodada) || 1) <= 5
    ).length;
    const recuados = jogadoresData.filter((j) => j.joga_recuado).length;
    const numTimes =
      jogadoresPorTime > 0 ? Math.floor(total / jogadoresPorTime) : 0;
    const restantes = jogadoresPorTime > 0
      ? total - numTimes * jogadoresPorTime
      : 0;

    return { craques, pesDeRato, recuados, numTimes, restantes };
  }, [jogadoresData, total, jogadoresPorTime]);

  const handleNotaChange = (id: number, nota: number) => {
    if (!Number.isFinite(nota)) return;
    setJogadoresData((prev) =>
      prev.map((j) => (j.id === id ? { ...j, nota_ultima_rodada: nota } : j))
    );
  };

  const handleRecuadoChange = (id: number, checked: boolean) => {
    setJogadoresData((prev) =>
      prev.map((j) => (j.id === id ? { ...j, joga_recuado: checked } : j))
    );
  };

  const normalizar = (lista: typeof jogadoresData): Jogador[] =>
    lista.map(
      (j) =>
        ({
          ...j,
          nivel: Number(j.nota_ultima_rodada) || 1,
          nota_ultima_rodada: Number(j.nota_ultima_rodada) || 1,
          joga_recuado: !!j.joga_recuado,
        } as unknown as Jogador)
    );

  const handleSortearAuto = () => onSortearAuto(normalizar(jogadoresData));
  const handleMontarManual = () => onMontarManual(normalizar(jogadoresData));

  const jogadoresFiltrados = React.useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return jogadoresData;
    return jogadoresData.filter((j) => {
      const nomeLimpo = limparNomeExibicao(j.nome).toLowerCase();
      return nomeLimpo.includes(termo);
    });
  }, [jogadoresData, busca]);

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      {/* ===== Header ===== */}
      <header className="text-center px-2">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black">
          <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
            Ajustar Notas dos Jogadores
          </span>
        </h2>
        <p className="mt-1.5 text-cyan-100/50 text-xs sm:text-sm">
          Defina o nível de cada jogador (1 a 10) e marque quem joga recuado
        </p>
      </header>

      {/* ===== Painel de configuracao + estatisticas ===== */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#0a1628]/70 to-[#091322]/70 backdrop-blur-md p-3 sm:p-4 space-y-3"
        aria-label="Resumo da rodada"
      >
        {/* Linha 1: configuracao do tamanho do time */}
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-3">
          <div className="flex-1 flex items-center gap-3 px-3.5 py-3 rounded-xl border border-cyan-500/30 bg-[#0d1f35]/80">
            <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-cyan-500/20 border border-cyan-400/30">
              <UsersRound className="h-5 w-5 text-cyan-200" />
            </div>
            <div className="flex-1 min-w-0">
              <label
                htmlFor="jogadoresPorTime"
                className="block text-[10px] font-semibold uppercase tracking-widest text-cyan-200/80"
              >
                Jogadores por time
              </label>
              <p className="text-[11px] text-cyan-100/40 leading-tight hidden sm:block">
                Quantos atletas em cada time
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setJogadoresPorTime(Math.max(1, (jogadoresPorTime || 1) - 1))
                }
                aria-label="Diminuir jogadores por time"
                className="h-10 w-10 flex items-center justify-center rounded-lg border border-cyan-500/30 bg-[#0d1f35] text-cyan-200 hover:bg-cyan-500/15 hover:border-cyan-400/60 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={(jogadoresPorTime || 0) <= 1}
              >
                <Minus className="h-4 w-4" />
              </button>

              {/* Input nativo: o componente <Input> (shadcn) aplica text-textPrimary
                  que vence text-white via cascade. Aqui usamos input puro para
                  garantir contraste. */}
              <input
                id="jogadoresPorTime"
                type="number"
                min={1}
                inputMode="numeric"
                value={jogadoresPorTime}
                onChange={(e) =>
                  setJogadoresPorTime(parseInt(e.target.value) || 0)
                }
                className="w-14 sm:w-16 h-10 text-center text-2xl font-black tabular-nums rounded-lg border-2 border-cyan-400/40 bg-[#0a1628] text-white focus:outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <button
                type="button"
                onClick={() =>
                  setJogadoresPorTime((jogadoresPorTime || 0) + 1)
                }
                aria-label="Aumentar jogadores por time"
                className="h-10 w-10 flex items-center justify-center rounded-lg border border-cyan-500/30 bg-[#0d1f35] text-cyan-200 hover:bg-cyan-500/15 hover:border-cyan-400/60 active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Resumo principal — total | times | restantes */}
          <div className="grid grid-cols-3 gap-2.5 sm:flex-1">
            <StatCard
              tone="cyan"
              icon={<Users className="h-5 w-5" />}
              label="Total"
              value={total}
            />
            <StatCard
              tone="emerald"
              icon={<Trophy className="h-5 w-5" />}
              label="Times"
              value={stats.numTimes}
              hint={
                jogadoresPorTime > 0 ? `× ${jogadoresPorTime}` : undefined
              }
            />
            <StatCard
              tone="purple"
              icon={<UserCheck className="h-5 w-5" />}
              label="Sobram"
              value={stats.restantes}
            />
          </div>
        </div>

        {/* Linha 2: stats de perfil dos jogadores */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard
            tone="amber"
            icon={<Star className="h-5 w-5" />}
            label="Craques"
            value={stats.craques}
          />
          <StatCard
            tone="red"
            icon={<TrendingDown className="h-5 w-5" />}
            label="Pé de Rato"
            value={stats.pesDeRato}
            hint="≤ 5"
          />
          <StatCard
            tone="blue"
            icon={<Shield className="h-5 w-5" />}
            label="Recuados"
            value={stats.recuados}
          />
        </div>

        {/* Aviso se a divisao nao for exata */}
        {jogadoresPorTime > 0 && stats.restantes > 0 && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10">
            <span className="text-amber-300 text-xs font-bold flex-shrink-0">⚠</span>
            <p className="text-amber-200/90 text-xs leading-snug">
              <strong>Atenção:</strong> {stats.restantes} jogador{stats.restantes !== 1 && 'es'} {stats.restantes === 1 ? 'ficará' : 'ficarão'} sem time com {jogadoresPorTime} por time.
              {' '}
              {stats.numTimes > 0 && (
                <>Considere ajustar para {Math.floor(total / Math.max(1, stats.numTimes))} ou {Math.ceil(total / Math.max(1, stats.numTimes))} por time.</>
              )}
            </p>
          </div>
        )}
      </motion.section>

      {/* ===== Busca ===== */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-100/40 pointer-events-none" />
        <Input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar jogador..."
          className="pl-9 h-11 bg-[#0d1f35]/50 border-cyan-500/20 text-white placeholder:text-cyan-100/30 rounded-xl"
        />
        {busca && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cyan-100/50 tabular-nums">
            {jogadoresFiltrados.length}/{total}
          </span>
        )}
      </div>

      {/* ===== Grid de jogadores ===== */}
      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-cyan-500/20 bg-[#0a1628]/40 p-8 text-center">
          <p className="text-cyan-100/60 text-sm">
            Nenhum jogador na rodada ainda.
          </p>
        </div>
      ) : jogadoresFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cyan-500/20 bg-[#0a1628]/40 p-8 text-center">
          <p className="text-cyan-100/60 text-sm">
            Nenhum jogador encontrado para <strong>"{busca}"</strong>.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {jogadoresFiltrados.map((jogador, index) => (
            <JogadorCard
              key={jogador.id}
              jogador={jogador}
              index={index}
              onNotaChange={handleNotaChange}
              onRecuadoToggle={handleRecuadoChange}
            />
          ))}
        </div>
      )}

      {/* ===== Botões de ação ===== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="sticky bottom-2 z-10 flex flex-col-reverse sm:flex-row justify-center gap-3 pt-2 pb-1"
      >
        <Button
          onClick={handleMontarManual}
          disabled={isLoading || stats.numTimes === 0}
          size="lg"
          variant="outline"
          className="border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10 hover:text-cyan-100 backdrop-blur-md"
        >
          <Users className="mr-2 h-5 w-5" />
          Montar Manualmente
        </Button>

        <Button
          onClick={handleSortearAuto}
          disabled={isLoading || stats.numTimes === 0}
          size="lg"
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/25 backdrop-blur-md"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Shuffle className="mr-2 h-5 w-5" />
          )}
          Sortear Automaticamente
        </Button>
      </motion.div>
    </div>
  );
};
