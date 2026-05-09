import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  valor: number;
  className?: string;
  /** Mostra icone de seta. Default: false */
  showArrow?: boolean;
  /** Tamanho do texto. Default: 'sm' */
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const SIZES = {
  xs: 'text-[10px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function PontosDisplay({ valor, className, showArrow = false, size = 'sm' }: Props) {
  const isPositive = valor > 0;
  const isNegative = valor < 0;

  const colorClass = isPositive
    ? 'text-emerald-400'
    : isNegative
      ? 'text-red-400'
      : 'text-white/30';

  const bgClass = isPositive
    ? 'bg-emerald-500/10'
    : isNegative
      ? 'bg-red-500/10'
      : 'bg-white/5';

  const ArrowIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold',
        SIZES[size],
        colorClass,
        bgClass,
        className,
      )}
    >
      {showArrow && <ArrowIcon className="w-3 h-3" />}
      {isPositive && '+'}{valor.toFixed(1)}
    </span>
  );
}
