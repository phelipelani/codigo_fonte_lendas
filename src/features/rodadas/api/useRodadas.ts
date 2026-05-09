// Arquivo: src/features/rodadas/api/useRodadas.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/api';
import { Rodada } from '@/@types';

const fetchRodadas = async (ligaId: number): Promise<Rodada[]> => {
  // Chama a rota do backend GET /api/rodadas/liga/:liga_id
  const { data } = await api.get(`/rodadas/liga/${ligaId}`);
  return data;
};

/**
 * Hook customizado (React Query) para buscar e
 * gerenciar o cache da lista de rodadas de uma liga.
 */
export const useRodadas = (ligaId: number) => {
  return useQuery<Rodada[], Error>({
    queryKey: ['rodadas', ligaId], // Chave de cache (ex: ['rodadas', 1])
    queryFn: () => fetchRodadas(ligaId),
    enabled: !!ligaId, // Só executa se o ligaId for válido
  });
};