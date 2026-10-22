// Arquivo: src/features/presenca/api/presencaApi.ts
//
// Hooks React Query para todos os endpoints de /presenca.
// Centralizado num arquivo so para manter o feature compacto.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/api';

// =============================================================
// Tipos
// =============================================================

export type StatusJogador = 'confirmado' | 'a_confirmar' | 'ausente' | 'aguardando';

export type JogadorPresenca = {
  id: number;
  nome: string;
  apelido?: string | null;
  tipo?: 'linha' | 'goleiro';
  status?: StatusJogador;
  horario_resposta?: string | null;
  ordem?: number | null;
};

export type Lista = {
  id: number;
  data_racha: string;
  disparado: boolean;
  fechado: boolean;
  atualizado_em: string | null;
};

export type DadosResponse = {
  lista: Lista | null;
  jogadores: {
    confirmados: JogadorPresenca[];
    pendentes: JogadorPresenca[];
    ausentes: JogadorPresenca[];
    sem_resposta: JogadorPresenca[];
  };
  config: {
    dia_racha: string;
    horario_racha: string;
    local_racha: string;
    intervalo_lembrete_horas?: string;
  };
};

export type BotJogador = {
  id: number;
  nome: string;
  numero: string;
  tipo: 'linha' | 'goleiro';
  ativo: 0 | 1 | boolean;
  criado_em?: string;
  atualizado_em?: string | null;
};

export type AcaoBody = {
  jogador_id: number;
  acao: 'confirmar' | 'ausente' | 'aguardando' | 'lembrete';
};

export type MensagemMassaBody = {
  destinatarios: number[] | 'todos' | 'ativos';
  texto: string;
};

export type MensagemMassaResponse = {
  ok: boolean;
  total: number;
  enviados: number;
  falhou: number;
  detalhes: Array<{
    id: number;
    nome: string;
    numero: string;
    ok: boolean;
    erro?: string;
  }>;
};

// =============================================================
// Lista atual + jogadores
// =============================================================

export const usePresencaDados = () =>
  useQuery<DadosResponse>({
    queryKey: ['presenca', 'dados'],
    queryFn: async () => (await api.get('/presenca/dados')).data,
    refetchInterval: 15000, // atualiza a cada 15s (jogadores podem responder pelo whats)
  });

export const usePresencaAcao = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: AcaoBody) =>
      (await api.post('/presenca/acao', body)).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['presenca', 'dados'] });
      if (data?.msg) toast.success(data.msg);
    },
    onError: (e: any) => toast.error(e?.response?.data?.msg ?? 'Erro ao executar ação'),
  });
};

// =============================================================
// CRUD bot_jogadores
// =============================================================

export const useBotJogadores = () =>
  useQuery<{ ok: boolean; jogadores: BotJogador[] }>({
    queryKey: ['presenca', 'jogadores'],
    queryFn: async () => (await api.get('/presenca/jogadores')).data,
  });

export const useCreateBotJogador = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { nome: string; numero: string; tipo: 'linha' | 'goleiro' }) =>
      (await api.post('/presenca/jogadores', body)).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['presenca', 'jogadores'] });
      if (data?.msg) toast.success(data.msg);
    },
    onError: (e: any) => toast.error(e?.response?.data?.msg ?? 'Erro ao criar jogador'),
  });
};

export const useUpdateBotJogador = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: number; nome: string; numero: string; tipo: 'linha' | 'goleiro' }) =>
      (await api.put(`/presenca/jogadores/${id}`, body)).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['presenca', 'jogadores'] });
      if (data?.msg) toast.success(data.msg);
    },
    onError: (e: any) => toast.error(e?.response?.data?.msg ?? 'Erro ao editar jogador'),
  });
};

export const useDeleteBotJogador = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.delete(`/presenca/jogadores/${id}`)).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['presenca', 'jogadores'] });
      if (data?.msg) toast.success(data.msg);
    },
    onError: (e: any) => toast.error(e?.response?.data?.msg ?? 'Erro ao remover jogador'),
  });
};

export const useToggleBotJogador = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.post(`/presenca/jogadores/${id}/toggle`)).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['presenca', 'jogadores'] });
      if (data?.msg) toast.success(data.msg);
    },
    onError: (e: any) => toast.error(e?.response?.data?.msg ?? 'Erro ao alternar status'),
  });
};

// =============================================================
// Configuracoes do bot
// =============================================================

export const useBotConfig = () =>
  useQuery<Record<string, string>>({
    queryKey: ['presenca', 'configuracoes'],
    queryFn: async () => (await api.get('/presenca/configuracoes')).data,
  });

