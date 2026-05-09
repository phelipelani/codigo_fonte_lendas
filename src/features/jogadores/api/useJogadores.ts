// Arquivo: src/features/jogadores/api/useJogadores.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/api';
import { Jogador } from '@/@types';

/**
 * A função que busca os dados da API
 */
const fetchJogadores = async (): Promise<Jogador[]> => {
  // Usamos o 'api' (Axios) que já tem o token automático
  const { data } = await api.get('/jogadores');
  return data;
};

/**
 * Hook customizado (React Query) para buscar e
 * gerenciar o cache da lista de jogadores.
 */
export const useJogadores = () => {
  return useQuery<Jogador[], Error>({
    queryKey: ['jogadores'], // Chave de cache do React Query
    queryFn: fetchJogadores,
  });
};