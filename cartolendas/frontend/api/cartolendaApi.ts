// Arquivo: src/api/cartolendaApi.ts
import api from './index';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  MercadoJogador,
  MeuTimeResponse,
  RankingEntry,
  HistoricoRodada,
  StatsMercadoResponse,
  EscalacaoTecnicoResponse,
  RankingRodadaEntry,
  RankingJogadorEntry,
  MeuPatrimonioResponse,
  MeuHistoricoResponse,
  HistoricoJogadoresResponse,
  StatsRodadaResponse,
  TemporadasDisponiveisResponse,
  TemporadaRankingResponse,
  ResetTemporadaResponse,
  EscalarResponse,
} from '@/@types/cartolendas';

// ── Hooks de leitura ──────────────────────────────────────────

export function useMercadoCartolenda(rodadaId: number | null) {
  return useQuery({
    queryKey: ['cartolendas', 'mercado', rodadaId],
    queryFn: async () => {
      const { data } = await api.get<MercadoJogador[]>(`/cartolendas/mercado/${rodadaId}`);
      return data;
    },
    enabled: !!rodadaId,
    staleTime: 30_000,
  });
}

export function useMeuTimeCartolenda(rodadaId: number | null) {
  return useQuery({
    queryKey: ['cartolendas', 'meu-time', rodadaId],
    queryFn: async () => {
      const { data } = await api.get<MeuTimeResponse>(`/cartolendas/meu-time/${rodadaId}`);
      return data;
    },
    enabled: !!rodadaId,
  });
}

export function useRankingCartolenda() {
  return useQuery({
    queryKey: ['cartolendas', 'ranking'],
    queryFn: async () => {
      const { data } = await api.get<RankingEntry[]>('/cartolendas/ranking');
      return data;
    },
  });
}

export function useHistoricoCartolenda() {
  return useQuery({
    queryKey: ['cartolendas', 'historico'],
    queryFn: async () => {
      const { data } = await api.get<HistoricoRodada[]>('/cartolendas/historico');
      return data;
    },
  });
}

export function useStatsMercadoCartolenda() {
  return useQuery({
    queryKey: ['cartolendas', 'stats-mercado'],
    queryFn: async () => {
      const { data } = await api.get<StatsMercadoResponse>('/cartolendas/stats/mercado');
      return data;
    },
  });
}

// ── Novos hooks Cartolendas v2 ──────────────────────────────────

export function useEscalacaoTecnico(rodadaId: number | null, userId: number | null) {
  return useQuery({
    queryKey: ['cartolendas', 'escalacao-tecnico', rodadaId, userId],
    queryFn: async () => {
      const { data } = await api.get<EscalacaoTecnicoResponse>(`/cartolendas/escalacao-tecnico/${rodadaId}/${userId}`);
      return data;
    },
    enabled: !!rodadaId && !!userId,
  });
}

export function useRankingRodada(rodadaId: number | null) {
  return useQuery({
    queryKey: ['cartolendas', 'ranking-rodada', rodadaId],
    queryFn: async () => {
      const { data } = await api.get<RankingRodadaEntry[]>(`/cartolendas/ranking-rodada/${rodadaId}`);
      return data;
    },
    enabled: !!rodadaId,
  });
}

export function useRankingJogadores(params: { tipo: 'pontos' | 'valorizacao'; escopo: 'rodada' | 'geral'; rodada_id?: number }) {
  return useQuery({
    queryKey: ['cartolendas', 'ranking-jogadores', params],
    queryFn: async () => {
      const { data } = await api.get<RankingJogadorEntry[]>('/cartolendas/ranking-jogadores', { params });
      return data;
    },
  });
}

export function useMeuPatrimonio(rodadaId?: number) {
  return useQuery({
    queryKey: ['cartolendas', 'meu-patrimonio', rodadaId],
    queryFn: async () => {
      const { data } = await api.get<MeuPatrimonioResponse>('/cartolendas/meu-patrimonio', { params: rodadaId ? { rodada_id: rodadaId } : {} });
      return data;
    },
  });
}

export function useMeuHistoricoCartolenda(campeonatoId: number | null) {
  return useQuery({
    queryKey: ['cartolendas', 'meu-historico', campeonatoId],
    queryFn: async () => {
      const { data } = await api.get<MeuHistoricoResponse>('/cartolendas/meu-historico', { params: { campeonato_id: campeonatoId } });
      return data;
    },
    enabled: !!campeonatoId,
  });
}

export function useHistoricoJogadoresCartolenda(campeonatoId: number | null) {
  return useQuery({
    queryKey: ['cartolendas', 'historico-jogadores', campeonatoId],
    queryFn: async () => {
      const { data } = await api.get<HistoricoJogadoresResponse>('/cartolendas/historico-jogadores', { params: { campeonato_id: campeonatoId } });
      return data;
    },
    enabled: !!campeonatoId,
  });
}

export function useStatsRodadaCartolenda(rodadaId?: number) {
  return useQuery({
    queryKey: ['cartolendas', 'stats-rodada', rodadaId],
    queryFn: async () => {
      const { data } = await api.get<StatsRodadaResponse>('/cartolendas/stats/rodada', { params: rodadaId ? { rodada_id: rodadaId } : {} });
      return data;
    },
  });
}

// ── Temporada (historico + reset) ─────────────────────────────

export function useTemporadasDisponiveis() {
  return useQuery({
    queryKey: ['cartolendas', 'temporadas'],
    queryFn: async () => {
      const { data } = await api.get<TemporadasDisponiveisResponse>('/cartolendas/temporada/historico');
      return data;
    },
  });
}

export function useTemporadaRanking(temporada: string | null) {
  return useQuery({
    queryKey: ['cartolendas', 'temporada-ranking', temporada],
    queryFn: async () => {
      const { data } = await api.get<TemporadaRankingResponse>('/cartolendas/temporada/historico', { params: { temporada } });
      return data;
    },
    enabled: !!temporada,
  });
}

export function useResetTemporada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { temporada_nome: string }) => {
      const { data } = await api.post<ResetTemporadaResponse>('/cartolendas/temporada/reset', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cartolendas'] });
    },
  });
}

// ── Mutations ─────────────────────────────────────────────────

export function useEscalarCartolenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { rodada_id: number; jogadores: { jogador_id: number; eh_reserva: boolean }[] }) => {
      const { data } = await api.post<EscalarResponse>('/cartolendas/escalar', payload);
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['cartolendas', 'meu-time', vars.rodada_id] });
      qc.invalidateQueries({ queryKey: ['cartolendas', 'ranking'] });
      qc.invalidateQueries({ queryKey: ['cartolendas', 'mercado'] });
      qc.invalidateQueries({ queryKey: ['cartolendas', 'meu-patrimonio'] });
      qc.invalidateQueries({ queryKey: ['cartolendas', 'capitao'] });
    },
  });
}
