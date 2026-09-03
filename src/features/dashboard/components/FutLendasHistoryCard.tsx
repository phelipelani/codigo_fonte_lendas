import React from 'react';
import { Landmark, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  historia?: {
    campeonatos_realizados: number;
    times_participaram: number;
    partidas_disputadas: number;
    gols_marcados: number;
    media_gols: number;
    mvps_distribuidos: number;
  };
}

export const FutLendasHistoryCard: React.FC<Props> = ({ historia }) => {
  const items = [
    { label: 'Campeonatos Realizados', value: historia?.campeonatos_realizados ?? 0 },
    { label: 'Times que Participaram', value: historia?.times_participaram ?? 0 },
    { label: 'Partidas Disputadas', value: historia?.partidas_disputadas ?? 0 },
    { label: 'Gols Marcados', value: historia?.gols_marcados ?? 0 },
    { label: 'Média de Gols por Jogo', value: historia?.media_gols ?? 0 },
    { label: 'MVPs Distribuídos', value: historia?.mvps_distribuidos ?? 0 },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1623]/80 p-4 sm:p-6 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Landmark size={18} />
          </div>
          <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
            História do FutLendas
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="p-3 rounded-xl border border-white/5 bg-black/25 text-center flex flex-col justify-center"
            >
              <span className="text-xl sm:text-2xl font-black text-white font-mono">
                {item.value}
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-1 leading-tight">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-white/5 text-center">
        <Link
          to="/analytics"
          className="text-xs font-bold text-cyan-400 hover:underline uppercase tracking-wider inline-flex items-center gap-1.5"
        >
          Ver Hall da Fama e Legado <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
};
