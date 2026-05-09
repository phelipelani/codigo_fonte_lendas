// Arquivo: src/features/rodadas/api/useGetTimes.ts
import { useQuery } from '@tanstack/react-query';
import { Jogador } from '@/@types';
import api from '@/api';

type JogadorComTime = Jogador & {
  numero_time: number;
  nome_time: string;
};

/**
 * Hook para buscar times formados na rodada
 * GET /rodadas/{rodada_id}/times
 */
export const useGetTimes = (rodadaId: number) => {
  return useQuery({
    queryKey: ['rodadas', rodadaId, 'times'],
    queryFn: async () => {
      const { data } = await api.get<JogadorComTime[]>(`/rodadas/${rodadaId}/times`);
      return data;
    },
    enabled: !!rodadaId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};