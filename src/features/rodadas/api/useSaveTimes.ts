// Arquivo: src/features/rodadas/api/useSaveTimes.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import api from '@/api';
import { getApiErrorMessage } from '@/utils/errorHandling';

// 1. Define o tipo de Time que o formulário manual vai gerar
export type TimeManual = {
  nome: string;
  jogadores: Jogador[];
  pontuacaoTotal: number;
};

// 2. Define o payload que a API espera (baseado em rodadaRoutes.js)
type SaveTimesPayload = {
  times: {
    nome: string;
    jogadores: { id: number }[];
  }[];
};

const saveTimes = async ({
  rodadaId,
  payload,
}: {
  rodadaId: number;
  payload: SaveTimesPayload;
}): Promise<{ message: string }> => {
  const { data } = await api.post(`/rodadas/${rodadaId}/times`, payload);
  return data;
};

export const useSaveTimes = (rodadaId: number) => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string },
    AxiosError<{ message: string }>,
    SaveTimesPayload
  >({
    mutationFn: (payload) => saveTimes({ rodadaId, payload }),
    onSuccess: (data) => {
      // Invalida o cache de 'timesSorteados' (para o Step 4)
      queryClient.invalidateQueries({ queryKey: ['timesSorteados', rodadaId] });
      queryClient.invalidateQueries({ queryKey: ['rodadas', rodadaId, 'times'] });
      toast.success(data.message || 'Times salvos com sucesso!');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar os times.'));
    },
  });
};

// Importação que faltava (global)
import { Jogador } from '@/@types';