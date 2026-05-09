import { cn } from '@/lib/utils';

interface Props {
  /** Array de valores numéricos (ex: pontos das últimas rodadas) */
  dados: number[];
  /** Largura em px. Default: 60 */
  width?: number;
  /** Altura em px. Default: 24 */
  height?: number;
  /** Cor da linha (Tailwind stroke class). Default: stroke-purple-400 */
  cor?: string;
  className?: string;
}

export function MiniGrafico({
  dados,
  width = 60,
  height = 24,
  cor = 'stroke-purple-400',
  className,
}: Props) {
  if (dados.length < 2) return null;

  const min = Math.min(...dados);
  const max = Math.max(...dados);
  const range = max - min || 1;
  const padding = 2;

  const points = dados.map((v, i) => {
    const x = padding + (i / (dados.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  // Cor do último ponto baseada na tendência
  const ultimo = dados[dados.length - 1];
  const penultimo = dados[dados.length - 2];
  const tendencia = ultimo >= penultimo ? 'fill-emerald-400' : 'fill-red-400';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('flex-shrink-0', className)}
    >
      <polyline
        points={points}
        fill="none"
        className={cn(cor, 'opacity-60')}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Último ponto com cor de tendência */}
      <circle
        cx={padding + ((dados.length - 1) / (dados.length - 1)) * (width - padding * 2)}
        cy={height - padding - ((ultimo - min) / range) * (height - padding * 2)}
        r="2"
        className={tendencia}
      />
    </svg>
  );
}
