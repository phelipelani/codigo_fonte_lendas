import { cn } from '@/lib/utils';
import type { PosicaoTipo } from '@/@types/cartolendas';

const CONFIG: Record<PosicaoTipo, { bg: string; label: string }> = {
  goleiro:  { bg: 'bg-blue-500',    label: 'GOL' },
  zagueiro: { bg: 'bg-emerald-500', label: 'ZAG' },
  linha:    { bg: 'bg-red-500',     label: 'ATA' },
};

interface Props {
  tipo: PosicaoTipo;
  className?: string;
  /** Mostra label abreviado (GOL, ZAG, ATA). Default: true */
  showLabel?: boolean;
}

export function PosicaoBadge({ tipo, className, showLabel = true }: Props) {
  const { bg, label } = CONFIG[tipo];
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md font-black uppercase tracking-wider',
        showLabel ? 'px-1.5 py-0.5 text-[9px]' : 'w-2.5 h-2.5 rounded-full',
        bg, 'text-white',
        className,
      )}
    >
      {showLabel && label}
    </span>
  );
}
