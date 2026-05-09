// Arquivo: src/@types/partida.ts
import { Jogador } from './index';

/**
 * Time na rodada (retornado por GET /rodadas/{id}/times)
 */
export type TimeNaRodada = {
  numero_time: number; // 1, 2, 3, 4
  nome_time: string; // "Amarelo", "Preto", "Azul", "Rosa"
  jogadores: (Jogador & {
    numero_time: number;
    nome_time: string;
  })[];
};

/**
 * Evento de jogo (gol, assistência, gol contra)
 */
export type EventoJogo = {
  id?: number;
  tipo_evento: 'gol' | 'assistencia' | 'gol_contra';
  jogador_id: number;
  time_id: number; // 1 ou 2 (qual time na partida)
  tempo_segundos: number;
  evento_pai_id?: number | null; // Link para assistência
};

/**
 * Partida criada (retorno de POST /rodadas/{id}/partidas)
 */
export type Partida = {
  id: number;
  rodada_id: number;
  data: string;
  placar_time1?: number;
  placar_time2?: number;
  duracao_segundos?: number;
  time1_numero?: number;
  time2_numero?: number;
  goleiro_time1_id?: number | null;
  goleiro_time2_id?: number | null;
};

/**
 * Payload para salvar resultado da partida
 */
export type SalvarResultadoPayload = {
  placar1: number;
  placar2: number;
  duracao: number; // em segundos
  time1_numero: number; // 1, 2, 3, ou 4
  time2_numero: number;
  goleiro_time1_id: number | null;
  goleiro_time2_id: number | null;
  time1: Array<{
    id: number;
    gols: number;
    assistencias: number;
  }>;
  time2: Array<{
    id: number;
    gols: number;
    assistencias: number;
  }>;
  eventos?: EventoJogo[]; // Opcional: para salvar eventos detalhados
};

/**
 * Estado do jogador durante a partida (frontend)
 */
export type JogadorEmPartida = Jogador & {
  gols: number;
  assistencias: number;
};

/**
 * Time durante a partida (frontend)
 */
export type TimeEmPartida = {
  numero: number; // 1, 2, 3, 4 (da rodada)
  nome: string; // "Amarelo", "Preto", etc
  goleiro_id: number | null;
  jogadores: JogadorEmPartida[];
};

/**
 * Configuração visual de cada time
 */
export type TeamConfig = {
  nome: string;
  primary: string;
  border: string;
  bg: string;
  text: string;
  badgeBg: string;
  badgeText: string;
  logo?: string;
};