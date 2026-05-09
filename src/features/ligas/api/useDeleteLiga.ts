// Arquivo: src/features/ligas/api/useDeleteLiga.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import api from '@/api';
import { getApiErrorMessage } from '@/utils/errorHandling';

const deleteLiga = async (id: number): Promise<{ message: string }> => {
  const { data } = await api.delete(`/ligas/${id}`);
  return data;
};

export const useDeleteLiga = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, AxiosError<{ message: string }>, number>({
    mutationFn: deleteLiga,
    onSuccess: (data, id) => {
      // Remove a liga do cache de 'ligas'
      queryClient.invalidateQueries({ queryKey: ['ligas'] });
      toast.success(data.message || 'Liga deletada com sucesso!');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Erro ao deletar liga.'));
    },
  });
};