export const useUpdateBotConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, string>) =>
      (await api.put('/presenca/configuracoes', body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['presenca', 'configuracoes'] });
      qc.invalidateQueries({ queryKey: ['presenca', 'dados'] });
      toast.success('Configurações salvas!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.msg ?? 'Erro ao salvar configurações'),
  });
};

// =============================================================
// Acoes da lista (admin)
// =============================================================

export const useDispararLista = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/presenca/disparar')).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['presenca', 'dados'] });
      if (data?.msg) toast.success(data.msg);
    },
    onError: (e: any) => toast.error(e?.response?.data?.msg ?? 'Erro ao disparar lista'),
  });
};

export const useFecharLista = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/presenca/fechar')).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['presenca', 'dados'] });
      if (data?.msg) toast.success(data.msg);
    },
    onError: (e: any) => toast.error(e?.response?.data?.msg ?? 'Erro ao fechar/reabrir lista'),
  });
};

export const useRecarregarLista = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/presenca/recarregar')).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['presenca', 'dados'] });
      if (data?.msg) toast.success(data.msg);
    },
    onError: (e: any) => toast.error(e?.response?.data?.msg ?? 'Erro ao recarregar relatório'),
  });
};

export const useSincronizarRespostas = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/presenca/sincronizar')).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['presenca', 'dados'] });
      if (data?.msg) toast.success(data.msg);
    },
    onError: (e: any) => toast.error(e?.response?.data?.msg ?? 'Erro ao sincronizar respostas'),
  });
};

export const useReenviarConvocacao = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/presenca/reenviar')).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['presenca', 'dados'] });
      if (data?.msg) toast.success(data.msg);
    },
    onError: (e: any) => toast.error(e?.response?.data?.msg ?? 'Erro ao reenviar convocação'),
  });
};

// =============================================================
// Mensagens
// =============================================================

export const useTesteMensagem = () =>
  useMutation({
    mutationFn: async (body: { numero: string; texto: string }) =>
      (await api.post('/presenca/teste-mensagem', body)).data,
    onSuccess: (data) => {
      if (data?.msg) toast.success(data.msg);
    },
    onError: (e: any) => toast.error(e?.response?.data?.msg ?? 'Erro ao enviar teste'),
  });

export const useMensagemMassa = () =>
  useMutation<MensagemMassaResponse, any, MensagemMassaBody>({
    mutationFn: async (body) =>
      (await api.post('/presenca/mensagem-massa', body)).data,
    onSuccess: (data) => {
      if (data?.ok) {
        toast.success(`✅ ${data.enviados} enviados${data.falhou > 0 ? ` (${data.falhou} falharam)` : ''}`);
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.msg ?? 'Erro ao enviar comunicado'),
  });

// =============================================================
// Caixa de Entrada (Respostas)
// =============================================================

export interface CaixaEntradaItem {
  jogador_id: number | null;
  numero: string;
  nome: string;
  mensagens: string[];
}

export const useCaixaEntrada = () =>
  useQuery<{ ok: boolean; respostas: CaixaEntradaItem[] }>({
    queryKey: ['presenca', 'caixa_entrada'],
    queryFn: async () => (await api.get('/presenca/caixa-entrada')).data,
    refetchInterval: 15000,
  });

export const useLimparCaixaEntrada = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/presenca/caixa-entrada/limpar')).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presenca', 'caixa_entrada'] });
      toast.success('Lista de respostas limpa com sucesso!');
    },
    onError: () => toast.error('Erro ao limpar caixa de entrada'),
  });
};

// =============================================================
// Logs
// =============================================================

export const usePresencaLogs = () =>
  useQuery<{ ok: boolean; logs: string[] }>({
    queryKey: ['presenca', 'logs'],
    queryFn: async () => (await api.get('/presenca/logs')).data,
    refetchInterval: 10000,
  });


// =============================================================
// MULTI-RACHA & EVOLUTION API (ETAPA 3C.3)
// =============================================================

export type MeuRacha = {
  id: number;
  nome: string;
  papel: string;
  ativo: number | boolean;
};

export type WhatsAppStatusResponse = {
  ok: boolean;
  racha_id: number;
  instancia_nome: string;
  status_conexao: 'desconectado' | 'aguardando_qr' | 'conectando' | 'conectado' | 'erro';
  numero_conectado?: string | null;
  qrcode_base64?: string | null;
  qr_code?: { disponivel: boolean; qr_code_base64?: string | null; qr_code_texto?: string | null } | null;
  ultimo_erro_codigo?: string | null;
  ultimo_erro_resumo?: string | null;
  mensagem_status?: string | null;
  atualizado_em?: string | null;
  modo_simulado?: boolean;
};

