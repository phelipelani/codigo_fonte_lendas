// Arquivo: src/features/presenca/components/RachaParticipantesTab.tsx
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Shield,
  Clock,
  CheckCircle,
  X,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import {
  useRachaParticipantes,
  useCadastrarParticipante,
  type RachaParticipante,
} from '../api/presencaApi';

interface RachaParticipantesTabProps {
  rachaId: number;
  selecionadosConvocacao?: Set<number>;
  onToggleSelecionado?: (jogadorId: number) => void;
  onSelecionarTodos?: (jogadorIds: number[]) => void;
  onLimparSelecao?: () => void;
}

type FiltroTipo = 'todos' | 'mensalista' | 'avulso_recorrente' | 'avulso_convidado';

export const RachaParticipantesTab: React.FC<RachaParticipantesTabProps> = ({
  rachaId,
  selecionadosConvocacao,
  onToggleSelecionado,
  onSelecionarTodos,
  onLimparSelecao,
}) => {
  const { data, isLoading } = useRachaParticipantes(rachaId);
  const cadastrarMut = useCadastrarParticipante(rachaId);

  const [busca, setBusca] = React.useState('');
  const [filtro, setFiltro] = React.useState<FiltroTipo>('todos');
  const [modalAberto, setModalAberto] = React.useState(false);

  // Form state
  const [nome, setNome] = React.useState('');
  const [whatsapp, setWhatsapp] = React.useState('');
  const [apelido, setApelido] = React.useState('');
  const [tipoParticipacao, setTipoParticipacao] = React.useState<
    'mensalista' | 'avulso_recorrente' | 'avulso_convidado'
  >('avulso_convidado');
  const [posicao, setPosicao] = React.useState<'linha' | 'goleiro'>('linha');

  const participantes = data?.participantes ?? [];

  const filtrados = React.useMemo(() => {
    return participantes.filter((p) => {
      const matchTipo = filtro === 'todos' || p.tipo_participacao === filtro;
      const t = busca.trim().toLowerCase();
      const matchBusca =
        !t ||
        p.nome.toLowerCase().includes(t) ||
        (p.apelido && p.apelido.toLowerCase().includes(t)) ||
        p.whatsapp.includes(t);
      return matchTipo && matchBusca;
    });
  }, [participantes, filtro, busca]);

  const totalMensalistas = participantes.filter((p) => p.tipo_participacao === 'mensalista').length;
  const totalRecorrentes = participantes.filter((p) => p.tipo_participacao === 'avulso_recorrente').length;
  const totalConvidados = participantes.filter((p) => p.tipo_participacao === 'avulso_convidado').length;

  const handleSubmitCadastro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !whatsapp.trim()) return;

    cadastrarMut.mutate(
      {
        nome: nome.trim(),
        whatsapp: whatsapp.trim(),
        apelido: apelido.trim() || undefined,
        tipo_participacao: tipoParticipacao,
        posicao,
      },
      {
        onSuccess: () => {
          setNome('');
          setWhatsapp('');
          setApelido('');
          setTipoParticipacao('avulso_convidado');
          setPosicao('linha');
          setModalAberto(false);
        },
      }
    );
  };

  const todosFiltradosIds = filtrados.map((p) => p.jogador_id);
  const todosSelecionados =
    selecionadosConvocacao &&
    todosFiltradosIds.length > 0 &&
    todosFiltradosIds.every((id) => selecionadosConvocacao.has(id));

  return (
    <div className="space-y-5">
      {/* Barra de controle */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Filtros em abas pequenas */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#0a1628]/60 border border-cyan-500/20 rounded-xl">
          <button
            type="button"
            onClick={() => setFiltro('todos')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              filtro === 'todos'
                ? 'bg-cyan-500/30 text-white border border-cyan-400/30 shadow'
                : 'text-cyan-100/60 hover:text-white'
            )}
          >
            Todos ({participantes.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltro('mensalista')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              filtro === 'mensalista'
                ? 'bg-amber-500/30 text-amber-200 border border-amber-400/30 shadow'
                : 'text-cyan-100/60 hover:text-white'
            )}
          >
            Mensalistas ({totalMensalistas})
          </button>
          <button
            type="button"
            onClick={() => setFiltro('avulso_recorrente')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              filtro === 'avulso_recorrente'
                ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 shadow'
                : 'text-cyan-100/60 hover:text-white'
            )}
          >
            Avulsos Recorrentes ({totalRecorrentes})
          </button>
          <button
            type="button"
            onClick={() => setFiltro('avulso_convidado')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              filtro === 'avulso_convidado'
                ? 'bg-blue-500/30 text-blue-200 border border-blue-400/30 shadow'
                : 'text-cyan-100/60 hover:text-white'
            )}
          >
            Convidados ({totalConvidados})
          </button>
        </div>

        {/* Busca e botão de cadastrar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-100/40 pointer-events-none" />
            <Input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou WhatsApp..."
              className="pl-9 h-10 bg-[#0d1f35]/50 border-cyan-500/20 text-white placeholder:text-cyan-100/30 rounded-xl"
            />
          </div>

          <Button
            size="sm"
            onClick={() => setModalAberto(true)}
            className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold h-10 whitespace-nowrap"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Participante
          </Button>
        </div>
      </div>

      {/* Barra de seleção rápida para convocação se fornecida */}
      {onToggleSelecionado && onSelecionarTodos && onLimparSelecao && (
        <div className="flex items-center justify-between bg-cyan-950/30 border border-cyan-500/20 px-4 py-2.5 rounded-xl text-xs text-cyan-100/70">
          <div className="flex items-center gap-2">
            <span>
              Selecionados para convocação: <strong>{selecionadosConvocacao?.size ?? 0}</strong> de{' '}
              {participantes.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (todosSelecionados) {
                  onLimparSelecao();
                } else {
                  onSelecionarTodos(todosFiltradosIds);
                }
              }}
              className="text-xs text-cyan-300 hover:text-white h-7 px-2"
            >
              {todosSelecionados ? 'Desmarcar todos' : 'Marcar todos visíveis'}
            </Button>
          </div>
        </div>
      )}

      {/* Grid de Participantes */}
      {isLoading ? (
        <div className="text-center py-12 text-cyan-100/50">
          <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-cyan-400" />
          Carregando participantes...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-cyan-500/20 bg-[#0a1628]/30">
          <Users className="mx-auto mb-2 h-8 w-8 text-cyan-400/40" />
          <p className="text-sm text-cyan-100/60 font-medium">Nenhum participante encontrado.</p>
          <p className="text-xs text-cyan-100/40 mt-1">
            Cadastre novos jogadores acima com nome e WhatsApp sem necessidade de conta de login.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtrados.map((p) => {
            const isSelected = selecionadosConvocacao?.has(p.jogador_id);
            return (
              <div
                key={p.id}
                onClick={() => onToggleSelecionado && onToggleSelecionado(p.jogador_id)}
                className={cn(
                  'rounded-xl border p-3.5 transition-all cursor-pointer flex items-center justify-between gap-3',
                  isSelected
                    ? 'border-cyan-400/60 bg-cyan-500/15 shadow-md'
                    : 'border-cyan-500/20 bg-[#0a1628]/50 hover:border-cyan-500/40'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {onToggleSelecionado && (
                    <input
                      type="checkbox"
                      checked={!!isSelected}
                      onChange={() => {}} // tratado no onClick do container
                      className="rounded border-cyan-500/30 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-[#0d1f35]"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm truncate">{p.nome}</span>
                      {p.apelido && (
                        <span className="text-xs text-cyan-100/50 italic">({p.apelido})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-cyan-100/60 mt-0.5">
                      <Phone className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{p.whatsapp}</span>
                      <span>•</span>
                      <span className="capitalize">{p.posicao}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                      p.tipo_participacao === 'mensalista' &&
                        'bg-amber-500/20 text-amber-300 border border-amber-500/30',
                      p.tipo_participacao === 'avulso_recorrente' &&
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                      p.tipo_participacao === 'avulso_convidado' &&
                        'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    )}
                  >
                    {p.tipo_participacao === 'mensalista'
                      ? 'Mensalista'
                      : p.tipo_participacao === 'avulso_recorrente'
                      ? 'Avulso Fixo'
                      : 'Convidado'}
                  </span>
                  {p.status_mensalidade && (
                    <span className="text-[10px] text-cyan-100/40">
                      Mensalidade: {p.status_mensalidade}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Cadastro Rápido de Participante (Sem login) */}
      <AnimatePresence>
        {modalAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#0d1f35] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-cyan-400" />
                  Cadastrar Participante
                </h3>
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="text-cyan-100/50 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitCadastro} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                    Nome Completo *
                  </label>
                  <Input
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="bg-[#0a1628] border-cyan-500/20 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                      WhatsApp *
                    </label>
                    <Input
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="Ex: 5511999998888"
                      className="bg-[#0a1628] border-cyan-500/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                      Apelido
                    </label>
                    <Input
                      value={apelido}
                      onChange={(e) => setApelido(e.target.value)}
                      placeholder="Ex: Carlão"
                      className="bg-[#0a1628] border-cyan-500/20 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                      Tipo de Participação
                    </label>
                    <select
                      value={tipoParticipacao}
                      onChange={(e) => setTipoParticipacao(e.target.value as any)}
                      className="w-full h-10 rounded-md border border-cyan-500/20 bg-[#0a1628] px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="avulso_convidado">Avulso Convidado</option>
                      <option value="avulso_recorrente">Avulso Recorrente</option>
                      <option value="mensalista">Mensalista</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                      Posição
                    </label>
                    <select
                      value={posicao}
                      onChange={(e) => setPosicao(e.target.value as any)}
                      className="w-full h-10 rounded-md border border-cyan-500/20 bg-[#0a1628] px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="linha">Linha</option>
                      <option value="goleiro">Goleiro</option>
                    </select>
                  </div>
                </div>

                <p className="text-[11px] text-cyan-100/50 bg-cyan-950/30 p-2.5 rounded-lg border border-cyan-500/20">
                  Participantes não necessitam de conta de login no FutLendas. O vínculo com o racha
                  e o recebimento de mensagens ocorrerão diretamente via WhatsApp.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setModalAberto(false)}
                    className="text-cyan-100/60 hover:text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={cadastrarMut.isPending}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold"
                  >
                    {cadastrarMut.isPending ? 'Salvando...' : 'Salvar Participante'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
