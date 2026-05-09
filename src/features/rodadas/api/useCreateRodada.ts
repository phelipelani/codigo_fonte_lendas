// Arquivo: src/features/rodadas/api/useCreateRodada.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import api from '@/api';
import { getApiErrorMessage } from '@/utils/errorHandling';
import { Rodada } from '@/@types';
import { RodadaFormSchema } from '../components/RodadaForm';

type CreateRodadaPayload = z.infer<typeof RodadaFormSchema>;

const createRodada = async ({
  ligaId,
  ...rodadaData
}: CreateRodadaPayload & { ligaId: number }): Promise<Rodada> => {
  const { data } = await api.post(`/rodadas/liga/${ligaId}`, rodadaData);
  return data;
};

export const useCreateRodada = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Rodada,
    AxiosError<{ message: string }>,
    CreateRodadaPayload & { ligaId: number }
  >({
    mutationFn: createRodada,
    onSuccess: (novaRodada) => {
      // --- CORREÇÃO APLICADA AQUI ---
      // Invalidamos a raiz 'rodadas'. Isso força o refetch de
      // qualquer query que comece com ['rodadas'], como ['rodadas', 1].
      queryClient.invalidateQueries({ queryKey: ['rodadas'] });
      // --- FIM DA CORREÇÃO ---

      toast.success(`Rodada de ${new Date(novaRodada.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} criada com sucesso!`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Erro ao criar rodada.'));
    },
  });
};