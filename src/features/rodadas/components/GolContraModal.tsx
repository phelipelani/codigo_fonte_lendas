// Arquivo: src/features/rodadas/components/GolContraModal.tsx
import * as React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Target } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Jogador } from '@/@types';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jogadores: Jogador[];
  nomeTime: string;
  onSelect: (jogador: Jogador) => void;
  className?: string;
}

export const GolContraModal: React.FC<Props> = ({
  isOpen,
  onClose,
  jogadores,
  nomeTime,
  onSelect,
  className,
}) => {
  const handleSelect = (jogador: Jogador) => {
    onSelect(jogador);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("bg-[#0a1628] border-red-500/30 p-0 overflow-hidden", className)}>
        {/* Header */}
        <div className="relative p-5 pb-4">
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-red-500/15 to-transparent pointer-events-none" />
          
          <DialogHeader className="relative">
            <DialogTitle className="flex items-center gap-3 text-xl font-black">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="bg-gradient-to-r from-red-300 via-rose-200 to-red-300 bg-clip-text text-transparent block">
                  Gol Contra
                </span>
                <span className="text-xs text-red-300/60 font-normal">
                  Quem do {nomeTime} marcou contra?
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

        {/* Lista de Jogadores */}
        <div className="p-4">
          <div className="max-h-[350px] space-y-2 overflow-y-auto pr-1">
            {jogadores && jogadores.length > 0 ? (
              jogadores.map((jogador, index) => (
                <motion.button
                  key={jogador.id}
                  onClick={() => handleSelect(jogador)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex w-full items-center gap-3 rounded-xl border border-cyan-500/20 bg-[#0d1f35]/50 p-3 transition-all hover:border-red-500/50 hover:bg-red-500/5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                    <Target className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-white">{jogador.nome}</div>
                    <div className="text-xs text-cyan-100/50">
                      {jogador.posicao === 'goleiro' ? '⚽ Goleiro' : 'Linha'}
                    </div>
                  </div>
                </motion.button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <AlertTriangle className="mb-2 h-10 w-10 text-red-400/30" />
                <p className="text-cyan-100/50 text-sm">Nenhum jogador neste time</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};