// Arquivo: src/features/rodadas/api/useCreatePartida.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Partida } from '@/@types/partida';
import api from '@/api';

/**
 * Hook para criar partida vazia na rodada
 * POST /rodadas/{rodada_id}/partidas
 */
export const useCreatePartida = (rodadaId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Partida>(`/rodadas/${rodadaId}/partidas`);
      return data;
    },
    onSuccess: () => {
      // Invalida queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['rodadas', rodadaId, 'partidas'] });
    },
  });
};