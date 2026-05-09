// Arquivo: src/features/rodadas/api/useDeleteRodada.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import api from '@/api';
import { getApiErrorMessage } from '@/utils/errorHandling';

const deleteRodada = async (id: number): Promise<{ message: string }> => {
  const { data } = await api.delete(`/rodadas/${id}`);
  return data;
};

export const useDeleteRodada = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string },
    AxiosError<{ message: string }>,
    { rodadaId: number; ligaId: number }
  >({
    mutationFn: ({ rodadaId }) => deleteRodada(rodadaId),
    onSuccess: (data, variables) => {
      // Invalida a lista de rodadas da liga
      queryClient.invalidateQueries({ queryKey: ['rodadas', variables.ligaId] });
      toast.success(data.message || 'Rodada deletada com sucesso!');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Erro ao deletar rodada.'));
    },
  });
};