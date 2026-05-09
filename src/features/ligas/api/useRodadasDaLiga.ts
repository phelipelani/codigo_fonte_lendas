// Arquivo: src/features/ligas/api/useRodadasDaLiga.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/api';
import { Rodada } from '@/@types';

const fetchRodadasDaLiga = async (ligaId: number): Promise<Rodada[]> => {
  const { data } = await api.get(`/rodadas/liga/${ligaId}`);
  return data;
};

/**
 * Hook para buscar as rodadas de uma liga específica
 * Usado para mostrar contador de rodadas nos cards
 */
export const useRodadasDaLiga = (ligaId: number) => {
  return useQuery<Rodada[], Error>({
    queryKey: ['rodadas', 'liga', ligaId],
    queryFn: () => fetchRodadasDaLiga(ligaId),
    enabled: !!ligaId,
  });
};