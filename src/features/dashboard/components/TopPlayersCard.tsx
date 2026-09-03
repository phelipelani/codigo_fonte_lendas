import React from 'react';
import { Crown, ArrowRight, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TopPlayer {
  id: number;
  nome: string;
  foto_url: string | null;
  jogos: number;
  pontos: number;
  titulos: number;
}

interface Props {
  jogadores?: TopPlayer[];
}

export const TopPlayersCard: React.FC<Props> = ({ jogadores = [] }) => {
  const topList = jogadores.slice(0, 5);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1623]/80 p-4 sm:p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-amber-400 fill-amber-400" />
            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
              Top 5 Jogadores
            </h3>
          </div>
          <Link
            to="/analytics"
            className="text-xs font-bold text-zinc-400 hover:text-cyan-400 transition-colors"
          >
            Geral →
          </Link>
        </div>

        <div className="space-y-2">
          {topList.map((player, idx) => {
            const isFirst = idx === 0;

            return (
              <Link
                to={`/jogadores/${player.id}`}
                key={player.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all group ${
                  isFirst
                    ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60'
                    : 'bg-black/25 border-white/5 hover:border-cyan-500/30'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-5 text-center text-xs font-black ${
                      isFirst ? 'text-amber-400' : 'text-zinc-500'
                    }`}
                  >
                    #{idx + 1}
                  </span>

                  {player.foto_url ? (
                    <img
                      src={player.foto_url}
                      alt={player.nome}
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {player.nome.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-white truncate block group-hover:text-cyan-300 transition-colors">
                      {player.nome}
                    </span>
                    {player.titulos > 0 && (
                      <span className="text-[10px] text-amber-400/90 font-bold flex items-center gap-1">
                        <Trophy size={10} /> {player.titulos} {player.titulos === 1 ? 'título' : 'títulos'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs sm:text-sm font-black text-cyan-400 font-mono">
                    {Number(player.pontos).toFixed(1)}
                  </span>
                  <span className="text-[9px] text-zinc-500 block uppercase font-bold">pts</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-white/5 text-center">
        <Link
          to="/analytics"
          className="text-xs font-bold text-cyan-400 hover:underline uppercase tracking-wider inline-flex items-center gap-1"
        >
          Ver Analytics Completo <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
};
