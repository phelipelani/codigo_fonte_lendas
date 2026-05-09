// Arquivo: src/features/rodadas/components/FimDeJogoModal.tsx
import * as React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Handshake, ArrowRight, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onProximaPartida: () => void;
  nomeTime1: string;
  nomeTime2: string;
  placar1: number;
  placar2: number;
  className?: string;
}

export const FimDeJogoModal: React.FC<Props> = ({
  isOpen,
  onProximaPartida,
  nomeTime1,
  nomeTime2,
  placar1,
  placar2,
  className,
}) => {
  const isEmpate = placar1 === placar2;
  const vencedor = placar1 > placar2 ? nomeTime1 : nomeTime2;
  const isTime1Vencedor = placar1 > placar2;
  const isTime2Vencedor = placar2 > placar1;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className={cn("bg-[#0a1628] border-cyan-500/20 p-0 overflow-hidden", className)} hideClose>
        {/* Confetti/Glow Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={cn(
            "absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-20",
            isEmpate ? "bg-amber-500" : "bg-emerald-500"
          )} />
        </div>

        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative text-center p-6"
        >
          {/* Título */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="mb-6"
          >
            {isEmpate ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/30">
                  <Handshake className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                  Empate!
                </h2>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <motion.div
                  animate={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  className="relative"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/30">
                    <Trophy className="h-8 w-8 text-white" />
                  </div>
                  <motion.div
                    className="absolute -top-1 -right-1"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Sparkles className="h-5 w-5 text-amber-400" />
                  </motion.div>
                </motion.div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent">
                  {vencedor} Venceu!
                </h2>
              </div>
            )}
          </motion.div>

          {/* Placar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6 flex items-center justify-center gap-4 rounded-2xl border border-cyan-500/20 bg-[#0d1f35]/50 p-5"
          >
            {/* Time 1 */}
            <div className={cn(
              "text-center transition-all flex-1",
              isTime1Vencedor && "scale-110"
            )}>
              <div className={cn(
                "mb-2 text-sm font-bold truncate",
                isTime1Vencedor ? "text-emerald-400" : "text-cyan-100/60"
              )}>
                {nomeTime1}
              </div>
              <motion.div
                key={placar1}
                initial={{ scale: 1.5 }}
                animate={{ scale: 1 }}
                className={cn(
                  "text-5xl font-black",
                  isTime1Vencedor ? "text-emerald-400" : "text-white"
                )}
              >
                {placar1}
              </motion.div>
              {isTime1Vencedor && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Trophy className="mx-auto mt-2 h-5 w-5 text-emerald-400" />
                </motion.div>
              )}
            </div>

            {/* VS */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-bold text-cyan-500"
            >
              ×
            </motion.div>

            {/* Time 2 */}
            <div className={cn(
              "text-center transition-all flex-1",
              isTime2Vencedor && "scale-110"
            )}>
              <div className={cn(
                "mb-2 text-sm font-bold truncate",
                isTime2Vencedor ? "text-emerald-400" : "text-cyan-100/60"
              )}>
                {nomeTime2}
              </div>
              <motion.div
                key={placar2}
                initial={{ scale: 1.5 }}
                animate={{ scale: 1 }}
                className={cn(
                  "text-5xl font-black",
                  isTime2Vencedor ? "text-emerald-400" : "text-white"
                )}
              >
                {placar2}
              </motion.div>
              {isTime2Vencedor && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Trophy className="mx-auto mt-2 h-5 w-5 text-emerald-400" />
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Botão Próxima Partida */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={onProximaPartida}
              size="lg"
              className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-cyan-500/25"
            >
              Próxima Partida
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};