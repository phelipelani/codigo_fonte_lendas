// Arquivo: src/features/rodadas/config/teamColors.ts
import { TeamConfig } from '@/@types/partida';

/**
 * Configuração visual dos times
 * Ordem: Amarelo (0), Preto (1), Azul (2), Rosa (3)
 */
export const TEAM_COLORS: TeamConfig[] = [
  {
    nome: 'Amarelo',
    primary: '#facc15',
    border: 'border-yellow-400',
    bg: 'bg-yellow-400/10',
    text: 'text-yellow-400',
    badgeBg: 'bg-yellow-400/20',
    badgeText: 'text-yellow-400',
  },
  {
    nome: 'Preto',
    primary: '#4b5563',
    border: 'border-gray-600',
    bg: 'bg-gray-600/10',
    text: 'text-gray-600',
    badgeBg: 'bg-gray-600/20',
    badgeText: 'text-gray-600',
  },
  {
    nome: 'Azul',
    primary: '#3b82f6',
    border: 'border-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-500',
  },
  {
    nome: 'Rosa',
    primary: '#ec4899',
    border: 'border-pink-500',
    bg: 'bg-pink-500/10',
    text: 'text-pink-500',
    badgeBg: 'bg-pink-500/20',
    badgeText: 'text-pink-500',
  },
];

/**
 * Retorna a configuração visual de um time pelo índice
 */
export const getTeamConfig = (teamIndex: number): TeamConfig => {
  return TEAM_COLORS[teamIndex % TEAM_COLORS.length];
};