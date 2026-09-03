import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import MatchDetailModal from '@/components/shared/MatchDetailModal';

interface MatchItem {
  id: number;
  placarA: number;
  placarB: number;
  duracao_segundos: number;
  timeA: {
    id: number;
    nome: string;
    logo: string | null;
  };
  timeB: {
    id: number;
    nome: string;
    logo: string | null;
  };
}

interface Props {
  ultimaRodada?: {
    rodada_id: number | null;
    data: string | null;
    campeonato_nome: string | null;
    partidas: MatchItem[];
  };
}

export const LatestRoundMatches: React.FC<Props> = ({ ultimaRodada }) => {
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);

  const partidas = ultimaRodada?.partidas || [];

  if (partidas.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d1623]/80 p-6 text-center">
        <Calendar size={28} className="mx-auto text-zinc-600 mb-2" />
        <p className="text-sm text-zinc-400">Nenhuma partida finalizada na última rodada.</p>
        <Link to="/partidas" className="inline-block mt-3 text-xs font-bold text-cyan-400 hover:underline">
          Ver todas as partidas →
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-[#0d1623]/80 p-4 sm:p-6 shadow-xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-cyan-400" />
            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
              Última Rodada
            </h3>
            {ultimaRodada?.data && (
              <span className="text-[10px] text-zinc-500 font-bold bg-zinc-800 px-2 py-0.5 rounded-full">
                {new Date(ultimaRodada.data).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
          <Link
            to="/partidas"
            className="text-xs font-bold text-zinc-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
          >
            Ver todos <ArrowRight size={12} />
          </Link>
        </div>

        {/* Lista de Partidas */}
        <div className="space-y-2 flex-1 overflow-y-auto max-h-[380px] pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {partidas.map((match, idx) => {
            const winA = match.placarA > match.placarB;
            const winB = match.placarB > match.placarA;

            return (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
                onClick={() => setSelectedMatchId(match.id)}
                className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-white/5 bg-black/20 hover:border-cyan-500/30 transition-all cursor-pointer"
              >
                {/* Time A */}
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span
                    className={`text-xs sm:text-sm font-bold truncate ${
                      winA ? 'text-white font-black' : 'text-zinc-400'
                    }`}
                  >
                    {match.timeA.nome}
                  </span>
                  {match.timeA.logo ? (
                    <img
                      src={match.timeA.logo}
                      alt={match.timeA.nome}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-contain shrink-0 bg-black/40 p-0.5"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                      {match.timeA.nome.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Placar Central */}
                <div className="px-3 sm:px-4 py-1 mx-2 rounded-lg bg-zinc-900 border border-white/10 shrink-0 font-mono font-black text-sm sm:text-base flex items-center gap-2">
                  <span className={winA ? 'text-emerald-400' : 'text-white'}>{match.placarA}</span>
                  <span className="text-zinc-600 text-xs">x</span>
                  <span className={winB ? 'text-emerald-400' : 'text-white'}>{match.placarB}</span>
                </div>

                {/* Time B */}
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-start">
                  {match.timeB.logo ? (
                    <img
                      src={match.timeB.logo}
                      alt={match.timeB.nome}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-contain shrink-0 bg-black/40 p-0.5"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                      {match.timeB.nome.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span
                    className={`text-xs sm:text-sm font-bold truncate ${
                      winB ? 'text-white font-black' : 'text-zinc-400'
                    }`}
                  >
                    {match.timeB.nome}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer Link */}
        <div className="pt-3 mt-3 border-t border-white/5 text-center">
          <Link
            to="/partidas"
            className="text-xs font-bold text-cyan-400 hover:underline uppercase tracking-wider inline-flex items-center gap-1.5"
          >
            Ver todos os resultados da rodada <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Modal de Detalhes da Partida ao Clicar */}
      {selectedMatchId && (
        <MatchDetailModal
          matchId={selectedMatchId}
          onClose={() => setSelectedMatchId(null)}
        />
      )}
    </>
  );
};
