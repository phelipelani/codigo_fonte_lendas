import { cn } from '@/lib/utils';
import { Avatar } from './Avatar';

export function StatRow({ rank, nome, foto, sub, value, valueColor = 'text-white' }: { rank?: number; nome: string; foto?: string; sub?: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      {rank != null && (
        <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0', rank === 1 ? 'bg-yellow-500 text-black' : rank === 2 ? 'bg-slate-400 text-black' : rank === 3 ? 'bg-amber-700 text-white' : 'bg-white/10 text-white/50')}>
          {rank}
        </div>
      )}
      <Avatar src={foto} nome={nome} size={7} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white truncate">{nome}</p>
        {sub && <p className="text-[10px] text-white/30 capitalize">{sub}</p>}
      </div>
      <p className={cn('font-black text-sm shrink-0', valueColor)}>{value}</p>
    </div>
  );
}
