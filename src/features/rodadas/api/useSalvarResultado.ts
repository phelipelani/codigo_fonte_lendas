// Arquivo: src/features/rodadas/api/useSalvarResultado.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { SalvarResultadoPayload } from '@/@types/partida';
import api from '@/api';

/**
 * Hook para salvar resultado da partida
 * PUT /partidas/{partida_id}/resultados
 */
export const useSalvarResultado = (partidaId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SalvarResultadoPayload) => {
      const { data } = await api.put(`/partidas/${partidaId}/resultados`, payload);
      return data;
    },
    onSuccess: () => {
      // Invalida queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['partidas', partidaId] });
      queryClient.invalidateQueries({ queryKey: ['rodadas'] });
    },
  });
};