// Arquivo: src/features/jogadores/api/useGerarConvite.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import api from '@/api';
import { getApiErrorMessage } from '@/utils/errorHandling';
import { Convite } from '@/@types';

type GerarConvitePayload = {
  jogador_id: number;
  tipo_usuario?: 'user' | 'admin';
};

type GerarConviteResponse = {
  message: string;
  convite: Convite;
};

const gerarConvite = async (payload: GerarConvitePayload): Promise<GerarConviteResponse> => {
  const { data } = await api.post('/auth/convite/gerar', payload);
  return data;
};

export const useGerarConvite = () => {
  const queryClient = useQueryClient();

  return useMutation<
    GerarConviteResponse,
    AxiosError<{ message: string }>,
    GerarConvitePayload
  >({
    mutationFn: gerarConvite,
    onSuccess: (data) => {
      // Invalida o cache de jogadores para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['jogadores'] });
      
      // Feedback visual
      toast.success('Convite gerado com sucesso!');
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Erro ao gerar convite.')
      );
    },
  });
};