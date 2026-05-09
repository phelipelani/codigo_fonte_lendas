// Arquivo: src/features/rodadas/api/useCampeonatoRodadas.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api';
import { Rodada } from '@/@types';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/utils/errorHandling';

export interface ElencoItem {
  vinculo_id: number;
  time_id: number;
  nome_time: string;
  logo_time: string | null;
  jogador_id: number;
  nome_jogador: string;
  posicao: string;
  nivel: number;
  foto_url: string | null;
  is_capitao: boolean; 
}

async function fetchRodadasCampeonato(campeonatoId: number): Promise<Rodada[]> {
  const { data } = await api.get(`/rodadas/campeonato/${campeonatoId}`);
  return data;
}

async function fetchElencoRodada(rodadaId: number): Promise<ElencoItem[]> {
  const { data } = await api.get(`/rodadas/${rodadaId}/elenco`);
  return data;
}

export function useRodadasDoCampeonato(campeonatoId: number) {
  return useQuery<Rodada[], Error>({
    queryKey: ['rodadas', 'campeonato', campeonatoId],
    queryFn: () => fetchRodadasCampeonato(campeonatoId),
    enabled: !!campeonatoId,
  });
}

export function useElencoRodada(rodadaId: number) {
  // Garante que rodadaId é number para consistência na queryKey
  const id = Number(rodadaId);
  return useQuery<ElencoItem[], Error>({
    queryKey: ['rodada', id, 'elenco'],
    queryFn: () => fetchElencoRodada(id),
    enabled: !!id && !isNaN(id),
    staleTime: 0,        // sempre considera stale → re-fetcha ao montar/navegar
    gcTime: 0,           // não mantém cache após desmontar
  });
}

export function useCreateRodadaCampeonato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ campeonatoId, data }: { campeonatoId: number; data: string }) => {
      const res = await api.post(`/rodadas/campeonato/${campeonatoId}`, { data });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rodadas', 'campeonato', variables.campeonatoId] });
      toast.success('Rodada criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'Erro ao criar rodada.'));
    }
  });
}

export function useDeleteRodadaCampeonato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rodadaId: number) => {
      await api.delete(`/rodadas/${rodadaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rodadas'] });
      toast.success('Rodada excluída com sucesso.');
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'Erro ao excluir rodada.'));
    }
  });
}

export function useUpdateRodadaCampeonato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rodadaId, data }: { rodadaId: number; data: Partial<Rodada> }) => {
      const res = await api.put(`/rodadas/${rodadaId}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rodadas'] });
      toast.success('Rodada atualizada!');
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'Erro ao atualizar rodada.'));
    }
  });
}

interface SubstituicaoPayload {
  rodadaId: number;
  timeId: number;
  jogadorSaiId: number;
  jogadorEntraId: number;
}

export function useSubstituirJogador() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rodadaId, timeId, jogadorSaiId, jogadorEntraId }: SubstituicaoPayload) => {
      const res = await api.post(`/rodadas/${rodadaId}/substituicao`, {
        time_id: timeId,
        jogador_sai_id: jogadorSaiId,
        jogador_entra_id: jogadorEntraId
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      const rodadaId = Number(variables.rodadaId);
      // Remove o cache completamente e força re-fetch na próxima montagem
      queryClient.removeQueries({ queryKey: ['rodada', rodadaId, 'elenco'] });
      queryClient.invalidateQueries({ queryKey: ['rodada', rodadaId] });
      toast.success('Substituição realizada!');
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'Erro ao substituir jogador.'));
    }
  });
}

interface SalvarPartidaPayload {
  rodadaId: number;
  timeA_id: number;
  timeB_id: number;
  placar_timeA: number;
  placar_timeB: number;
  duracao_segundos: number;
  goleiro_timeA_id: number | null;
  goleiro_timeB_id: number | null;
  timeA_jogadores: any[];
  timeB_jogadores: any[];
  eventos: any[]; 
}

export function useSalvarPartidaCampeonato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SalvarPartidaPayload) => {
      const res = await api.post(`/campeonatos/rodada/${data.rodadaId}/partida`, data);
      return res.data;
    },
    onSuccess: (_, vars) => {
      const rodadaId = Number(vars.rodadaId);
      queryClient.invalidateQueries({ queryKey: ['rodada', rodadaId] });
      queryClient.invalidateQueries({ queryKey: ['rodada', rodadaId, 'elenco'] });
      toast.success('Partida salva com sucesso!');
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar partida.'));
    }
  });
}

export function useFinalizarRodada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rodadaId }: { rodadaId: number }) => {
      const res = await api.post(`/rodadas/${rodadaId}/finalizar`);
      return res.data;
    },
    onSuccess: (_, variables) => {
      const rodadaId = Number(variables.rodadaId);
      
      queryClient.invalidateQueries({ queryKey: ['rodadas'] });
      queryClient.invalidateQueries({ queryKey: ['campeonatos'] }); 
      queryClient.invalidateQueries({ queryKey: ['rodada', rodadaId] });
      queryClient.invalidateQueries({ queryKey: ['rodada', rodadaId, 'elenco'] });
      
      toast.success('Rodada finalizada e prêmios calculados!');
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'Erro ao finalizar rodada.'));
    }
  });
}