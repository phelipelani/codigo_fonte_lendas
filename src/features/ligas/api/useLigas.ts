// Arquivo: src/features/ligas/api/useLigas.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/api';

// 1. Define o tipo de dado (baseado no schemas.yaml )
export type Liga = {
  id: number;
  nome: string;
  data_inicio: string;
  data_fim: string;
  finalizada_em?: string | null;
};

// 2. A função de busca
const fetchLigas = async (): Promise<Liga[]> => {
  const { data } = await api.get('/ligas');
  return data;
};

// 3. O Hook
export const useLigas = () => {
  return useQuery<Liga[], Error>({
    queryKey: ['ligas'], // Chave de cache
    queryFn: fetchLigas,
  });
};


const fetchLiga = async (id: number): Promise<Liga> => {
  const { data } = await api.get(`/ligas/${id}`);
  return data;
};

/**
 * Hook customizado (React Query) para buscar os dados
 * de uma única liga pelo ID.
 */
export const useLiga = (id: number) => {
  return useQuery<Liga, Error>({
    queryKey: ['ligas', id], // Chave de cache única (ex: ['ligas', 1])
    queryFn: () => fetchLiga(id),
    enabled: !!id, // Só executa a query se o ID for válido
  });
};