export type RachaParticipante = {
  id: number;
  jogador_id: number;
  racha_id: number;
  nome: string;
  apelido?: string | null;
  whatsapp: string;
  posicao: 'linha' | 'goleiro';
  tipo_participacao: 'mensalista' | 'avulso_recorrente' | 'avulso_convidado';
  ativo: number | boolean;
  status_mensalidade?: 'ativo' | 'inadimplente' | 'pausado' | 'cancelado' | null;
};

export type RachaTitular = {
  jogador_id: number;
  nome: string;
  whatsapp: string;
  tipo_participacao: string;
  posicao: string;
  status_intencao?: string;
  promovido_automaticamente?: number | boolean;
  status_presenca?: string;
};

export type RachaFilaEsperaItem = {
  jogador_id: number;
  nome: string;
  whatsapp: string;
  tipo_participacao: string;
  posicao: string;
  posicao_fila: number;
  status_intencao: string;
  promovido_automaticamente: number | boolean;
  notificacao_promocao_pendente: number | boolean;
};

export type RachaSessaoAtiva = {
  id: number;
  data_racha: string;
  horario_abertura?: string | null;
  horario_fechamento?: string | null;
  status: 'agendada' | 'aberta' | 'concluida' | 'cancelada';
  status_convocacao?: 'aberta' | 'fechada';
  fechamento_convocacao_em?: string | null;
  apuracao_presenca: 'nao_iniciada' | 'em_andamento' | 'homologada';
};

export type RachaSessaoAtivaResponse = {
  ok: boolean;
  racha_id: number;
  sessao: RachaSessaoAtiva | null;
  titulares: RachaTitular[];
  fila_espera: RachaFilaEsperaItem[];
};

export type RachaSessaoEvento = {
  id: number;
  sessao_id: number;
  tipo_evento: string;
  usuario_responsavel_id?: number | null;
  nome_usuario?: string | null;
  jogador_id?: number | null;
  status_anterior?: string | null;
  status_novo?: string | null;
  motivo?: string | null;
  dados_adicionais?: any;
  created_at: string;
};

export const getErrorMessage = (e: any, fallback: string): string => {
  const data = e?.response?.data;
  if (!data) return e?.message ?? fallback;
  if (typeof data === 'string') return data;
  if (typeof data.message === 'string' && data.message) return data.message;
  if (typeof data.msg === 'string' && data.msg) return data.msg;
  if (typeof data.error === 'string' && data.error) return data.error;
  return fallback;
};

export const useMeusRachas = () =>
  useQuery<{ ok: boolean; rachas: MeuRacha[] }>({
    queryKey: ['racha', 'meus-rachas'],
    queryFn: async () => (await api.get('/racha/meus-rachas')).data,
  });

export const useWhatsAppStatus = (rachaId?: number) =>
  useQuery<WhatsAppStatusResponse>({
    queryKey: ['racha', rachaId, 'whatsapp', 'status'],
    queryFn: async () => {
      const res = await api.get('/racha/whatsapp/status', { headers: { 'X-Racha-Id': rachaId } });
      const raw = res.data?.status ?? res.data;
      return {
        ...raw,
        qrcode_base64: raw?.qrcode_base64 ?? raw?.qr_code?.qr_code_base64 ?? null,
        instancia_nome: raw?.instancia_nome ?? raw?.instance_name ?? '',
      };
    },
    enabled: !!rachaId,
    refetchInterval: (query) => {
      const st = query.state.data?.status_conexao;
      return st === 'aguardando_qr' || st === 'conectando' ? 3000 : 15000;
    },
  });

export const useConectarWhatsApp = (rachaId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await api.post('/racha/whatsapp/conectar', {}, { headers: { 'X-Racha-Id': rachaId } })).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'whatsapp', 'status'] });
      if (data?.conexao) {
        qc.setQueryData(['racha', rachaId, 'whatsapp', 'status'], (old: any) => ({
          ...(old ?? {}),
          ...data.conexao,
          qrcode_base64: data.conexao?.qrcode_base64 ?? data.conexao?.qr_code?.qr_code_base64 ?? null,
        }));
      }
      if (data?.mensagem) toast.success(data.mensagem);
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'Erro ao conectar WhatsApp')),
  });
};

export const useDesconectarWhatsApp = (rachaId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await api.post('/racha/whatsapp/desconectar', {}, { headers: { 'X-Racha-Id': rachaId } })).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'whatsapp', 'status'] });
      toast.success(data?.mensagem ?? 'Instância desconectada com sucesso.');
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'Erro ao desconectar WhatsApp')),
  });
};

