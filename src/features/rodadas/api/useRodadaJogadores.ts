// Arquivo: src/features/rodadas/api/useRodadaJogadores.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/api';
import { Jogador } from '@/@types';

// A API retorna a lista de jogadores da rodada
const fetchRodadaJogadores = async (rodadaId: number): Promise<Jogador[]> => {
  const { data } = await api.get(`/rodadas/${rodadaId}/jogadores`);
  return data;
};

/**
 * Hook para buscar a lista de jogadores JÁ CONFIRMADOS em uma rodada.
 */
export const useRodadaJogadores = (rodadaId: number) => {
  return useQuery<Jogador[], Error>({
    queryKey: ['rodadaJogadores', rodadaId], // Chave de cache
    queryFn: () => fetchRodadaJogadores(rodadaId),
    enabled: !!rodadaId,
  });
};