import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api';

// ── Tipos ──────────────────────────────────────────────────────────────────

export type MpStatus = {
  conectado: boolean;
  mp_user_id?: string;
  token_expira_em?: string | null;
  atualizado_em?: string;
};

export type MpSaldo = {
  total: number;
  disponivel: number;
  pendente: number;
  moeda: string;
};

export type MpResumoMes = {
  label: string;
  entradas: number;
  saidas: number;
  liquido: number;
  qtd_entradas: number;
  qtd_saidas: number;
};

export type MpResumo = {
  ok: boolean;
  mes_atual: MpResumoMes;
  mes_anterior: MpResumoMes;
  aviso?: string;
};

export type MpTransacao = {
  id: number;
  descricao: string;
  valor: number;
  status: 'approved' | 'pending' | 'rejected' | 'cancelled' | string;
  tipo: string;
  metodo: string;
  criado_em: string;
  aprovado_em: string | null;
  pagador: string;
  email: string;
};

// ── Hooks ──────────────────────────────────────────────────────────────────

export const useMpStatus = () =>
  useQuery<MpStatus>({
    queryKey: ['mp', 'status'],
    queryFn: () => api.get('/mp/status').then(r => r.data),
    staleTime: 30_000,
  });

export const useMpSaldo = (enabled: boolean) =>
  useQuery<{ ok: boolean; saldo: MpSaldo }>({
    queryKey: ['mp', 'saldo'],
    queryFn: () => api.get('/mp/balance').then(r => r.data),
    enabled,
    staleTime: 60_000,
    refetchInterval: enabled ? 60_000 : false,
  });

export const useMpResumo = (enabled: boolean) =>
  useQuery<MpResumo>({
    queryKey: ['mp', 'resumo'],
    queryFn: () => api.get('/mp/resumo').then(r => r.data),
    enabled,
    staleTime: 120_000,
    refetchInterval: enabled ? 120_000 : false,
  });

export const useMpTransacoes = (enabled: boolean, limite = 30) =>
  useQuery<{ ok: boolean; transacoes: MpTransacao[]; total: number }>({
    queryKey: ['mp', 'transacoes', limite],
    queryFn: () => api.get(`/mp/transacoes?limite=${limite}`).then(r => r.data),
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? 30_000 : false,
  });

export const useMpOAuthUrl = () =>
  useMutation<{ ok: boolean; url: string }, Error>({
    mutationFn: () => api.get('/mp/oauth/start').then(r => r.data),
  });

export const useMpDesconectar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/mp/disconnect').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mp'] });
    },
  });
};
