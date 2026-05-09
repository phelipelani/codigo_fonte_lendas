// Arquivo: src/features/jogadores/api/useUpdateJogador.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import api from '@/api';
import { getApiErrorMessage } from '@/utils/errorHandling';
import { Jogador } from '@/@types';
import { JogadorFormSchema } from '../components/JogadorForm';

// 1. Define o que a API espera
type UpdateJogadorPayload = z.infer<typeof JogadorFormSchema>;

// 2. A função de mutação
const updateJogador = async ({
  id,
  ...jogadorData
}: UpdateJogadorPayload & { id: number }): Promise<Jogador> => {
  const { data } = await api.put(`/jogadores/${id}`, jogadorData);
  return data;
};

// 3. O Hook
export const useUpdateJogador = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<
    Jogador,
    AxiosError<{ message: string }>,
    UpdateJogadorPayload & { id: number }
  >({
    mutationFn: updateJogador,
    onSuccess: (data, variables) => {
      // 1. Invalida a lista E o cache individual do jogador
      queryClient.invalidateQueries({ queryKey: ['jogadores'] });
      queryClient.invalidateQueries({ queryKey: ['jogador', variables.id.toString()] });
      
      // 2. Mostra notificação
      toast.success(`Jogador "${variables.nome}" atualizado com sucesso!`);
      
      // 3. Redireciona
      navigate('/jogadores');
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Erro ao atualizar jogador.')
      );
    },
  });
};