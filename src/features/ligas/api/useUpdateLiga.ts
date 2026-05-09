// Arquivo: src/features/ligas/api/useUpdateLiga.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { z } from 'zod';
import { toast } from 'sonner';
import api from '@/api';
import { getApiErrorMessage } from '@/utils/errorHandling';
import { Liga } from './useLigas';
import { LigaFormSchema } from '../components/LigaForm';

type UpdateLigaPayload = z.infer<typeof LigaFormSchema>;

const updateLiga = async ({
  id,
  ...ligaData
}: UpdateLigaPayload & { id: number }): Promise<{ message: string }> => {
  const { data } = await api.put(`/ligas/${id}`, ligaData);
  return data;
};

export const useUpdateLiga = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string },
    AxiosError<{ message: string }>,
    UpdateLigaPayload & { id: number }
  >({
    mutationFn: updateLiga,
    onSuccess: (data, variables) => {
      // Invalida a lista de ligas E o cache da liga individual
      queryClient.invalidateQueries({ queryKey: ['ligas'] });
      queryClient.invalidateQueries({ queryKey: ['ligas', variables.id] });
      
      toast.success(data.message || `Liga "${variables.nome}" atualizada com sucesso!`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Erro ao atualizar liga.'));
    },
  });
};