export const useSimularConexaoWhatsApp = (rachaId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await api.post('/racha/whatsapp/simular-conexao', {}, { headers: { 'X-Racha-Id': rachaId } })).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'whatsapp', 'status'] });
      toast.success(data?.mensagem ?? 'Simulação de pareamento ativada com sucesso!');
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'Erro ao simular conexão')),
  });
};

export const useRachaParticipantes = (rachaId?: number) =>
  useQuery<{ ok: boolean; participantes: RachaParticipante[] }>({
    queryKey: ['racha', rachaId, 'participantes'],
    queryFn: async () =>
      (await api.get('/racha/participantes', { headers: { 'X-Racha-Id': rachaId } })).data,
    enabled: !!rachaId,
  });

export const useCadastrarParticipante = (rachaId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      nome: string;
      whatsapp: string;
      tipo_participacao?: string;
      posicao?: string;
      apelido?: string;
    }) =>
      (await api.post('/racha/participantes', body, { headers: { 'X-Racha-Id': rachaId } })).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'participantes'] });
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao-ativa'] });
      toast.success(data?.mensagem ?? 'Participante cadastrado com sucesso!');
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'Erro ao cadastrar participante')),
  });
};

export const useSessaoAtiva = (rachaId?: number) =>
  useQuery<RachaSessaoAtivaResponse>({
    queryKey: ['racha', rachaId, 'sessao-ativa'],
    queryFn: async () =>
      (await api.get('/racha/sessoes/ativa', { headers: { 'X-Racha-Id': rachaId } })).data,
    enabled: !!rachaId,
    refetchInterval: 10000,
  });

export const useCriarSessao = (rachaId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { data_racha: string; horario_inicio?: string; horario_fim?: string }) =>
      (await api.post('/racha/sessoes', body, { headers: { 'X-Racha-Id': rachaId } })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao-ativa'] });
      toast.success('Sessão criada com sucesso!');
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'Erro ao criar sessão')),
  });
};

export const useConvocarParticipantes = (rachaId?: number, sessaoId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      limite_vagas?: number;
      incluir_mensalistas?: boolean;
      avulsos_selecionados?: number[];
    }) =>
      (await api.post(`/racha/sessoes/${sessaoId}/convocar`, body, { headers: { 'X-Racha-Id': rachaId } })).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao-ativa'] });
      toast.success(data?.mensagem ?? 'Convocação gerada com sucesso!');
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'Erro ao convocar participantes')),
  });
};

export const useFecharConvocacao = (rachaId?: number, sessaoId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body?: { motivo?: string }) =>
      (await api.post(`/racha/sessoes/${sessaoId}/fechar-convocacao`, body ?? {}, { headers: { 'X-Racha-Id': rachaId } })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao-ativa'] });
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao', sessaoId, 'historico'] });
      toast.success('Lista de convocação fechada com sucesso!');
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'Erro ao fechar convocação')),
  });
};

export const useReabrirConvocacao = (rachaId?: number, sessaoId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { motivo: string }) =>
      (await api.post(`/racha/sessoes/${sessaoId}/reabrir-convocacao`, body, { headers: { 'X-Racha-Id': rachaId } })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao-ativa'] });
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao', sessaoId, 'historico'] });
      toast.success('Convocação reaberta com justificativa registrada!');
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'Erro ao reabrir convocação')),
  });
};

export const useDispararRenovacaoCompetencia = (rachaId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { competencia: string; valor_mensalidade?: number; chave_pix?: string; instrucoes?: string }) =>
      (await api.post('/racha/renovacoes/disparar', body, { headers: { 'X-Racha-Id': rachaId } })).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'renovacoes'] });
      toast.success(`Renovação mensal disparada! Enviados: ${data?.enviados ?? 0}, já notificados: ${data?.pulados ?? 0}`);
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'Erro ao disparar renovação')),
  });
};

export const useListarRenovacoes = (rachaId?: number, competencia?: string) =>
  useQuery({
    queryKey: ['racha', rachaId, 'renovacoes', competencia],
    queryFn: async () =>
      (await api.get(`/racha/renovacoes${competencia ? `?competencia=${competencia}` : ''}`, { headers: { 'X-Racha-Id': rachaId } })).data,
    enabled: !!rachaId,
  });

export const useDispararConvocacao = (rachaId?: number, sessaoId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body?: { texto_personalizado?: string; variacoes_mensagens?: string[] }) =>
      (await api.post(`/racha/sessoes/${sessaoId}/disparar-convocacao`, body ?? {}, { headers: { 'X-Racha-Id': rachaId } })).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao-ativa'] });
      toast.success(`Convocação semanal enviada para ${data?.total_destinatarios ?? 0} jogadores!`);
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'Erro ao disparar convocação semanal')),
  });
};

