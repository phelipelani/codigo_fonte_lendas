// Arquivo: src/features/rodadas/api/useUpdateRodada.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import api from '@/api';
import { getApiErrorMessage } from '@/utils/errorHandling';
import { RodadaFormSchema } from '../components/RodadaForm';
import { Rodada } from '@/@types';

type UpdateRodadaPayload = z.infer<typeof RodadaFormSchema>;

const updateRodada = async ({
  rodadaId,
  ...rodadaData
}: UpdateRodadaPayload & { rodadaId: number }): Promise<{ message: string }> => {
  const { data } = await api.put(`/rodadas/${rodadaId}`, rodadaData);
  return data;
};

export const useUpdateRodada = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string },
    AxiosError<{ message: string }>,
    UpdateRodadaPayload & { rodadaId: number; ligaId: number }
  >({
    mutationFn: updateRodada,
    onSuccess: (data, variables) => {
      // Invalida a lista de rodadas da liga
      queryClient.invalidateQueries({ queryKey: ['rodadas', variables.ligaId] });
      toast.success(data.message || `Rodada atualizada com sucesso!`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Erro ao atualizar rodada.'));
    },
  });
};