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
// Logs
// =============================================================

export const usePresencaLogs = () =>
  useQuery<{ ok: boolean; logs: string[] }>({
    queryKey: ['presenca', 'logs'],
    queryFn: async () => (await api.get('/presenca/logs')).data,
    refetchInterval: 10000,
  });