export const useDispararRenovacao = (rachaId?: number, sessaoId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body?: { valor_mensalidade?: number; chave_pix?: string; instrucoes?: string }) =>
      (await api.post(`/racha/sessoes/${sessaoId}/disparar-renovacao`, body ?? {}, { headers: { 'X-Racha-Id': rachaId } })).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao-ativa'] });
      toast.success(`Mensagem de renovação mensal disparada para ${data?.total_mensalistas ?? 0} mensalistas!`);
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'Erro ao disparar renovação')),
  });
};

export const useDispararComunicadoRacha = (rachaId?: number, sessaoId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { destinatarios?: number[]; mensagem: string }) =>
      (await api.post(`/racha/sessoes/${sessaoId}/disparar-comunicado`, body, { headers: { 'X-Racha-Id': rachaId } })).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao-ativa'] });
      toast.success(`Comunicado enviado para ${data?.total_enviados ?? 0} destinatários!`);
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'Erro ao disparar comunicado')),
  });
};

export const useReenviarPromocoes = (rachaId?: number, sessaoId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await api.post(`/racha/sessoes/${sessaoId}/reenviar-promocoes`, {}, { headers: { 'X-Racha-Id': rachaId } })).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao-ativa'] });
      toast.success(`Notificações reenviadas: ${data?.resultado?.enviados ?? 0} sucesso(s)!`);
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'Erro ao reenviar notificações')),
  });
};

export const useHomologarLista = (rachaId?: number, sessaoId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body?: { motivo?: string }) =>
      (await api.post(`/racha/sessoes/${sessaoId}/homologar-lista`, body ?? {}, { headers: { 'X-Racha-Id': rachaId } })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao-ativa'] });
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao', sessaoId, 'historico'] });
      toast.success('Lista de presença oficial homologada com sucesso!');
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'Erro ao homologar lista')),
  });
};

export const useReabrirLista = (rachaId?: number, sessaoId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { motivo: string }) =>
      (await api.post(`/racha/sessoes/${sessaoId}/reabrir-lista`, body, { headers: { 'X-Racha-Id': rachaId } })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao-ativa'] });
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao', sessaoId, 'historico'] });
      toast.success('Lista de presença reaberta para edições com justificativa registrada!');
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'Erro ao reabrir lista')),
  });
};

export const useSubstituirParticipante = (rachaId?: number, sessaoId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      jogador_saiu_id: number;
      jogador_entrou_id: number;
      motivo: string;
      status_saida?: string;
    }) =>
      (await api.post(`/racha/sessoes/${sessaoId}/substituir`, body, { headers: { 'X-Racha-Id': rachaId } })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao-ativa'] });
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao', sessaoId, 'historico'] });
      toast.success('Substituição realizada com sucesso e registrada no histórico!');
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'Erro na substituição')),
  });
};

export const useRegistrarPresencasReais = (rachaId?: number, sessaoId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (presencas: Array<{ jogador_id: number; status_presenca: string; motivo?: string }>) =>
      (await api.post(`/racha/sessoes/${sessaoId}/presencas`, { presencas }, { headers: { 'X-Racha-Id': rachaId } })).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao-ativa'] });
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao', sessaoId, 'historico'] });
      toast.success(`Presenças reais atualizadas (${data?.atualizados ?? 0} jogadores)!`);
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'Erro ao registrar presenças')),
  });
};

export const useConcluirSessao = (rachaId?: number, sessaoId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await api.post(`/racha/sessoes/${sessaoId}/concluir`, {}, { headers: { 'X-Racha-Id': rachaId } })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao-ativa'] });
      qc.invalidateQueries({ queryKey: ['racha', rachaId, 'sessao', sessaoId, 'historico'] });
      toast.success('Sessão concluída e arquivada oficialmente!');
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'Erro ao concluir sessão')),
  });
};

export const useHistoricoSessao = (rachaId?: number, sessaoId?: number) =>
  useQuery<{ ok: boolean; racha_id: number; sessao_id: number; total: number; eventos: RachaSessaoEvento[] }>({
    queryKey: ['racha', rachaId, 'sessao', sessaoId, 'historico'],
    queryFn: async () =>
      (await api.get(`/racha/sessoes/${sessaoId}/historico`, { headers: { 'X-Racha-Id': rachaId } })).data,
    enabled: !!rachaId && !!sessaoId,
  });
