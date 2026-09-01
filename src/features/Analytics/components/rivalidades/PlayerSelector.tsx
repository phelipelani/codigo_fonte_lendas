import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerSelectorProps {
  jogadorA: any;
  jogadorB: any;
  onOpenSelectorA: () => void;
  onOpenSelectorB: () => void;
  onSwap?: () => void;
  icon?: React.ReactNode | string;
}

const PlayerSlot = ({ 
  jogador, 
  color, 
  onClick, 
  label 
}: { 
  jogador: any; 
  color: 'cyan' | 'purple'; 
  onClick: () => void;
  label: string;
}) => {
  const isCyan = color === 'cyan';
  const glowColor = isCyan ? 'drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]';
  const textColor = isCyan ? 'text-cyan-400' : 'text-purple-400';

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        className={cn(
          "relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 bg-surfaceElevated transition-all flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background group",
          isCyan 
            ? 'border-cyan-500/50 hover:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-cyan-400' 
            : 'border-purple-500/50 hover:border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)] text-purple-400'
        )}
        aria-label={jogador ? `Trocar ${jogador.nome}` : label}
      >
        <AnimatePresence mode="wait">
          {jogador ? (
            <motion.div
              key="filled"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="w-full h-full"
            >
              {jogador.foto_url ? (
                <img src={jogador.foto_url} alt={jogador.nome} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-white bg-surface">
                  {jogador.nome.substring(0, 2).toUpperCase()}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center w-full h-full"
            >
              <Plus className="w-8 h-8 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all text-textMuted" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <div className="text-center min-h-[40px] mt-2">
        {jogador ? (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
            <div className="font-bold text-white text-sm sm:text-base">{jogador.nome.split(' ')[0]}</div>
            {jogador.posicao && <div className={cn("text-[10px] uppercase", textColor)}>{jogador.posicao}</div>}
          </motion.div>
        ) : (
          <div className="text-xs text-textMuted uppercase tracking-wider">{label}</div>
        )}
      </div>
    </div>
  );
};

export function PlayerSelector({ jogadorA, jogadorB, onOpenSelectorA, onOpenSelectorB, onSwap, icon = "VS" }: PlayerSelectorProps) {
  return (
    <div className="relative flex items-center justify-between px-4 sm:px-12 py-6">
      <PlayerSlot 
        jogador={jogadorA} 
        color="cyan" 
        onClick={onOpenSelectorA} 
        label="Escolher Jogador" 
      />

      <div className="flex flex-col items-center justify-center px-4">
        <div className="w-10 h-10 rounded-full bg-surfaceElevated border border-border flex items-center justify-center mb-2 z-10">
          <span className="text-xs font-black text-textMuted uppercase">{icon}</span>
        </div>
        
        {jogadorA && jogadorB && onSwap && (
          <button 
            onClick={onSwap}
            className="flex items-center gap-1 text-[10px] uppercase text-textMuted hover:text-white transition-colors bg-surface px-2 py-1 rounded-full border border-border"
          >
            <ArrowLeftRight className="w-3 h-3" />
            Trocar
          </button>
        )}
      </div>

      <PlayerSlot 
        jogador={jogadorB} 
        color="purple" 
        onClick={onOpenSelectorB} 
        label="Escolher Jogador" 
      />
      
      {/* Visual connection line */}
      <div className="absolute top-[3.75rem] sm:top-[4.25rem] left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 h-px bg-gradient-to-r from-cyan-500/0 via-border to-purple-500/0 -z-10" />
    </div>
  );
}
