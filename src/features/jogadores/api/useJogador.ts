// Arquivo: src/features/jogadores/api/useJogador.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/api';
import { Jogador } from '@/@types';

const fetchJogador = async (id: string | number): Promise<Jogador> => {
  const { data } = await api.get(`/jogadores/${id}`);
  return data;
};

/**
 * Hook customizado (React Query) para buscar os dados
 * de um único jogador pelo ID.
 */
export const useJogador = (id: string | number) => {
  return useQuery<Jogador, Error>({
    queryKey: ['jogador', String(id)],
    queryFn: () => fetchJogador(id),
    enabled: !!id,
  });
};