import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TrendPlayer {
  id: number;
  nome: string;
  foto: string | null;
  pontos: number;
}

interface Props {
  tendencias?: {
    em_alta: TrendPlayer[];
    em_queda: TrendPlayer[];
  };
}

export const TrendsCard: React.FC<Props> = ({ tendencias }) => {
  const emAlta = tendencias?.em_alta || [];
  const emQueda = tendencias?.em_queda || [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {/* EM ALTA */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1623]/80 p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
            <TrendingUp size={16} />
          </div>
          <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
            Em Alta na Rodada
          </h4>
        </div>

        <div className="space-y-2">
          {emAlta.length === 0 ? (
            <p className="text-xs text-zinc-500 py-2">Sem dados nesta rodada</p>
          ) : (
            emAlta.map((player) => (
              <Link
                to={`/jogadores/${player.id}`}
                key={player.id}
                className="flex items-center justify-between p-2 rounded-xl bg-black/25 border border-white/5 hover:border-emerald-500/30 transition-all group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {player.foto ? (
                    <img src={player.foto} alt={player.nome} className="w-7 h-7 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {player.nome.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-bold text-zinc-300 truncate group-hover:text-emerald-400 transition-colors">
                    {player.nome}
                  </span>
                </div>
                <span className="text-xs font-black text-emerald-400 shrink-0 font-mono">
                  +{Number(player.pontos).toFixed(0)} pts
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* EM QUEDA */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1623]/80 p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1 rounded-md bg-red-500/10 text-red-400">
            <TrendingDown size={16} />
          </div>
          <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
            Em Queda na Rodada
          </h4>
        </div>

        <div className="space-y-2">
          {emQueda.length === 0 ? (
            <p className="text-xs text-zinc-500 py-2">Sem dados nesta rodada</p>
          ) : (
            emQueda.map((player) => (
              <Link
                to={`/jogadores/${player.id}`}
                key={player.id}
                className="flex items-center justify-between p-2 rounded-xl bg-black/25 border border-white/5 hover:border-red-500/30 transition-all group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {player.foto ? (
                    <img src={player.foto} alt={player.nome} className="w-7 h-7 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {player.nome.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-bold text-zinc-300 truncate group-hover:text-red-400 transition-colors">
                    {player.nome}
                  </span>
                </div>
                <span className="text-xs font-black text-red-400 shrink-0 font-mono">
                  {Number(player.pontos).toFixed(0)} pts
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
