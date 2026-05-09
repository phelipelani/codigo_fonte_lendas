// Arquivo: src/features/dashboard/api/useDashboardStats.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/api';

export interface DashboardStats {
  total_gols: number;
  total_jogadores: number;
  total_assistencias: number;
  total_jogos: number;
  // Se o backend mandar os próximos jogos, mapeamos aqui depois
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  // Chamando a rota que você listou
  const { data } = await api.get<DashboardStats>('/estatisticas/dashboard');
  return data;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    // Dados iniciais para não quebrar a tela enquanto carrega
    initialData: {
      total_gols: 0,
      total_jogadores: 0,
      total_assistencias: 0,
      total_jogos: 0
    }
  });
}