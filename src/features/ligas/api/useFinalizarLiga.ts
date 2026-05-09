// Arquivo: src/features/ligas/api/useFinalizarLiga.ts (NOVO)

import { AxiosError } from 'axios';
import { toast } from 'sonner';
import api from '@/api';
import { getApiErrorMessage } from '@/utils/errorHandling';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const finalizarLiga = async (ligaId: number): Promise<{ message: string }> => {
  const { data } = await api.post(`/ligas/${ligaId}/finalizar`);
  return data;
};

export const useFinalizarLiga = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, AxiosError<{ message: string }>, number>({
    mutationFn: finalizarLiga,
    onSuccess: (data, ligaId) => {
      // Invalida cache da lista e da liga específica
      queryClient.invalidateQueries({ queryKey: ['ligas'] });
      queryClient.invalidateQueries({ queryKey: ['ligas', ligaId] });
      
      toast.success(data.message || 'Liga finalizada com sucesso!');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Erro ao finalizar liga.'));
    },
  });
};