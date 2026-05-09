// Arquivo: src/features/rodadas/config/timesConfig.ts

/**
 * Configuração das cores e logos dos times
 * 
 * As cores correspondem aos logos disponíveis em src/assets/times/
 * - Amarelo.webp
 * - Preto.webp
 * - Azul.webp
 * - Rosa.webp
 */

export type TimeConfig = {
  nome: string;
  cor: 'amarelo' | 'preto' | 'azul' | 'rosa';
  logo: string;
  gradientBg: string;
  border: string;
  text: string;
  badgeBg: string;
  badgeText: string;
};

export const TIMES_CONFIG: TimeConfig[] = [
  {
    nome: 'Time 1',
    cor: 'amarelo',
    logo: '/src/assets/times/Amarelo.webp',
    gradientBg: 'from-yellow-500/20 to-yellow-600/10',
    border: 'border-yellow-500',
    text: 'text-yellow-400',
    badgeBg: 'bg-yellow-500/20',
    badgeText: 'text-yellow-400',
  },
  {
    nome: 'Time 2',
    cor: 'preto',
    logo: '/src/assets/times/Preto.webp',
    gradientBg: 'from-gray-700/20 to-gray-800/10',
    border: 'border-gray-600',
    text: 'text-gray-300',
    badgeBg: 'bg-gray-600/20',
    badgeText: 'text-gray-300',
  },
  {
    nome: 'Time 3',
    cor: 'azul',
    logo: '/src/assets/times/Azul.webp',
    gradientBg: 'from-blue-500/20 to-blue-600/10',
    border: 'border-blue-500',
    text: 'text-blue-400',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-400',
  },
  {
    nome: 'Time 4',
    cor: 'rosa',
    logo: '/src/assets/times/Rosa.webp',
    gradientBg: 'from-pink-500/20 to-pink-600/10',
    border: 'border-pink-500',
    text: 'text-pink-400',
    badgeBg: 'bg-pink-500/20',
    badgeText: 'text-pink-400',
  },
];

/**
 * Retorna a configuração do time baseado no índice
 */
export const getTimeConfig = (index: number): TimeConfig => {
  return TIMES_CONFIG[index % TIMES_CONFIG.length];
};