import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { motion } from 'framer-motion';

interface PlayerSelectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  jogadores: any[];
  onSelect: (jogadorId: string) => void;
  excludeId?: string;
  playerColor?: 'cyan' | 'purple';
}

export function PlayerSelectionSheet({ 
  open, 
  onOpenChange, 
  title, 
  jogadores, 
  onSelect, 
  excludeId,
  playerColor = 'cyan'
}: PlayerSelectionSheetProps) {
  const [search, setSearch] = useState('');
  const [filterPos, setFilterPos] = useState('TODOS');

  const filteredJogadores = useMemo(() => {
    return jogadores
      .filter((j) => String(j.id) !== excludeId)
      .filter((j) => j.nome.toLowerCase().includes(search.toLowerCase()))
      .filter((j) => {
        if (filterPos === 'TODOS') return true;
        const pos = j.posicao?.toUpperCase() || '';
        if (filterPos === 'ATACANTES' && pos.includes('ATA')) return true;
        if (filterPos === 'MEIAS' && pos.includes('MEI')) return true;
        if (filterPos === 'DEFENSORES' && (pos.includes('ZAG') || pos.includes('LAT') || pos.includes('DEF'))) return true;
        if (filterPos === 'GOLEIROS' && pos.includes('GOL')) return true;
        return false;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [jogadores, excludeId, search, filterPos]);

  const handleSelect = (id: string) => {
    onSelect(id);
    onOpenChange(false);
    setSearch('');
  };

  const focusColor = playerColor === 'cyan' ? 'focus:ring-cyan-500' : 'focus:ring-purple-500';

  const posColor = (pos?: string) => {
    const p = pos?.toUpperCase() || '';
    if (p.includes('ATA')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (p.includes('MEI')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (p.includes('DEF') || p.includes('ZAG') || p.includes('LAT')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (p.includes('GOL')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    return 'bg-surfaceElevated text-textMuted border-border';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* We don't override the base classes heavily here, just use the component as intended */}
      <DialogContent className="max-w-[90vw] md:max-w-4xl p-0 gap-0 overflow-hidden bg-surface border-border/50">
        <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-surface/50 text-center">
          <DialogTitle className="text-xl md:text-2xl font-black text-white flex items-center justify-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            SELECIONE OS JOGADORES
          </DialogTitle>
          <p className="text-textMuted text-sm mt-1">Escolha dois jogadores para comparar suas estatísticas</p>
        </DialogHeader>

        <div className="p-4 md:p-6 bg-[#0a1526]">
          {/* Header Visual */}
          <div className="flex items-center justify-between bg-surface/40 border border-border/30 rounded-2xl p-4 md:p-6 mb-6">
            <div className="flex-1 flex flex-col items-center text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1">Jogador 1</span>
              <span className="text-[10px] text-textMuted mb-3">Selecione o primeiro jogador</span>
              <div className="w-16 h-16 rounded-full border-2 border-cyan-500/50 flex items-center justify-center bg-cyan-500/10 text-cyan-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
            </div>
            
            <div className="px-4">
              <div className="w-12 h-12 rounded-full bg-surfaceElevated border border-border flex items-center justify-center shadow-lg">
                <span className="text-sm font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">VS</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-1">Jogador 2</span>
              <span className="text-[10px] text-textMuted mb-3">Selecione o segundo jogador</span>
              <div className="w-16 h-16 rounded-full border-2 border-purple-500/50 flex items-center justify-center bg-purple-500/10 text-purple-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar jogador..."
                className={cn("pl-9 bg-surface/50 border-border/50 h-11 text-sm rounded-full", focusColor)}
              />
            </div>
            <div className="flex overflow-x-auto gap-2 pb-2 md:pb-0 hide-scrollbar">
              {['TODOS', 'ATACANTES', 'MEIAS', 'DEFENSORES', 'GOLEIROS'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilterPos(f)}
                  className={cn(
                    "px-4 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-full whitespace-nowrap transition-colors border",
                    filterPos === f 
                      ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" 
                      : "bg-surface/50 text-textMuted border-border/50 hover:bg-surface hover:text-white"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Jogadores */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-h-[50vh] overflow-y-auto pr-2 pb-4">
            {filteredJogadores.map((j) => (
              <motion.button
                key={j.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(String(j.id))}
                className={cn(
                  "flex flex-col items-center p-4 rounded-2xl transition-all text-center",
                  "bg-surface/40 hover:bg-surfaceElevated border border-border/30 hover:border-cyan-500/30",
                  "focus:outline-none focus:ring-2", focusColor
                )}
              >
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-border/50 mb-3 bg-surfaceElevated flex items-center justify-center">
                  {j.foto_url ? (
                    <img src={j.foto_url} alt={j.nome} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-textMuted">{j.nome.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                
                <span className="font-bold text-white text-sm mb-1 truncate w-full">{j.nome.split(' ')[0]}</span>
                
                <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded uppercase mb-3 border", posColor(j.posicao))}>
                  {j.posicao || 'JOGADOR'}
                </span>

                <div className="flex gap-3 text-center border-t border-border/30 pt-2 w-full justify-center">
                  <div>
                    <div className="text-base font-black text-white">{j.stats?.ovr || '-'}</div>
                    <div className="text-[8px] text-textMuted uppercase tracking-wider">Geral</div>
                  </div>
                </div>
              </motion.button>
            ))}

            {filteredJogadores.length === 0 && (
              <div className="col-span-full py-12 text-center text-textMuted">
                Nenhum jogador encontrado com esses filtros.
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t border-border/30 bg-surface/50 text-xs text-textMuted flex items-center gap-2">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
           Selecione um jogador para cada lado para começar a comparação.
        </div>
      </DialogContent>
    </Dialog>
  );
}
