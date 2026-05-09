// src/features/notificacoes/hooks/useNotificacoes.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api';

export interface Notificacao {
  id: number;
  tipo: 'convite' | 'rodada_nova' | 'mvp' | 'resultado';
  titulo: string;
  mensagem: string;
  lida: boolean;
  meta: Record<string, any> | null;
  criado_em: string;
}

// ── Lista completa ────────────────────────────────────────────────────────────
export function useNotificacoes() {
  return useQuery<Notificacao[]>({
    queryKey: ['notificacoes'],
    queryFn: async () => (await api.get('/notificacoes')).data,
    staleTime: 30_000, // 30s
    refetchInterval: 60_000, // poll a cada 60s
    refetchIntervalInBackground: false,
  });
}

// ── Contador não lidas (mais leve — poll frequente) ───────────────────────────
export function useNotificacoesCount() {
  return useQuery<{ nao_lidas: number }>({
    queryKey: ['notificacoes-count'],
    queryFn: async () => (await api.get('/notificacoes/count')).data,
    staleTime: 20_000,
    refetchInterval: 30_000, // atualiza o badge a cada 30s
    refetchIntervalInBackground: false,
  });
}

// ── Marcar uma como lida ──────────────────────────────────────────────────────
export function useMarcarLida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.put(`/notificacoes/${id}/ler`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notificacoes'] });
      qc.invalidateQueries({ queryKey: ['notificacoes-count'] });
    },
  });
}

// ── Marcar todas como lidas ───────────────────────────────────────────────────
export function useMarcarTodasLidas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => api.put('/notificacoes/ler-todas'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notificacoes'] });
      qc.invalidateQueries({ queryKey: ['notificacoes-count'] });
    },
  });
}