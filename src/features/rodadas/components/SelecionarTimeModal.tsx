// Arquivo: src/features/rodadas/components/SelecionarTimeModal.tsx
import * as React from 'react';
import { motion } from 'framer-motion';
import { Shirt, Users, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { getTeamConfig } from '../config/teamColors';
import { cn } from '@/lib/utils';

import AmareloLogo from '@/assets/Amarelo.webp';
import PretoLogo from '@/assets/Preto.webp';
import AzulLogo from '@/assets/Azul.webp';
import RosaLogo from '@/assets/Rosa.webp';

const TEAM_LOGOS = [AmareloLogo, PretoLogo, AzulLogo, RosaLogo];

interface TimeDisponivel {
  numero: number;
  nome: string;
  jogadores: Array<{ id: number; nome: string; nivel: number }>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectTime: (time: TimeDisponivel) => void;
  times: TimeDisponivel[];
  title?: string;
  className?: string;
}

export const SelecionarTimeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectTime,
  times,
  title = 'Selecionar Time',
  className,
}) => {
  const handleSelect = (time: TimeDisponivel) => {
    onSelectTime(time);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("bg-[#0a1628] border-cyan-500/20 p-0 overflow-hidden", className)}>
        {/* Header */}
        <div className="relative p-5 pb-4">
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />
          
          <DialogHeader className="relative">
            <DialogTitle className="flex items-center gap-3 text-xl font-black">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/30">
                <Shirt className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                {title}
              </span>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

        {/* Content */}
        <div className="p-4">
          {times && times.length > 0 ? (
            <div className="grid gap-3 grid-cols-2">
              {times.map((time, index) => {
                const config = getTeamConfig(time.numero - 1);
                const mediaTime =
                  time.jogadores.length > 0
                    ? (time.jogadores.reduce((sum, j) => sum + (j.nivel || 1), 0) / time.jogadores.length).toFixed(1)
                    : '0.0';

                return (
                  <motion.button
                    key={time.numero}
                    onClick={() => handleSelect(time)}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      'relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all',
                      'bg-[#0d1f35]/50 hover:bg-[#0d1f35]',
                      'border-cyan-500/20 hover:border-cyan-500/50',
                      'hover:shadow-lg hover:shadow-cyan-500/10'
                    )}
                  >
                    {/* Logo do Time */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-14 h-14 rounded-xl border-2 border-cyan-500/30 bg-[#0a1628] overflow-hidden flex items-center justify-center">
                        {TEAM_LOGOS[time.numero - 1] ? (
                          <img 
                            src={TEAM_LOGOS[time.numero - 1]} 
                            alt={config.nome}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-black text-cyan-400">
                            {time.numero}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">
                          {config.nome}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-cyan-100/50">
                          <Users size={12} />
                          {time.jogadores.length} jogadores
                        </div>
                      </div>
                    </div>

                    {/* Média */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black/20">
                      <span className="text-xs text-cyan-100/50">Média do Time</span>
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-amber-400" />
                        <span className="text-lg font-black text-amber-400">{mediaTime}</span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Shirt className="mb-4 h-12 w-12 text-cyan-400/30" />
              <p className="text-cyan-100/50 text-sm">Nenhum time disponível</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};