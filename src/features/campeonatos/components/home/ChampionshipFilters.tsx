import { memo, useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

interface Props {
  busca: string; setBusca: (v: string) => void;
  status: string; setStatus: (v: string) => void;
  formato: string; setFormato: (v: string) => void;
  ordem: string; setOrdem: (v: string) => void;
}

export const ChampionshipFilters = memo(({ busca, setBusca, status, setStatus, formato, setFormato, ordem, setOrdem }: Props) => {
  const [sheetOpen, setSheetOpen] = useState(false);

  const FiltrosConteudo = () => (
    <>
      <div className="space-y-4 md:space-y-0 md:flex md:gap-4 md:flex-1">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1.5 ml-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2.5 bg-surface/50 border border-border/50 rounded-lg text-xs text-white focus:border-cyan-400 focus:outline-none">
            <option value="todos">Todos</option>
            <option value="em_andamento">Em andamento</option>
            <option value="finalizados">Finalizados</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1.5 ml-1">Formato</label>
          <select value={formato} onChange={e => setFormato(e.target.value)} className="w-full px-3 py-2.5 bg-surface/50 border border-border/50 rounded-lg text-xs text-white focus:border-cyan-400 focus:outline-none">
            <option value="todos">Todos</option>
            <option value="pontos_corridos">Pontos Corridos</option>
            <option value="copa">Copa</option>
            <option value="mata_mata">Mata-Mata</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1.5 ml-1">Ordenar por</label>
          <select value={ordem} onChange={e => setOrdem(e.target.value)} className="w-full px-3 py-2.5 bg-surface/50 border border-border/50 rounded-lg text-xs text-white focus:border-cyan-400 focus:outline-none">
            <option value="recentes">Mais recente</option>
            <option value="antigos">Mais antigo</option>
            <option value="nome">Nome</option>
          </select>
        </div>
      </div>
      <div className="mt-6 md:mt-0 pt-4 md:pt-0 border-t border-border/50 md:border-t-0 flex gap-3">
         <button onClick={() => {setStatus('todos'); setFormato('todos'); setOrdem('recentes'); setSheetOpen(false);}} className="flex-1 md:flex-none h-10 px-4 rounded-lg border border-border/50 text-xs font-bold text-textMuted hover:text-white transition-colors">Limpar</button>
         <button onClick={() => setSheetOpen(false)} className="md:hidden flex-[2] h-10 rounded-lg bg-cyan-600 text-white text-xs font-bold">Aplicar</button>
      </div>
    </>
  );

  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
        <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-wider md:mr-4 hidden md:block">Campeonatos</h2>
        <div className="relative flex-1 md:max-w-sm flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
            <input type="text" placeholder="Buscar campeonato..." value={busca} onChange={e => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-surface/50 border border-border/50 rounded-lg text-xs text-white focus:border-cyan-400 focus:outline-none placeholder:text-textMuted" 
            />
          </div>
          <button onClick={() => setSheetOpen(true)} className="md:hidden flex items-center justify-center gap-2 px-4 rounded-lg border border-border/50 bg-surface/50 text-xs font-bold text-white">
            <Filter size={14} /> Filtros
          </button>
        </div>
        <div className="hidden md:flex flex-1 items-end gap-4">
          <FiltrosConteudo />
        </div>
      </div>
      
      {/* Custom Bottom Sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSheetOpen(false)} />
          <div className="relative bg-[#0f1f33] rounded-t-2xl p-5 border-t border-border/50 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
             <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-5" />
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-lg font-black text-white uppercase tracking-wider">Filtros</h3>
               <button onClick={() => setSheetOpen(false)} className="w-8 h-8 rounded-full bg-surface/50 flex items-center justify-center text-textMuted">
                 <X size={16} />
               </button>
             </div>
             <FiltrosConteudo />
          </div>
        </div>
      )}
    </div>
  );
});
