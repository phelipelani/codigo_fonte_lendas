// Arquivo: src/features/presenca/components/RachaFilaPresencaTab.tsx
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRightLeft,
  RotateCcw,
  ShieldCheck,
  Send,
  Loader2,
  Lock,
  Unlock,
  CheckSquare,
  History,
  X,
  FileText,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import {
  useSessaoAtiva,
  useCriarSessao,
  useFecharConvocacao,
  useReabrirConvocacao,
  useHomologarLista,
  useReabrirLista,
  useSubstituirParticipante,
  useRegistrarPresencasReais,
  useConcluirSessao,
  useReenviarPromocoes,
  useHistoricoSessao,
  useRachaParticipantes,
  type RachaTitular,
  type RachaFilaEsperaItem,
} from '../api/presencaApi';

interface RachaFilaPresencaTabProps {
  rachaId: number;
}

export const RachaFilaPresencaTab: React.FC<RachaFilaPresencaTabProps> = ({ rachaId }) => {
  const { data: sessaoData, isLoading: isSessaoLoading } = useSessaoAtiva(rachaId);
  const { data: participantesData } = useRachaParticipantes(rachaId);

  const sessao = sessaoData?.sessao ?? null;
  const titulares = sessaoData?.titulares ?? [];
  const filaEspera = sessaoData?.fila_espera ?? [];
  const sessaoId = sessao?.id;

  const { data: historicoData, isLoading: isHistoricoLoading } = useHistoricoSessao(rachaId, sessaoId);

  // Mutations
  const criarSessaoMut = useCriarSessao(rachaId);
  const fecharConvocacaoMut = useFecharConvocacao(rachaId, sessaoId);
  const reabrirConvocacaoMut = useReabrirConvocacao(rachaId, sessaoId);
  const homologarMut = useHomologarLista(rachaId, sessaoId);
  const reabrirMut = useReabrirLista(rachaId, sessaoId);
  const substituirMut = useSubstituirParticipante(rachaId, sessaoId);
  const presencasReaisMut = useRegistrarPresencasReais(rachaId, sessaoId);
  const concluirMut = useConcluirSessao(rachaId, sessaoId);
  const reenviarPromocoesMut = useReenviarPromocoes(rachaId, sessaoId);

  // Modals state
  const [modalCriarSessao, setModalCriarSessao] = React.useState(false);
  const [novaDataRacha, setNovaDataRacha] = React.useState('');
  const [novoHorarioInicio, setNovoHorarioInicio] = React.useState('19:00');
  const [novoHorarioFim, setNovoHorarioFim] = React.useState('21:00');

  const [modalReabrirConvocacao, setModalReabrirConvocacao] = React.useState(false);
  const [motivoReabrirConvocacao, setMotivoReabrirConvocacao] = React.useState('');

  const [modalReabrir, setModalReabrir] = React.useState(false);
  const [motivoReabertura, setMotivoReabertura] = React.useState('');

  const [modalSubstituicao, setModalSubstituicao] = React.useState(false);
  const [jogadorSaiuId, setJogadorSaiuId] = React.useState<number | 0>(0);
  const [jogadorEntrouId, setJogadorEntrouId] = React.useState<number | 0>(0);
  const [statusSaida, setStatusSaida] = React.useState<'cancelado_no_prazo' | 'falta_justificada' | 'falta_injustificada'>('cancelado_no_prazo');
  const [motivoSubstituicao, setMotivoSubstituicao] = React.useState('');

  // Local match-day attendance state: Record<jogadorId, { status: string; motivo?: string }>
  const [presencasLocais, setPresencasLocais] = React.useState<Record<number, { status: string; motivo?: string }>>({});

  // Sync initial match-day attendance when session loads
  React.useEffect(() => {
    if (titulares.length > 0) {
      const initial: Record<number, { status: string; motivo?: string }> = {};
      titulares.forEach((t) => {
        initial[t.jogador_id] = {
          status: t.status_presenca || (t.status_intencao === 'confirmado' ? 'presente' : 'pendente_apuracao'),
        };
      });
      setPresencasLocais(initial);
    }
  }, [titulares]);

  const handleSalvarPresencasReais = () => {
    if (!sessaoId) return;
    const payload = Object.entries(presencasLocais).map(([jogId, data]) => ({
      jogador_id: Number(jogId),
      status_presenca: data.status,
      motivo: data.motivo,
    }));

    presencasReaisMut.mutate(payload);
  };

  const handleFecharConvocacao = () => {
    if (!sessaoId) return;
    if (!confirm('Deseja fechar a convocação pré-jogo? Novas respostas de WhatsApp não alterarão a lista titular fechada.')) return;
    fecharConvocacaoMut.mutate({});
  };

  const handleReabrirConvocacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessaoId || !motivoReabrirConvocacao.trim()) return;
    reabrirConvocacaoMut.mutate(
      { motivo: motivoReabrirConvocacao.trim() },
      {
        onSuccess: () => {
          setMotivoReabrirConvocacao('');
          setModalReabrirConvocacao(false);
        },
      }
    );
  };

  const handleHomologar = () => {
    if (!sessaoId) return;
    if (!confirm('Deseja homologar oficialmente a lista de presença da sessão?')) return;
    homologarMut.mutate({ motivo: 'Homologação oficial realizada pelo organizador' });
  };

  const handleReabrir = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessaoId || !motivoReabertura.trim()) return;
    reabrirMut.mutate(
      { motivo: motivoReabertura.trim() },
      {
        onSuccess: () => {
          setMotivoReabertura('');
          setModalReabrir(false);
        },
      }
    );
  };

  const handleSubstituir = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessaoId || jogadorSaiuId <= 0 || jogadorEntrouId <= 0 || !motivoSubstituicao.trim()) return;
    substituirMut.mutate(
      {
        jogador_saiu_id: jogadorSaiuId,
        jogador_entrou_id: jogadorEntrouId,
        motivo: motivoSubstituicao.trim(),
        status_saida: statusSaida,
      },
      {
        onSuccess: () => {
          setJogadorSaiuId(0);
          setJogadorEntrouId(0);
          setMotivoSubstituicao('');
          setModalSubstituicao(false);
        },
      }
    );
  };

  const handleConcluir = () => {
    if (!sessaoId) return;
    if (sessao.apuracao_presenca !== 'homologada') {
      alert('A lista precisa ser homologada antes da conclusão da sessão.');
      return;
    }
    if (!confirm('Confirmar finalização e conclusão oficial desta sessão?')) return;
    concluirMut.mutate();
  };

  const handleCriarSessaoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaDataRacha) return;
    criarSessaoMut.mutate(
      {
        data_racha: novaDataRacha,
        horario_inicio: novoHorarioInicio || undefined,
        horario_fim: novoHorarioFim || undefined,
      },
      {
        onSuccess: () => {
          setModalCriarSessao(false);
          setNovaDataRacha('');
        },
      }
    );
  };

  const temPromocoesPendentes = filaEspera.some((f) => !!f.notificacao_promocao_pendente);

  if (isSessaoLoading) {
    return (
      <div className="text-center py-12 text-cyan-100/50">
        <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-cyan-400" />
        Carregando sessão ativa e fila de espera...
      </div>
    );
  }

  if (!sessao) {
    return (
      <div className="rounded-2xl border border-dashed border-cyan-500/20 bg-[#0a1628]/40 p-10 text-center space-y-4">
        <Calendar className="mx-auto h-12 w-12 text-cyan-400/50" />
        <h3 className="text-lg font-bold text-white">Nenhuma sessão ativa encontrada</h3>
        <p className="text-sm text-cyan-100/60 max-w-md mx-auto">
          Crie uma nova sessão de jogo para convocar participantes, gerenciar a fila FIFO e validar presenças reais.
        </p>
        <Button
          onClick={() => setModalCriarSessao(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold"
        >
          <Calendar className="mr-2 h-4 w-4" />
          Criar Nova Sessão de Racha
        </Button>

        {/* Modal Criar Sessão */}
        <AnimatePresence>
          {modalCriarSessao && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#0d1f35] p-6 shadow-2xl space-y-4 text-left"
              >
                <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-cyan-400" />
                    Nova Sessão de Racha
                  </h3>
                  <button
                    type="button"
                    onClick={() => setModalCriarSessao(false)}
                    className="text-cyan-100/50 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleCriarSessaoSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                      Data da Partida (YYYY-MM-DD) *
                    </label>
                    <Input
                      type="date"
                      required
                      value={novaDataRacha}
                      onChange={(e) => setNovaDataRacha(e.target.value)}
                      className="bg-[#0a1628] border-cyan-500/20 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                        Horário Início
                      </label>
                      <Input
                        type="time"
                        value={novoHorarioInicio}
                        onChange={(e) => setNovoHorarioInicio(e.target.value)}
                        className="bg-[#0a1628] border-cyan-500/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                        Horário Término
                      </label>
                      <Input
                        type="time"
                        value={novoHorarioFim}
                        onChange={(e) => setNovoHorarioFim(e.target.value)}
                        className="bg-[#0a1628] border-cyan-500/20 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setModalCriarSessao(false)}
                      className="text-cyan-100/60 hover:text-white"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={criarSessaoMut.isPending}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold"
                    >
                      {criarSessaoMut.isPending ? 'Criando...' : 'Criar Sessão'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner da Sessão Ativa */}
      <div className="rounded-2xl border border-cyan-500/25 bg-[#0a1628]/80 p-5 backdrop-blur-md shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'inline-flex h-3 w-3 rounded-full',
                sessao.status === 'aberta'
                  ? 'bg-emerald-400 animate-pulse'
                  : sessao.status === 'concluida'
                  ? 'bg-blue-400'
                  : 'bg-amber-400'
              )}
            />
            <h2 className="text-xl font-black text-white">
              Sessão #{sessao.id} — Partida de {sessao.data_racha}
            </h2>
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border',
                sessao.status === 'aberta' &&
                  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                sessao.status === 'concluida' &&
                  'bg-blue-500/20 text-blue-300 border-blue-500/30',
                sessao.status === 'agendada' &&
                  'bg-amber-500/20 text-amber-300 border-amber-500/30'
              )}
            >
              {sessao.status}
            </span>
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border',
                sessao.status_convocacao === 'fechada'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              )}
            >
              {sessao.status_convocacao === 'fechada' ? 'Convocação Fechada' : 'Convocação Aberta'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-cyan-100/60 mt-1">
            <span>
              Apuração:{' '}
              <strong
                className={cn(
                  sessao.apuracao_presenca === 'homologada'
                    ? 'text-emerald-300'
                    : 'text-amber-300'
                )}
              >
                {sessao.apuracao_presenca === 'homologada' ? 'Homologada Oficial' : 'Em Aberto / Edição'}
              </strong>
            </span>
            {sessao.horario_abertura && (
              <span>Horário: {sessao.horario_abertura} {sessao.horario_fechamento ? `até ${sessao.horario_fechamento}` : ''}</span>
            )}
            <span>Titulares: {titulares.length}</span>
            <span>Fila de espera: {filaEspera.length}</span>
          </div>
        </div>

        {/* Botões de Ações de Ciclo de Vida da Sessão */}
        <div className="flex flex-wrap items-center gap-2">
          {/* PRÉ-JOGO: Fechamento / Reabertura da Convocação */}
          {sessao.status_convocacao !== 'fechada' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleFecharConvocacao}
              disabled={fecharConvocacaoMut.isPending}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 font-bold"
              title="Encerra o período normal de respostas no WhatsApp sem homologar presenças pós-jogo"
            >
              <Lock className="mr-1.5 h-4 w-4" />
              Fechar Convocação
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalReabrirConvocacao(true)}
              className="border-blue-500/40 text-blue-300 hover:bg-blue-500/10 font-bold"
              title="Reabre a convocação pré-jogo mediante justificativa"
            >
              <Unlock className="mr-1.5 h-4 w-4" />
              Reabrir Convocação
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setModalSubstituicao(true)}
            className="border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10"
          >
            <ArrowRightLeft className="mr-1.5 h-4 w-4" />
            Substituir Participante
          </Button>

          {/* PÓS-JOGO: Homologação Oficial e Conclusão */}
          {sessao.apuracao_presenca !== 'homologada' ? (
            <Button
              size="sm"
              onClick={handleHomologar}
              disabled={homologarMut.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              title="Congela oficialmente a lista de presença e faltas após a apuração pós-jogo"
            >
              <ShieldCheck className="mr-1.5 h-4 w-4" />
              Homologar Apuração Final
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalReabrir(true)}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
            >
              <Unlock className="mr-1.5 h-4 w-4" />
              Reabrir Apuração (Motivo)
            </Button>
          )}

          {sessao.status !== 'concluida' && (
            <Button
              size="sm"
              onClick={handleConcluir}
              disabled={concluirMut.isPending || sessao.apuracao_presenca !== 'homologada'}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold disabled:opacity-40"
              title={
                sessao.apuracao_presenca !== 'homologada'
                  ? 'É necessário homologar a apuração antes de concluir a sessão'
                  : 'Concluir oficialmente o racha'
              }
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Concluir Sessão
            </Button>
          )}
        </div>
      </div>

      {/* Alerta de Notificações de Promoção Pendentes */}
      {temPromocoesPendentes && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/15 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0" />
            <div>
              <h4 className="font-bold text-amber-200 text-sm">
                Notificações de Promoção Pendentes na Fila
              </h4>
              <p className="text-xs text-amber-200/80">
                Um ou mais avulsos foram promovidos para a vaga de desistentes, mas a notificação do WhatsApp falhou ou expirou.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => reenviarPromocoesMut.mutate()}
            disabled={reenviarPromocoesMut.isPending}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold shrink-0"
          >
            {reenviarPromocoesMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Reenviar Notificações Agora
          </Button>
        </div>
      )}

      {/* Grid Principal: Titulares vs Fila de Espera FIFO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Titulares da Sessão */}
        <div className="rounded-2xl border border-cyan-500/20 bg-[#0a1628]/60 p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-500/15 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">Titulares Confirmados</h3>
              <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 font-bold">
                {titulares.length}
              </span>
            </div>
            <span className="text-xs text-cyan-100/50">Vagas oficiais</span>
          </div>

          {titulares.length === 0 ? (
            <p className="text-xs text-cyan-100/50 py-8 text-center">Nenhum titular na sessão ainda.</p>
          ) : (
            <div className="space-y-2">
              {titulares.map((t) => (
                <div
                  key={t.jogador_id}
                  className="rounded-xl border border-cyan-500/15 bg-[#0d1f35]/60 p-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm truncate">{t.nome}</span>
                      {t.promovido_automaticamente ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                          Promovido da Fila
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-cyan-100/60 mt-0.5">
                      {t.tipo_participacao} • {t.posicao} • {t.whatsapp}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                        t.status_intencao === 'confirmado' &&
                          'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                        t.status_intencao === 'recusado' &&
                          'bg-red-500/20 text-red-300 border border-red-500/30',
                        (!t.status_intencao || t.status_intencao === 'aguardando') &&
                          'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      )}
                    >
                      {t.status_intencao || 'aguardando'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coluna 2: Fila de Espera FIFO dos Avulsos */}
        <div className="rounded-2xl border border-cyan-500/20 bg-[#0a1628]/60 p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-500/15 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">Fila de Espera FIFO (Avulsos)</h3>
              <span className="rounded-full bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 font-bold">
                {filaEspera.length}
              </span>
            </div>
            <span className="text-xs text-cyan-100/50">Ordem rigorosa de chegada</span>
          </div>

          {filaEspera.length === 0 ? (
            <p className="text-xs text-cyan-100/50 py-8 text-center">Fila de espera vazia no momento.</p>
          ) : (
            <div className="space-y-2">
              {filaEspera.map((f, idx) => (
                <div
                  key={f.jogador_id}
                  className={cn(
                    'rounded-xl border p-3 flex items-center justify-between gap-3 text-xs',
                    f.notificacao_promocao_pendente
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : 'border-cyan-500/15 bg-[#0d1f35]/60'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-7 w-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center font-black text-cyan-200 text-xs shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm truncate">{f.nome}</span>
                        {f.notificacao_promocao_pendente ? (
                          <span className="px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold animate-pulse">
                            Notif. Pendente
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-cyan-100/60 mt-0.5">
                        {f.tipo_participacao} • {f.whatsapp}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold uppercase">
                      {f.status_intencao || 'na_fila'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Seção Pós-Jogo: Validação da Presença Real */}
      <div className="rounded-2xl border border-cyan-500/20 bg-[#0a1628]/60 p-5 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-cyan-500/15 pb-3">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-teal-400" />
              Apuração Pós-Jogo: Presenças Reais e Faltas
            </h3>
            <p className="text-xs text-cyan-100/60 mt-0.5">
              Assinale quem compareceu no campo e especifique faltas justificadas com justificativa.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleSalvarPresencasReais}
            disabled={presencasReaisMut.isPending || titulares.length === 0}
            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold"
          >
            {presencasReaisMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="mr-2 h-4 w-4" />
            )}
            Salvar Presenças Reais
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1f35] text-cyan-100/70 border-b border-cyan-500/20">
              <tr>
                <th className="py-2.5 px-3">Jogador</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3">Status de Presença Real</th>
                <th className="py-2.5 px-3">Motivo / Justificativa (se falta)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/10">
              {titulares.map((t) => {
                const atual = presencasLocais[t.jogador_id] ?? { status: 'presente' };
                return (
                  <tr key={t.jogador_id} className="hover:bg-[#0d1f35]/40 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      {t.nome}
                      {t.promovido_automaticamente ? (
                        <span className="ml-2 text-[10px] text-amber-300 font-normal italic">
                          (promovido)
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 px-3 text-cyan-100/60 capitalize">
                      {t.tipo_participacao}
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={atual.status}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPresencasLocais((prev) => ({
                            ...prev,
                            [t.jogador_id]: { ...prev[t.jogador_id], status: val },
                          }));
                        }}
                        className="rounded-lg bg-[#071322] border border-cyan-500/25 px-2.5 py-1 text-xs text-white focus:outline-none"
                      >
                        <option value="presente">Presente</option>
                        <option value="falta_justificada">Falta Justificada</option>
                        <option value="falta_injustificada">Falta Injustificada</option>
                        <option value="cancelado_no_prazo">Cancelado no Prazo</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      {atual.status === 'falta_justificada' ? (
                        <Input
                          placeholder="Informe o motivo da falta..."
                          value={atual.motivo || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPresencasLocais((prev) => ({
                              ...prev,
                              [t.jogador_id]: { ...prev[t.jogador_id], motivo: val },
                            }));
                          }}
                          className="h-8 text-xs bg-[#071322] border-cyan-500/25 text-white max-w-sm"
                        />
                      ) : (
                        <span className="text-cyan-100/30 italic">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histórico Append-Only de Auditoria */}
      <div className="rounded-2xl border border-cyan-500/20 bg-[#0a1628]/60 p-5 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between border-b border-cyan-500/15 pb-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">Histórico de Auditoria Append-Only</h3>
            <span className="rounded-full bg-cyan-500/20 text-cyan-300 text-xs px-2 py-0.5 font-bold">
              {historicoData?.total ?? 0} eventos
            </span>
          </div>
          <span className="text-xs text-cyan-100/50">Triggers de proteção ativas contra UPDATE/DELETE</span>
        </div>

        {isHistoricoLoading ? (
          <p className="text-xs text-cyan-100/50 py-4 text-center">Carregando auditoria...</p>
        ) : !historicoData?.eventos?.length ? (
          <p className="text-xs text-cyan-100/50 py-4 text-center">Nenhum evento registrado ainda.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {historicoData.eventos.map((ev) => (
              <div
                key={ev.id}
                className="rounded-xl border border-cyan-500/10 bg-[#071322]/80 p-3 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-200 capitalize">
                      {ev.tipo_evento.replace(/_/g, ' ')}
                    </span>
                    {ev.status_novo && (
                      <span className="text-[10px] text-cyan-100/60">
                        ({ev.status_anterior ?? '—'} ➔ {ev.status_novo})
                      </span>
                    )}
                  </div>
                  {ev.motivo && (
                    <p className="text-[11px] text-cyan-100/80 italic">
                      Motivo: "{ev.motivo}"
                    </p>
                  )}
                  <p className="text-[10px] text-cyan-100/40">
                    Responsável: {ev.nome_usuario || (ev.usuario_responsavel_id ? `Usuário #${ev.usuario_responsavel_id}` : 'Sistema / Webhook')}
                  </p>
                </div>
                <div className="text-[10px] text-cyan-100/40 shrink-0 tabular-nums">
                  {ev.created_at}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Reabrir Convocação Pré-Jogo (Justificativa Obrigatória) */}
      <AnimatePresence>
        {modalReabrirConvocacao && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-blue-500/30 bg-[#0d1f35] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-blue-500/20">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Unlock className="h-5 w-5 text-blue-400" />
                  Reabrir Convocação Pré-Jogo
                </h3>
                <button
                  type="button"
                  onClick={() => setModalReabrirConvocacao(false)}
                  className="text-cyan-100/50 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleReabrirConvocacao} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                    Motivo da Reabertura * (obrigatório para auditoria)
                  </label>
                  <Textarea
                    required
                    value={motivoReabrirConvocacao}
                    onChange={(e) => setMotivoReabrirConvocacao(e.target.value)}
                    placeholder="Ex: Prorrogação do prazo para resposta dos avulsos da lista de espera"
                    rows={3}
                    className="bg-[#0a1628] border-blue-500/30 text-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setModalReabrirConvocacao(false)}
                    className="text-cyan-100/60 hover:text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={reabrirConvocacaoMut.isPending || !motivoReabrirConvocacao.trim()}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                  >
                    {reabrirConvocacaoMut.isPending ? 'Reabrindo...' : 'Confirmar Reabertura'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Reabrir Lista (Justificativa Obrigatória) */}
      <AnimatePresence>
        {modalReabrir && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#0d1f35] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Unlock className="h-5 w-5 text-amber-400" />
                  Reabrir Lista de Presença
                </h3>
                <button
                  type="button"
                  onClick={() => setModalReabrir(false)}
                  className="text-cyan-100/50 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleReabrir} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                    Motivo da Reabertura * (obrigatório para auditoria)
                  </label>
                  <Textarea
                    required
                    value={motivoReabertura}
                    onChange={(e) => setMotivoReabertura(e.target.value)}
                    placeholder="Ex: Ajuste na escalação após contusão de titular durante o aquecimento"
                    rows={3}
                    className="bg-[#0a1628] border-amber-500/30 text-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setModalReabrir(false)}
                    className="text-cyan-100/60 hover:text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={reabrirMut.isPending || !motivoReabertura.trim()}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
                  >
                    {reabrirMut.isPending ? 'Reabrindo...' : 'Confirmar Reabertura'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Substituição Manual de Participante */}
      <AnimatePresence>
        {modalSubstituicao && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#0d1f35] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-cyan-400" />
                  Substituir Participante
                </h3>
                <button
                  type="button"
                  onClick={() => setModalSubstituicao(false)}
                  className="text-cyan-100/50 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubstituir} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                    Jogador que está saindo *
                  </label>
                  <select
                    value={jogadorSaiuId}
                    onChange={(e) => setJogadorSaiuId(Number(e.target.value))}
                    className="w-full h-10 rounded-md border border-cyan-500/20 bg-[#0a1628] px-3 py-2 text-sm text-white focus:outline-none"
                    required
                  >
                    <option value={0}>Selecione quem sai...</option>
                    {titulares.map((t) => (
                      <option key={t.jogador_id} value={t.jogador_id}>
                        {t.nome} ({t.tipo_participacao})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                    Jogador Substituto (Entrando) *
                  </label>
                  <select
                    value={jogadorEntrouId}
                    onChange={(e) => setJogadorEntrouId(Number(e.target.value))}
                    className="w-full h-10 rounded-md border border-cyan-500/20 bg-[#0a1628] px-3 py-2 text-sm text-white focus:outline-none"
                    required
                  >
                    <option value={0}>Selecione quem entra...</option>
                    {participantesData?.participantes
                      ?.filter((p) => !titulares.some((t) => t.jogador_id === p.jogador_id))
                      .map((p) => (
                        <option key={p.jogador_id} value={p.jogador_id}>
                          {p.nome} ({p.tipo_participacao})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                    Status de Saída do Substituído
                  </label>
                  <select
                    value={statusSaida}
                    onChange={(e) => setStatusSaida(e.target.value as any)}
                    className="w-full h-10 rounded-md border border-cyan-500/20 bg-[#0a1628] px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="cancelado_no_prazo">Cancelado no Prazo</option>
                    <option value="falta_justificada">Falta Justificada</option>
                    <option value="falta_injustificada">Falta Injustificada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                    Motivo da Substituição *
                  </label>
                  <Input
                    required
                    value={motivoSubstituicao}
                    onChange={(e) => setMotivoSubstituicao(e.target.value)}
                    placeholder="Ex: Jogador teve imprevisto no trânsito"
                    className="bg-[#0a1628] border-cyan-500/20 text-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setModalSubstituicao(false)}
                    className="text-cyan-100/60 hover:text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={substituirMut.isPending || jogadorSaiuId <= 0 || jogadorEntrouId <= 0 || !motivoSubstituicao.trim()}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                  >
                    {substituirMut.isPending ? 'Substituindo...' : 'Confirmar Substituição'}
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
