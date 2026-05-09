// Arquivo: src/api/campeonatoApi.ts

import api from './index';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Campeonato, CampeonatoPartida, Time, FormatoCampeonato } from '@/types/models';
import { toast } from 'sonner';
import type {
  StatsJogadorLinha,
  StatsGoleiro,
  StatsZagueiro,
  StatsTimeTotais,
  ConfrontoTime,
  StatsAvancadasResponse,
} from '@/@types/cartolendas';

const BASE_URL = '/campeonatos';

// --- TIPOS ESPECÍFICOS PARA CLASSIFICAÇÃO ---
export interface ItemClassificacao {
  posicao: number;
  time_id: number;
  nome: string;
  logo_url?: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_pro: number;
  gols_contra: number;
  saldo_gols: number;
  aproveitamento: number;
}

export interface EstatisticaJogador {
  jogador_id: number;
  nome: string;
  foto_url: string | null;
  time_nome: string;
  total_gols: number;
  total_assistencias: number;
}

export interface StatsAvancadas {
  jogadores: StatsJogadorLinha[];
  goleiros: StatsGoleiro[];
  zagueiros: StatsZagueiro[];
  times: {
    totais: StatsTimeTotais[];
    rivalidades: unknown[];
  };
  confrontos_times: ConfrontoTime[];
}

export interface Rodada {
  id: number;
  data: string;
  status: string;
  campeonato_id?: number;
  liga_id?: number;
}


// ----------------------------------------------------
// FETCH FUNCTIONS
// ----------------------------------------------------

export async function fetchEstatisticasJogadores(campeonatoId: number): Promise<EstatisticaJogador[]> {
  const { data } = await api.get<EstatisticaJogador[]>(`/campeonatos/${campeonatoId}/estatisticas-jogadores`);
  return data;
}

export function useCampeonatoStats(campeonatoId: number) {
  return useQuery<EstatisticaJogador[], Error>({
    queryKey: ['campeonatos', campeonatoId, 'stats'],
    queryFn: () => fetchEstatisticasJogadores(campeonatoId),
    enabled: !!campeonatoId,
  });
}

// ✅ ATUALIZADO: Agora aceita rodada_id opcional
export function useStatsAvancadas(campeonatoId: number, rodadaId?: number | null) {
  return useQuery<StatsAvancadas, Error>({
    queryKey: ['campeonatos', campeonatoId, 'stats-avancadas', rodadaId],
    queryFn: async () => {
      const params = rodadaId ? `?rodada_id=${rodadaId}` : '';
      const { data } = await api.get(`/campeonatos/${campeonatoId}/stats-avancadas${params}`);
      return data;
    },
    enabled: !!campeonatoId,
  });
}

// ✅ NOVO: Hook para buscar rodadas do campeonato
export function useRodadasCampeonato(campeonatoId: number) {
  return useQuery<Rodada[], Error>({
    queryKey: ['campeonatos', campeonatoId, 'rodadas'],
    queryFn: async () => {
      const { data } = await api.get(`/rodadas/campeonato/${campeonatoId}`);
      return data;
    },
    enabled: !!campeonatoId,
  });
}


export async function fetchCampeonatos(): Promise<Campeonato[]> {
  const { data } = await api.get<Campeonato[]>(BASE_URL);
  return data;
}

export async function fetchCampeonatoById(id: number): Promise<Campeonato> {
  const { data } = await api.get<Campeonato>(`${BASE_URL}/${id}`);
  return data;
}

export async function fetchCampeonatoPartidas(campeonatoId: number): Promise<CampeonatoPartida[]> {
  const { data } = await api.get<CampeonatoPartida[]>(
    `${BASE_URL}/${campeonatoId}/partidas`
  );
  return data;
}

export async function fetchTimesDoCampeonato(campeonatoId: number): Promise<Time[]> {
  const { data } = await api.get<Time[]>(`${BASE_URL}/${campeonatoId}/times`);
  return data;
}

export async function fetchClassificacao(campeonatoId: number): Promise<ItemClassificacao[]> {
  const { data } = await api.get<ItemClassificacao[]>(`${BASE_URL}/${campeonatoId}/classificacao`);
  return data;
}

// ----------------------------------------------------
// REACT QUERY HOOKS (READ)
// ----------------------------------------------------

export function useCampeonatos() {
  return useQuery<Campeonato[], Error>({
    queryKey: ['campeonatos'],
    queryFn: fetchCampeonatos,
  });
}

export function useCampeonato(id: number) {
  return useQuery<Campeonato, Error>({
    queryKey: ['campeonatos', id],
    queryFn: () => fetchCampeonatoById(id),
    enabled: !!id,
  });
}

export function useCampeonatoPartidas(campeonatoId: number) {
  return useQuery<CampeonatoPartida[], Error>({
    queryKey: ['campeonatos', campeonatoId, 'partidas'],
    queryFn: () => fetchCampeonatoPartidas(campeonatoId),
    enabled: !!campeonatoId,
  });
}

export function useTimesDoCampeonato(campeonatoId: number) {
  return useQuery<Time[], Error>({
    queryKey: ['campeonatos', campeonatoId, 'times'],
    queryFn: () => fetchTimesDoCampeonato(campeonatoId),
    enabled: !!campeonatoId,
  });
}

export function useCampeonatoClassificacao(campeonatoId: number) {
  return useQuery<ItemClassificacao[], Error>({
    queryKey: ['campeonatos', campeonatoId, 'classificacao'],
    queryFn: () => fetchClassificacao(campeonatoId),
    enabled: !!campeonatoId,
  });
}

// ----------------------------------------------------
// REACT QUERY HOOKS (MUTATION)
// ----------------------------------------------------

export function useCreateCampeonato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (campeonatoData: { nome: string; data: string; formato: FormatoCampeonato }) => {
      const { data } = await api.post<Campeonato>(BASE_URL, campeonatoData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campeonatos'] });
    },
  });
}

export function useIniciarCampeonato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.post(`${BASE_URL}/${id}/iniciar`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['campeonatos', id] });
      queryClient.invalidateQueries({ queryKey: ['campeonatos', id, 'partidas'] });
    },
  });
}

export function useUpdateCampeonato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Campeonato> }) => {
      const { data: updatedData } = await api.put<Campeonato>(`${BASE_URL}/${id}`, data);
      return updatedData;
    },
    onSuccess: (updatedCampeonato, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campeonatos'] });
      queryClient.invalidateQueries({ queryKey: ['campeonatos', variables.id] });
    },
  });
}

export function useDeleteCampeonato() { 
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`${BASE_URL}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campeonatos'] });
    },
  });
}

export function useFinalizarCampeonato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/campeonatos/${id}/finalizar`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['campeonatos', id] });
      queryClient.invalidateQueries({ queryKey: ['campeonatos'] });
      toast.success('Campeonato encerrado com sucesso! 🏆');
    },
  });
}