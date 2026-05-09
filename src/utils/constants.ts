// ── Auth ─────────────────────────────────────────────────
export const GOOGLE_AUTH_URL = `${import.meta.env.VITE_API_URL ?? ''}/auth/google`;

/**
 * Constantes de pontuação do FutLendas.
 * ESPELHO do arquivo api_php/src/utils/Pontos.php
 * ⚠️  Altere aqui E no Pontos.php para manter sincronizado.
 */

// ── Pontuação por partida ──────────────────────────────────
export const PONTOS = {
  GOLS: 1.5,
  ASSISTENCIAS: 1.0,
  CLEAN_SHEET: 0.5,        // Defensor / Goleiro (jogo sem sofrer gol)
  VITORIAS: 3.0,
  EMPATES: 1.0,
  DERROTAS: -1.0,
  GOL_CONTRA: -3.0,        // Punição automática
} as const;

// ── Prêmios Hall da Fama (G.O.A.T) ────────────────────────
export const PREMIOS = {
  TITULO_PONTOS_CORRIDOS: 100,   // Campeão de Liga
  TITULO_MATA_MATA: 150,         // Campeão de Copa
  MVP_GERAL: 50,                 // Craque do Campeonato
  MVP_RODADA: 5,                 // Craque da Semana
  ARTILHEIRO_GERAL: 30,         // Prêmio individual final
  GARCOM_GERAL: 30,             // Prêmio individual final
  GOL_HISTORICO: 1,             // Acúmulo histórico
  ASSIST_HISTORICO: 1,          // Acúmulo histórico
} as const;

// ── Punições disciplinares ─────────────────────────────────
export const PUNICOES = {
  LEVE: -5,
  MEDIA: -10,
  GRAVE: -25,
  MAXIMA: -50,
} as const;

// ── Pé de Rato ─────────────────────────────────────────────
export const PE_DE_RATO = {
  RODADA: -3,
  GERAL: -20,
} as const;

// ── Funções de cálculo (espelho do PHP) ────────────────────

export function calcularJogadorLinha(
  gols: number,
  assistencias: number,
  vitorias: number,
  empates: number,
  derrotas: number,
  golsContra = 0
): number {
  return (
    gols * PONTOS.GOLS +
    assistencias * PONTOS.ASSISTENCIAS +
    vitorias * PONTOS.VITORIAS +
    empates * PONTOS.EMPATES +
    derrotas * PONTOS.DERROTAS +
    golsContra * PONTOS.GOL_CONTRA
  );
}

export function calcularJogadorRecuado(
  cleanSheets: number,
  vitorias: number,
  empates: number,
  derrotas: number,
  golsContra = 0
): number {
  return (
    cleanSheets * PONTOS.CLEAN_SHEET +
    vitorias * PONTOS.VITORIAS +
    empates * PONTOS.EMPATES +
    derrotas * PONTOS.DERROTAS +
    golsContra * PONTOS.GOL_CONTRA
  );
}

export function calcularGoleiro(
  cleanSheets: number,
  vitorias: number,
  empates: number,
  derrotas: number,
  golsContra = 0
): number {
  return calcularJogadorRecuado(cleanSheets, vitorias, empates, derrotas, golsContra);
}
