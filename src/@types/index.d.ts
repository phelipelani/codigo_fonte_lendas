// Arquivo: src/@types/index.d.ts (VERSÃO ATUALIZADA)

/**
 * Define o formato do objeto de Usuário
 * (Baseado no components.schemas.Usuario do swagger)
 */
export type Usuario = {
  id: number;
  username?: string;
  name?: string;
  email?: string | null;
  role: "admin" | "user";
  fotoUrl?: string | null;
  jogadorId?: number | null;
  jogador_id?: number | null;
  tem_conta_ativa?: boolean;
};

export interface JogadorNoTime {
  id: number;
  nome: string;
  posicao: string;
  nivel?: number;
  jogarRecuado?: boolean;
  joga_recuado?: boolean;
  foto_url?: string | null;
  fotoUrl?: string | null;
  avatarUrl?: string | null;
  isCapitao?: boolean;
  is_capitao: boolean;
  isPeDeRato?: boolean;
  is_pe_de_rato: boolean;
}

/**
 * Define o formato do objeto de Jogador
 * (Baseado no components.schemas.Jogador do swagger)
 *
 * ATUALIZAÇÃO: Agora inclui dados do usuário vinculado
 */
export type Jogador = {
  id: number;
  nome: string;
  joga_recuado: boolean;
  jogarRecuado?: boolean;
  nivel: number;
  posicao: "linha" | "goleiro";
  foto_url: string | null;
  fotoUrl?: string | null;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  usuarioId?: number | null;
  usuario?: {
    role: "admin" | "user";
    tem_conta_ativa: boolean;
  } | null;
  times?: Array<{
    id: number;
    nome: string;
    logoUrl?: string | null;
    logo_url?: string | null;
    isCapitao: boolean;
    isPeDeRato: boolean;
  }>;
};

/**
 * Define o formato do objeto de Liga
 * (Baseado no schemas.yaml)
 */
export type Liga = {
  id: number;
  nome: string;
  data_inicio: string;
  data_fim: string;
  finalizada_em?: string | null; // ← ADICIONADO
};

/**
 * Define o formato do objeto de Rodada
 * (Baseado no schemas.yaml)
 */
export type Rodada = {
  id: number;
  liga_id: number;
  data: string;
  status: "aberta" | "finalizada";
};

/**
 * Define o formato esperado para os Eventos de Partida
 * (Baseado no components.schemas.EventoInput do swagger)
 */
export type EventoInput = {
  tipo_evento: "gol" | "gol_contra";
  jogador_id: number;
  tempo_segundos: number;
  assist_por_jogador_id?: number | null;
};

// ============================================
// NOVOS TYPES - SISTEMA DE CONVITES
// ============================================

/**
 * Define o formato do objeto de Convite
 * (Retornado ao gerar um convite)
 */
export type Convite = {
  id: number;
  token: string;
  link: string;
  expira_em: string;
  tipo_usuario: "user" | "admin";
  jogador: {
    id: number;
    nome: string;
    foto_url?: string | null;
  };
};

/**
 * Define o formato da resposta ao gerar um convite
 */
export type GerarConviteResponse = {
  message: string;
  convite: Convite;
};

/**
 * Define o formato da resposta ao validar um convite
 */
export type ValidarConviteResponse = {
  message: string;
  convite: {
    jogador_id: number;
    jogador_nome: string;
    jogador_foto?: string | null;
    expira_em: string;
  };
};

/**
 * Define o formato da resposta ao ativar uma conta
 */
export type AtivarContaResponse = {
  message: string;
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
    jogador_id: number;
    jogador_nome: string;
  };
};


// ============================================
// NOVOS TYPES - CAMPEONATOS E TIMES (Adicionados)
// ============================================

export type FormatoCampeonato = 'mata-mata' | 'grupos' | 'liga';
export type FaseCampeonato = 'inscricao' | 'grupos' | 'oitavas' | 'quartas' | 'semifinal' | 'finalizada';
export type StatusPartida = 'pendente' | 'em_andamento' | 'finalizada';

export interface Time {
  id: number;
  nome: string;
  logo_url?: string | null;
  logoUrl?: string | null;
  criadoEm?: string | null;
  nome_capitao?: string | null;
  jogadores?: JogadorNoTime[];
}

export interface Campeonato {
  id: number;
  nome: string;
  data: string; // Data da criação/início
  formato: FormatoCampeonato;
  fase_atual: FaseCampeonato;
  time_campeao_id?: number | null;
  time_campeao_nome?: string;
}

export interface CampeonatoPartida {
  id: number;
  campeonato_id: number;
  fase: FaseCampeonato;
  timeA_id: number;
  timeA_nome: string;
  timeA_logo_url?: string | null;
  timeB_id: number;
  timeB_nome: string;
  timeB_logo_url?: string | null;
  
  placar_timeA?: number | null;
  placar_timeB?: number | null;
  placar_penaltis_timeA?: number | null;
  placar_penaltis_timeB?: number | null;
  duracao_segundos?: number | null;
  goleiro_timeA_id?: number | null;
  goleiro_timeB_id?: number | null;
  status: StatusPartida;
}