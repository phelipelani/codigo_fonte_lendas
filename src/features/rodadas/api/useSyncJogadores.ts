// Arquivo: src/features/rodadas/api/useSyncJogadores.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import api from '@/api';
import { getApiErrorMessage } from '@/utils/errorHandling';
import { Jogador } from '@/@types';

// O que a API espera: { nomes: ["Jogador A", "Jogador B"] }
type SyncPayload = {
  nomes: string[];
};

// O que a API retorna: { jogadores: Jogador[], novos: number, existentes: number }
type SyncResponse = {
  jogadores: Jogador[];
  novos: number;
  existentes: number;
};

const syncJogadores = async ({
  rodadaId,
  nomes,
}: SyncPayload & { rodadaId: number }): Promise<SyncResponse> => {
  const { data } = await api.post(`/rodadas/${rodadaId}/sync-jogadores`, { nomes });
  return data;
};

export const useSyncJogadores = (rodadaId: number) => {
  const queryClient = useQueryClient();

  return useMutation<
    SyncResponse,
    AxiosError<{ message: string }>,
    SyncPayload
  >({
    mutationFn: (payload) => syncJogadores({ ...payload, rodadaId }),
    onSuccess: (data) => {
      // Atualiza o cache de 'rodadaJogadores' com os novos dados
      queryClient.setQueryData(['rodadaJogadores', rodadaId], data.jogadores);
      
      // Invalida a lista de jogadores (caso novos tenham sido criados)
      queryClient.invalidateQueries({ queryKey: ['jogadores'] });
      
      toast.success(
        `${data.jogadores.length} jogadores sincronizados!`,
        { description: `${data.novos} novos | ${data.existentes} existentes.` }
      );
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Erro ao sincronizar jogadores.')
      );
    },
  });
};