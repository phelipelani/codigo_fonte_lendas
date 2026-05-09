// Arquivo: src/features/rodadas/components/ResultadoTimesStep.tsx
import * as React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, Users, Trophy, Star, Loader2, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useGetTimes } from '../api/useGetTimes';
import { getTeamConfig } from '../config/teamColors';
import { cn } from '@/lib/utils';

import AmareloLogo from '@/assets/Amarelo.webp';
import PretoLogo from '@/assets/Preto.webp';
import AzulLogo from '@/assets/Azul.webp';
import RosaLogo from '@/assets/Rosa.webp';

const TEAM_LOGOS = [AmareloLogo, PretoLogo, AzulLogo, RosaLogo];

interface Props {
  rodadaId: number;
  ligaId: number;
  onResortear?: () => void;
  isRessorteando?: boolean;
}

export const ResultadoTimesStep: React.FC<Props> = ({ rodadaId, ligaId, onResortear, isRessorteando }) => {
  const navigate = useNavigate();
  const { data: jogadoresComTime, isLoading } = useGetTimes(rodadaId);

  const timesPorNumero = React.useMemo(() => {
    if (!jogadoresComTime) return {};

    return jogadoresComTime.reduce((acc, jogador) => {
      const numeroTime = jogador.numero_time;
      if (!acc[numeroTime]) {
        acc[numeroTime] = {
          numero: numeroTime,
          nome: jogador.nome_time,
          jogadores: [],
        };
      }
      acc[numeroTime].jogadores.push(jogador);
      return acc;
    }, {} as Record<number, { numero: number; nome: string; jogadores: typeof jogadoresComTime }>);
  }, [jogadoresComTime]);

  const times = Object.values(timesPorNumero).sort((a, b) => a.numero - b.numero);

  const handleIniciarPartidas = () => {
    navigate(`/ligas/${ligaId}/rodadas/${rodadaId}/partidas`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-cyan-100/50 text-sm">Carregando times...</p>
        </div>
      </div>
    );
  }

  if (!times || times.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-cyan-400/30" />
          <p className="text-cyan-100/50">Nenhum time formado ainda</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <Trophy className="h-5 w-5 text-emerald-400" />
          <span className="text-emerald-300 font-bold">{times.length} times formados</span>
        </div>
        <h2 className="text-2xl font-black">
          <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
            Times Prontos!
          </span>
        </h2>
      </motion.div>

      {/* Grid de Times */}
      <div className="grid gap-4 md:grid-cols-2">
        {times.map((time, index) => {
          const config = getTeamConfig(time.numero - 1);
          const mediaTime =
            time.jogadores.length > 0
              ? (time.jogadores.reduce((sum, j) => sum + (j.nivel || 1), 0) / time.jogadores.length).toFixed(1)
              : '0.0';

          return (
            <motion.div
              key={time.numero}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 backdrop-blur-md overflow-hidden"
            >
              {/* Header do Time */}
              <div className="p-4 border-b border-cyan-500/10 bg-gradient-to-r from-cyan-500/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl border-2 border-cyan-500/30 bg-[#0d1f35] overflow-hidden flex items-center justify-center">
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
                      <h3 className="text-lg font-bold text-white">
                        Time {time.numero}
                      </h3>
                      <span className="text-xs text-cyan-100/50">
                        {time.jogadores.length} jogadores
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-cyan-100/50 uppercase">Média</div>
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-amber-400" />
                      <span className="text-2xl font-black text-amber-400">{mediaTime}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de Jogadores */}
              <div className="p-3 space-y-2">
                {time.jogadores.map((jogador, jIndex) => (
                  <motion.div
                    key={jogador.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + jIndex * 0.03 }}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#0d1f35]/50 border border-cyan-500/10"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-cyan-400">{jIndex + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium text-white text-sm">{jogador.nome}</div>
                        {jogador.posicao === 'goleiro' && (
                          <span className="text-[10px] text-emerald-400">⚽ Goleiro</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10">
                      <Star size={10} className="text-cyan-400" />
                      <span className="text-xs font-bold text-cyan-400">{jogador.nivel}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Botões */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row justify-center gap-3 pt-4"
      >
        {onResortear && (
          <Button
            onClick={onResortear}
            disabled={isRessorteando}
            size="lg"
            variant="outline"
            className="h-14 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
          >
            {isRessorteando ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Shuffle className="mr-2 h-5 w-5" />
            )}
            Sortear Novamente
          </Button>
        )}
        <Button
          onClick={handleIniciarPartidas}
          size="lg"
          className="min-w-[280px] h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-lg shadow-lg shadow-emerald-500/25"
        >
          <Play className="mr-2 h-6 w-6" />
          Iniciar Partidas
        </Button>
      </motion.div>
    </div>
  );
};