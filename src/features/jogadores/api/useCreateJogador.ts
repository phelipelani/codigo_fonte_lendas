// Arquivo: src/features/jogadores/api/useCreateJogador.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import api from '@/api';
import { getApiErrorMessage } from '@/utils/errorHandling';
import { Jogador } from '@/@types';
import { JogadorFormSchema } from '../components/JogadorForm'; // Criaremos este

// 1. Define o que a API espera
type CreateJogadorPayload = z.infer<typeof JogadorFormSchema>;

// 2. A função de mutação
const createJogador = async (jogador: CreateJogadorPayload): Promise<Jogador> => {
  const { data } = await api.post('/jogadores', jogador);
  return data;
};

// 3. O Hook
export const useCreateJogador = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<
    Jogador,
    AxiosError<{ message: string }>,
    CreateJogadorPayload
  >({
    mutationFn: createJogador,
    onSuccess: (novoJogador) => {
      // 1. Invalida o cache da lista de jogadores (para atualizar a tabela)
      queryClient.invalidateQueries({ queryKey: ['jogadores'] });
      
      // 2. Mostra notificação de sucesso
      toast.success(`Jogador "${novoJogador.nome}" criado com sucesso!`);
      
      // 3. Redireciona para a lista
      navigate('/jogadores');
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Erro ao criar jogador.')
      );
    },
  });
};