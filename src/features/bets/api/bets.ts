import api from '@/api';

export interface OpcaoBet {
  id: number;
  mercado_id: number;
  descricao: string;
  regra_condicao: string;
  regra_valor: string;
  odd: string;
}

export interface MercadoBet {
  id: number;
  campeonato_id: number;
  rodada_id: number;
  titulo: string;
  regra_categoria: string;
  regra_alvo_id: number;
  status: string;
  imagem?: string;
  alvo_nome?: string;
  opcoes: OpcaoBet[];
}

export interface CarteiraBet {
  id: number;
  usuario_id: number;
  saldo: string;
  lucro_prejuizo_total: string;
}

export const betsApi = {
  getCarteira: async (): Promise<CarteiraBet> => {
    const response = await api.get('/bets/carteira');
    return response.data;
  },

  getMercados: async (campeonatoId: number, rodadaId: number): Promise<MercadoBet[]> => {
    const response = await api.get('/bets/mercados', {
      params: { campeonato_id: campeonatoId, rodada_id: rodadaId }
    });
    return response.data;
  },

  getHistorico: async () => {
    const response = await api.get('/bets/historico');
    return response.data;
  },

  getRanking: async () => {
    const response = await api.get('/bets/ranking');
    return response.data;
  },

  fazerAposta: async (valor: number, opcoes: number[]): Promise<{ success: boolean; bilhete_id: number; novo_saldo: number; error?: string }> => {
    const response = await api.post('/bets/apostar', { valor, opcoes });
    return response.data;
  },

  adminAddSaldo: async (usuarioId: number, valor: number) => {
    const response = await api.post('/bets/admin/add-saldo', { usuario_id: usuarioId, valor });
    return response.data;
  },

  adminApurarRodada: async (rodadaId: number) => {
    const response = await api.post(`/bets/admin/apurar/${rodadaId}`);
    return response.data;
  },
  
  adminCriarMercadoGols: async (campeonatoId: number, rodadaId: number, timeId: number, nomeTime: string) => {
    const response = await api.post('/bets/admin/criar-mercado', {
        campeonato_id: campeonatoId,
        rodada_id: rodadaId,
        time_id: timeId,
        nome_time: nomeTime
    });
    return response.data;
  },

  adminCriarMercadoGoleiro: async (campeonatoId: number, rodadaId: number, goleiroId: number, nomeGoleiro: string) => {
    const response = await api.post('/bets/admin/criar-mercado-goleiro', {
        campeonato_id: campeonatoId,
        rodada_id: rodadaId,
        goleiro_id: goleiroId,
        nome_goleiro: nomeGoleiro
    });
    return response.data;
  },

  adminCriarMercadoGenerico: async (data: { campeonato_id?: number, rodada_id?: number, alvo_id: number, tipo_alvo: 'time' | 'goleiro', categoria: string, nome_alvo: string }) => {
    const response = await api.post('/bets/admin/mercados/novo', data);
    return response.data;
  },

  adminGetStatsTimes: async () => {
    const response = await api.get('/bets/admin/stats-times');
    return response.data;
  },

  adminGetStatsGoleiros: async () => {
    const response = await api.get('/bets/admin/stats-goleiros');
    return response.data;
  },

  adminGetMercados: async () => {
    const response = await api.get('/bets/admin/mercados');
    return response.data;
  },

  adminExcluirMercado: async (id: number) => {
    const response = await api.delete(`/bets/admin/mercados/${id}`);
    return response.data;
  },

  adminAtualizarMercadoStatus: async (id: number, status: string) => {
    const response = await api.put(`/bets/admin/mercados/${id}/status`, { status });
    return response.data;
  },

  adminAtualizarOpcao: async (id: number, odd: string) => {
    const response = await api.put(`/bets/admin/opcoes/${id}`, { odd });
    return response.data;
  }
};
