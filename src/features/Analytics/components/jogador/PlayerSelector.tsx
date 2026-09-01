import { useState, useMemo } from 'react';
import { Search, User, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface PlayerSelectorProps {
  jogadorId: string;
  setJogadorId: (id: string) => void;
  jogadores: any[];
}

export function PlayerSelector({ jogadorId, setJogadorId, jogadores }: PlayerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedPlayer = jogadores.find((j) => String(j.id) === jogadorId);

  const filteredJogadores = useMemo(() => {
    return jogadores
      .filter((j) => j.nome.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [jogadores, search]);

  const handleSelect = (id: string) => {
    setJogadorId(id);
    setOpen(false);
    setSearch('');
  };

  const posColor = (pos?: string) => {
    const p = pos?.toUpperCase() || '';
    if (p.includes('ATA')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (p.includes('MEI')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (p.includes('DEF') || p.includes('ZAG') || p.includes('LAT')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (p.includes('GOL')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    return 'bg-surfaceElevated text-textMuted border-border';
  };

  return (
    <div className="w-full flex flex-col items-center justify-center mb-6 px-4">
      <h2 className="text-[10px] md:text-xs font-bold text-cyan-500 mb-2 uppercase tracking-widest text-center">
        Raio-X do Jogador
      </h2>
      
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="w-full max-w-sm flex items-center justify-between p-2 pl-3 pr-4 bg-surfaceElevated/50 hover:bg-surfaceElevated/80 border border-border/50 rounded-full transition-colors group"
      >
        <div className="flex items-center gap-3">
          <Search size={16} className="text-cyan-400 group-hover:text-cyan-300 transition-colors" />
          {selectedPlayer ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full overflow-hidden border border-border bg-surface">
                {selectedPlayer.foto_url ? (
                  <img src={selectedPlayer.foto_url} alt={selectedPlayer.nome} className="w-full h-full object-cover" />
                ) : (
                  <User size={14} className="m-auto mt-1 text-textMuted" />
                )}
              </div>
              <span className="text-white font-semibold text-sm">{selectedPlayer.nome}</span>
            </div>
          ) : (
            <span className="text-textMuted text-sm">Buscar jogador...</span>
          )}
        </div>
        <ChevronDown size={16} className="text-textMuted" />
      </button>

      {/* Modal / Bottom Sheet Style */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-xl p-0 gap-0 overflow-hidden bg-surface border-border/50 flex flex-col h-[85vh] md:h-[600px] mt-auto mb-4 md:my-auto rounded-3xl">
          <DialogHeader className="p-4 md:p-6 pb-2 border-b border-border/30 bg-surface/50">
            <DialogTitle className="text-lg md:text-xl font-black text-white flex items-center gap-2">
              <Search className="text-cyan-400" size={20} />
              SELECIONAR JOGADOR
            </DialogTitle>
            <div className="relative mt-4 mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
              <Input
                autoFocus
                placeholder="Digite o nome do jogador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-12 bg-surfaceElevated/50 border-border/50 text-white rounded-xl focus-visible:ring-cyan-500/50 text-base"
              />
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-2 bg-[#0a1526]">
            {filteredJogadores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <User size={48} className="text-border/50 mb-4" />
                <p className="text-white font-bold">Nenhum jogador encontrado</p>
                <p className="text-sm text-textMuted mt-1">Tente buscar por outro nome</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1">
                {filteredJogadores.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => handleSelect(String(j.id))}
                    className="flex items-center p-3 gap-3 rounded-xl hover:bg-surface/50 border border-transparent hover:border-border/50 transition-all text-left w-full group"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-border bg-surfaceElevated flex-shrink-0 relative">
                      {j.foto_url ? (
                        <img src={j.foto_url} alt={j.nome} className="w-full h-full object-cover" />
                      ) : (
                        <User size={24} className="m-auto mt-2 text-textMuted" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                          {j.nome}
                        </p>
                        {j.nivel && (
                          <div className="px-2 py-0.5 rounded-full bg-surfaceElevated border border-border/50 text-[10px] font-bold text-amber-400 flex-shrink-0">
                            OVR {Math.min(99, 75 + (j.nivel * 2))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider", posColor(j.posicao))}>
                          {j.posicao || 'LINHA'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
