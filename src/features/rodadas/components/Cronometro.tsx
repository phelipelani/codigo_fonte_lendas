// Arquivo: src/features/rodadas/components/Cronometro.tsx
import * as React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface Props {
  segundos: number;
  isRodando: boolean;
  onToggle: () => void;
}

export const Cronometro: React.FC<Props> = ({ segundos, isRodando, onToggle }) => {
  const minutos = Math.floor(segundos / 60);
  const segs = segundos % 60;

  const formatado = `${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Display do Tempo */}
      <motion.div
        animate={{
          scale: isRodando ? [1, 1.02, 1] : 1,
        }}
        transition={{
          duration: 1,
          repeat: isRodando ? Infinity : 0,
        }}
        className={cn(
          'rounded-xl border-2 px-8 py-4 font-mono text-5xl font-bold',
          isRodando
            ? 'border-danger bg-danger/10 text-danger'
            : 'border-border bg-surface text-textPrimary'
        )}
      >
        {formatado}
      </motion.div>

      {/* Botão Play/Pause */}
      <Button
        onClick={onToggle}
        size="lg"
        variant={isRodando ? 'destructive' : 'default'}
        className="min-w-[120px]"
      >
        {isRodando ? (
          <>
            <Pause className="mr-2 h-5 w-5" />
            Pausar
          </>
        ) : (
          <>
            <Play className="mr-2 h-5 w-5" />
            Iniciar
          </>
        )}
      </Button>
    </div>
  );
};