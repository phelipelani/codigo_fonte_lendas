// Arquivo: src/@types/cartolendas.ts
// Tipos para todas as respostas da API Cartolendas

// ── Tipos base reutilizáveis ────────────────────────────────

/** Tipo de posição para cores e lógica do Cartolendas */
export type PosicaoTipo = 'goleiro' | 'zagueiro' | 'linha';

/** Retorna o tipo de posição baseado na string e flag joga_recuado */
export function getPosicaoTipo(posicao: string, jogaRecuado?: boolean | number): PosicaoTipo {
  if (posicao === 'goleiro') return 'goleiro';
  if (jogaRecuado) return 'zagueiro';
  return 'linha';
}

/** Cores por posição (Tailwind classes) */
export const POSICAO_CORES: Record<PosicaoTipo, { bg: string; text: string; border: string; label: string }> = {
  goleiro:  { bg: 'bg-blue-500',    text: 'text-blue-400',    border: 'border-blue-500',    label: 'GOL' },
  zagueiro: { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500', label: 'ZAG' },
  linha:    { bg: 'bg-red-500',     text: 'text-red-400',     border: 'border-red-500',     label: 'ATA/MEI' },
};

export interface JogadorBase {
  id: number;
  nome: string;
  foto_url: string | null;
  avatar_url: string | null;
  posicao: string;
  joga_recuado?: number;
}

export interface JogadorComPreco extends JogadorBase {
  usuario_id: number;
  preco: number;
  media_pontos: number;
  variacao: number;
}

// ── GET /cartolendas/mercado/:rodadaId ──────────────────────

export type MercadoJogador = JogadorComPreco;

// ── GET /cartolendas/meu-time/:rodadaId ─────────────────────

export interface EscalacaoJogador {
  jogador_id: number;
  eh_reserva: number;
  posicao: string;
  preco_na_escalacao: number;
  pontos_obtidos: number;
  preco_apos_rodada: number;
  nome: string;
  foto_url: string | null;
  avatar_url: string | null;
  posicao_real: string;
  preco_atual: number;
  media_pontos: number;
  variacao: number;
}

export interface MeuTimeResponse {
  escalacao: EscalacaoJogador[];
  capitao_id: number | null;
  orcamento_gasto: number;
  total_pontos: number;
  calculado?: number;
  verba_tecnico: number;
}

// ── GET /cartolendas/ranking ────────────────────────────────

export interface RankingEntry {
  usuario_id: number;
  pontos_total: number;
  lendas_coins: number;
  divisao: string;
  rodadas_jogadas: number;
  melhor_rodada_pts: number;
  patrimonio: number;
  username: string;
  jogador_nome: string | null;
  foto_url: string | null;
  avatar_url: string | null;
  posicao: number;
}

// ── GET /cartolendas/historico ───────────────────────────────

export interface HistoricoRodada {
  rodada_id: number;
  total_pontos: number;
  orcamento_gasto: number;
  calculado: number;
  patrimonio: number;
  data: string;
  status: string;
  total_jogadores: number;
}

// ── GET /cartolendas/stats/mercado ────────────────��─────────

export interface JogadorPrecoInfo {
  id: number;
  nome: string;
  foto_url: string | null;
  posicao: string;
  preco: number;
  media_pontos: number;
  variacao: number;
}

export interface StatsMercadoResponse {
  rodada_referencia: number;
  mais_caro: JogadorPrecoInfo | null;
  mais_barato: JogadorPrecoInfo | null;
  maiores_altas: JogadorPrecoInfo[];
  maiores_quedas: JogadorPrecoInfo[];
  estatisticas: {
    total_jogadores: number;
    preco_medio: number;
    preco_maximo: number;
    preco_minimo: number;
  } | null;
}

// ── GET /cartolendas/escalacao-tecnico/:rodadaId/:userId ────

export interface EscalacaoTecnicoJogador {
  jogador_id: number;
  eh_reserva: number;
  posicao: string;
  preco_na_escalacao: number;
  pontos_obtidos: number;
  preco_apos: number;
  nome: string;
  foto_url: string | null;
  avatar_url: string | null;
  posicao_real: string;
  preco_atual: number;
  variacao: number;
}

export interface TecnicoInfo {
  id: number;
  username: string;
  jogador_nome: string | null;
  foto_url: string | null;
  avatar_url: string | null;
  pontos_total: number;
  divisao: string;
  patrimonio_global: number;
}

export interface EscalacaoTecnicoResponse {
  escalacao: EscalacaoTecnicoJogador[];
  capitao_id: number | null;
  total_pontos: number;
  orcamento_gasto: number;
  patrimonio: number;
  calculado: number;
  tecnico: TecnicoInfo | null;
  message?: string;
}

// ── GET /cartolendas/ranking-rodada/:rodadaId ───────────────

export interface RankingRodadaEntry {
  usuario_id: number;
  total_pontos: number;
  orcamento_gasto: number;
  patrimonio: number;
  username: string;
  jogador_nome: string | null;
  foto_url: string | null;
  avatar_url: string | null;
  divisao: string;
  posicao: number;
}

// ── GET /cartolendas/ranking-jogadores ─────────────���────────

/** Quando escopo=rodada, tipo=pontos */
export interface RankingJogadorPontosRodada {
  id: number;
  nome: string;
  foto_url: string | null;
  avatar_url: string | null;
  posicao: string;
  pontos: number;
  preco: number;
  variacao: number;
  media_pontos: number;
}

/** Quando escopo=rodada, tipo=valorizacao */
export interface RankingJogadorValorizacaoRodada {
  id: number;
  nome: string;
  foto_url: string | null;
  avatar_url: string | null;
  posicao: string;
  variacao: number;
  preco: number;
  pontos_rodada: number;
  media_pontos: number;
}

/** Quando escopo=geral, tipo=pontos */
export interface RankingJogadorPontosGeral {
  id: number;
  nome: string;
  foto_url: string | null;
  avatar_url: string | null;
  posicao: string;
  total_pontos: number;
  rodadas_jogadas: number;
  media_pontos: number;
  preco_atual: number;
}

/** Quando escopo=geral, tipo=valorizacao */
export interface RankingJogadorValorizacaoGeral {
  id: number;
  nome: string;
  foto_url: string | null;
  avatar_url: string | null;
  posicao: string;
  preco_atual: number;
  valorizacao_total: number;
  total_pontos: number;
  rodadas_jogadas: number;
  media_pontos: number;
}

/** Union type para ranking de jogadores (varia conforme params) */
export type RankingJogadorEntry =
  | RankingJogadorPontosRodada
  | RankingJogadorValorizacaoRodada
  | RankingJogadorPontosGeral
  | RankingJogadorValorizacaoGeral;

// ── GET /cartolendas/meu-patrimonio ──────────��──────────────

export interface PatrimonioJogador {
  jogador_id: number;
  preco_na_escalacao: number;
  preco_apos: number;
  pontos_obtidos: number;
  eh_reserva: number;
  nome: string;
  foto_url: string | null;
  avatar_url: string | null;
  posicao: string;
  variacao_rodada: number;
  valorizacao: number;
}

export interface PatrimonioEvolucao {
  rodada_id: number;
  data: string;
  total_pontos: number;
  patrimonio: number;
}

export interface MeuPatrimonioResponse {
  rodada_id: number;
  patrimonio_atual: number;
  patrimonio_anterior: number;
  variacao_total: number;
  total_pontos: number;
  jogadores: PatrimonioJogador[];
  evolucao: PatrimonioEvolucao[];
  message?: string;
}

// ── GET /cartolendas/meu-historico ──────────────────────────

export interface EvolucaoRodada {
  rodada_id: number;
  total_pontos: number;
  orcamento_gasto: number;
  saldo_lc: number;
  data: string;
}

export interface JogadorEscalacaoStat {
  id: number;
  nome: string;
  foto_url: string | null;
  avatar_url: string | null;
  posicao: string;
  vezes_escalado: number;
}

export interface JogadorRendimentoStat {
  id: number;
  nome: string;
  foto_url: string | null;
  avatar_url: string | null;
  posicao: string;
  total_pontos: number;
  vezes_escalado: number;
}

export interface JogadorMaisPontuouStat {
  id: number;
  nome: string;
  foto_url: string | null;
  avatar_url: string | null;
  posicao: string;
  melhor_pontuacao: number;
  total_pontos: number;
}

export interface MinhaValorizacaoRodada {
  rodada_id: number;
  preco: number;
  variacao: number;
  pontos_rodada: number;
  media_pontos: number;
  data: string;
}

export interface MeuRanking {
  pontos_total: number;
  lendas_coins: number;
  divisao: string;
  rodadas_jogadas: number;
  melhor_rodada_pts: number;
}

export interface MeuHistoricoResponse {
  evolucao: EvolucaoRodada[];
  mais_escalado: JogadorEscalacaoStat[];
  mais_rendeu: JogadorRendimentoStat[];
  mais_pontuou: JogadorMaisPontuouStat[];
  menos_rendeu: JogadorRendimentoStat[];
  minha_valorizacao: MinhaValorizacaoRodada[];
  meu_jogador_id: number;
  ranking: MeuRanking | null;
}

// ── GET /cartolendas/historico-jogadores ─────────────────────

export interface HistoricoJogadorRodada {
  rodada_id: number;
  preco: number;
  variacao: number;
  pontos_rodada: number;
  media_pontos: number;
  gols: number;
  assistencias: number;
}

export interface HistoricoJogador {
  id: number;
  nome: string;
  foto_url: string | null;
  avatar_url: string | null;
  posicao: string;
  rodadas: HistoricoJogadorRodada[];
  media_pontos: number;
  total_pontos: number;
  total_gols: number;
  total_assistencias: number;
  valorizacao_total: number;
  preco_atual: number;
}

export interface RodadaInfo {
  id: number;
  data: string;
  status: string;
}

export interface HistoricoJogadoresResponse {
  rodadas: RodadaInfo[];
  jogadores: HistoricoJogador[];
}

// ── GET /cartolendas/stats/rodada ───────────────────────────

export interface StatsJogadorRodada {
  id: number;
  nome: string;
  foto_url: string | null;
  avatar_url: string | null;
  posicao: string;
  total_escalacoes?: number;
  pontos?: number;
}

export interface StatsTimeRodada {
  id: number;
  total_pontos: number;
  usuario_id: number;
  username: string;
  jogador_nome: string | null;
  foto_url: string | null;
  avatar_url: string | null;
}

export interface StatsCapitaoPopular {
  id: number;
  nome: string;
  foto_url: string | null;
  avatar_url: string | null;
  posicao: string;
  total_capitanias: number;
}

export interface StatsResumoRodada {
  media_pontos: number | null;
  total_times: number;
  maior_pontuacao: number | null;
  menor_pontuacao: number | null;
}

export interface RodadaDisponivel {
  id: number;
  data: string;
}

export interface StatsRodadaResponse {
  rodada_id: number;
  rodada: { id: number; data: string; status: string } | null;
  rodadas_disponiveis: RodadaDisponivel[];
  mais_escalados: StatsJogadorRodada[];
  melhores_jogadores: StatsJogadorRodada[];
  piores_jogadores: StatsJogadorRodada[];
  melhores_times: StatsTimeRodada[];
  capitao_popular: StatsCapitaoPopular[];
  resumo: StatsResumoRodada | null;
  sem_dados?: boolean;
}

// ── GET /cartolendas/events ─────────────────────────────────

export interface CartolendaEvent {
  id: number;
  tipo: string;
  payload: string;
  created_at: string;
}

export interface CartolendaEventsResponse {
  events: CartolendaEvent[];
  server_time: string;
}

// ── Temporadas ──────────────────────────────────────────────

export interface TemporadaResumo {
  temporada: string;
  tecnicos: number;
  data_arquivo: string;
  maior_pontuacao: number;
}

export interface TemporadasDisponiveisResponse {
  temporadas: TemporadaResumo[];
}

export interface TemporadaRankingEntry {
  usuario_id: number;
  username: string;
  pontos_total: number;
  lendas_coins: number;
  divisao: string;
  rodadas_jogadas: number;
  melhor_rodada_pts: number;
  patrimonio: number;
  posicao_final: number;
}

export interface TemporadaRankingResponse {
  temporada: string;
  ranking: TemporadaRankingEntry[];
}

export interface ResetTemporadaResponse {
  message: string;
  temporada: string;
  arquivados: number;
}

// ── Mutation responses ──────────────────────────────────────

export interface EscalarResponse {
  message: string;
  time_id?: number;
}

// ── Stats Avancadas (campeonato) ──────────────���─────────────

export interface StatsJogadorLinha {
  id: number;
  nome: string;
  foto_url: string | null;
  posicao: string;
  time_id: number;
  time_nome: string;
  gols: number;
  assistencias: number;
  clean_sheets: number;
  gols_contra: number;
  jogos: number;
  pontos: number;
}

export interface StatsGoleiro {
  id: number;
  nome: string;
  foto_url: string | null;
  posicao: 'goleiro';
  jogos: number;
  clean_sheets: number;
  gols_sofridos: number;
  pontos: number;
  algoz?: { nome: string; gols: number } | null;
  vitima?: { nome: string; gols: number } | null;
}

export interface StatsZagueiro {
  id: number;
  nome: string;
  foto_url: string | null;
  time_id: number;
  time_nome: string;
  gols: number;
  assistencias?: number;
  clean_sheets: number;
  gols_contra?: number;
  jogos: number;
  pontos: number;
}

export interface StatsTimeTotais {
  id: number;
  nome: string;
  logo_url: string | null;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gp: number;
  gc: number;
}

export interface ConfrontoTime {
  timeA_id: number;
  timeA_nome: string;
  timeA_logo: string | null;
  timeB_id: number;
  timeB_nome: string;
  timeB_logo: string | null;
  vitoriasA: number;
  vitoriasB: number;
  empates: number;
  golsA: number;
  golsB: number;
}

export interface StatsAvancadasResponse {
  jogadores: StatsJogadorLinha[];
  goleiros: StatsGoleiro[];
  zagueiros: StatsZagueiro[];
  times: {
    totais: StatsTimeTotais[];
    rivalidades: unknown[];
  };
  confrontos_times: ConfrontoTime[];
}
