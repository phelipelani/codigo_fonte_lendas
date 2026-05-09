// Arquivo: src/features/ligas/api/useCreateLiga.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { z } from 'zod';
import { toast } from 'sonner';
import api from '@/api';
import { getApiErrorMessage } from '@/utils/errorHandling';
import { Liga } from './useLigas';
import { LigaFormSchema } from '../components/LigaForm';

type CreateLigaPayload = z.infer<typeof LigaFormSchema>;

const createLiga = async (liga: CreateLigaPayload): Promise<Liga> => {
  const { data } = await api.post('/ligas', liga);
  return data.liga; // O backend retorna um objeto { message, liga }
};

export const useCreateLiga = () => {
  const queryClient = useQueryClient();

  return useMutation<Liga, AxiosError<{ message: string }>, CreateLigaPayload>({
    mutationFn: createLiga,
    onSuccess: (novaLiga) => {
      // Atualiza o cache da lista de 'ligas'
      queryClient.invalidateQueries({ queryKey: ['ligas'] });
      toast.success(`Liga "${novaLiga.nome}" criada com sucesso!`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Erro ao criar liga.'));
    },
  });
};