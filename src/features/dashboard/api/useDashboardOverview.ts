import { useQuery } from '@tanstack/react-query';
import api from '@/api';

export interface DashboardOverviewData {
  totais: {
    total_partidas: number;
    total_gols: number;
    total_jogadores: number;
    media_gols: number;
  };
  campeonato_atual: {
    id: number;
    nome: string;
    formato: string;
    status: string;
    rodada_atual: number | null;
    total_rodadas: number;
    lider: {
      time_id: number;
      nome: string;
      escudo: string | null;
      pontos: number;
    } | null;
    partidas_ultima_rodada: number;
  } | null;
  destaques: {
    mvp: {
      id: number;
      nome: string;
      foto_url: string | null;
      total: string | number;
    } | null;
    pe_de_rato: {
      id: number;
      nome: string;
      foto_url: string | null;
      total: string | number;
    } | null;
    jogador_rodada: {
      id: number;
      nome: string;
      foto_url: string | null;
      total: string | number;
    } | null;
    mvps?: Array<{
      id: number;
      nome: string;
      foto_url: string | null;
      total: string | number;
    }>;
    pes_de_rato?: Array<{
      id: number;
      nome: string;
      foto_url: string | null;
      total: string | number;
    }>;
    outros_destaques?: Array<{
      id: number;
      nome: string;
      foto_url: string | null;
      total: string | number;
      label?: string;
    }>;
  };
  ultima_rodada: {
    rodada_id: number | null;
    data: string | null;
    campeonato_nome: string | null;
    partidas: Array<{
      id: number;
      placarA: number;
      placarB: number;
      duracao_segundos: number;
      timeA: {
        id: number;
        nome: string;
        logo: string | null;
      };
      timeB: {
        id: number;
        nome: string;
        logo: string | null;
      };
    }>;
  };
  momentos: {
    maior_goleada: string | null;
    jogo_mais_gols: string | null;
  } | null;
  tendencias: {
    em_alta: Array<{
      id: number;
      nome: string;
      foto: string | null;
      pontos: number;
    }>;
    em_queda: Array<{
      id: number;
      nome: string;
      foto: string | null;
      pontos: number;
    }>;
  };
  top_jogadores: Array<{
    id: number;
    nome: string;
    foto_url: string | null;
    jogos: number;
    pontos: number;
    titulos: number;
  }>;
  campeoes: Array<{
    id: number;
    nome: string;
    escudo_url: string;
    formato: string;
    titulos: number;
    conquistas: Array<{
      nome: string;
      data: string;
    }>;
  }>;
  historia: {
    campeonatos_realizados: number;
    times_participaram: number;
    partidas_disputadas: number;
    gols_marcados: number;
    media_gols: number;
    mvps_distribuidos: number;
  };
}

export function useDashboardOverview() {
  return useQuery<DashboardOverviewData>({
    queryKey: ['dashboard', 'overview'],
    queryFn: async () => {
      const res = await api.get('/dashboard/overview');
      return res.data;
    },
    staleTime: 1000 * 60 * 3, // 3 min cache
  });
}
