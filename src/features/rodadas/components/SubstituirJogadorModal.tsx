// Arquivo: src/features/rodadas/components/SubstituirJogadorModal.tsx
import * as React from 'react';
import { motion } from 'framer-motion';
import { UserMinus, UserPlus, ArrowLeftRight, Star } from 'lucide-react';
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
  jogadorSaindo: Jogador | null;
  jogadoresDisponiveis: Jogador[];
  onSelect: (jogador: Jogador) => void;
  className?: string;
}

export const SubstituirJogadorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  jogadorSaindo,
  jogadoresDisponiveis,
  onSelect,
  className,
}) => {
  const handleSelect = (jogador: Jogador) => {
    onSelect(jogador);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("bg-[#0a1628] border-cyan-500/20 p-0 overflow-hidden", className)}>
        {/* Header */}
        <div className="relative p-5 pb-4">
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
          
          <DialogHeader className="relative">
            <DialogTitle className="flex items-center gap-3 text-xl font-black">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
                <ArrowLeftRight className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                Substituição
              </span>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Jogador Saindo */}
        {jogadorSaindo && (
          <div className="mx-4 mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 mb-2">
              <UserMinus className="h-4 w-4" />
              SAINDO
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-white">{jogadorSaindo.nome}</div>
                <div className="text-xs text-red-300/60">
                  {jogadorSaindo.posicao === 'goleiro' ? '⚽ Goleiro' : 'Linha'}
                </div>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20">
                <Star size={12} className="text-red-400" />
                <span className="text-sm font-bold text-red-400">{jogadorSaindo.nivel}</span>
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

        {/* Lista de Jogadores Disponíveis */}
        <div className="p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-3">
            <UserPlus className="h-4 w-4" />
            SELECIONE QUEM ENTRA
          </div>

          <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
            {jogadoresDisponiveis && jogadoresDisponiveis.length > 0 ? (
              jogadoresDisponiveis.map((jogador, index) => (
                <motion.button
                  key={jogador.id}
                  onClick={() => handleSelect(jogador)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex w-full items-center justify-between rounded-xl border border-cyan-500/20 bg-[#0d1f35]/50 p-3 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                      <UserPlus className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-white">{jogador.nome}</div>
                      <div className="text-xs text-cyan-100/50">
                        {jogador.posicao === 'goleiro' ? '⚽ Goleiro' : 'Linha'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <Star size={12} className="text-cyan-400" />
                    <span className="text-sm font-bold text-cyan-400">{jogador.nivel}</span>
                  </div>
                </motion.button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <UserPlus className="mb-2 h-10 w-10 text-cyan-400/30" />
                <p className="text-cyan-100/50 text-sm">Nenhum jogador no banco</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};