// Arquivo: src/features/rodadas/components/TimeDisplay.tsx
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, RefreshCw } from 'lucide-react';
import { JogadorEmPartida } from '@/@types/partida';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface Props {
  jogadores: JogadorEmPartida[];
  teamColor: string;
  isJogoAtivo: boolean;
  onStatChange: (jogadorId: number, stat: 'gols' | 'assistencias', delta: number) => void;
  onSubstituir?: (jogador: JogadorEmPartida) => void;
}

export const TimeDisplay: React.FC<Props> = ({
  jogadores,
  teamColor,
  isJogoAtivo,
  onStatChange,
  onSubstituir,
}) => {
  if (!jogadores || jogadores.length === 0) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface/50 p-8">
        <p className="text-textMuted">Nenhum jogador selecionado</p>
      </div>
    );
  }

  return (
    <div className="h-full space-y-2 overflow-y-auto rounded-xl border border-border bg-surface p-4">
      <AnimatePresence>
        {jogadores.map((jogador, index) => (
          <motion.div
            key={jogador.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'group flex items-center gap-2 rounded-lg border bg-background p-3 transition-all',
              isJogoAtivo
                ? 'border-border'
                : 'cursor-pointer border-border hover:border-accentPrimary/50 hover:bg-surface'
            )}
            onClick={() => !isJogoAtivo && onSubstituir && onSubstituir(jogador)}
          >
            {/* Nome do Jogador */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-textPrimary">
                  {jogador.nome}
                </span>
                {jogador.posicao === 'goleiro' && (
                  <span className="text-xs">⚽</span>
                )}
              </div>
            </div>

            {/* Controles de Gols */}
            <div
              className={cn(
                'flex items-center gap-1.5 transition-opacity',
                isJogoAtivo ? 'opacity-100' : 'opacity-40 pointer-events-none'
              )}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatChange(jogador.id, 'gols', -1);
                }}
                disabled={!isJogoAtivo || jogador.gols === 0}
                className="h-7 w-7 rounded-full p-0 text-accentSecondary hover:bg-accentSecondary/20"
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>

              <motion.span
                key={`gols-${jogador.id}-${jogador.gols}`}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="w-6 text-center text-sm font-bold text-accentSecondary"
              >
                {jogador.gols}
              </motion.span>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatChange(jogador.id, 'gols', 1);
                }}
                disabled={!isJogoAtivo}
                className="h-7 w-7 rounded-full p-0 text-accentSecondary hover:bg-accentSecondary/20"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>

              <span className="ml-1 text-xs text-textMuted">⚽</span>
            </div>

            {/* Controles de Assistências */}
            <div
              className={cn(
                'flex items-center gap-1.5 transition-opacity',
                isJogoAtivo ? 'opacity-100' : 'opacity-40 pointer-events-none'
              )}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatChange(jogador.id, 'assistencias', -1);
                }}
                disabled={!isJogoAtivo || jogador.assistencias === 0}
                className="h-7 w-7 rounded-full p-0 text-accentPrimary hover:bg-accentPrimary/20"
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>

              <motion.span
                key={`assist-${jogador.id}-${jogador.assistencias}`}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="w-6 text-center text-sm font-bold text-accentPrimary"
              >
                {jogador.assistencias}
              </motion.span>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatChange(jogador.id, 'assistencias', 1);
                }}
                disabled={!isJogoAtivo}
                className="h-7 w-7 rounded-full p-0 text-accentPrimary hover:bg-accentPrimary/20"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>

              <span className="ml-1 text-xs text-textMuted">🦶</span>
            </div>

            {/* Ícone de Substituição (só aparece quando jogo NÃO está ativo) */}
            {!isJogoAtivo && onSubstituir && (
              <div className="ml-2 opacity-0 transition-opacity group-hover:opacity-100">
                <RefreshCw className="h-4 w-4 text-accentPrimary" />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};