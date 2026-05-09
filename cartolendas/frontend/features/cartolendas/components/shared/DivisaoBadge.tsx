import { cn } from '@/lib/utils';

const divisaoMap: Record<string, { icon: string; color: string; bg: string }> = {
  Bronze: { icon: '🟤', color: 'text-amber-600', bg: 'bg-amber-900/20 border border-amber-700/30' },
  Prata:  { icon: '⚪', color: 'text-slate-300', bg: 'bg-slate-600/20 border border-slate-500/30' },
  Ouro:   { icon: '🟡', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' },
  Lenda:  { icon: '💜', color: 'text-purple-400', bg: 'bg-purple-500/10 border border-purple-500/30' },
};

export const DivisaoBadge = ({ divisao }: { divisao: string }) => {
  const d = divisaoMap[divisao] ?? divisaoMap.Bronze;
  return <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold', d.color, d.bg)}>{d.icon} {divisao}</span>;
};
