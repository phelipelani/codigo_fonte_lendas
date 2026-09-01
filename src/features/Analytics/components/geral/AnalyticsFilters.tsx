import { memo } from 'react';
import { Trophy, Filter, Calendar, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsFiltersProps {
  comTitulos: boolean;
  onChangeComTitulos: (val: boolean) => void;
  posicao: 'todos' | 'linha' | 'goleiro';
  onChangePosicao: (val: 'todos' | 'linha' | 'goleiro') => void;
}

export const AnalyticsFilters = memo(({ comTitulos, onChangeComTitulos, posicao, onChangePosicao }: AnalyticsFiltersProps) => {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-end gap-4 p-4 rounded-2xl border border-border/50 bg-surfaceElevated/30">
      
      <div className="flex-1 space-y-1.5">
        <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider ml-1">Considerar Títulos</label>
        <div className="flex rounded-lg border border-border/50 bg-surface/50 p-1">
          <button 
            onClick={() => onChangeComTitulos(true)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all",
              comTitulos ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-textMuted hover:text-white"
            )}
          >
            <Trophy size={14} /> Com Títulos
          </button>
          <button 
            onClick={() => onChangeComTitulos(false)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all",
              !comTitulos ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "text-textMuted hover:text-white"
            )}
          >
            <Filter size={14} /> Sem Títulos
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-1.5">
        <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider ml-1">Posição na Tabela Geral</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Users size={14} className="text-cyan-400" />
          </div>
          <select 
            value={posicao}
            onChange={(e) => onChangePosicao(e.target.value as any)}
            className="w-full pl-9 pr-4 py-2.5 bg-surface/50 border border-cyan-500/30 rounded-lg text-xs text-white appearance-none cursor-pointer focus:outline-none focus:border-cyan-400"
          >
            <option value="linha">Linha (Exclui Goleiros)</option>
            <option value="goleiro">Apenas Goleiros</option>
            <option value="todos">Todos</option>
          </select>
        </div>
      </div>

      <button onClick={() => { onChangeComTitulos(true); onChangePosicao('linha'); }} className="h-[42px] px-6 rounded-lg border border-border/50 text-xs font-bold text-textMuted hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
        <X size={14} /> Limpar
      </button>

    </div>
  );
});
