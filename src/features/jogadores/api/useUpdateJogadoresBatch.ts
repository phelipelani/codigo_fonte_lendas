// Arquivo: src/features/jogadores/api/useUpdateJogadoresBatch.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import api from '@/api';
import { getApiErrorMessage } from '@/utils/errorHandling';
import { Jogador } from '@/@types';

type PlayerUpdatePayload = {
  id: number;
  nivel?: number;
  joga_recuado?: boolean;
};

type BatchUpdatePayload = {
  originais: Jogador[];
  atualizados: Jogador[];
};

// A função de mutação que compara e envia
const updateJogadoresBatch = async ({ originais, atualizados }: BatchUpdatePayload) => {
  const promises: Promise<any>[] = [];
  
  // Lógica migrada de 'NotasJogadoresStep.jsx' [cite: 1, 249-281]
  atualizados.forEach(currentPlayer => {
    const originalPlayer = originais.find(p => p.id === currentPlayer.id);
    if (!originalPlayer) return;

    const dataToUpdate: Partial<Jogador> = {};

    const currentNivel = Number(currentPlayer.nivel) || 0; // Trata NaN/null
    const originalNivel = Number(originalPlayer.nivel) || 0;
    
    if (currentNivel !== originalNivel) {
      dataToUpdate.nivel = currentNivel;
    }

    const currentRecuado = !!currentPlayer.joga_recuado;
    const originalRecuado = !!originalPlayer.joga_recuado;

    if (currentRecuado !== originalRecuado) {
      dataToUpdate.joga_recuado = currentRecuado;
    }

    // Se houver mudanças, chama a API
    if (Object.keys(dataToUpdate).length > 0) {
      promises.push(api.put(`/jogadores/${currentPlayer.id}/details`, dataToUpdate));
    }
  });

  if (promises.length === 0) {
    toast.info("Nenhuma alteração nas notas ou posições foi detectada.");
    return { message: "Nenhuma alteração." };
  }

  await Promise.all(promises);
  return { message: `${promises.length} jogadores atualizados.` };
};

export const useUpdateJogadoresBatch = (rodadaId: number) => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string },
    AxiosError<{ message: string }>,
    BatchUpdatePayload
  >({
    mutationFn: updateJogadoresBatch,
    onSuccess: (data, variables) => {
      // Atualiza o cache dos jogadores da rodada com os novos dados
      queryClient.setQueryData(['rodadaJogadores', rodadaId], variables.atualizados);
      // Invalida o cache global de jogadores
      queryClient.invalidateQueries({ queryKey: ['jogadores'] });
      
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar alterações.'));
    },
  });
};